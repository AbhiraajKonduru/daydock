"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The signature graphic: progress you make, then progress you undo, over and
 * over, ending the year at roughly zero. It draws itself as the section moves
 * through the viewport. Without JavaScript or with reduced motion it simply
 * renders complete, which is still the whole argument.
 */

const SEGMENTS: { d: string; kind: "gain" | "loss" }[] = [
  { kind: "gain", d: "M60,250 C110,240 150,180 200,130" },
  { kind: "loss", d: "M200,130 C230,128 250,200 285,248" },
  { kind: "gain", d: "M285,248 C340,240 390,150 450,105" },
  { kind: "loss", d: "M450,105 C480,103 500,190 535,249" },
  { kind: "gain", d: "M535,249 C590,240 640,160 700,118" },
  { kind: "loss", d: "M700,118 C730,116 750,195 785,250" },
  { kind: "gain", d: "M785,250 C830,242 870,190 920,155" },
  { kind: "loss", d: "M920,155 C940,153 950,210 965,250" },
];

const CAPTIONS = [
  "Two good weeks. You are locked in.",
  "Then one bad day.",
  "Then a bad week, and starting again feels worse than not starting.",
  "So you find a different app and it happens again.",
  "A year later you are about where you started.",
];

export default function CycleChart() {
  const box = useRef<HTMLDivElement>(null);
  const paths = useRef<(SVGPathElement | null)[]>([]);
  const [stage, setStage] = useState(CAPTIONS.length - 1);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const nodes = paths.current.filter(Boolean) as SVGPathElement[];
    if (!nodes.length) return;

    const lengths = nodes.map((node) => node.getTotalLength());
    const total = lengths.reduce((sum, value) => sum + value, 0);
    nodes.forEach((node, index) => {
      node.style.strokeDasharray = `${lengths[index]}`;
      node.style.strokeDashoffset = `${lengths[index]}`;
    });
    setStage(0);

    let frame = 0;
    const draw = () => {
      frame = 0;
      const element = box.current;
      if (!element) return;
      const rect = element.getBoundingClientRect();
      const span = rect.height + window.innerHeight * 0.55;
      const raw = (window.innerHeight * 0.9 - rect.top) / span;
      const progress = Math.min(1, Math.max(0, raw));

      const drawn = progress * total;
      let consumed = 0;
      nodes.forEach((node, index) => {
        const length = lengths[index];
        const visible = Math.min(length, Math.max(0, drawn - consumed));
        node.style.strokeDashoffset = `${length - visible}`;
        consumed += length;
      });

      setStage(Math.min(CAPTIONS.length - 1, Math.floor(progress * CAPTIONS.length)));
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(draw);
    };

    draw();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="cycle" ref={box}>
      <div className="cycleBox">
        <svg className="cycleChart" viewBox="0 0 1000 300" role="img" aria-label="A chart of progress repeatedly built up and then undone, ending the year back at zero">
          <line className="cycleZero" x1="45" y1="250" x2="975" y2="250" />
          {SEGMENTS.map((segment, index) => (
            <path
              key={segment.d}
              ref={(node) => { paths.current[index] = node; }}
              className={`cycleSeg ${segment.kind === "gain" ? "cycleGain" : "cycleLoss"}`}
              d={segment.d}
            />
          ))}
        </svg>
        <div className="cycleKey">
          <b><i style={{ background: "var(--gain)" }} /> Progress you make</b>
          <b><i style={{ background: "var(--loss)" }} /> Progress you undo</b>
          <b><i style={{ background: "#4a4741" }} /> Where you started</b>
        </div>
      </div>
      <p className="loopNote" aria-live="polite">{CAPTIONS[stage]}</p>
    </div>
  );
}
