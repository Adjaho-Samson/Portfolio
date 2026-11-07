/* Runs before paint. A saved explicit choice wins over the system preference. */
(() => {
  const key = "tchatzdev.theme";
  const root = document.documentElement;
  const system = window.matchMedia?.("(prefers-color-scheme: dark)");
  let saved = null;
  try {
    const value = localStorage.getItem(key);
    if (value === "light" || value === "dark") saved = value;
  } catch {
    /* Private browsing or disabled storage: the theme still works in memory. */
  }
  const apply = (theme) => {
    root.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#0e1729" : "#f7f8fc");
    const label =
      theme === "dark" ? "Activer le mode clair" : "Activer le mode sombre";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-label", label);
      button.title = label;
      button.querySelector("[data-theme-label]").textContent =
        theme === "dark" ? "Mode clair" : "Mode sombre";
    });
  };
  apply(saved || (system?.matches ? "dark" : "light"));
  document.addEventListener("DOMContentLoaded", () => {
    apply(root.dataset.theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.hidden = false;
      button.addEventListener("click", () => {
        const theme = root.dataset.theme === "dark" ? "light" : "dark";
        saved = theme;
        try {
          localStorage.setItem(key, theme);
        } catch {
          /* In-memory fallback. */
        }
        apply(theme);
      });
    });
  });
  system?.addEventListener?.("change", (event) => {
    if (!saved) apply(event.matches ? "dark" : "light");
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== key) return;
    saved =
      event.newValue === "light" || event.newValue === "dark"
        ? event.newValue
        : null;
    apply(saved || (system?.matches ? "dark" : "light"));
  });
})();
