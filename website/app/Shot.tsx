"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

/**
 * A screenshot of the real app.
 *
 * Always full width and always below its own explanation, never beside it, so
 * the text inside the screenshot stays readable. Tapping opens it at full size
 * for anyone on a small screen.
 */
export default function Shot({
  src,
  alt,
  title,
  description,
  caption,
}: {
  src: string;
  alt: string;
  title?: string;
  description?: string;
  caption?: string;
}) {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  return (
    <figure className="shot">
      {title || description ? (
        <div className="shotHead">
          {title ? <h3>{title}</h3> : null}
          {description ? <p>{description}</p> : null}
        </div>
      ) : null}

      <button type="button" className="shotFrame" onClick={() => setOpen(true)} aria-label={`Enlarge: ${alt}`}>
        <img src={src} alt={alt} loading="lazy" />
      </button>

      <p className="shotHint">Tap the screenshot to read it full size</p>
      {caption ? <figcaption className="shotCap">{caption}</figcaption> : null}

      {open ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={alt}
          onClick={close}
        >
          <button type="button" className="lightboxClose" onClick={close} aria-label="Close">
            <X aria-hidden="true" />
          </button>
          <img src={src} alt={alt} />
        </div>
      ) : null}
    </figure>
  );
}
