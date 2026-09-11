"use client";

import { useEffect, useState } from "react";
import { ArrowDown, ArrowUpRight, Download } from "lucide-react";
import { Shell } from "../PublicChrome";
import HeroWave from "../HeroWave";
import { GITHUB_URL } from "../site";

type DownloadManifest = {
  version: string;
  releasePage: string;
  downloads: { windows: string; macos: string; linux: string };
};

const fallbackManifest: DownloadManifest = {
  version: "0.2.0",
  releasePage: `${GITHUB_URL}/releases/tag/v0.2`,
  downloads: {
    windows: `${GITHUB_URL}/releases/download/v0.2/Daydock_0.2.0_x64-setup.exe`,
    macos: `${GITHUB_URL}/releases/download/v0.2/Daydock_0.2.0_universal.dmg`,
    linux: `${GITHUB_URL}/releases/download/v0.2/Daydock_0.2.0_amd64.AppImage`,
  },
};

const PLATFORMS = [
  { label: "Windows", detail: "Installer, .exe", platform: "windows" as const },
  { label: "macOS", detail: "Universal .dmg, Apple silicon and Intel", platform: "macos" as const },
  { label: "Linux", detail: "AppImage, x86_64", platform: "linux" as const },
];

export default function DownloadPage() {
  const [manifest, setManifest] = useState(fallbackManifest);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/downloads", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Download manifest returned ${response.status}`);
        return response.json() as Promise<DownloadManifest>;
      })
      .then(setManifest)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          console.warn("Using fallback Daydock downloads", error);
        }
      });
    return () => controller.abort();
  }, []);

  const version = manifest.version.replace(/^v/, "");

  return (
    <Shell current="/download">
      <section className="pageHead">
        <HeroWave variant="download" />
        <div className="wrap">
          <p className="eyebrow"><span /> Version {version} beta</p>
          <h1>Download Daydock.</h1>
          <p className="lede">
            Free, open source, and yours. No account, no subscription, no cloud in the middle. Your
            notebook is a folder of Markdown files on your own computer.
          </p>

          <div className="note">
            <h4>Scroll down before you download</h4>
            <p>
              Windows and macOS will show a security warning the first time you open Daydock. What
              that warning means and how to get past it is just below, and the download links are
              right after it.
            </p>
          </div>

          <div className="actions">
            <a className="primary" href="#unsigned">
              How to open it <ArrowDown aria-hidden="true" />
            </a>
            <a className="ghost" href="#downloads">Skip to the downloads</a>
          </div>
        </div>
      </section>

      <section className="band" id="unsigned">
        <div className="wrap">
          <h2>Your computer will warn you. Here is why.</h2>
          <div className="note" style={{ marginTop: 26 }}>
            <h4>Read this before you install</h4>
            <p>
              Daydock is not code signed yet. Signing certificates cost real money every year, and we
              have not raised it.
            </p>
            <p>
              Unsigned does not mean unsafe, but you should not take our word for it. The full source
              is on GitHub, every release is built in public, and you can check the file yourself
              before you run it. If any of that is not enough for you, do not install it. That is a
              reasonable call.
            </p>
            <p>
              <a className="textLink" href="/support">
                Help us get builds signed <ArrowUpRight className="linkIcon" aria-hidden="true" />
              </a>
            </p>
          </div>

          <div className="trust">
            <div className="trustCard">
              <h4>Opening Daydock on Windows</h4>
              <p className="why">
                Windows SmartScreen shows a blue box because it does not recognise the publisher yet.
              </p>
              <ol>
                <li>Run the installer you downloaded.</li>
                <li>On the blue Windows protected your PC screen, select <strong>More info</strong>.</li>
                <li>Select <strong>Run anyway</strong>.</li>
                <li>Finish the installer as normal.</li>
              </ol>
            </div>

            <div className="trustCard">
              <h4>Opening Daydock on macOS</h4>
              <p className="why">
                macOS blocks unsigned apps on first launch. The right click trick no longer works on
                recent versions, so use Settings instead.
              </p>
              <ol>
                <li>Open the .dmg and drag Daydock into <strong>Applications</strong>.</li>
                <li>Double click Daydock once. You will get a warning. Select <strong>Done</strong> or <strong>Cancel</strong>.</li>
                <li>Open <strong>System Settings</strong>, then <strong>Privacy and Security</strong>.</li>
                <li>Scroll to <strong>Security</strong>. You will see a line saying Daydock was blocked.</li>
                <li>Select <strong>Open Anyway</strong>, then confirm with your password or Touch ID.</li>
              </ol>
            </div>

            <div className="trustCard">
              <h4>Running Daydock on Linux</h4>
              <p className="why">AppImages need to be marked executable before they will run.</p>
              <ol>
                <li>Download the AppImage.</li>
                <li>Right click it, open <strong>Properties</strong>, and allow executing as a program. Or run <span className="inlineCode">chmod +x</span> on it.</li>
                <li>Double click to launch.</li>
              </ol>
            </div>

            <div className="trustCard">
              <h4>Updates after that</h4>
              <p className="why">You only have to do the trust step once.</p>
              <ol>
                <li>Daydock checks for updates in the app.</li>
                <li>Updates are signed with our own update key, so later versions install without the warnings above.</li>
                <li>You can always download manually from this page instead.</li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      <section className="band raised" id="downloads">
        <div className="wrap">
          <h2>Now pick your download.</h2>
          <div className="dlList">
            {PLATFORMS.map((item) => (
              <a key={item.platform} href={`/api/download?platform=${item.platform}`}>
                <span>
                  <b>{item.label}</b>
                  <small>{item.detail}</small>
                </span>
                <Download aria-hidden="true" />
              </a>
            ))}
            <a href={manifest.releasePage} target="_blank" rel="noreferrer">
              <span>
                <b>All release files</b>
                <small>Checksums and source archives</small>
              </span>
              <ArrowUpRight aria-hidden="true" />
            </a>
          </div>

          <div className="note">
            <h4>It is a beta, and we mean it</h4>
            <p>
              Version {version} is a prerelease. It is used every day by the person who built it, but
              expect rough edges. Your notebook is plain Markdown in a folder you chose, so back that
              folder up the way you would back up anything else, and tell us when something breaks.
            </p>
            <p>
              <a className="textLink" href="/feedback">Report a bug or ask for a feature</a>
            </p>
          </div>

          <div className="actions">
            <a className="ghost" href="/guide">How to use it once it is installed</a>
            <a className="textLink" href={GITHUB_URL} target="_blank" rel="noreferrer">
              Read the source <ArrowUpRight className="linkIcon" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>
    </Shell>
  );
}
