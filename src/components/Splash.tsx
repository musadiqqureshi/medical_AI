"use client";

import { useEffect, useState } from "react";
import { Orb } from "./Orb";

// Branded launch splash. Shows briefly on first load (and on the Android/PWA
// standalone launch), then fades out. TWA also generates a native splash from
// the manifest background_color + icon.
export function Splash() {
  const [gone, setGone] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Only show the splash on a fresh app launch, not on every client nav.
    const shownThisSession = sessionStorage.getItem("splash-shown");
    if (shownThisSession) {
      setGone(true);
      return;
    }
    sessionStorage.setItem("splash-shown", "1");
    const fade = setTimeout(() => setFading(true), 950);
    const done = setTimeout(() => setGone(true), 1450);
    return () => {
      clearTimeout(fade);
      clearTimeout(done);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      className={`brand-gradient fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="animate-float">
        <Orb size={128} />
      </div>
      <p className="text-xl font-bold tracking-tight text-white">Medical AI</p>
    </div>
  );
}
