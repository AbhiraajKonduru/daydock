import { ogCard, size, contentType } from "../ogCard";

export const alt = "Support The Daydock Foundation";
export { size, contentType };

export default async function Image() {
  return ogCard({
    title: "We are raising $20,000 in our first year.",
    kicker: "Every line published, every dollar accounted for.",
  });
}
