/**
 * The hero wave. The cycle chart's line again, progress built and undone, with
 * faint echoes around it, until it settles into one steady orange line that
 * climbs past every old peak. Every page draws the same idea with one small
 * twist of its own. Purely decorative. On wide screens it sits behind the hero
 * text and takes no layout space; on narrow ones, where the text needs the
 * whole width, the same drawing becomes a short strip above the title.
 */

export type WaveVariant =
  | "home"
  | "why"
  | "guide"
  | "roadmap"
  | "foundation"
  | "support"
  | "download"
  | "feedback";

type Point = [number, number];
type Cubic = [Point, Point, Point, Point];

type Shape = {
  cycles: number;
  amp: number;
  decay: number;
  /** Where the line stops swinging, as a fraction of the width. */
  settle: number;
  rise: number;
  /** Where the steady line ends. Defaults to just past the right edge. */
  end?: number;
  /** Level off at the end instead of still climbing. */
  flatEnd?: boolean;
};

const W = 800;
const H = 560;
const BASE = 400;
const ECHOES = [-2, -1, 1, 2];
/** The band every variant actually draws in, echoes and float included. */
const STRIP = "0 125 800 350";

const SHAPES: Record<WaveVariant, Shape> = {
  // The whole story: a few swings, then it settles and keeps climbing.
  home: { cycles: 3, amp: 105, decay: 0.85, settle: 0.58, rise: 190 },
  // The loop is the subject here, so it swings longer and settles late.
  why: { cycles: 4, amp: 110, decay: 0.97, settle: 0.78, rise: 80 },
  // Settles early, and the steady part is marked off one day at a time.
  guide: { cycles: 2, amp: 85, decay: 0.75, settle: 0.42, rise: 150 },
  // The steady line runs out into dots. Directions, not promises.
  roadmap: { cycles: 3, amp: 95, decay: 0.85, settle: 0.52, rise: 150, end: W - 170 },
  // Two strands, the tool and the teaching, settling into one line.
  foundation: { cycles: 3, amp: 105, decay: 0.85, settle: 0.58, rise: 180 },
  // Climbs to a dashed target and levels off on it.
  support: { cycles: 3, amp: 95, decay: 0.9, settle: 0.5, rise: 210, end: W - 110, flatEnd: true },
  // Lands on the dock from the logo.
  download: { cycles: 3, amp: 90, decay: 0.85, settle: 0.45, rise: 150, end: W - 200, flatEnd: true },
  // A ring marks the moment it turns.
  feedback: { cycles: 2, amp: 100, decay: 0.85, settle: 0.55, rise: 150 },
};

const round = (value: number) => Math.round(value * 10) / 10;
const pair = ([x, y]: Point) => `${round(x)},${round(y)}`;

function geometry(shape: Shape, base = BASE, scale = 1) {
  const start = 30;
  const settleX = W * shape.settle;
  const end = shape.end ?? W + 40;
  const span = (settleX - start) / shape.cycles;

  // Each cycle climbs slowly and falls fast, like the cycle chart.
  let wave = `M${pair([start, base])}`;
  for (let i = 0; i < shape.cycles; i += 1) {
    const x = start + i * span;
    const peak = base - shape.amp * scale * shape.decay ** i;
    wave += ` C${pair([x + span * 0.3, base])} ${pair([x + span * 0.42, peak])} ${pair([x + span * 0.6, peak])}`;
    wave += ` C${pair([x + span * 0.74, peak])} ${pair([x + span * 0.84, base])} ${pair([x + span, base])}`;
  }

  const length = end - settleX;
  const top = base - shape.rise;
  const steady: Cubic = [
    [settleX, base],
    [settleX + length * 0.35, base],
    shape.flatEnd ? [settleX + length * 0.6, top] : [settleX + length * 0.55, base - shape.rise * 0.6],
    [end, top],
  ];
  const curve = `C${steady.slice(1).map(pair).join(" ")}`;

  return { wave, steady, settle: `M${pair(steady[0])} ${curve}`, full: `${wave} ${curve}` };
}

function pointOn([p0, p1, p2, p3]: Cubic, t: number): Point {
  const u = 1 - t;
  const at = (i: 0 | 1) => u ** 3 * p0[i] + 3 * u * u * t * p1[i] + 3 * u * t * t * p2[i] + t ** 3 * p3[i];
  return [at(0), at(1)];
}

export default function HeroWave({ variant = "home" }: { variant?: WaveVariant }) {
  const shape = SHAPES[variant];
  const main = geometry(shape);
  const [settleX, settleY] = main.steady[0];
  const [controlX, controlY] = main.steady[2];
  const [endX, endY] = main.steady[3];
  const slope = (endY - controlY) / (endX - controlX);

  const art = (
    <>
      <g className="waveFloat">
        {ECHOES.map((offset) => (
          <path
            key={offset}
            className="waveLine waveEcho"
            d={geometry(shape, BASE + offset * 26, 1 - offset * 0.14).full}
            pathLength={1}
            strokeOpacity={Math.abs(offset) === 1 ? 0.12 : 0.06}
            style={{ animationDelay: `${Math.abs(offset) * 0.15}s` }}
          />
        ))}
      </g>

      {variant === "support" ? (
        <line className="waveGoal waveFade" x1={settleX} y1={endY} x2={W + 40} y2={endY} />
      ) : null}
      {variant === "foundation" ? (
        <path
          className="waveLine waveCycle"
          d={geometry({ ...shape, cycles: 4, amp: 75, decay: 0.9 }).wave}
          pathLength={1}
          style={{ animationDelay: "0.2s" }}
        />
      ) : null}

      <path className="waveLine waveCycle" d={main.wave} pathLength={1} />
      <path className="waveLine waveSettle" d={main.settle} pathLength={1} />

      {variant === "guide"
        ? [1, 2, 3, 4, 5, 6].map((day) => {
            const [x, y] = pointOn(main.steady, day / 7);
            return (
              <line
                key={day}
                className="waveTick waveFade"
                x1={x}
                y1={y - 9}
                x2={x}
                y2={y + 9}
                style={{ animationDelay: `${1.9 + day * 0.12}s` }}
              />
            );
          })
        : null}
      {variant === "roadmap" ? (
        <line
          className="waveFuture waveFade"
          x1={endX + 14}
          y1={endY + 14 * slope}
          x2={W + 40}
          y2={endY + (W + 40 - endX) * slope}
        />
      ) : null}
      {variant === "support" ? <circle className="waveDot waveFade" cx={endX} cy={endY} r={6} /> : null}
      {variant === "download" ? (
        <g className="waveFade">
          <rect className="waveDock" x={endX} y={endY - 4} width={140} height={8} rx={4} />
          <rect className="waveBlock waveDrop" x={endX + 34} y={endY - 56} width={52} height={52} rx={12} />
          <rect className="waveWaiting" x={endX + 98} y={endY - 34} width={28} height={28} rx={8} />
        </g>
      ) : null}
      {variant === "feedback" ? (
        <circle className="waveRing waveFade" cx={settleX} cy={settleY} r={9} style={{ animationDelay: "1.3s" }} />
      ) : null}
    </>
  );

  // CSS shows exactly one of these, so only one ever animates.
  return (
    <>
      <svg
        className="wave"
        data-variant={variant}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMaxYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {art}
      </svg>
      <svg
        className="waveStrip"
        data-variant={variant}
        viewBox={STRIP}
        preserveAspectRatio="xMaxYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        {art}
      </svg>
    </>
  );
}
