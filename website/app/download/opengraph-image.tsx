import { ogCard, size, contentType } from "../ogCard";

export const alt = "Download Daydock, free for Windows, macOS and Linux";
export { size, contentType };

export default async function Image() {
  return ogCard({
    title: "Download Daydock, free.",
    kicker: "Windows, macOS and Linux.",
    highlight: "Plain Markdown, no account.",
  });
}
