import { ogCard, size, contentType } from "../ogCard";

export const alt = "How to use Daydock";
export { size, contentType };

export default async function Image() {
  return ogCard({
    title: "Five sections, and none of them are rules.",
    kicker: "Win, Tasks, Limits, Notes, Journal.",
    highlight: "What each one is actually for.",
  });
}
