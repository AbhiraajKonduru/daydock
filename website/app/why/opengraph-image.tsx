import { ogCard, size, contentType } from "../ogCard";

export const alt = "Why we built Daydock: the tool was never the problem";
export { size, contentType };

export default async function Image() {
  return ogCard({
    title: "The tool was never the problem.",
    kicker: "Calendars, planners, Todoist.",
    highlight: "None of them fix the actual loop.",
  });
}
