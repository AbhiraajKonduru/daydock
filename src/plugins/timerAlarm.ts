const ACTIVE_TIMER_KEY = "daydock-active-timer";

/**
 * A running block holds this slot until it is paused or finished - not until it
 * reaches zero. Passing zero starts overtime, and an overtime block is still the
 * one timer running, so it must keep the slot.
 */
type ActiveTimer = { id: string; dueAt: number; chimed?: boolean };

/** A slot older than this outlived a crash; releasing it beats wedging every timer. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export const TIMER_ELAPSED_EVENT = "daydock:timer-elapsed";

let alarmHandle: number | null = null;
let audioContext: AudioContext | null = null;

function readActiveTimer(): ActiveTimer | null {
  try {
    const value = JSON.parse(localStorage.getItem(ACTIVE_TIMER_KEY) || "null") as ActiveTimer | null;
    return value && typeof value.id === "string" && Number.isFinite(value.dueAt) ? value : null;
  } catch {
    return null;
  }
}

function writeActiveTimer(timer: ActiveTimer | null) {
  try {
    if (timer) localStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(timer));
    else localStorage.removeItem(ACTIVE_TIMER_KEY);
  } catch {
    // This is a scheduling cache. Markdown timer state remains authoritative.
  }
}

export function activeTimerId(now = Date.now()): string | null {
  const timer = readActiveTimer();
  if (!timer) return null;
  if (now - timer.dueAt > STALE_AFTER_MS) {
    writeActiveTimer(null);
    return null;
  }
  return timer.id;
}

export function primeCompletionSound() {
  try {
    audioContext ??= new AudioContext();
    if (audioContext.state === "suspended") void audioContext.resume();
  } catch {
    // Audio is an enhancement. Timer state remains durable if unavailable.
  }
}

/**
 * A soft three-note rise, each voice fading on its own so the chime decays
 * rather than cutting off. Quiet enough to sit next to a full hour of work.
 */
export function playCompletionSound() {
  try {
    audioContext ??= new AudioContext();
    const play = () => {
      if (!audioContext) return;
      const start = audioContext.currentTime + 0.02;
      const notes: Array<[number, number, number]> = [
        [523.25, 0, 0.9],
        [659.25, 0.16, 0.8],
        [783.99, 0.32, 1],
      ];
      for (const [frequency, offset, level] of notes) {
        const at = start + offset;
        const gain = audioContext.createGain();
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.11 * level, at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.85);
        gain.connect(audioContext.destination);

        const oscillator = audioContext.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start(at);
        oscillator.stop(at + 0.9);

        // A quiet octave above gives the sine a little body without a hard edge.
        const shimmer = audioContext.createOscillator();
        const shimmerGain = audioContext.createGain();
        shimmerGain.gain.setValueAtTime(0.0001, at);
        shimmerGain.gain.exponentialRampToValueAtTime(0.022 * level, at + 0.02);
        shimmerGain.gain.exponentialRampToValueAtTime(0.0001, at + 0.5);
        shimmerGain.connect(audioContext.destination);
        shimmer.type = "sine";
        shimmer.frequency.value = frequency * 2;
        shimmer.connect(shimmerGain);
        shimmer.start(at);
        shimmer.stop(at + 0.55);
      }
    };
    if (audioContext.state === "suspended") void audioContext.resume().then(play);
    else play();
  } catch {
    // Never let an unavailable audio device affect persisted timer state.
  }
}

function announceElapsed(timer: ActiveTimer) {
  writeActiveTimer({ ...timer, chimed: true });
  window.dispatchEvent(new CustomEvent(TIMER_ELAPSED_EVENT, {
    detail: { id: timer.id, dueAt: timer.dueAt },
  }));
  playCompletionSound();
}

export function scheduleTimerAlarm(id: string, dueAt: number, chimed = false) {
  if (alarmHandle !== null) window.clearTimeout(alarmHandle);
  alarmHandle = null;
  const timer: ActiveTimer = { id, dueAt, chimed };
  writeActiveTimer(timer);
  if (chimed || dueAt <= Date.now()) return;

  const delay = Math.min(dueAt - Date.now(), 2_147_483_647);
  alarmHandle = window.setTimeout(() => {
    alarmHandle = null;
    const active = readActiveTimer();
    if (!active || active.id !== id || active.chimed) return;
    // A long timer can outlast one setTimeout window, or the clock can drift.
    if (active.dueAt > Date.now()) {
      scheduleTimerAlarm(active.id, active.dueAt);
      return;
    }
    announceElapsed(active);
  }, delay);
}

export function clearTimerAlarm(id: string) {
  const active = readActiveTimer();
  if (active?.id !== id) return;
  if (alarmHandle !== null) window.clearTimeout(alarmHandle);
  alarmHandle = null;
  writeActiveTimer(null);
}

// Restore the alarm after a renderer restart. The Markdown session timestamps
// remain authoritative; this local value is only a rebuildable scheduling hint.
// A block that passed zero while the app was closed is already in overtime, so
// it keeps its slot but is marked chimed - a chime minutes late helps nobody.
if (typeof window !== "undefined") {
  const saved = readActiveTimer();
  if (saved && Date.now() - saved.dueAt <= STALE_AFTER_MS) {
    scheduleTimerAlarm(saved.id, saved.dueAt, saved.chimed || saved.dueAt <= Date.now());
  } else if (saved) {
    writeActiveTimer(null);
  }
}
