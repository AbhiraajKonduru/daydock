"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Download } from "lucide-react";
import { Shell } from "./PublicChrome";
import CycleChart from "./CycleChart";
import HeroWave from "./HeroWave";
import Shot from "./Shot";

type PublishedTestimonial = {
  id: string;
  quote: string;
  displayName: string;
  role?: string;
  verified: boolean;
};

const LOOP = [
  { step: "01", name: "Trigger", copy: "A deadline, a project, a goal you said you would start. Something you would have to be uncomfortable to do." },
  { step: "02", name: "Escape", copy: "So you do the easy thing instead. Scroll, another video, one more setup video about the perfect system." },
  { step: "03", name: "Relief", copy: "It works. For about an hour you do not have to think about it." },
  { step: "04", name: "Shame", copy: "Then you remember. And the feeling of being behind becomes the reason you avoid it again tomorrow." },
];

export default function Home() {
  const [testimonials, setTestimonials] = useState<PublishedTestimonial[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/testimonials", { signal: controller.signal })
      .then((response) => (response.ok ? (response.json() as Promise<PublishedTestimonial[]>) : []))
      .then((quotes) => setTestimonials(Array.isArray(quotes) ? quotes : []))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <Shell>
      <section className="hero">
        <HeroWave />
        <div className="wrap">
          <h1>Ambition without execution is just a desire.</h1>
          <p className="lede">
            You have tried time blocking in Google Calendar. You have tried weekly planning in a paper
            journal. You have tried Todoist and planning every project out in advance. Every time you
            start, you stop. And when you look back on the year, you are still not closer to making
            your ambitions reality.
          </p>
          <p className="punch">The app was never <span>the problem.</span></p>
          <div className="actions">
            <a className="primary" href="/download">Download Daydock, free <Download aria-hidden="true" /></a>
            <a className="ghost" href="/why">Read why we built it</a>
          </div>
          <p className="micro" style={{ marginTop: 24 }}>
            Free and open source. No account. Your files stay on your computer.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>You already know how this goes.</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            Two good weeks. Then one bad day. Then the bad day turns into a bad month, and starting
            again feels worse than never starting. Everything you build gets undone by something.
          </p>
          <CycleChart />
          <div className="loop">
            {LOOP.map((item) => (
              <article key={item.step}>
                <b>{item.step}</b>
                <h4>{item.name}</h4>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
          <p className="loopNote">
            The worst part is the last step feeding the first one. Falling behind is what makes you
            avoid it, and avoiding it is what puts you further behind.{" "}
            <a className="textLink" href="/why">Where this idea comes from <ArrowUpRight className="linkIcon" aria-hidden="true" /></a>
          </p>
        </div>
      </section>

      <section className="band raised">
        <div className="wrap argue">
          <h2>The tool was never the problem.</h2>
          <p style={{ marginTop: 26 }}>
            Almost nobody fixes their focus by finding a better app. They fix it by changing who they
            think they are.
          </p>
          <div className="flip">
            <p>
              <strong>You are not working two hours after school because you want to launch a startup.</strong>{" "}
              You are working two hours because you are the kind of person who builds things.
            </p>
            <p style={{ marginTop: 18 }}>
              <strong>You are not studying because you want the grade.</strong> You are studying
              because you are the kind of person who picks their future over what feels good right now.
            </p>
          </div>
          <p>
            That switch is the whole thing. And you cannot get anywhere near it while you are still
            comparing productivity apps.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>So we built the boring one.</h2>
          <p className="lede" style={{ marginTop: 26, marginBottom: 14 }}>
            A page for today. A page for the week. Documents for anything worth keeping. Plain
            Markdown files in a folder you own. No account, no streaks, no counter telling you what
            you failed to do yesterday.
          </p>
          <p className="lede">
            Daydock is trying to get out of the way.
          </p>

          <div style={{ marginTop: 64, display: "grid", gap: 88 }}>
            <Shot
              src="/today-view.png"
              alt="The Daydock daily page for Thursday, September 10, showing Win, Tasks, Limits, Notes and Journal sections filled in with a real day"
              title="Today"
              description="One win, the tasks around it, the limits that protect it, and room to write down what actually happened. This is a real day, not a demo."
              caption="Daily/2026-09-10.md. Everything you see is a plain Markdown file on your computer."
            />
            <Shot
              src="/week-view.png"
              alt="The Daydock weekly page for Week 37, 2026 showing Goals, Recurring, Upcomings and Backlog"
              title="The week"
              description="Goals for the week, the recurring things you do every week, what is coming up, and a backlog for work that is not a commitment yet. Enough direction to make a day easy to plan."
              caption="Weekly/2026-W37.md. Recurring items link out to documents you wrote once and reuse."
            />
            <Shot
              src="/plan-view.png"
              alt="Daydock plan mode with the weekly page on the left and tomorrow's daily page on the right"
              title="Planning tomorrow"
              description="Plan mode puts the week next to the day you are writing, so tomorrow gets planned with context instead of guesswork. It takes a couple of minutes."
              caption="Plan mode. The week on the left, the day you are writing on the right."
            />
          </div>

          <div className="note">
            <h4>An honest note</h4>
            <p>
              If something else already works for you, use it. Seriously. We are not trying to build the perfect system for everyone. Our goal is to build the system for the people who can&apos;t find a system.
            </p>
            <p>
              Daydock exists because the setup is where most people lose. We wanted something you can
              open once and start using, so the friction is gone and you can spend your attention on
              the part that actually changes your behaviour.
            </p>
          </div>

          <div className="actions">
            <a className="primary" href="/download">Download Daydock, free <Download aria-hidden="true" /></a>
            <a className="ghost" href="/guide">See how the pages work</a>
          </div>
        </div>
      </section>

      <section className="band raised">
        <div className="wrap">
          <h2>An app cannot teach you this.</h2>
          <p className="lede" style={{ marginTop: 26 }}>
            That is the other half of what we do. The Daydock Foundation runs free virtual workshops
            for high school students on the part that actually changes behaviour, taught by our team
            and reviewed by our advisory board.
          </p>
          <div className="grid2">
            <article className="card">
              <span className="tag">Branch one</span>
              <h4>The tool</h4>
              <p>
                Daydock, free and open source, built to remove friction and then stay out of your way.
                No subscription, no account, no lock in.
              </p>
            </article>
            <article className="card">
              <span className="tag">Branch two</span>
              <h4>The teaching</h4>
              <p>
                Free workshops and written guides on identity, self sabotage and building a system
                that survives a bad week. Aimed at students, free for everyone.
              </p>
            </article>
          </div>
          <div className="actions">
            <a className="ghost" href="/foundation">About the foundation</a>
            <a className="textLink" href="/support">How to fund this work</a>
          </div>
        </div>
      </section>

      {testimonials.length > 0 ? (
        <section className="band">
          <div className="stories">
            <p className="eyebrow"><span /> From people using it</p>
            <h2>What changed after they installed it.</h2>
            <div className="storyGrid">
              {testimonials.map((item) => (
                <blockquote key={item.id}>
                  <p>{item.quote}</p>
                  <footer>
                    <b>{item.displayName}</b>
                    {item.role ? <span>{item.role}</span> : null}
                    {item.verified ? <small>Submitted with a valid Daydock code</small> : null}
                  </footer>
                </blockquote>
              ))}
            </div>
            <a className="textLink storiesLink" href="/feedback">Share yours</a>
          </div>
        </section>
      ) : null}
    </Shell>
  );
}
