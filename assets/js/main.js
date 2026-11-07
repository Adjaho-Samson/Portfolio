/* Navigation, progressive reveal and the certificate dialog. No network calls. */
(() => {
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".navigation");
  const desktop = window.matchMedia("(min-width: 1050px)");

  if (header && menuButton && navigation) {
    header.classList.add("nav-ready");
    const setOpen = (open, returnFocus = false) => {
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute(
        "aria-label",
        open ? "Fermer le menu" : "Ouvrir le menu",
      );
      navigation.classList.toggle("is-open", open);
      navigation.inert = !open && !desktop.matches;
      if (returnFocus) menuButton.focus();
    };
    setOpen(false);
    menuButton.addEventListener("click", () => {
      const open = menuButton.getAttribute("aria-expanded") !== "true";
      setOpen(open);
      if (open) navigation.querySelector("a")?.focus();
    });
    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
    desktop.addEventListener("change", () => setOpen(false));
    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (
        event.key === "Escape" &&
        menuButton.getAttribute("aria-expanded") === "true"
      ) {
        setOpen(false, true);
      }
    });
    // The dropdown is non-modal. Close it when keyboard focus leaves the header.
    document.addEventListener("focusin", (event) => {
      if (!header.contains(event.target)) setOpen(false);
    });
  }

  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const items = [...document.querySelectorAll("[data-reveal]")];
  let observer;
  const showAll = () => {
    observer?.disconnect();
    items.forEach((item) => item.classList.remove("reveal-pending"));
  };
  if (!motion.matches && "IntersectionObserver" in window) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.06, rootMargin: "0px 0px -20px 0px" },
    );
    items.forEach((item) => {
      // Above-the-fold content and anchor targets never wait for an animation.
      if (
        item.getBoundingClientRect().top < window.innerHeight ||
        item.querySelector(":target")
      )
        return;
      item.classList.add("reveal-pending");
      observer.observe(item);
    });
  }
  motion.addEventListener?.("change", (event) => {
    if (event.matches) showAll();
  });
  window.addEventListener("hashchange", () => {
    const target = document.getElementById(location.hash.slice(1));
    const reveal = target?.closest("[data-reveal]");
    if (reveal) reveal.classList.add("is-visible");
  });

  const dialog = document.getElementById("certificate-dialog");
  const preview = document.getElementById("certificate-preview");
  const closeButton = document.getElementById("certificate-close");
  if (
    dialog &&
    preview &&
    closeButton &&
    typeof dialog.showModal === "function"
  ) {
    let trigger = null;
    const title = document.getElementById("dialog-title");
    const description = document.getElementById("dialog-description");
    const openLink = document.getElementById("certificate-open");
    const downloadLink = document.getElementById("certificate-download");
    document.querySelectorAll("[data-certificate]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        trigger = button;
        const { title: name, pdf, preview: image, meta } = button.dataset;
        title.textContent = name;
        description.textContent = meta;
        preview.src = image;
        preview.alt = `Certificat « ${name} » délivré à Samson Guy-Emmanuel Trésor Adjaho`;
        preview.hidden = false;
        openLink.href = pdf;
        openLink.setAttribute(
          "aria-label",
          `Ouvrir le PDF : ${name} (nouvel onglet)`,
        );
        downloadLink.href = pdf;
        downloadLink.setAttribute("aria-label", `Télécharger le PDF : ${name}`);
        dialog.showModal();
        document.body.classList.add("dialog-open");
        closeButton.focus();
      });
    });
    closeButton.addEventListener("click", () => dialog.close());
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        dialog.close();
    });
    dialog.addEventListener("close", () => {
      document.body.classList.remove("dialog-open");
      trigger?.focus();
    });
  }
  // Without native dialog support (or without JavaScript), certificate controls
  // remain ordinary links to the original PDFs.
})();
