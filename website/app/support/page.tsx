import { Shell } from "../PublicChrome";
import HeroWave from "../HeroWave";
import { pageMeta } from "../meta";
import { CONTACT_EMAIL, FISCAL, FUNDING_GOAL, MILESTONES } from "../site";

export const metadata = pageMeta({
  path: "/support",
  title: "Support The Daydock Foundation",
  shareTitle: "Fund free productivity tools and teaching for students",
  description:
    "We are raising $20,000. Here is every line of it, what each dollar buys, what unlocks at $10,000 and $20,000, and how funders are recognised.",
});

const BUDGET = [
  {
    line: "Building the software",
    amount: 9000,
    detail:
      "The largest line by far, and deliberately so. Finishing the desktop app, then the mobile app at 10,000 dollars and the hosted web version at 20,000. Paying freelancers for the parts we cannot build ourselves.",
  },
  {
    line: "Reaching students",
    amount: 3500,
    detail:
      "Getting in front of high school students who have never heard of us, through ads, school clubs and creators.",
  },
  {
    line: "Workshop program",
    amount: 2000,
    detail:
      "Curriculum development, the platform we run sessions on, materials, and reaching schools outside our own network.",
  },
  {
    line: `Fiscal sponsorship fee, ${FISCAL.feePercent} percent`,
    amount: 1400,
    detail: `What ${FISCAL.program} charges on revenue. It replaces legal fees, startup fees and banking fees entirely, so we are not asking you for those.`,
  },
  {
    line: "Research with coaches and consultants",
    amount: 1000,
    detail:
      "Paying productivity coaches and consultants for their time, then publishing what actually works for free instead of keeping it.",
  },
  {
    line: "Reserve",
    amount: 1000,
    detail: "So a slow quarter does not end the program.",
  },
  {
    line: "Accessibility and translation",
    amount: 700,
    detail: "Captioning workshop recordings and translating written guides.",
  },
  {
    line: "Code signing certificates",
    amount: 600,
    detail:
      "Apple and Windows certificates so people stop seeing security warnings when they install Daydock. This is the single biggest thing standing between us and normal adoption.",
  },
  {
    line: "Director stipends",
    amount: 600,
    detail:
      "200 dollars per director per year. Not a salary. A small acknowledgement that keeps people going.",
  },
  {
    line: "Domain, hosting and infrastructure",
    amount: 200,
    detail: "A real domain instead of a free subdomain, plus what it costs to keep this site up.",
  },
];

const money = (value: number) => `$${value.toLocaleString("en-US")}`;

