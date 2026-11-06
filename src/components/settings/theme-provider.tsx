"use client";

import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from "react";

export type Theme = "light" | "dark";

const THEME_COOKIE = "rota-theme";
const LEGACY_THEME_KEY = "rota-theme";
const THEME_EVENT = "rota-theme-change";

type ThemeContextValue = { theme: Theme; setTheme: (theme: Theme) => void };
const ThemeContext = createContext<ThemeContextValue | null>(null);

function readThemeCookie(): Theme | null {
  const entry = document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${THEME_COOKIE}=`));
  const value = entry?.slice(THEME_COOKIE.length + 1);
  return value === "dark" || value === "light" ? value : null;
}

function writeThemeCookie(theme: Theme) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${THEME_COOKIE}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

function getTheme(initialTheme: Theme): Theme {
  return readThemeCookie() ?? (document.documentElement.dataset.theme === "dark" ? "dark" : initialTheme);
}

function subscribe(listener: () => void) {
  window.addEventListener(THEME_EVENT, listener);
  return () => window.removeEventListener(THEME_EVENT, listener);
}

export function ThemeProvider({ initialTheme, children }: { initialTheme: Theme; children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, () => getTheme(initialTheme), () => initialTheme);

  const setTheme = useCallback((next: Theme) => {
    writeThemeCookie(next);
    document.documentElement.dataset.theme = next;
    window.dispatchEvent(new Event(THEME_EVENT));
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme precisa ser usado dentro de ThemeProvider.");
  return value;
}

/** Runs in the document head with the request nonce to migrate old localStorage preferences before paint. */
export const themeBootstrapScript = `(()=>
{try{const c=document.cookie.split(';').map(x=>x.trim()).find(x=>x.startsWith('${THEME_COOKIE}='));
if(c){const v=c.slice(${THEME_COOKIE.length + 1});
if(v==='dark'||v==='light'){document.documentElement.dataset.theme=v;
localStorage.removeItem('${LEGACY_THEME_KEY}');
return}}
const v=localStorage.getItem('${LEGACY_THEME_KEY}');
if(v==='dark'||v==='light'){document.documentElement.dataset.theme=v;
document.cookie='${THEME_COOKIE}='+v+'; 
Path=/; 
Max-Age=31536000; 
SameSite=Lax'+(location.protocol==='https:'?'; 
Secure':'')}localStorage.removeItem('${LEGACY_THEME_KEY}')}catch{}})();`;
