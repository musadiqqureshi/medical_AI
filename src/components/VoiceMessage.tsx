"use client";

import { useEffect, useRef, useState } from "react";

// Fixed bar heights so the waveform looks organic (mimics the mockup).
const BARS = [0.4, 0.7, 1, 0.55, 0.85, 0.35, 0.9, 0.6, 1, 0.45, 0.75, 0.5, 0.95, 0.4, 0.7, 0.6, 0.85, 0.5];

/** A voice-note style bubble that reads the given text aloud (Web Speech TTS),
 *  animating the waveform while playing — matches the mockup's audio message. */
export function VoiceMessage({ text, tone = "light" }: { text: string; tone?: "light" | "brand" }) {
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  function toggle() {
    if (!supported) return;
    const synth = window.speechSynthesis;
    if (playing) {
      synth.cancel();
      setPlaying(false);
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*#_`>]/g, ""));
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => setPlaying(false);
    u.onerror = () => setPlaying(false);
    utterRef.current = u;
    setPlaying(true);
    synth.speak(u);
  }

  // Rough duration estimate (~13 chars/sec of speech).
  const secs = Math.max(3, Math.round(text.length / 13));
  const label = `0:${String(secs % 60).padStart(2, "0")}`;

  const brand = tone === "brand";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 transition ${
        brand ? "bg-white/20 text-white" : "glass text-slate-700"
      }`}
      aria-label={playing ? "Stop audio" : "Play audio"}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${
          brand ? "bg-white text-violet-600" : "brand-gradient text-white"
        }`}
      >
        {playing ? (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <rect x="7" y="7" width="10" height="10" rx="2" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </span>

      <span className={`flex h-6 items-center gap-[3px] ${playing ? "wave-playing" : ""}`}>
        {BARS.map((h, i) => (
          <span
            key={i}
            className={`wave-bar w-[3px] rounded-full ${brand ? "bg-white/90" : "bg-violet-400"}`}
            style={{ height: `${h * 100}%`, animationDelay: `${i * 0.06}s` }}
          />
        ))}
      </span>

      <span className={`text-xs tabular-nums ${brand ? "text-white/80" : "text-slate-400"}`}>
        {label}
      </span>
    </button>
  );
}
