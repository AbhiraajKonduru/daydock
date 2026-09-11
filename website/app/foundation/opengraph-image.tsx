import { ogCard, size, contentType } from "../ogCard";

export const alt = "The Daydock Foundation";
export { size, contentType };

export default async function Image() {
  return ogCard({
    title: "Free tools and free teaching.",
    kicker: "A student led nonprofit,",
    highlight: "for people who keep falling off.",
  });
}
