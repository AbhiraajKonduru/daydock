import { ArrowUpRight } from "lucide-react";
import { Shell } from "../PublicChrome";
import HeroWave from "../HeroWave";
import { pageMeta } from "../meta";
import { GITHUB_URL, MILESTONES } from "../site";

export const metadata = pageMeta({
  path: "/roadmap",
  title: "Roadmap",
  shareTitle: "What Daydock is building next",
  description:
    "Signed builds, a nicer editor, plugins, workshops, plus a mobile app at $10,000 and a hosted version you buy once at $20,000. And the things Daydock will never become.",
});

const money = (value: number) => `$${value.toLocaleString("en-US")}`;

const NOW = [
  {
    title: "Signed Windows builds",
    copy: "Right now Windows shows a blue warning screen and you have to click More info and then Run anyway. It is not hard, but it is the moment most people give up. A certificate fixes it.",
  },
  {
    title: "Signed and notarised macOS builds",
    copy: "Same problem, worse on Mac, because recent versions removed the easy bypass. Until we can sign, we are shipping a zip with instructions written properly instead of buried in a dropdown.",
  },
  {
    title: "An editor that feels good to write in",
    copy: "A thicker cursor, selection and highlighting that behave the way you expect, and your own font and size. Small things, but you are looking at this page every day.",
  },
  {
    title: "The first workshop cohort",
    copy: "Free, virtual, for high school students. Taught by our team and reviewed by our advisory board once it is seated.",
  },
  {
    title: "A real domain",
    copy: "We are on a free subdomain today. A proper domain is cheap and it is one of the first things a grant would pay for.",
  },
];

const NEXT = [
  {
    title: "Plugins for slash commands",
    copy: "A way for people to add their own slash commands to the editor, so Daydock can stay almost empty while still doing the specific thing you need.",
  },
  {
    title: "Onboarding that does not add setup",
    copy: "The first five minutes should teach you the daily and weekly loop without turning into a configuration screen.",
  },
  {
    title: "Export, including PDF",
    copy: "Your notes are already portable because they are Markdown. Export is about handing a document to someone else.",
  },
  {
    title: "Attachments in the Assets folder",
    copy: "The folder is created today but the app does not manage what is in it yet.",
  },
  {
    title: "More complete keyboard navigation",
    copy: "Everything reachable without the mouse, and a command palette that covers the whole app.",
  },
];

const MAYBE = [
  "Packaging for distribution channels such as the Arch User Repository",
  "Better conflict handling and recovery messages when a notebook is synced across machines",
  "Published guides from the workshop curriculum, free for anyone",
];

const NEVER = [
  "A project management suite",
  "A database of tagged and categorised tasks",
  "Streaks, points, badges or anything that keeps score of your failures",
  "A social productivity platform",
  "Anything that requires an account or hosted storage to work",
];

export default function RoadmapPage() {
  return (
    <Shell current="/roadmap">
      <section className="pageHead">
        <HeroWave variant="roadmap" />
        <div className="wrap">
          <p className="eyebrow"><span /> Roadmap</p>
          <h1>What we are building, and what we will never build.</h1>
          <p className="lede">
            These are directions, not promises or deadlines. Anything new has to keep the daily loop,
            the plain Markdown files and the low setup cost intact, or it does not go in.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Working on now</h2>
          <div className="steps">
            {NOW.map((item, index) => (
              <article key={item.title}>
                <h4><i>{String(index + 1).padStart(2, "0")}</i> {item.title}</h4>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band raised">
        <div className="wrap">
          <h2>Next</h2>
          <div className="steps">
            {NEXT.map((item, index) => (
              <article key={item.title}>
                <h4><i>{String(index + 1).padStart(2, "0")}</i> {item.title}</h4>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Waiting on funding.</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            These two are the things people ask us for most, and both need real money to build. We
            are not going to promise them on a maybe, so they are tied to a number instead. Hit the
            number, we build the thing.
          </p>

          <div className="steps">
            {MILESTONES.map((item) => (
              <article key={item.amount}>
                <h4><i>AT {money(item.amount)}</i> {item.title}</h4>
                <p style={{ color: "var(--ink)", fontWeight: 600 }}>{item.summary}</p>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>

          <p className="loopNote">
            The hosted version stays open source and your notebook stays plain Markdown you can
            download any time, so if this foundation ever stops, you can run it yourself.{" "}
            <a className="textLink" href="/support">
              See the full budget <ArrowUpRight className="linkIcon" aria-hidden="true" />
            </a>
          </p>
        </div>
      </section>

      <section className="band raised">
        <div className="wrap">
          <div className="grid2">
            <article className="card">
              <span className="tag">Considering</span>
              <h4>Ideas we like but have not committed to</h4>
              <ul style={{ paddingLeft: 20, color: "var(--ink-2)", fontSize: 15, lineHeight: 1.75, margin: 0 }}>
                {MAYBE.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
            <article className="card">
              <span className="tag">Never</span>
              <h4>Things Daydock is not trying to become</h4>
              <ul style={{ paddingLeft: 20, color: "var(--ink-2)", fontSize: 15, lineHeight: 1.75, margin: 0 }}>
                {NEVER.map((item) => <li key={item}>{item}</li>)}
              </ul>
            </article>
          </div>

          <div className="note">
            <h4>Want something on this list</h4>
            <p>
              Feature requests genuinely change what we build next, especially from people using
              Daydock every day. For a substantial change, open an issue first so we can talk about
              the problem before anyone writes code.
            </p>
            <p>
              <a className="textLink" href="/feedback">Send a request</a>{" "}
              <a className="textLink" href={`${GITHUB_URL}/issues`} target="_blank" rel="noreferrer" style={{ marginLeft: 18 }}>
                Open an issue <ArrowUpRight className="linkIcon" aria-hidden="true" />
              </a>
            </p>
          </div>
        </div>
      </section>
    </Shell>
  );
}
