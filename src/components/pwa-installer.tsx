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
      <div className="flex w-full max-w-sm items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-800">
        <span className="text-2xl">📲</span>
        <div className="flex-1 text-sm leading-snug">
          <b className="text-slate-900 dark:text-slate-100">Pasang Teadrop</b>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Instal ke layar beranda untuk akses cepat.
          </p>
        </div>
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          Pasang
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="shrink-0 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          aria-label="Tutup"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
