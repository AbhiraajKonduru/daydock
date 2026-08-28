# Daydock

> A minimal execution system designed to help people consistently show up; not manage infinitely complex productivity systems.
> 

---

# Philosophy

Most productivity software becomes another project to maintain.

Daydock is built on the opposite philosophy.

- One daily page.
- One weekly page.
- Everything is Markdown.
- Local-first.
- Fast.
- No unnecessary features.
- Never miss twice.

The goal is not organization.

The goal is execution.

---

# Core Principles

---

## Local First

Everything lives inside a normal folder.

Users own their data.

No account.

No cloud requirement.

No proprietary format.

---

## Markdown Native

Every page is Markdown.

No hidden databases.

Files should remain readable forever.

---

## Frictionless

Opening today's page should take less than one second.

Creating tomorrow should take one click.

---

## Notebook First

Think notebook.

Not workspace.

Not dashboard.

Not database.

---

# Folder Structure

Execution/

```
Weekly/

    2026-W32.md
    2026-W33.md

Daily/

    2026-08-03.md
    2026-08-04.md

Docs/

    DD Protocol.md
    Running.md
    Morning Routine.md

Assets/
```

settings.json

Everything is plain Markdown.

---

# Home Screen

When the application opens:

Today's page opens immediately.

No dashboard.

No project list.

No loading screen.

Just today's page.

---

# Daily Page

Contains:

- System streak
- Win requirements
- Task list
- Limits
- Notes
- Journal

Example

# Date

🔥 Streak: 42

## Tasks (win req are highlighted with a star)

- [ ]  Chemistry
- [ ]  Run
- [ ]  Ship Feature
- [ ]  Email teacher
- [ ]  Laundry

## Limits

- [ ]  Phone outside room
- [ ]  Follow DD Protocol

## Notes

...

## Journal

...

---

# Weekly Page

Contains

## Goals

## Recurring Tasks

## Upcoming

## Backlog

---

# Linked Documents

Any item may reference a document.

Example

- [ ]  Follow DD Protocol

Clicking it opens

Docs/DD Protocol.md

Examples

Morning Routine

Workout Plan

Study Protocol

Reading List

Packing Checklist

The item stays simple.

The document contains details.

---

# Streak

The streak measures system usage.

A day counts if the user meaningfully interacted (bare minimum: planning tasks).

Missing one day is allowed.

Two consecutive missed days reset the streak.

---

# Journal

The journal is part of the daily page.

Not a separate feature.

Morning planning naturally flows into evening reflection.

One chronological notebook.

---

# Search

Simple full-text search.

Search every Markdown file.

Nothing more.

---

# Recent Pages

Quick sidebar

Today

Yesterday

Current Week

Recent Documents

Side bar is not open by default but it opens when the mouse moves and hovers over the left side.

---

# UI Philosophy

Inspired by Claude.

Large typography.

Warm neutral colors.

Generous spacing like notion (how every line is like a block that can be dragged, yk notion ui, if not search for it).

Reading-focused.

No unnecessary icons.

No floating toolbars.

No visual clutter.

---

# Editing

Markdown editor.

Markdown is automatically rendered but when you click on a line, then you can see the markdown itself (unless it is a check box, so for instance you can make a task by doing [] and then typing and the checkbox will look nice and interactive even when editing it in the future. But for instance if it is a heading, you can see the hashtags when editing it by typing but otherwise you just see the rendered size).

Checkboxes interactive.

Keyboard first.

---

# Design Goals

The application should disappear.

It should feel like opening a paper notebook.

---

# Although this is in markdown…

it should feel like an app. When i write a event or something i should be able to just type “ `dentist appointment @07/22/26` ” and then see the item created and formatted nicely without the @ symbol yk? stuff like that

---

# Future Ideas

Daily templates

Git sync

PDF export

Statistics page

Command palette

---

Here is a chat i had with another ai while creating it:

good system idea or any imrpovements?

So essentially i want to design a very basic and minimalistic system. 

so first of all, it should not be overkill since that is what killed all previous systems, believing future me is some superman.

so instead it should be a super simple thing that can fit in one page: tasks for the day and then limits, such as “no cheap dopamine until all tasks complete” etc. And some tasks are recurring so like that would be nice to add.

daily:

Progress bar:

# Tasks X/XX/XXXX

- [ ]  item A
- [ ]  item B

# Limits

DD protocol (this carries over all the limits written in that)

weekly:

basically just the recurring tasks, a backlog, etc. Most of the time tasks for the next day will be planned the day before or right after waking up. 

This side can also contain event dates if i am not supposed to forget something

reminders are also good here

due dates are fine as well

goals for the week are  also good

No times on tasks since that is one of the reasons why i do not like calendars.

I actually think you're converging on something much more sustainable than most productivity systems.

The failure mode of most systems isn't that they lack features—it's that they assume a version of you that is perfectly disciplined, plans accurately, and enjoys maintaining the system. Every additional field is another thing that can become stale.

A few principles I'd keep:

- **The system should take <2 minutes to update.**
- **It should answer only one question: "What should I do next?"**
- **Anything you don't look at daily doesn't belong on the daily page.**
- **Capture > organization.** If you're unsure where something goes, throw it into the backlog.

I'd simplify it even further.

---

## Daily

