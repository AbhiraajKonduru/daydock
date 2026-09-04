import { ArrowRight, ArrowUpRight, BookOpen, CalendarDays, Check, Download, Search, Sparkles } from "lucide-react";
import NoticeBanner from "./NoticeBanner";

const downloads = [
  { label: "Windows", detail: ".exe", href: "https://github.com/AbhiraajKonduru/daydock/releases/download/v0.2/Daydock_0.2.0_x64-setup.exe" },
  { label: "macOS", detail: "Universal .dmg", href: "https://github.com/AbhiraajKonduru/daydock/releases/download/v0.2/Daydock_0.2.0_universal.dmg" },
  { label: "Linux", detail: "AppImage", href: "https://github.com/AbhiraajKonduru/daydock/releases/download/v0.2/Daydock_0.2.0_amd64.AppImage" },
];

function Mark() { return <span className="mark" aria-hidden="true"><i /><i /><i /></span>; }
function Arrow() { return <ArrowUpRight className="linkIcon" aria-hidden="true" />; }

export default function Home() {
  return (
    <main>
      <NoticeBanner />
      <nav className="nav" aria-label="Primary navigation">
        <a className="wordmark" href="#top"><Mark /><span>Daydock</span></a>
        <div className="navLinks"><span className="version">v0.2 · prerelease</span><a href="https://github.com/AbhiraajKonduru/daydock" target="_blank" rel="noreferrer">GitHub <Arrow /></a></div>
      </nav>

      <section className="hero" id="top">
        <div className="heroCopy">
          <p className="eyebrow"><span /> A quieter way to get things done</p>
          <h1>Your day,<br /><em>without the machinery.</em></h1>
          <p className="lede">Turn weekly direction into focused daily action. Daydock keeps your plans, notes, and reusable documents in plain Markdown—right where they belong: with you.</p>
          <div className="actions"><a className="primary" href="#download">Download Daydock <Download aria-hidden="true" /></a><a className="textLink" href="https://github.com/AbhiraajKonduru/daydock" target="_blank" rel="noreferrer">View the source <Arrow /></a></div>
          <p className="micro">Free &amp; open source · No account · No required cloud</p>
        </div>

        <div className="notebook" aria-label="An abstract preview of a Daydock daily page">
          <aside className="rail">
            <div className="railBrand"><Mark /> <b>Daydock</b></div>
            <div className="navItem active"><Sparkles /> Today <kbd>ALT T</kbd></div>
            <div className="navItem"><CalendarDays /> Yesterday <kbd>ALT Y</kbd></div>
            <div className="navItem"><CalendarDays /> Tomorrow <kbd>ALT O</kbd></div>
            <div className="navItem"><BookOpen /> Last week <kbd>ALT L</kbd></div>
            <div className="navItem"><BookOpen /> This week <kbd>ALT W</kbd></div>
            <div className="navItem"><BookOpen /> Next week <kbd>ALT N</kbd></div>
            <div className="navItem"><Search /> Search <kbd>CTRL K</kbd></div>
            <small>RECENT DAYS</small><div className="navItem quiet">Wednesday, Aug 27</div><div className="navItem quiet">Tuesday, Aug 26</div>
            <small>DOCUMENTS</small><div className="navItem quiet">Morning protocol</div>
          </aside>
          <article className="page"><div className="pageTop"><span>Today · Daily/2026-08-28.md</span><span className="saved">Saved</span><b>Plan</b></div><div className="paper"><p className="date">FRIDAY · AUGUST 28</p><h2>Today</h2><h3>Win</h3><p className="task"><i className="checked"><Check /></i> Ship a small, complete version</p><h3>Tasks</h3><p className="task"><i /> Review the week</p><p className="task"><i /> Write the next clear step</p><h3>Limits</h3><p className="note">Do fewer things. Give them your full attention.</p><h3>Notes</h3><h3>Journal</h3></div></article>
          <div className="cornerNote">Everything here is<br /><strong>just Markdown.</strong><span /></div>
        </div>
      </section>

      <section className="principle"><p>Most productivity systems become another thing to maintain.</p><h2>Daydock stays close to the present.</h2><div className="loop" aria-label="The Daydock workflow"><span><b>01</b> Anchor the week</span><ArrowRight className="flowArrow" aria-hidden="true" /><span><b>02</b> Choose today’s win</span><ArrowRight className="flowArrow" aria-hidden="true" /><span><b>03</b> Work &amp; adapt</span></div></section>

      <section className="details">
        <div className="detailIntro"><p className="eyebrow"><span /> Built for ownership</p><h2>A notebook,<br />not a platform.</h2></div>
        <div className="features"><article><span>01</span><h3>Plain Markdown</h3><p>Daily pages, weekly plans, and documents are normal files in a folder you choose.</p></article><article><span>02</span><h3>Local first</h3><p>No account, proprietary format, or cloud dependency between you and your work.</p></article><article><span>03</span><h3>Weekly → daily</h3><p>Hold the week in view, then make one realistic day at a time.</p></article><article><span>04</span><h3>Optional sync</h3><p>Use your existing Git and GitHub setup when you want your notebook elsewhere.</p></article></div>
      </section>

      <section className="download" id="download"><div><p className="eyebrow light"><span /> Version 0.2 prerelease</p><h2>Make today<br />a little clearer.</h2><p>Early, useful, and already used daily by its creator. Builds are unsigned, so your operating system may show a warning.</p></div><div className="downloadList">{downloads.map((item) => <a key={item.label} href={item.href}><span><b>{item.label}</b><small>{item.detail}</small></span><Download aria-hidden="true" /> </a>)}<a className="allReleases" href="https://github.com/AbhiraajKonduru/daydock/releases/tag/v0.2" target="_blank" rel="noreferrer"><span><b>All release files</b><small>Checksums &amp; source archives</small></span><Arrow /></a></div></section>

      <footer><a className="wordmark" href="#top"><Mark /><span>Daydock</span></a><p>Open source under GPL-3.0</p><a href="https://github.com/AbhiraajKonduru/daydock" target="_blank" rel="noreferrer">GitHub <Arrow /></a></footer>
    </main>
  );
}
