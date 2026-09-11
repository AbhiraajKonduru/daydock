import DownloadPage from "./DownloadPage";
import { pageMeta } from "../meta";

export const metadata = pageMeta({
  path: "/download",
  title: "Download Daydock",
  shareTitle: "Download Daydock, free for Windows, macOS and Linux",
  description:
    "Free and open source. Plain Markdown in a folder you own, no account and no subscription, plus clear instructions for opening an unsigned build.",
});

export default function Page() {
  return <DownloadPage />;
}