```
Progress: ███████░░░ 7/10

TODAY

□ Chemistry worksheet
□ Finish feature X
□ Run 5K
□ Reply to email

LIMITS

✓ DD Protocol
□ No YouTube until tasks complete
□ Phone stays outside room during deep work

NOTES (optional)

- Remember to ask teacher about...
```

Notice there are only three sections:

- Tasks
- Limits
- Notes

Nothing else.

---

## Weekly

```
THIS WEEK

Goals
- Finish chemistry unit
- Ship MVP
- Run 3 times

Recurring
□ Laundry
□ Review finances
□ Weekly planning
□ Clean desk

Upcoming
- Wed: Dentist
- Fri: Assignment due

Backlog
- Learn Docker
- Read paper
- Fix website bug
```

That's really all you need.

---

## One improvement I'd make

I'd separate **tasks** from **standards**.

Tasks end.

Standards never end.

For example:

```
TODAY

□ Finish biology homework
□ Push latest update

STANDARD

✓ Read before bed
✓ Workout
✓ Journal
✓ No social media before work
```

This avoids rewriting habits every day while still making them visible.

---

## Another improvement: use "Top 3"

Instead of twenty tasks:

```
TOP 3

1. Chemistry
2. Ship feature
3. Run

Everything Else

□ Email
□ Laundry
□ Organize notes
□ Buy batteries
```

As long as the Top 3 get done, the day was successful.

This prevents a common failure mode where you finish 8 small tasks but avoid the important one.

---

## I'd also remove the progress bar based on task count

Imagine:

```
10 tiny tasks
1 huge project
```

The progress bar becomes misleading.

Instead I'd use:

```
Top 3: 2/3
Tasks: 7/11
```

Or no progress bar at all.

The checklist itself already tells you where you are.

---

## I like your "Limits" idea

Most productivity systems only track what you should do.

They ignore what you shouldn't do.

For example:

```
LIMITS

□ No Discord until work finished
□ No YouTube
□ No gaming
□ Phone outside room
□ Follow DD Protocol
```

That addresses behavior directly instead of just intentions.

---

## One thing I'd avoid

Don't make this become another planning system.

No:

- priorities (other than Top 3)
- tags
- estimated durations
- Eisenhower matrix
- labels
- contexts
- Kanban
- projects
- folders

The moment you're spending more time organizing than doing, the system has stopped serving its purpose.

---

### Overall

I think this is about **90% of the way there**. The only structural changes I'd make are:

- Daily: **Top 3**, remaining tasks, limits, optional notes.
- Weekly: goals, recurring tasks, upcoming dates, reminders, backlog.
- Keep everything on a single page.
- Make updating it take under two minutes.

The simplicity is the strength. If you can realistically maintain it every day for a year, it's a better system than an elaborate planner that lasts two weeks.

I think this is enough.

In fact, I'd be careful about adding much more because you're very close to the point where complexity starts outweighing the benefit.

A few thoughts:

### 1. "Win REQs" is an excellent addition

This solves one of the biggest problems with checklists.

Without it:

- Complete 10 tiny tasks → feels productive.
- Ignore the one important task.

With it:

```
WIN REQs

[x] Chemistry
[x] Run
[ ] Ship feature
```

The day isn't a win until those are done.

I'd limit it to **1–3** items. If you have 6 "must-do" tasks, then none of them are really must-do.

---

### 2. The squares are better than a percentage

I like this more than a numeric progress bar because it's lightweight.

```
All Tasks

[x] [x] [x] [ ] [ ] [ ]
```

When you add another task, you simply add another square. No recalculating percentages.

---

### 3. I'd slightly rename "TODAY"

Maybe

```
TODAY

1.
2.
3.
```

or

```
Today's Tasks
```

Since the numbering already conveys priority, you don't need another "Priority" field.

---

### 4. I might tweak Notes

Instead of making it only reminders, I'd let it be a scratchpad.

```
NOTES

- Call John
- Random idea
- Teacher moved due date
```

That gives you somewhere to dump thoughts without interrupting your work.

---

### 5. Weekly looks about right

I don't think it needs anything else.

```
Goals
Recurring
Upcoming
Backlog
```

Those four sections cover almost everything.

---

## The one thing I'd add

Not another section—just a simple rule.

> **The notebook is allowed to be messy.**
> 

Cross things out.

Draw arrows.

Write in the margins.

Add tasks halfway through the day.

Spill over onto another page.

Don't worry about making it aesthetically perfect.

One reason bullet journals work for some people is that they're customizable. One reason they fail for others is that they become art projects. Your notebook should look like a tool, not a product.

---

## Overall

I'd genuinely stop here.

The system has a clear hierarchy:

- **Weekly page** → direction.
- **Daily page** → execution.
- **Win requirements** → what defines success.
- **Task list** → everything else.
- **Limits** → prevent self-sabotage.
- **Notes** → capture anything that doesn't fit elsewhere.
- **System streak** → reinforce consistency.

Notice what isn't there:

- No schedules.
- No estimates.
- No tags.
- No contexts.
- No priorities beyond simple numbering.
- No elaborate habit trackers.
- No productivity metrics.

That's a feature, not a limitation. The system is simple enough that you can realistically keep using it every day, which is ultimately what determines whether it succeeds.
