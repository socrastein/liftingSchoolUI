import { ref } from "vue";

/** The two themes the showcase can show. */
export type Theme = "light" | "dark";

/** Where the chosen theme is saved; index.html reads the same key before the first paint. */
const THEME_KEY = "theme";

/**
 * The showcase's theme: which one is showing, and a way to switch. Dark mode is the `dark` class on <html>, as in every
 * project, and the choice is saved so a reload (or the accessibility check, which presets it) shows the same theme.
 *
 * @returns The current theme and `setTheme` to change it.
 */
export function useTheme() {
  const isDark = document.documentElement.classList.contains("dark");
  const theme = ref<Theme>(isDark ? "dark" : "light");

  /** Shows the given theme and remembers it. */
  function setTheme(next: Theme): void {
    theme.value = next;
    const shouldBeDark = next === "dark";
    document.documentElement.classList.toggle("dark", shouldBeDark);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage can be blocked; the theme still changes for this visit
    }
  }

  return { theme, setTheme };
}
