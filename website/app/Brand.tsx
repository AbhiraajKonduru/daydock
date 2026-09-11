/**
 * The Daydock mark.
 *
 * A dock: one horizontal platform with today's block resting on it, and a
 * lighter block waiting its turn. One day at a time, sitting on something solid.
 */
export function Mark({ className = "mark" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" role="img" aria-label="Daydock" focusable="false">
      <rect width="32" height="32" rx="8" fill="var(--accent)" />
      <rect x="6.5" y="20.6" width="19" height="2.6" rx="1.3" fill="#fff6ee" />
      <rect x="6.5" y="10.4" width="8.4" height="8.4" rx="2.2" fill="#fff6ee" />
      <rect x="17.4" y="13.9" width="4.9" height="4.9" rx="1.6" fill="#fff6ee" opacity="0.45" />
    </svg>
  );
}

export function Wordmark({ href = "/" }: { href?: string }) {
  return (
    <a className="wordmark" href={href}>
      <Mark />
      <span>Daydock</span>
    </a>
  );
}
