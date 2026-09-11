import type { Metadata } from "next";
import { SITE_URL } from "./site";

/**
 * Per page metadata. Next does not copy `title` and `description` into
 * Open Graph automatically, so without this every page would share the
 * homepage preview card when it is pasted into a chat.
 */
export function pageMeta({
  title,
  description,
  path,
  shareTitle,
}: {
  title: string;
  description: string;
  path: string;
  /** Optional punchier title for link previews, where there is no template suffix. */
  shareTitle?: string;
}): Metadata {
  const social = shareTitle ?? `${title} | Daydock`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: social,
      description,
      url: path,
      siteName: "The Daydock Foundation",
      type: "website",
    },
    twitter: { card: "summary_large_image", title: social, description },
  };
}

export const canonical = (path: string) => new URL(path, SITE_URL).toString();
