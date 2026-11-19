import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Theme = "light" | "dark";
const storageKey = "tab-brain-theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === "light" ? "light" : "dark",
  );

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#141c17" : "#f7f8f2");
  }, [theme]);

  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === storageKey)
        setTheme(event.newValue === "light" ? "light" : "dark");
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      localStorage.setItem(storageKey, next);
    } catch {
      // The switch still works when browser storage is unavailable.
    }
  };

  const label = `Switch to ${theme === "dark" ? "light" : "dark"} theme`;
  return (
    <button
      type="button"
      className="icon-button theme-toggle"
      aria-label={label}
      title={label}
      data-testid="theme-toggle"
      onClick={toggle}
    >
      {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
