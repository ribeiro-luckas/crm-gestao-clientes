"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/settings/theme-provider";

export function ThemeControl() {
  const { theme, setTheme } = useTheme();

  return <>
          <div className="theme-control">
            <button
             type="button" 
             className={`theme-option${theme === "light" 
              ? " is-selected" 
              : ""}`} 
             aria-pressed={theme === "light"} 
             onClick={() => setTheme("light")}
            >
              <Sun size={16} />Claro
            </button>

            <button
             type="button" 
             className={`theme-option${theme === "dark" 
              ? " is-selected" 
              : ""}`} 
             aria-pressed={theme === "dark"} 
             onClick={() => setTheme("dark")}
            >
              <Moon size={16} />Escuro
            </button>
          </div>
        </>
}
