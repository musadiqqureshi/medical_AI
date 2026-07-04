"use client";

import { useEffect } from "react";

// Registers the service worker so the app is installable (PWABuilder / Android TWA).
export function PWARegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () =>
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* ignore registration errors (e.g. non-HTTPS dev) */
      });
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
