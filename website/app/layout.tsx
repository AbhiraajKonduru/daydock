import type { Metadata } from "next";
import "@fontsource/dm-mono/400.css";
import "@fontsource/dm-mono/500.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/merriweather/400.css";
import "@fontsource/merriweather/400-italic.css";
import "./globals.css";
import VisitTracker from "./VisitTracker";
import { CONTACT_EMAIL, GITHUB_URL, SITE_URL } from "./site";

const title = "Daydock";
const tagline = "Ambition without execution is just a desire";
const description =
  "You have tried Google Calendar, a paper planner, Todoist. Every time you start, you stop. Daydock is a free, local first daily page for ambitious students, because the app was never the problem.";

export const metadata: Metadata = {
  title: { default: `${title}: ${tagline}`, template: `%s | ${title}` },
  description,
  applicationName: title,
  metadataBase: new URL(
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : SITE_URL,
  ),
  alternates: { canonical: "/" },
  icons: { icon: "/favicon.svg" },
  keywords: [
    "Daydock",
    "productivity app for students",
    "markdown daily planner",
    "local first productivity",
    "open source planner",
    "The Daydock Foundation",
  ],
  openGraph: {
    title: `${title}: ${tagline}`,
    description,
    url: "/",
    type: "website",
    siteName: "The Daydock Foundation",
  },
  twitter: {
    card: "summary_large_image",
    title: `${title}: ${tagline}`,
    description,
  },
};

/**
 * Structured data. Tells search engines that Daydock is a free application made
 * by a named nonprofit, and hands them the site structure they use when deciding
 * whether to show sub links underneath a result.
 */
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: "The Daydock Foundation",
      url: SITE_URL,
      email: CONTACT_EMAIL,
      logo: `${SITE_URL}/favicon.svg`,
      description:
        "A student led nonprofit building free tools and free teaching for people who keep falling off their own plans.",
      sameAs: [GITHUB_URL],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: "Daydock",
      description,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SoftwareApplication",
      name: "Daydock",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Windows, macOS, Linux",
      url: `${SITE_URL}/download`,
      description:
        "A free, open source daily and weekly planner that stores everything as plain Markdown files on your own computer. No account, no subscription, no streaks.",
      isAccessibleForFree: true,
      license: "https://www.gnu.org/licenses/gpl-3.0.html",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "SiteNavigationElement",
      name: ["Download", "Why we built it", "How to use it", "Roadmap", "Foundation", "Support us"],
      url: [
        `${SITE_URL}/download`,
        `${SITE_URL}/why`,
        `${SITE_URL}/guide`,
        `${SITE_URL}/roadmap`,
        `${SITE_URL}/foundation`,
        `${SITE_URL}/support`,
      ],
    },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}
