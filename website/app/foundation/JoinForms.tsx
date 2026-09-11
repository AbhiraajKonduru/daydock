"use client";

import { useState } from "react";

type Kind = "advisor" | "volunteer";

function useSubmitter(kind: Kind) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");

  const send = async (payload: Record<string, unknown>) => {
    setStatus("saving");
    setError("");
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, kind }),
      });
      const body = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(body.error || "We could not save that right now.");
      setStatus("saved");
    } catch (cause) {
      setStatus("error");
      setError(cause instanceof Error ? cause.message : "Something went wrong.");
    }
  };

  return { status, error, send };
}

export function AdvisorForm() {
  const { status, error, send } = useSubmitter("advisor");
  const [displayName, setName] = useState("");
  const [linkedinUrl, setLinkedin] = useState("");
  const [email, setEmail] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  if (status === "saved") {
    return (
      <div className="formCard">
        <p className="formSuccess">Thank you. We have your details.</p>
        <p className="formHint">
          Abhiraaj will reach out to set up a short call. If it is a fit, we will talk about what
          reviewing our workshop material would actually involve.
        </p>
      </div>
    );
  }

  return (
    <div className="formCard">
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void send({
            website: honeypot,
            displayName: displayName.trim(),
            linkedinUrl: linkedinUrl.trim(),
            email: email.trim(),
            contact: contact.trim(),
            message: message.trim(),
            followUpPermission: true,
          });
        }}
      >
        <input
          className="honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />

        <label htmlFor="advisor-name">Your name</label>
        <input id="advisor-name" required value={displayName} onChange={(event) => setName(event.target.value)} />

        <label htmlFor="advisor-linkedin">LinkedIn profile</label>
        <input
          id="advisor-linkedin"
          required
          type="url"
          placeholder="https://www.linkedin.com/in/..."
          value={linkedinUrl}
          onChange={(event) => setLinkedin(event.target.value)}
        />

        <label htmlFor="advisor-email">Email</label>
        <input id="advisor-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />

        <label htmlFor="advisor-phone">Phone <span>optional</span></label>
        <input id="advisor-phone" value={contact} onChange={(event) => setContact(event.target.value)} />

        <label htmlFor="advisor-message">What draws you to this <span>optional</span></label>
        <textarea
          id="advisor-message"
          value={message}
          placeholder="Anything you want us to know before the call."
          onChange={(event) => setMessage(event.target.value)}
        />

        <div className="formActions">
          <button className="primary" type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Sending" : "Apply to advise"}
          </button>
          {status === "error" ? <p className="formHint warn">{error}</p> : null}
        </div>
        <p className="formHint">
          We only use this to get in touch about the advisory board. Nothing is published without
          asking you first.
        </p>
      </form>
    </div>
  );
}

export function VolunteerForm() {
  const { status, error, send } = useSubmitter("volunteer");
  const [displayName, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("Social media and content");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");

  if (status === "saved") {
    return (
      <div className="formCard">
        <p className="formSuccess">Got it. Welcome.</p>
        <p className="formHint">
          We will email you the mission brief, the brand guidelines and the assets, plus how hours are
          logged and signed off.
        </p>
      </div>
    );
  }

  return (
    <div className="formCard">
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault();
          void send({
            website: honeypot,
            displayName: displayName.trim(),
            email: email.trim(),
            role,
            message: message.trim(),
            followUpPermission: true,
          });
        }}
      >
        <input
          className="honeypot"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />

        <label htmlFor="vol-name">Your name</label>
        <input id="vol-name" required value={displayName} onChange={(event) => setName(event.target.value)} />

        <label htmlFor="vol-email">Email</label>
        <input id="vol-email" required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />

        <label htmlFor="vol-role">What you want to work on</label>
        <select id="vol-role" value={role} onChange={(event) => setRole(event.target.value)}>
          <option>Social media and content</option>
          <option>Outreach to schools and clubs</option>
          <option>Design and video</option>
          <option>Writing and guides</option>
          <option>Community and support</option>
          <option>Something else</option>
        </select>

        <label htmlFor="vol-message">Anything you want to tell us <span>optional</span></label>
        <textarea
          id="vol-message"
          value={message}
          placeholder="What you would try first, or what you are good at."
          onChange={(event) => setMessage(event.target.value)}
        />

        <div className="formActions">
          <button className="primary" type="submit" disabled={status === "saving"}>
            {status === "saving" ? "Sending" : "Count me in"}
          </button>
          {status === "error" ? <p className="formHint warn">{error}</p> : null}
        </div>
        <p className="formHint">
          No commitment and no minimum. You can stop whenever you want.
        </p>
      </form>
    </div>
  );
}
