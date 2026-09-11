"use client";

import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { Mark, Wordmark } from "./Brand";
import { CONTACT_EMAIL, GITHUB_URL } from "./site";

const LINKS = [
  { href: "/why", label: "Why" },
  { href: "/guide", label: "How to use it" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/foundation", label: "Foundation" },
  { href: "/support", label: "Support us" },
];

function Arrow() {
  return <ArrowUpRight className="linkIcon" aria-hidden="true" />;
}

export function PublicNav({ current }: { current?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="nav">
      <div className="navInner">
        <Wordmark />
        <nav className="navLinks" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} className={current === link.href ? "on" : undefined}>
              {link.label}
            </a>
          ))}
          <a className="navCta" href="/download">Download</a>
        </nav>
        <button
          type="button"
          className="navToggle"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
      {open ? (
        <nav className="mobileMenu" aria-label="Primary">
          {LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>{link.label}</a>
          ))}
          <a href="/download" onClick={() => setOpen(false)}>Download</a>
        </nav>
      ) : null}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="site">
      <div className="footInner">
        <div>
          <Wordmark />
          <p className="footNote">
            Daydock is built by The Daydock Foundation, a student led nonprofit project working on
            free tools and free teaching for people who keep falling off their own plans.
          </p>
        </div>
        <div>
          <h4>The app</h4>
          <ul>
            <li><a href="/download">Download</a></li>
            <li><a href="/guide">How to use it</a></li>
            <li><a href="/roadmap">Roadmap</a></li>
            <li><a href="/feedback">Send feedback</a></li>
            <li><a href={GITHUB_URL} target="_blank" rel="noreferrer">Source on GitHub <Arrow /></a></li>
          </ul>
        </div>
        <div>
          <h4>The foundation</h4>
          <ul>
            <li><a href="/why">Why we built it</a></li>
            <li><a href="/foundation">Team and roles</a></li>
            <li><a href="/foundation#volunteer">Volunteer with us</a></li>
            <li><a href="/support">Grants and donations</a></li>
            <li><a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></li>
          </ul>
        </div>
      </div>
      <div className="footBase">
        <span>The Daydock Foundation</span>
        <span>App source under GPL-3.0</span>
        <span>Fiscal sponsorship through Hack Club HCB, application in progress</span>
      </div>
    </footer>
  );
}

export function Shell({
  children,
  current,
}: {
  children: React.ReactNode;
  current?: string;
}) {
  return (
    <>
      <PublicNav current={current} />
      <main>{children}</main>
      <PublicFooter />
    </>
  );
}

export { Mark };
