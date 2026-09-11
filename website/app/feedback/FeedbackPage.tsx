"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PublicFooter, PublicNav } from "../PublicChrome";
import HeroWave from "../HeroWave";
import { parseSurveyCode } from "@/lib/surveyCode";

type FormKind = "testimonial" | "bug" | "feature" | "improvement" | "general";
type DisplayPreference = "anonymous" | "first_name" | "full_name";

const FEEDBACK_KINDS: { id: Exclude<FormKind, "testimonial">; label: string }[] = [
  { id: "bug", label: "Bug" },
  { id: "feature", label: "Feature request" },
  { id: "improvement", label: "Improvement" },
  { id: "general", label: "General" },
];

function initialMode(kind: string | null): "feedback" | "testimonial" {
  return kind === "testimonial" ? "testimonial" : "feedback";
}

export default function FeedbackPage() {
  const params = useSearchParams();
  const [mode, setMode] = useState<"feedback" | "testimonial">(initialMode(params.get("kind")));
  const [kind, setKind] = useState<Exclude<FormKind, "testimonial">>("bug");
  const [code, setCode] = useState(params.get("code") ?? "");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [useCase, setUseCase] = useState("");
  const [problem, setProblem] = useState("");
  const [outcome, setOutcome] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [role, setRole] = useState("");
  const [displayPreference, setDisplayPreference] = useState<DisplayPreference>("first_name");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [quotePermission, setQuotePermission] = useState(false);
  const [followUpPermission, setFollowUpPermission] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const parsed = useMemo(() => (code.trim() ? parseSurveyCode(code) : null), [code]);
  const codeTouched = code.trim().length > 0;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setStatus("saving");
    setError("");
    const payload = {
      website: honeypot,
      kind: mode === "testimonial" ? "testimonial" : kind,
      title: title.trim() || undefined,
      message: message.trim() || undefined,
      useCase: useCase.trim() || undefined,
      problem: problem.trim() || undefined,
      outcome: outcome.trim() || undefined,
      recommendation: recommendation.trim() || undefined,
      displayPreference: mode === "testimonial" ? displayPreference : undefined,
      displayName: displayPreference === "anonymous" ? undefined : displayName.trim() || undefined,
      role: role.trim() || undefined,
      email: email.trim() || undefined,
      quotePermission: mode === "testimonial" && quotePermission,
      followUpPermission,
      verified: Boolean(parsed),
      platform: parsed?.platform,
      appVersion: parsed?.appVersion,
      verificationGeneratedAt: parsed?.generatedAt,
      verificationAlgorithmVersion: parsed?.algorithmVersion,
    };
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "We could not save that right now.");
      setStatus("saved");
    } catch (caught) {
      setStatus("error");
      setError(caught instanceof Error ? caught.message : "We could not save that right now.");
    }
  };

  return (
    <main className="subpage">
      <PublicNav />
      <section className="formHero">
        <HeroWave variant="feedback" />
        <p className="eyebrow"><span /> From people using Daydock</p>
        <h1>{mode === "testimonial" ? "Share your Daydock story." : "Help make Daydock better."}</h1>
        <p className="lede">
          Reports stay private unless you give permission to quote them. A Daydock code only means the form was opened from an installed copy, not how often you use it.
        </p>
      </section>

      <form className="feedbackForm" onSubmit={(event) => void submit(event)}>
        <div className="modeSwitch" role="tablist" aria-label="Submission type">
          <button type="button" role="tab" aria-selected={mode === "feedback"} className={mode === "feedback" ? "active" : ""} onClick={() => setMode("feedback")}>Feedback</button>
          <button type="button" role="tab" aria-selected={mode === "testimonial"} className={mode === "testimonial" ? "active" : ""} onClick={() => setMode("testimonial")}>Testimonial</button>
        </div>

        <label htmlFor="survey-code">Daydock code <span>(optional)</span></label>
        <input
          id="survey-code"
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="XXXX-XXXX-XXXX-XXXX-XX"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
        />
        {parsed && (
          <p className="formHint ok">
            Submitted with a valid Daydock code · {parsed.platform} · v{parsed.appVersion}
          </p>
        )}
        {codeTouched && !parsed && <p className="formHint warn">That code is not valid or has expired. You can still send this as an unverified web submission.</p>}
        {!codeTouched && <p className="formHint">In Daydock, press Ctrl+Shift+F (Cmd+Shift+F on Mac) to generate a code. Skip this if the app would not open.</p>}

        <label className="honeypot" htmlFor="website">Website</label>
        <input id="website" className="honeypot" value={honeypot} onChange={(event) => setHoneypot(event.target.value)} tabIndex={-1} autoComplete="off" />

        {mode === "feedback" ? (
          <>
            <label htmlFor="feedback-kind">Type</label>
            <select id="feedback-kind" value={kind} onChange={(event) => setKind(event.target.value as Exclude<FormKind, "testimonial">)}>
              {FEEDBACK_KINDS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <label htmlFor="feedback-title">Title</label>
            <input id="feedback-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Short summary" maxLength={160} />
            <label htmlFor="feedback-message">What happened, or what would help?</label>
            <textarea id="feedback-message" value={message} onChange={(event) => setMessage(event.target.value)} required rows={7} maxLength={5000} />
          </>
        ) : (
          <>
            <label htmlFor="use-case">How do you use Daydock?</label>
            <textarea id="use-case" value={useCase} onChange={(event) => setUseCase(event.target.value)} rows={3} maxLength={2000} />
            <label htmlFor="problem">What problem were you trying to solve?</label>
            <textarea id="problem" value={problem} onChange={(event) => setProblem(event.target.value)} rows={3} maxLength={2000} />
            <label htmlFor="outcome">What changed after using it?</label>
            <textarea id="outcome" value={outcome} onChange={(event) => setOutcome(event.target.value)} rows={3} maxLength={2000} />
            <label htmlFor="recommendation">What would you tell someone considering it?</label>
            <textarea id="recommendation" value={recommendation} onChange={(event) => setRecommendation(event.target.value)} rows={3} maxLength={2000} />
            <label htmlFor="role">Role or organization type <span>(optional)</span></label>
            <input id="role" value={role} onChange={(event) => setRole(event.target.value)} placeholder="Student, researcher, nonprofit staff…" maxLength={160} />
            <label htmlFor="display-preference">How should we name you if this is quoted?</label>
            <select id="display-preference" value={displayPreference} onChange={(event) => setDisplayPreference(event.target.value as DisplayPreference)}>
              <option value="anonymous">Anonymous</option>
              <option value="first_name">First name</option>
              <option value="full_name">Full name</option>
            </select>
            {displayPreference !== "anonymous" && (
              <>
                <label htmlFor="display-name">{displayPreference === "first_name" ? "First name" : "Name"}</label>
                <input id="display-name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} maxLength={120} />
              </>
            )}
            <label className="checkLabel">
              <input type="checkbox" checked={quotePermission} onChange={(event) => setQuotePermission(event.target.checked)} />
              You may quote this on the website and in grant applications.
            </label>
          </>
        )}

        <label htmlFor="email">Email <span>(optional, for follow-up only)</span></label>
        <input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={320} />
        <label className="checkLabel">
          <input type="checkbox" checked={followUpPermission} onChange={(event) => setFollowUpPermission(event.target.checked)} />
          It’s okay to follow up if I included an email.
        </label>

        {status === "saved" ? (
          <p className="formSuccess">Thank you. This stays private unless you gave permission to quote it.</p>
        ) : (
          <div className="formActions">
            <button className="primary" type="submit" disabled={status === "saving"}>
              {status === "saving" ? "Sending…" : mode === "testimonial" ? "Send story" : "Send feedback"}
            </button>
            <a className="textLink" href="https://github.com/AbhiraajKonduru/daydock/issues" target="_blank" rel="noreferrer">Open a GitHub issue instead</a>
          </div>
        )}
        {error && <p className="formHint warn">{error}</p>}
      </form>
      <PublicFooter />
    </main>
  );
}
