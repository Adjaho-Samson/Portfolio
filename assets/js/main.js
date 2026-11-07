/* Navigation, constellation de compétences, téléchargement APK et visionneuse
   de certificats. Aucune requête réseau, aucune mesure d'audience. */
(() => {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------------------------------------------------------- Menu -- */
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
    // Le panneau n'est pas modal : il se referme quand le focus le quitte.
    document.addEventListener("focusin", (event) => {
      if (!header.contains(event.target)) setOpen(false);
    });
  }

  /* ------------------------------------------------------------ Année ---- */
  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------- Constellation ----- */
  /* Les orbites tournent en CSS. Ce script ne fait que : figer le système au
     survol, révéler le nom de la compétence pointée, proposer une pause
     explicite au clavier et couper l'animation si la personne la refuse. */
  document.querySelectorAll("[data-constellation]").forEach((scene) => {
    // La légende et la pause vivent à côté de la scène, dans la même figure.
    const figure = scene.closest(".constellation-figure") ?? scene.parentElement;
    const captionName = figure?.querySelector("[data-caption-name]");
    const captionKind = figure?.querySelector("[data-caption-kind]");
    const total = scene.querySelectorAll(".satellite").length;
    const pauseButton = figure?.querySelector("[data-orbit-pause]");
    const pauseLabel = pauseButton?.querySelector("[data-orbit-pause-label]");
    const restName = total ? `${total} compétences` : "Compétences";
    const restKind = "Web, mobile et systèmes";

    const describe = (node) => {
      if (!captionName || !captionKind) return;
      const name = node?.dataset.name;
      const kind = node?.dataset.kind;
      captionName.textContent = name || restName;
      captionKind.textContent = kind || restKind;
    };

    scene.querySelectorAll(".satellite").forEach((node) => {
      // Le pointeur peut traverser la pastille en mouvement : on écoute la
      // scène entière et on résout la compétence réellement survolée.
      node.addEventListener("pointerenter", () => {
        describe(node);
        scene.classList.add("is-frozen");
      });
      node.addEventListener("pointerleave", () => {
        scene.classList.remove("is-frozen");
        if (!node.contains(document.activeElement)) describe(null);
      });
      node.addEventListener("focus", () => describe(node));
      node.addEventListener("blur", () => describe(null));
    });
    // Sur écran tactile, le nom reste affiché après un appui.
    scene.addEventListener("click", (event) => {
      const node = event.target.closest(".satellite");
      if (node) describe(node);
    });

    if (motion.matches) {
      scene.dataset.paused = "true";
      if (pauseButton) {
        pauseButton.hidden = true;
      }
    } else if (pauseButton) {
      pauseButton.addEventListener("click", () => {
        const paused = pauseButton.getAttribute("aria-pressed") === "true";
        pauseButton.setAttribute("aria-pressed", String(!paused));
        scene.dataset.paused = String(!paused);
        if (pauseLabel) {
          pauseLabel.textContent = paused
            ? "Mettre en pause"
            : "Reprendre le mouvement";
        }
      });
    }
    motion.addEventListener?.("change", (event) => {
      if (!event.matches) return;
      scene.dataset.paused = "true";
      scene.classList.remove("is-frozen");
      if (pauseButton) pauseButton.hidden = true;
      describe(null);
    });
  });

  /* ------------------------------------------------ Téléchargement APK -- */
  /* Le lien est un vrai fichier servi par le site : aucun script ne fabrique
     d'URL ni ne simule une fin de téléchargement. On indique seulement le
     contexte matériel (aucune version PC) et l'état du fichier. */
  document.querySelectorAll("[data-download]").forEach((panel) => {
    const link = panel.querySelector('a[download]');
    const status = panel.querySelector("[data-download-status]");
    if (!link || !status) return;
    const fileName = link.getAttribute("download") || "l’application";
    const isAndroid = /Android/i.test(navigator.userAgent);
    link.addEventListener("click", () => {
      status.hidden = false;
      status.textContent = isAndroid
        ? `Téléchargement de ${fileName} lancé. Ouvrez le fichier depuis la notification ou le dossier Téléchargements pour installer l’application.`
        : `Téléchargement de ${fileName} lancé dans le dossier Téléchargements. Ce fichier s’installe uniquement sur Android.`;
    });
  });

  /* ------------------------------------------------------ Révélations --- */
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
      // Le contenu au-dessus de la ligne de flottaison n'attend jamais.
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

  /* -------------------------------------------------- Certification ----- */
  const dialog = document.getElementById("certificate-dialog");
  const preview = document.getElementById("certificate-preview");
  const closeButton = document.getElementById("certificate-close");
  if (dialog && preview && closeButton && typeof dialog.showModal === "function") {
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
  // Sans dialogue natif (ou sans JavaScript), les contrôles restent des liens
  // vers les PDF originaux.
})();
