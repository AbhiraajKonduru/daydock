import { Shell } from "../PublicChrome";
import HeroWave from "../HeroWave";
import { pageMeta } from "../meta";
import { CYCLE_VIDEO } from "../site";

export const metadata = pageMeta({
  path: "/why",
  title: "Why we built Daydock",
  shareTitle: "The tool was never the problem",
  description:
    "Time blocking, paper planners, Todoist. Every time you start, you stop. The self sabotage loop behind it, and why we built an app with almost nothing in it.",
});

export default function WhyPage() {
  return (
    <Shell current="/why">
      <section className="pageHead">
        <HeroWave variant="why" />
        <div className="wrap">
          <p className="eyebrow"><span /> Why we exist</p>
          <h1>The tool was never the problem.</h1>
          <p className="lede">
            Daydock started because I kept failing at systems that everyone else seemed fine with.
            This is the whole reasoning, written out, so you can decide whether we are talking about
            the same thing.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap essay">
          <p>
            I have ambitions. Real ones. Things I want to build, grades I want, a version of my life
            that I can picture clearly. Wanting it was never the hard part.
          </p>
          <p>
            The hard part was that every time I started, I stopped.
          </p>
          <p>
            I tried time blocking in Google Calendar. Every hour of the day had a coloured box.
            It lasted about a week, and then the boxes were just a record of what I did not do.
            I tried weekly planning in a paper journal. I tried Todoist, planning projects out in
            advance, breaking everything into subtasks. Each one worked for a little while and then
            it did not, and the failure always felt like my fault, so I would go looking for the next
            thing that might fix me.
          </p>

          <blockquote>
            <p>Ambition without execution is just a desire.</p>
          </blockquote>

          <p>
            What actually got to me was looking back. A year would go by and I would still not be
            closer to any of it. Not because I did nothing, but because every stretch of progress got
            cancelled out by a stretch of undoing it. Two good weeks, then a bad one that erased them.
            Add it all up and you land almost exactly where you started.
          </p>

          <h2>The loop that keeps it going</h2>
          <p>
            This part is not our idea. The clearest explanation I have found is by{" "}
            <strong>{CYCLE_VIDEO.creator}</strong>, and it is worth the sixteen minutes. He breaks
            self sabotage into four steps that feed each other.
          </p>
          <p>
            Something <strong>triggers</strong> you, usually a thing you would have to be
            uncomfortable to do. You <strong>escape</strong> into something easier. You get{" "}
            <strong>relief</strong>, and for an hour you genuinely feel better. Then comes the{" "}
            <strong>shame</strong>, because there is a gap between who you are being and who you know
            you could be. And the shame becomes the next trigger. That is why it is a spiral instead
            of a mistake.
          </p>

          <div className="videoWrap">
            <div className="videoFrame">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${CYCLE_VIDEO.id}`}
                title={`${CYCLE_VIDEO.title} by ${CYCLE_VIDEO.creator}`}
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
            <p className="videoNote">
              &ldquo;{CYCLE_VIDEO.title}&rdquo; by {CYCLE_VIDEO.creator}. We are not affiliated with him and this is
              not an endorsement from him. We are linking it because it explains the cycle better than
              we can, and because our workshops build on the same idea.
            </p>
          </div>

          <h2>Nothing in that loop is about software</h2>
          <p>
            Read the four steps again and try to find the part a better app fixes. It is not there.
            No amount of tagging, nesting, colour coding or notification scheduling touches a single
            step of it. The whole loop runs on how you feel about yourself when you fall behind.
          </p>
          <p>
            Which means the year I spent switching tools was not wasted effort in the wrong place.
            It was the escape step. Researching the perfect system feels exactly like progress and
            costs you nothing, which is what makes it such a good hiding place.
          </p>

          <h2>What actually changes it</h2>
          <p>
            Motivation does not survive a bad week. Identity does. The difference sounds like word
            games until you try it on something real.
          </p>
          <p>
            You are not working two hours after school because you want to launch a startup. You are
            working two hours because you are the kind of person who builds things. You are not
            studying because you want the grade. You are studying because you are the kind of person
            who picks their future over what feels good right now.
          </p>
          <p>
            When execution is who you are, a missed day is just a missed day. There is nothing to
            recover from and nothing to be ashamed of, so there is no trigger waiting for you
            tomorrow. That is the actual fix. Everything else is decoration.
          </p>

          <h2>So what is the app for</h2>
          <p>
            You still need somewhere to write things down. But the setup is where most people lose,
            because setting up a system is the most productive feeling escape there is.
          </p>
          <p>
            So Daydock has almost nothing in it. A page for today, a page for the week, and documents
            for anything you want to reuse. Plain Markdown in a folder you own. Nothing to configure,
            no account to make, no streak to protect, no overdue counter to feel bad about.
          </p>
          <p>
            The goal is to remove the friction and the decisions, so that the only thing left to think
            about is the part that matters. Stop asking which tool to use. Start asking who you need
            to believe you are.
          </p>

          <h2>And the workshops</h2>
          <p>
            An app cannot teach you any of this, which is why the foundation is two branches and not
            one. We run free virtual workshops for high school students on the cycle, on identity, and
            on building something that survives a bad week. Free, because the students who need this
            most are the least able to pay for the fourth app they will quit.
          </p>
          <p>
            <strong>Abhiraaj Konduru</strong><br />
            Founder and Executive Director, The Daydock Foundation
          </p>

          <div className="actions">
            <a className="primary" href="/download">Download Daydock, free</a>
            <a className="ghost" href="/foundation">About the foundation</a>
          </div>
        </div>
      </section>
    </Shell>
  );
}
