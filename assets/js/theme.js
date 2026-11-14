/* Thème TchatzDev — exécuté avant le premier rendu.
   L'identité du site est nocturne : le mode sombre est le choix par défaut.
   Le mode clair reste disponible et un choix explicite est conservé. */
(() => {
  // Signale que JavaScript est disponible avant le premier rendu : sans ce
  // script, aucun contenu animé n'est masqué et le préchargeur reste caché.
  document.documentElement.classList.replace("no-js", "js");
  const key = "tchatzdev.theme";
  const root = document.documentElement;
  let saved = null;
  try {
    const value = localStorage.getItem(key);
    if (value === "light" || value === "dark") saved = value;
  } catch {
    /* Navigation privée ou stockage refusé : le thème fonctionne en mémoire. */
  }
  const apply = (theme) => {
    root.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#07080a" : "#f6f5f3");
    const label =
      theme === "dark" ? "Passer en mode clair" : "Passer en mode sombre";
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.setAttribute("aria-label", label);
      button.title = label;
      const text = button.querySelector("[data-theme-label]");
      if (text) text.textContent = label;
    });
  };
  apply(saved || "dark");
  document.addEventListener("DOMContentLoaded", () => {
    apply(root.dataset.theme);
    document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
      button.addEventListener("click", () => {
        const theme = root.dataset.theme === "dark" ? "light" : "dark";
        saved = theme;
        try {
          localStorage.setItem(key, theme);
        } catch {
          /* Repli en mémoire pour la page courante. */
        }
        apply(theme);
        window.dispatchEvent(
          new CustomEvent("tchatz:theme", { detail: theme }),
        );
      });
    });
  });
  window.addEventListener("storage", (event) => {
    if (event.key !== key) return;
    saved =
      event.newValue === "light" || event.newValue === "dark"
        ? event.newValue
        : null;
    apply(saved || "dark");
  });
})();
