import { ogCard, size, contentType } from "../ogCard";

export const alt = "Send Daydock feedback";
export { size, contentType };

export default async function Image() {
  return ogCard({
    title: "Tell us what is broken.",
    kicker: "Bugs, feature requests,",
    highlight: "or what actually changed for you.",
  });
}