export default function SupportPage() {
  const total = BUDGET.reduce((sum, item) => sum + item.amount, 0);

  return (
    <Shell current="/support">
      <section className="pageHead">
        <HeroWave variant="support" />
        <div className="wrap">
          <p className="eyebrow"><span /> Grants and donations</p>
          <h1>We are raising {money(FUNDING_GOAL)} in our first year.</h1>
          <p className="lede">
            Here is every line of it, what it buys, and what we are promising to do with it. If a
            number here is not specific enough for you to hold us to, tell us and we will fix it.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>What we are trying to do.</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            Two targets for our first year, both public, both easy to check.
          </p>
          <div className="grid2">
            <article className="card">
              <span className="tag">Target one</span>
              <h4>{money(FUNDING_GOAL)} raised</h4>
              <p>
                Enough to get builds signed, run real workshops and pay the people who help us build
                this, without ever charging a student for any of it.
              </p>
            </article>
            <article className="card">
              <span className="tag">Target two</span>
              <h4>10,000 downloads</h4>
              <p>
                Ten thousand people who stopped shopping for a productivity system and started using
                one. We measure this and we will publish it.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="band raised">
        <div className="wrap">
          <h2>What unlocks, and when.</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            Two of these are not on the roadmap yet because we cannot honestly promise them without
            the money to build them. So they are tied to the number instead. Hit the number, we build
            the thing.
          </p>

          <div className="steps">
            {MILESTONES.map((item) => (
              <article key={item.amount}>
                <h4><i>{money(item.amount)}</i> {item.title}</h4>
                <p style={{ color: "var(--ink)", fontWeight: 600 }}>{item.summary}</p>
                <p>{item.detail}</p>
              </article>
            ))}
          </div>

          <div className="note">
            <h4>About lifetime access</h4>
            <p>
              We know how it sounds for a young nonprofit to promise lifetime access to anything. So here is
              the safety net, in writing. The hosted version will be open source like the rest of
              Daydock, and your notebook stays plain Markdown files you can download at any time. If
              this foundation ever cannot keep running, you can host it yourself or move your notes
              anywhere, and you lose nothing but our involvement.
            </p>
            <p>
              We would rather sell something once at cost and mean it than rent you your own notes
              forever.
            </p>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Where the money goes.</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            Every line, in order of size. Nothing here is a placeholder. Most of it is development,
            because the two things above are what people keep asking us for.
          </p>
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Line</th>
                  <th scope="col" style={{ textAlign: "right" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {BUDGET.map((item) => (
                  <tr key={item.line}>
                    <td>
                      <strong style={{ color: "var(--ink)" }}>{item.line}</strong>
                      <br />
                      <span style={{ fontSize: 13.5, color: "var(--muted)", lineHeight: 1.6, display: "inline-block", marginTop: 6 }}>
                        {item.detail}
                      </span>
                    </td>
                    <td className="num">{money(item.amount)}</td>
                  </tr>
                ))}
                <tr className="total">
                  <td>Total</td>
                  <td className="num">{money(total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="note">
            <h4>What we will not spend it on</h4>
            <p>
              No salaries. No office. No paid tooling we could get free. No legal or incorporation
              fees, because fiscal sponsorship covers those. If we ever want to spend a grant on
              something outside this table, we will ask the funder first.
            </p>
          </div>
        </div>
      </section>

      <section className="band raised">
        <div className="wrap">
          <h2>How the money is held.</h2>
          <div className="steps">
            <article>
              <h4><i>01</i> Fiscal sponsorship, not a shell</h4>
              <p>
                We are applying to {FISCAL.program}. That application is {FISCAL.status}. Once
                approved, funds are held by {FISCAL.sponsor}, a 501(c)(3) with EIN {FISCAL.ein}, and
                donations to The Daydock Foundation are tax deductible through them.
              </p>
              <p>
                We are not claiming that status until it is granted, and we are not collecting money
                before then.
              </p>
            </article>
            <article>
              <h4><i>02</i> Finances you can actually look at</h4>
              <p>
                HCB offers a public transparency mode: a live ledger of every dollar in and every
                dollar out. We intend to turn it on and link it from this page, so you can check what
                we did with your grant without asking us.
              </p>
            </article>
            <article>
              <h4><i>03</i> Reporting</h4>
              <p>
                Downloads, workshops run and students reached, sent to funders on whatever schedule
                you need, and published here as well. If a number is bad we will publish the bad
                number.
              </p>
            </article>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>If you fund us.</h2>
          <div className="grid3">
            <article>
              <h4>Your logo here</h4>
              <p>
                Supporters are listed on this site with their logo and a link, for as long as we
                exist. If you would rather stay anonymous, that is fine too.
              </p>
            </article>
            <article>
              <h4>Named support</h4>
              <p>
                If you fund a specific line, we will say so plainly. Someone will read that signing
                certificates were paid for by you.
              </p>
            </article>
            <article>
              <h4>Direct access</h4>
              <p>
                You get the founder&apos;s email and honest answers. We are small enough that this is
                not a promise we can break quietly.
              </p>
            </article>
          </div>

          <div className="note">
            <h4>Talk to us</h4>
            <p>
              Whether you are a foundation, a company with a grants program, a teacher who knows one,
              or a person who wants to chip in, the same email reaches us. Tell us what you need to
              see and we will put it together.
            </p>
            <p>
              <a className="textLink" href={`mailto:${CONTACT_EMAIL}?subject=Daydock Foundation grant`}>{CONTACT_EMAIL}</a>
            </p>
          </div>

          <div className="actions">
            <a className="primary" href={`mailto:${CONTACT_EMAIL}?subject=Daydock Foundation grant`}>
              Start a conversation
            </a>
            <a className="ghost" href="/foundation">Meet the team</a>
          </div>
        </div>
      </section>
    </Shell>
  );
}
