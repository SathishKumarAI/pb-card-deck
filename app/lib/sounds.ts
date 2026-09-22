const AudioContext = typeof window !== "undefined" ? window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext : null;

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (!AudioContext) return null;
  if (!ctx) ctx = new AudioContext();
  return ctx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.3) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = volume;
  gain.gain.exponentialRampToValueAtTime(0.01, c.currentTime + duration);
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + duration);
}

export function playScoreSound() {
  playTone(880, 0.15, "sine", 0.2);
}

export function playUndoSound() {
  playTone(440, 0.1, "triangle", 0.15);
}

export function playCardFlipSound() {
  playTone(600, 0.08, "sine", 0.15);
  setTimeout(() => playTone(800, 0.1, "sine", 0.2), 80);
}

export function playWinSound() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playTone(f, 0.3, "sine", 0.25), i * 150);
  });
}

export function playResetSound() {
  playTone(300, 0.2, "triangle", 0.15);
}

export function triggerHaptic(pattern: "light" | "medium" | "heavy" = "light") {
  if (!navigator.vibrate) return;
  const patterns = { light: [10], medium: [30], heavy: [50, 30, 50] };
  navigator.vibrate(patterns[pattern]);
}

// Speak a short phrase (e.g. the score) via the Web Speech API. Opt-in; guarded
// for browsers without speech synthesis. Cancels any in-flight utterance so
// rapid points don't queue up and lag behind play.
export function speak(text: string) {
  if (!text) return;
  try {
    const synth = window.speechSynthesis;
    if (!synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.volume = 1;
    synth.speak(u);
  } catch {}
}
