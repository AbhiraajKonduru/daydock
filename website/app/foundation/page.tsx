import { ArrowUpRight } from "lucide-react";
import { Shell } from "../PublicChrome";
import HeroWave from "../HeroWave";
import { AdvisorForm, VolunteerForm } from "./JoinForms";
import { pageMeta } from "../meta";
import { CONTACT_EMAIL, FISCAL } from "../site";

export const metadata = pageMeta({
  path: "/foundation",
  title: "The Daydock Foundation",
  shareTitle: "The Daydock Foundation: free tools and free teaching",
  description:
    "A student led nonprofit building free tools and free teaching for people who keep falling off their own plans. Our team, open roles, volunteering, and the advisory board.",
});

export default function FoundationPage() {
  return (
    <Shell current="/foundation">
      <section className="pageHead">
        <HeroWave variant="foundation" />
        <div className="wrap">
          <p className="eyebrow"><span /> The Daydock Foundation</p>
          <h1>Free tools and free teaching for people who keep falling off.</h1>
          <p className="lede">
            We are a student led nonprofit project. We think the reason most people never
            execute on their ambitions is not because their productivity app is bad but because real change starts inside, and we are building both halves of
            an answer to that: a simple app combined with resources on how to change your mindset to that of the person you want to become.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="wrap">
          <h2>Two branches, one idea.</h2>
          <div className="grid2">
            <article className="card">
              <span className="tag">Branch one</span>
              <h4>Daydock, the app</h4>
              <p>
                Free and open source. A page for today, a page for the week, and documents. Plain
                Markdown in a folder you own, no account and nothing keeping score.
              </p>
              <p>
                Its job is to take setup and decisions off the table, because choosing a system is the
                most convincing way to avoid doing the work.
              </p>
            </article>
            <article className="card">
              <span className="tag">Branch two</span>
              <h4>Workshops and guides</h4>
              <p>
                Free virtual workshops for high school students, taught by our team and reviewed by
                our advisory board. On the self sabotage cycle, on identity instead of motivation, and
                on building a system that survives a bad week.
              </p>
              <p>
                Everything we teach ends up written down and published free, whether or not you ever
                install anything.
              </p>
            </article>
          </div>
          <p className="loopNote">
            <a className="textLink" href="/why">The full reasoning behind both <ArrowUpRight className="linkIcon" aria-hidden="true" /></a>
          </p>
        </div>
      </section>

      <section className="band raised">
        <div className="wrap">
          <h2>Who is doing this.</h2>
          <div className="people">
            <article className="person">
              <img
                className="personPhoto"
                src="/team/abhiraaj-konduru.webp"
                srcSet="/team/abhiraaj-konduru.webp 1x, /team/abhiraaj-konduru@2x.webp 2x"
                width={148}
                height={148}
                alt="Abhiraaj Konduru"
                loading="lazy"
              />
              <div>
                <h4>Abhiraaj Konduru</h4>
                <p className="role">Founder and Executive Director</p>
                <p>
                  Part time software engineer, and the person who built Daydock because he couldn&apos;t stick to any productivity system...
                </p>
                <p>
                  Previously Director of Sponsorship and Director of Logistics for a Divergent
                  regional hackathon in Boston, where he helped raise $15,000, $3,000 in cash
                  and $12,000 in prizes, for an event officially partnered with Microsoft with more
                  than 100 participants.
                </p>
              </div>
            </article>

            <article className="person">
              <img
                className="personPhoto"
                src="/team/vikyatt-bommireddy.webp"
                srcSet="/team/vikyatt-bommireddy.webp 1x, /team/vikyatt-bommireddy@2x.webp 2x"
                width={148}
                height={148}
                alt="Vikyatt Bommireddy"
                loading="lazy"
              />
              <div>
                <h4>Vikyatt Bommireddy</h4>
                <p className="role">Director of Outreach</p>
                <p>
                  Former content creator and video editor. Understands content trends and how to
                  walk up to strangers with no problems :)
                </p>
                <p>
                  Joined because he wanted to help ambitious students achieve their goals.
                </p>
              </div>
            </article>

          </div>
        </div>
      </section>

      <section className="band" id="roles">
        <div className="wrap">
          <h2>Three seats we are trying to fill.</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            None of these are filled yet.
          </p>

          <div className="grid2">
            <article className="card open">
              <span className="tag">Open role</span>
              <h4>Director of Grants</h4>
              <p>
                We need someone to find the funders, write the applications and keep the reporting
                honest. You would own the grant pipeline end to end and work directly with Abhiraaj
                on what we ask for and why.
              </p>
              <p>
                5-10 hours per week commitment.
              </p>
              <p>
                Send an email to{" "}
                <a className="emailLink" href={`mailto:${CONTACT_EMAIL}?subject=Director of Grants`}>
                  {CONTACT_EMAIL}
                </a>{" "}
                and tell us why this problem is interesting to you and why you would be a good fit.
              </p>
              <div className="cardActions">
                <a className="ghost" href={`mailto:${CONTACT_EMAIL}?subject=Director of Grants`}>
                  Email about this role
                </a>
              </div>
            </article>

            <article className="card open">
              <span className="tag">Open role</span>
              <h4>Director of Content</h4>
              <p>
                We need someone to own everything we teach and publish. Writing the blog posts and
                guides, and building the workshop curriculum, so ideas like the self sabotage cycle
                turn into sessions a high school student actually gets something out of. You would
                work with our advisory board on what we teach and with Abhiraaj on what we publish.
              </p>
              <p>
                5-10 hours per week commitment.
              </p>
              <p>
                Send an email to{" "}
                <a className="emailLink" href={`mailto:${CONTACT_EMAIL}?subject=Director of Content`}>
                  {CONTACT_EMAIL}
                </a>{" "}
                and tell us why this problem is interesting to you and why you would be a good fit.
              </p>
              <div className="cardActions">
                <a className="ghost" href={`mailto:${CONTACT_EMAIL}?subject=Director of Content`}>
                  Email about this role
                </a>
              </div>
            </article>

            {/* Spans both columns so the two director roles sit side by side above it. */}
            <article className="card open" style={{ gridColumn: "1 / -1" }}>
              <span className="tag">Forming now</span>
              <h4>Advisory board</h4>
              <p>
                Adults who review our workshop material before it reaches students, and who keep us
                honest about what we claim. Educators, counsellors, coaches, nonprofit people, and
                anyone who has taught teenagers something difficult.
              </p>
              <p>
                It is a light commitment, and it matters a lot to whether a student can trust what we
                teach. Members are listed here once the board is seated.
              </p>
              <div className="cardActions">
                <a className="ghost" href="#advisory">Apply to advise</a>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="band raised" id="advisory">
        <div className="wrap">
          <h2>Join the advisory board.</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            Leave your LinkedIn and a way to reach you. Abhiraaj will set up a short call, and if it
            is a fit we will talk about what reviewing our material actually involves.
          </p>
          <AdvisorForm />
        </div>
      </section>

      <section className="band" id="volunteer">
        <div className="wrap">
          <h2>Volunteer with us.</h2>
          <p className="lede" style={{ marginTop: 24 }}>
            If you want more people to find this, you can just go and do that. We send you our mission
            brief, our brand guidelines and the assets, and then you are free to run with it. Post,
            write, film, talk to clubs, whatever you are good at. The better the work, the more impact
            you have, and there is no ceiling on that.
          </p>

          <div className="grid3">
            <article>
              <h4>What you get</h4>
              <p>
                A written mission brief, brand guidelines, logos and screenshots, and someone to
                answer questions. Plus credit for what you do.
              </p>
            </article>
            <article>
              <h4>What we ask</h4>
              <p>
                Log what you do, be honest in how you describe us, and never make claims about the app
                or the foundation that are not true. We would rather grow slower than mislead someone.
              </p>
            </article>
            <article>
              <h4>About volunteer hours</h4>
              <p>
                We log your hours and sign a letter confirming them. We are seating an advisory board
                with adult members so that sign off comes from an adult rather than another student.
                Schools differ, so check what yours accepts before you count on it.
              </p>
            </article>
          </div>

          <VolunteerForm />
        </div>
      </section>

      <section className="band raised">
        <div className="wrap">
          <h2>The legal and money part.</h2>
          <div className="note" style={{ marginTop: 26 }}>
            <h4>Where we actually are</h4>
            <p>
              We are applying for fiscal sponsorship through {FISCAL.program}. That application is{" "}
              {FISCAL.status}. Once it is approved, The Daydock Foundation operates under{" "}
              {FISCAL.sponsor}, a 501(c)(3) with EIN {FISCAL.ein}, donations become tax deductible,
              and our finances can be made publicly viewable in HCB transparency mode.
            </p>
            <p>
              Until that approval lands, we are not claiming tax deductible status and we are not
              collecting money.
            </p>
            <p>
              <a className="textLink" href="/support">What we are raising for, line by line</a>
            </p>
          </div>

          <div className="actions">
            <a className="primary" href={`mailto:${CONTACT_EMAIL}`}>Email us</a>
            <a className="ghost" href="/support">Fund this work</a>
          </div>
          <p className="micro" style={{ marginTop: 20 }}>
            {CONTACT_EMAIL} reaches Abhiraaj directly. A foundation address is coming with the domain.
          </p>
        </div>
      </section>
    </Shell>
  );
}
