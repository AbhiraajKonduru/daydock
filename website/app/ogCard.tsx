import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (weight: string) =>
  readFile(
    path.join(process.cwd(), "node_modules", "@fontsource", "dm-sans", "files", `dm-sans-latin-${weight}-normal.woff`),
  );

/**
 * The shared link preview card. Every page renders one at build time with its
 * own headline, so pasting any page into a chat shows what that page is about
 * rather than the homepage.
 */
export async function ogCard({
  title,
  kicker,
  highlight,
}: {
  title: string;
  kicker: string;
  highlight?: string;
}) {
  const [bold, regular] = await Promise.all([font("700"), font("400")]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0c0b0a",
          padding: "72px 76px",
          fontFamily: "DM Sans",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <svg width="54" height="54" viewBox="0 0 32 32">
            <rect width="32" height="32" rx="8" fill="#e8763f" />
            <rect x="6.5" y="20.6" width="19" height="2.6" rx="1.3" fill="#fff6ee" />
            <rect x="6.5" y="10.4" width="8.4" height="8.4" rx="2.2" fill="#fff6ee" />
            <rect x="17.4" y="13.9" width="4.9" height="4.9" rx="1.6" fill="#fff6ee" opacity="0.45" />
          </svg>
          <span style={{ fontSize: 36, fontWeight: 700, color: "#f0ebe2", letterSpacing: "-0.04em" }}>
            Daydock
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: title.length > 46 ? 64 : 78,
              fontWeight: 700,
              color: "#f0ebe2",
              letterSpacing: "-0.045em",
              lineHeight: 1.04,
              maxWidth: 980,
            }}
          >
            {title}
          </span>
          <span
            style={{
              marginTop: 30,
              fontSize: 29,
              color: "#b8b2a7",
              letterSpacing: "-0.01em",
              maxWidth: 960,
              display: "flex",
              flexWrap: "wrap",
            }}
          >
            {kicker}
            {highlight ? <span style={{ color: "#e8763f", marginLeft: 10 }}>{highlight}</span> : null}
          </span>
        </div>

        <span style={{ fontSize: 22, color: "#857f75" }}>
          The Daydock Foundation · Free and open source
        </span>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "DM Sans", data: bold, weight: 700, style: "normal" },
        { name: "DM Sans", data: regular, weight: 400, style: "normal" },
      ],
    },
  );
}
