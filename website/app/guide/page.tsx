import { Shell } from "../PublicChrome";
import HeroWave from "../HeroWave";
import { pageMeta } from "../meta";
import Shot from "../Shot";

export const metadata = pageMeta({
  path: "/guide",
  title: "How to use Daydock",
  shareTitle: "How to use Daydock: five sections, none of them rules",
  description:
    "What Win, Tasks, Limits, Notes and Journal are actually for, how Goals, Recurring, Upcomings and Backlog work, and how to link reusable documents into your day.",
});

export default function GuidePage() {
  return (
    <Shell current="/guide">
      <section className="pageHead">
        <HeroWave variant="guide" />
        <div className="wrap">
          <p className="eyebrow"><span /> How to use it</p>
          <h1>Five sections, and none of them are rules.</h1>
          <p className="lede">
            Daydock gives you a daily page, a weekly page and documents. That is the whole app. Here
            is what each part is actually for, with real examples rather than empty templates. If a
            section does not help you, leave it empty. Nothing counts it.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>The daily page</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            Daydock opens on today automatically and saves as you type. The page is already split
            into five sections so you do not have to design a format every morning.
          </p>

          <div className="steps">
            <article>
              <h4><i>WIN</i> The result that would make today count</h4>
              <p>
                Not everything you plan to do. The one or two things that, if they happened, would
                make the day a good one. Keeping this short is the point. If everything is a win,
                nothing is.
              </p>
              <div className="example">
                <b>Win</b><br />
                Reach out to Coca Cola for sponsoring food and drinks<br />
                Finish dimensional analysis chemistry homework
              </div>
            </article>

            <article>
              <h4><i>TASKS</i> The supporting work</h4>
              <p>
                Everything else you want to get to. These are not failures if they roll to tomorrow.
                They exist so your head is empty and the win stays visible.
              </p>
              <div className="example">
                <b>Tasks</b><br />
                Study for accounting test by asking ChatGPT to quiz me on chapter 1<br />
                Brainstorm ideas for the food pantry expiry date problem
              </div>
            </article>

            <article>
              <h4><i>LIMITS</i> The boundaries that protect the win</h4>
              <p>
                This is the section people skip and then wish they had used. A limit is a rule you set
                for yourself before the day gets hard. It can be a plain sentence.
              </p>
              <div className="example">
                <b>Limits</b><br />
                No phone until the win is done<br />
                Stop working at 10pm even if it is not finished
              </div>
              <p style={{ marginTop: 16 }}>
                It can also be a link to something you already wrote. If you have a dopamine
                management protocol saved as a document, you do not need to retype it every day. Put{" "}
                <span className="inlineCode">[[name of the document (capital sensitive)]]</span> in Limits and click through to it
                when you need the detail.
              </p>
            </article>

            <article>
              <h4><i>NOTES</i> What is actually happening</h4>
              <p>
                Anything you capture during the day. Where things went sideways, what you decided,
                what you are waiting on. This is the section that makes the page worth rereading.
              </p>
              <div className="example">
                <b>Notes</b><br />
                Got home late (5:30pm) because track practice was delayed. Starting a 90 minute timer
                now to finish the Coca Cola reach out, then homework.
              </div>
            </article>

            <article>
              <h4><i>JOURNAL</i> The part that changes the next day</h4>
              <p>
                Reflection, honestly written, ideally about patterns rather than events. This is where
                you notice that you keep overestimating how much fits in a day, which is worth more
                than any feature in any app.
              </p>
              <div className="example">
                <b>Journal</b><br />
                Today ties into my problem with overestimating how much I can do. Would help to put
                less under Win and more under Tasks tomorrow.
              </div>
            </article>
          </div>

          <div style={{ marginTop: 64 }}>
            <Shot
              src="/today-view.png"
              alt="A Daydock daily page with Win, Tasks, Limits, Notes and Journal filled in"
              caption="A real daily page. Note DD Protocol under Limits, linked instead of retyped."
            />
          </div>
        </div>
      </section>

      <section className="band raised">
        <div className="wrap">
          <h2>The weekly page</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            The week is there so planning a day takes two minutes instead of twenty. It is direction,
            not a contract.
          </p>

          <div className="steps">
            <article>
              <h4><i>GOALS</i> What you want true by Sunday</h4>
              <p>
                Outcomes, not activities. Two or three is plenty. These are what you pull from when
                you are choosing a win in the morning.
              </p>
            </article>
            <article>
              <h4><i>RECURRING</i> The things you rewrite every week</h4>
              <p>
                Habits and responsibilities that come back weekly. This is the section that saves you
                the most typing, because most of these are documents you wrote once. Link them with{" "}
                <span className="inlineCode">[[Name of document]]</span> and they carry over as a single
                line instead of a rewritten checklist.
              </p>
              <div className="example">
                <b>Recurring</b><br />
                [[Night Routine]]<br />
                [[DD Protocol]]<br />
                Exercise routine for posture according to PT
              </div>
            </article>
            <article>
              <h4><i>UPCOMINGS</i> Things with a date attached</h4>
              <p>
                Quizzes, deadlines, plans with friends. Not a calendar, just enough that nothing
                lands on you by surprise on Thursday.
              </p>
            </article>
            <article>
              <h4><i>BACKLOG</i> Work that is not a commitment yet</h4>
              <p>
                Ideas and useful work you are not promising to do. Having somewhere honest to put
                these is what stops your daily page from filling up with things you will not touch.
              </p>
            </article>
          </div>

          <div style={{ marginTop: 64 }}>
            <Shot
              src="/week-view.png"
              alt="A Daydock weekly page showing Goals, Recurring, Upcomings and Backlog"
              caption="One week of direction. Recurring items are links to documents, not retyped checklists."
            />
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Documents are the part that lasts</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            Daily pages are disposable by design. Documents are not. This is where your actual system
            lives: routines, protocols, project plans, principles, anything you want to write once and
            reuse for a year.
          </p>

          <div className="steps">
            <article>
              <h4><i>WRITE ONCE</i> Create a document from the sidebar</h4>
              <p>
                A night routine, a study protocol, a plan for a project, the rules you want to follow
                when you are tired. Documents are ordinary files in a{" "}
                <span className="inlineCode">Docs/</span> folder, so you can read them without Daydock
                open.
              </p>
            </article>
            <article>
              <h4><i>LINK IT</i> Type two square brackets anywhere</h4>
              <p>
                Write <span className="inlineCode">[[Morning Routine]]</span> on any page and it
                becomes a link you can click. That is how a five step protocol becomes one line in
                today&apos;s Limits section instead of a wall of text you stop reading.
              </p>
            </article>
            <article>
              <h4><i>RENAME SAFELY</i> Right click a document to rename it</h4>
              <p>
                Daydock renames the file and repairs the links pointing at it, so your old pages do
                not break. The heading inside the document stays whatever you want it to be.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="band raised">
        <div className="wrap">
          <h2>Planning tomorrow</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            Plan mode puts the weekly page beside the day you are writing. You plan tomorrow while
            you can still see what the week was supposed to be about, which is the difference between
            a plan and a wish list.
          </p>
          <p className="lede" style={{ marginTop: 16 }}>
            Do it the night before, when you still remember what happened today. It takes a couple of
            minutes and it is the single highest leverage habit in the whole app.
          </p>

          <div style={{ marginTop: 56 }}>
            <Shot
              src="/plan-view.png"
              alt="Daydock plan mode showing the weekly page on the left and a daily page on the right"
              caption="Plan mode. The week on the left, the day you are writing on the right."
            />
          </div>

          <div className="grid3">
            <article>
              <h4>Keyboard first</h4>
              <p>
                Alt T for today, Alt Y for yesterday, Alt O for tomorrow, Alt W for this week, Alt L
                and Alt N for last and next week, Ctrl K to search everything.
              </p>
            </article>
            <article>
              <h4>Your own templates</h4>
              <p>
                If you don&apos;t like Win, Tasks, Limits, Notes and Journal sections, change them. Customise
                the daily and weekly templates and every new page uses yours instead of ours.
              </p>
            </article>
            <article>
              <h4>It is just a folder</h4>
              <p>
                Pick where your notebook lives. Back it up however you already back things up, or use
                your own Git and GitHub setup if you want it on more than one machine.
              </p>
            </article>
          </div>

          <div className="actions">
            <a className="primary" href="/download">Download Daydock, free</a>
            <a className="ghost" href="/feedback">Something confusing? Tell us</a>
          </div>
        </div>
      </section>
    </Shell>
  );
}
