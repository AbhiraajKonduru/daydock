# Daydock plugins

Daydock plugins are small, reviewed features bundled with the application. The
current system intentionally does not download or execute third-party code. A
community plugin follows the normal contribution and maintainer-review process,
then ships as a native part of a Daydock release.

## Architecture

Plugins are registered explicitly in `src/plugins/registry.ts` and implement the
types in `src/plugins/api.ts`. A plugin may currently contribute:

- slash commands
- inline editor widgets
- block-level editor widgets

The editor host owns CodeMirror integration and durable save requests. Plugins
must update the editor document through the supplied context; they must not write
notebook files directly. This preserves Daydock's autosave serialization and
external-change protection.

The host also owns the hidden state footer, in `src/plugins/documentState.ts`.
A plugin owns the shape of the values it keeps there, never the envelope, and
emptying one plugin's slice never discards another's.

A command returns one of three things. A result replaces the command; `null`
leaves a bare command on the page as an editable prompt; and `{ error }` keeps
exactly what the person typed and shows the message. A command must never answer
a bad argument by deleting it. `spliceCommandLine` in `src/plugins/api.ts`
replaces only the command itself, so text after the cursor survives.

A rendered widget is a single unit in the editor: the cursor steps over it and
Backspace removes the whole marker, never part of it. A plugin that keeps state
in the footer implements `pruneState` to drop entries whose marker is gone. The
host runs it inside the same edit that deleted the marker, so one undo restores
both the widget and its history.

The slash menu shows each command by its literal name, such as Block or Doc.
Choosing a command writes `/name ` and closes the menu; pressing Enter once the
arguments are typed runs it. A command with a `suggest` hook opens its picker
instead.

Templates expose the same slash-command menu, but store the selected command as
a reusable directive. Complete directives such as `/capacity 4h` are resolved
when each page is generated. Incomplete directives such as `/capacity` remain
on the new page as prompts. Stateful directives such as `/block 1h` receive new
artifact IDs and state for every generated page.

## Bundled plugins

### Time blocks

Add a timer after an existing task:

```markdown
- [ ] Write the proposal /block 1 hour
```

Or add a centered timer on an empty line:

```text
/block 2h Architecture work
```

Durations accept `h`, `hour`, `m`, and `minutes`, up to 24 hours. An inline
timer is named by its task, so `/block 1h deep work` after a task is rejected
rather than quietly dropping the label; name a block by putting `/block` on a
line of its own.

A block counts wall-clock time: it keeps elapsing while Daydock is closed,
because a block is a commitment of real time rather than screen time. Reaching
zero is not the end of it. The timer chimes once, then keeps counting into
overtime and shows the time past the plan as a negative countdown, until it is
paused or finished by hand. Finishing records what the block actually took, so
overtime is visible in the page rather than rounded away.

### Static focus time

Use `/time 2h School` for focus time that should count against capacity without
creating a timer. It can also follow a task, such as:

```markdown
- [ ] Attend class /time 90m
```

`/block` and `/time` are separate commands. Plugins do not define command
aliases.

### Focus capacity

On an empty line, set the amount of focus time available on the page:

```text
/capacity 4h
```

The rendered block compares that capacity with all timed blocks and static time
entries in the document. Re-running `/capacity` moves the existing marker rather
than adding a second one, so a page never shows two disagreeing totals.

A block still in progress is charged the time it planned. A finished one is
charged what it actually took, so a 1h block closed after 20m stops reading as a
lost hour, and one finished 15m late is charged the full 1h 15m.

### Document links

Type `/doc` and press Enter to open a document picker. It filters as you type
and inserts the chosen document as a normal wiki link, such as
`[[Morning Routine]]`. Typing a name that does not exist yet and pressing Enter
links to a new document with that name.

The picker uses the optional `suggest` hook on a slash command: once the command
name is complete, its suggestions replace the command menu, and choosing one
calls `run` with that suggestion's `argumentsText`. Templates can use
`/doc Morning Routine` as a directive that becomes a link on each new page.

## Markdown format and durability

The working portion of a document stays compact:

```markdown
- [ ] Write the proposal · ⏱ 1h <!--daydock:block:tb_example-->
- [ ] Attend class · ◷ 1h 30m <!--daydock:time-->
```

Mutable session history is JSON inside a hidden HTML comment at the very bottom
of the same Markdown file. It remains readable in a text editor and invisible in
rendered Markdown:

```markdown
<!-- daydock:state
{
  "version": 1,
  "timeBlocks": {
    "tb_example": {
      "status": "paused",
      "sessions": [
        {
          "started": "2026-09-14T13:00:00.000Z",
          "stopped": "2026-09-14T13:25:00.000Z"
        }
      ]
    }
  }
}
-->
```

The visible countdown is derived from these timestamps and never writes once per
second. Creating, starting, pausing, resuming, finishing, and automatically
completing a timer request an immediate save. Native notebook writes flush a
temporary file before atomically replacing the destination. Normal window close
requests are held until all open documents have saved successfully.

The local `daydock-active-timer` value is a rebuildable scheduling hint used to
restore the completion sound after a renderer restart. It is not authoritative;
the Markdown timestamps remain the source of truth.

## Adding a bundled plugin

1. Add the plugin under `src/plugins/native/`.
2. Register it explicitly in `src/plugins/registry.ts`.
3. Keep its Markdown representation understandable without Daydock.
4. Version any persistent state and test parsing, serialization, and recovery.
5. Use the provided durable editor update rather than accessing storage.
6. Run `npm test`, `npm run build`, and the relevant native tests.

The API is intentionally narrow while the first plugins establish which
extension points are genuinely useful. Settings, remote installation,
permissions, dependency resolution, and a community catalog are not implemented.
