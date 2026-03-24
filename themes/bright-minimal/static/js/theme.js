(() => {
  const storageKey = "bp-theme";
  const root = document.documentElement;
  const toggle = document.querySelector("[data-theme-toggle]");
  const media = window.matchMedia("(prefers-color-scheme: dark)");

  const getStoredTheme = () => {
    try {
      return localStorage.getItem(storageKey);
    } catch (err) {
      return null;
    }
  };

  const setStoredTheme = (theme) => {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (err) {
      // ignore write failures
    }
  };

  const notifyThemeChange = (theme) => {
    try {
      window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme } }));
    } catch (err) {
      // ignore event failures
    }
  };

  const applyTheme = (theme, persist) => {
    root.setAttribute("data-theme", theme);
    if (document.body) {
      document.body.setAttribute("data-theme", theme);
    }
    if (persist) {
      setStoredTheme(theme);
    }
    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }
    notifyThemeChange(theme);
  };

  const systemTheme = () => (media.matches ? "dark" : "light");

  const stored = getStoredTheme();
  if (!stored) {
    applyTheme(systemTheme(), false);
  }

  if (toggle) {
    toggle.addEventListener("click", () => {
      const current = root.getAttribute("data-theme") || systemTheme();
      const next = current === "dark" ? "light" : "dark";
      applyTheme(next, true);
    });
  }

  media.addEventListener("change", () => {
    if (!getStoredTheme()) {
      applyTheme(systemTheme(), false);
    }
  });
})();
