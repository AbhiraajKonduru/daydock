import { pageMeta } from "../meta";

export const metadata = pageMeta({
  path: "/feedback",
  title: "Feedback",
  shareTitle: "Tell the Daydock team what is broken",
  description: "Send Daydock feedback, report an issue, or share how the app has helped you.",
});

export default function FeedbackLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
