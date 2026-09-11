import { ogCard, size, contentType } from "../ogCard";

export const alt = "The Daydock roadmap";
export { size, contentType };

export default async function Image() {
  return ogCard({
    title: "What we are building, and what we never will.",
    kicker: "Signed builds, plugins, a mobile app.",
    highlight: "And a list of things we refuse to add.",
  });
}
