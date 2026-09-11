import { Suspense } from "react";
import FeedbackPage from "./FeedbackPage";

export default function Page() {
  return (
    <Suspense fallback={<main className="subpage"><p className="formLoading">Loading the feedback form…</p></main>}>
      <FeedbackPage />
    </Suspense>
  );
}
