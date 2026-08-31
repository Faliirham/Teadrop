"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstaller() {
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // Register the service worker.
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch(() => {
          /* ignore registration errors (e.g. in dev) */
        });
    }
  }, []);

  // Capture the install prompt when the browser fires beforeinstallprompt.
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const installed = () => setShowPrompt(false);
    window.addEventListener("appinstalled", installed);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  if (!showPrompt || !installPrompt) return null;

  const install = async () => {
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-4 z-[60] flex justify-center px-4">
      <div className="glass flex w-full max-w-sm items-center gap-3 rounded-2xl p-4 shadow-xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
          <MobileIcon />
        </span>
        <div className="flex-1 text-sm leading-snug">
          <b className="text-foreground">Pasang Teadrop</b>
          <p className="text-xs text-muted">Instal ke layar beranda untuk akses cepat.</p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-accent-strong px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[#0d9280]"
        >
          Pasang
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="shrink-0 text-xs text-muted transition hover:text-foreground"
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function MobileIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <path d="M12 18h.01" />
    </svg>
  );
}
