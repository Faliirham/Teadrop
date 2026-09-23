"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

export type Theme = "dark" | "light";

type ThemeContextValue = {
  theme: Theme;
  toggle: () => void;
  setTheme: (t: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "teadrop_theme";

/**
 * Dark is the default theme. Light mode is opt-in via the `.light` class
 * (see globals.css where dark is the base and `.light` overrides it).
 */
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  root.style.colorScheme = theme;
}

function readThemeFromDOM(): Theme {
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Always initialize to "dark" on both server and client to avoid hydration
  // mismatch. The boot script already applied the real theme to <html> before
  // hydration, so we read it in useEffect (client-only) and sync.
  const [theme, setThemeState] = useState<Theme>("dark");

  useEffect(() => {
    // Sync sekali dari DOM yang sudah dipasang boot script pre-hydration.
    // Pola ini disengaja untuk hindari hydration mismatch (init selalu "dark").
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readThemeFromDOM());
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyTheme(t);
    try {
      localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore quota / private-mode errors */
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, toggle, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>");
  return ctx;
}

/**
 * Inline script (runs before hydration) that applies the persisted/system
 * theme to <html> to avoid a flash of the wrong theme. Defaults to dark.
 */
export const themeBootScript = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}');if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';}var e=document.documentElement;e.classList.toggle('light',t==='light');e.style.colorScheme=t;}catch(_){}})();`;
