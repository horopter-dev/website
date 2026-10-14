// Loaded without async or defer in <head>, so the stored theme applies before first paint.
// Behaves as next-themes does with attribute "class": the same storage key and values, the
// resolved theme as a class and color-scheme on <html>, live system following, sync across tabs.
(() => {
  const storageKey = "theme";
  const choices = new Set(["system", "light", "dark"]);
  const root = document.documentElement;
  const systemDark = window.matchMedia("(prefers-color-scheme: dark)");

  /** @param {string | null} value */
  const valid = (value) => (value !== null && choices.has(value) ? value : "system");

  const stored = () => {
    try {
      return valid(window.localStorage.getItem(storageKey));
    } catch {
      return "system";
    }
  };

  /** @param {string} choice */
  const store = (choice) => {
    try {
      window.localStorage.setItem(storageKey, choice);
    } catch {
      // Without storage the choice lasts for this page only.
    }
  };

  let choice = stored();

  const apply = () => {
    const resolved = choice === "system" ? (systemDark.matches ? "dark" : "light") : choice;
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
    root.style.colorScheme = resolved;
    for (const button of document.querySelectorAll("[data-theme-choice]")) {
      button.setAttribute(
        "aria-pressed",
        String(button.getAttribute("data-theme-choice") === choice),
      );
    }
  };

  const wireToggle = () => {
    for (const container of document.querySelectorAll("[data-theme-toggle]")) {
      container.removeAttribute("hidden");
    }
    for (const button of document.querySelectorAll("[data-theme-choice]")) {
      button.addEventListener("click", () => {
        choice = valid(button.getAttribute("data-theme-choice"));
        store(choice);
        apply();
      });
    }
    apply();
  };

  apply();
  systemDark.addEventListener("change", apply);
  window.addEventListener("storage", (event) => {
    if (event.key === storageKey) {
      choice = valid(event.newValue);
      apply();
    }
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wireToggle);
  } else {
    wireToggle();
  }
})();
