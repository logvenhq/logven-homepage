(() => {
  const storageKey = "logven-appearance";
  const themeColor = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  const validModes = new Set(["system", "light", "dark"]);

  const readMode = () => {
    try {
      const storedMode = window.localStorage.getItem(storageKey);
      if (validModes.has(storedMode)) return storedMode;
      window.localStorage.removeItem(storageKey);
      return "system";
    } catch {
      return "system";
    }
  };

  let mode = readMode();

  const updateThemeColor = () => {
    const isDark = mode === "dark" || (mode === "system" && systemTheme.matches);
    if (themeColor) themeColor.content = isDark ? "#18191c" : "#ffffff";
  };

  const applyMode = () => {
    document.documentElement.classList.toggle("light", mode === "light");
    document.documentElement.classList.toggle("dark", mode === "dark");
    updateThemeColor();
    document.dispatchEvent(new CustomEvent("logven:themechange", { detail: { mode } }));
  };

  const syncControls = () => {
    document.querySelectorAll('[data-theme-control] input[name="appearance"]').forEach((input) => {
      input.checked = input.value === mode;
    });
  };

  applyMode();
  document.addEventListener("DOMContentLoaded", syncControls, { once: true });
  document.addEventListener("change", (event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || !input.closest("[data-theme-control]") || input.name !== "appearance" || !validModes.has(input.value)) return;

    mode = input.value;
    try {
      if (mode === "system") window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, mode);
    } catch {
      // The active choice still applies for this page when storage is unavailable.
    }

    applyMode();
    syncControls();
  });

  systemTheme.addEventListener("change", () => {
    if (mode !== "system") return;
    updateThemeColor();
    document.dispatchEvent(new CustomEvent("logven:themechange", { detail: { mode } }));
  });
})();
