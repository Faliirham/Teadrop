"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { Button } from "@/components/ui";

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<{
    opts: ConfirmOptions;
    resolve: (v: boolean) => void;
  } | null>(null);

  const confirmFn = useCallback<ConfirmFn>((opts) => {
    return new Promise<boolean>((resolve) => {
      setState({ opts, resolve });
    });
  }, []);

  const finish = useCallback(
    (value: boolean) => {
      state?.resolve(value);
      setState(null);
    },
    [state]
  );

  const open = !!state;

  return (
    <ConfirmContext.Provider value={confirmFn}>
      {children}
      {open && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/70"
          onClick={() => finish(false)}
        >
          <div
            className="glass w-full max-w-sm overflow-hidden rounded-2xl p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-foreground">
              {state!.opts.title}
            </h3>
            <p className="mt-2 text-sm text-muted">
              {state!.opts.message}
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="ghost" size="md" onClick={() => finish(false)}>
                Batal
              </Button>
              <Button
                variant={state!.opts.danger ? "danger" : "primary"}
                size="md"
                onClick={() => finish(true)}
              >
                {state!.opts.confirmLabel ?? "Lanjut"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}
