import { ogCard, size, contentType } from "./ogCard";

export const alt = "Daydock: Ambition without execution is just a desire";
export { size, contentType };

export default async function Image() {
  return ogCard({
    title: "Ambition without execution is just a desire.",
    kicker: "Every time you start, you stop.",
    highlight: "The app was never the problem.",
  });
}
