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

export const metadata: Metadata = {
  title: "Daydock — Your day, without the machinery",
  description: "A local-first productivity system for turning weekly direction into focused daily action. Plain Markdown, no account, no required cloud.",
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  openGraph: { title: "Daydock — Your day, without the machinery", description: "A quiet, local-first productivity system built on plain Markdown.", type: "website", images: ["/og.png"] },
  twitter: { card: "summary_large_image", title: "Daydock — Your day, without the machinery", description: "A quiet, local-first productivity system built on plain Markdown.", images: ["/og.png"] },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
