/**
 * Spoken prompts with the phone's own Indonesian voice. Temporary: the product will use recorded voice.
 * Every call resolves even when speech is unavailable, so the game never waits forever.
 */
let voice: SpeechSynthesisVoice | null = null;
function pickVoice() {
  if (!("speechSynthesis" in window)) return;
  const vs = speechSynthesis.getVoices();
  voice = vs.find((v) => /^id([-_]|$)/i.test(v.lang)) || vs.find((v) => /indones/i.test(v.name)) || null;
}
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }

export function say(text: string, rate = 0.85): Promise<void> {
  return new Promise((res) => {
    if (muted) { setTimeout(res, 250); return; }
    if (!("speechSynthesis" in window)) { setTimeout(res, 500 + text.length * 40); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "id-ID"; if (voice) u.voice = voice;
    u.rate = rate; u.pitch = 1.12;
    let done = false; const fin = () => { if (!done) { done = true; res(); } };
    u.onend = fin; u.onerror = fin;
    setTimeout(fin, 900 + text.length * 120);
    speechSynthesis.speak(u);
  });
}
export function hush() { if ("speechSynthesis" in window) speechSynthesis.cancel(); }

export const NUM = ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"];

let muted = false;
/** Parents can turn the voice off; prompts then resolve at once so the game keeps flowing. */
export function setMuted(m: boolean) { muted = m; if (m) hush(); }
export function isMuted() { return muted; }
