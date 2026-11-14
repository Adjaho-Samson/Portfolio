/* TchatzDev — couche d'interaction et de mouvement.
   Aucune requête réseau, aucune mesure d'audience : tout est servi par le site.
   Organisation :
     01. Environnement et préférences
     02. Préchargeur
     03. Défilement doux (Lenis) et barre de progression
     04. Curseur personnalisé (pointeur fin uniquement)
     05. En-tête, menu et section active
     06. Révélations (GSAP + ScrollTrigger, repli sans animation)
     07. Parallaxe
     08. Micro-interactions (cartes, boutons magnétiques, compteurs)
     09. Constellation de compétences
     10. Téléchargement APK
     11. Visionneuse de certificats
     12. Divers (année, retour en haut, préférences)
*/
(() => {
  "use strict";

  /* 01. Environnement ----------------------------------------------------- */
  const root = document.documentElement;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const desktop = window.matchMedia("(min-width: 1050px)");
  const saveData = navigator.connection?.saveData === true;
  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  const Lenis = window.Lenis;
  const canAnimate = Boolean(gsap && ScrollTrigger) && !reduceMotion.matches;
  const blocked = () => reduceMotion.matches || saveData;
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  if (gsap && ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  /* 02. Préchargeur ------------------------------------------------------- */
  /* Le voile ne retarde jamais la lecture : il disparaît au chargement complet
     et, au pire, après 2,4 s. */
  const preloader = $("[data-preloader]");
  if (preloader) {
    const bar = $(".preloader-bar > span", preloader);
    const count = $(".preloader-count", preloader);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (bar) bar.style.width = "100%";
      if (count) count.textContent = "100 %";
      preloader.dataset.state = "done";
      root.classList.remove("is-loading");
      window.setTimeout(() => {
        preloader.hidden = true;
      }, 900);
      window.dispatchEvent(new CustomEvent("tchatz:revealed"));
    };
    if (blocked()) {
      finish();
    } else {
      let progress = 0;
      const tick = () => {
        // Le chargement complet peut arriver entre deux battements : sans ce
        // garde, la barre reculerait pendant la disparition du voile.
        if (done) return;
        progress = Math.min(progress + Math.random() * 15 + 7, 92);
        if (bar) bar.style.width = `${progress}%`;
        if (count) count.textContent = `${String(Math.round(progress)).padStart(2, "0")} %`;
        window.setTimeout(tick, 90 + Math.random() * 110);
      };
      tick();
      if (document.readyState === "complete") window.setTimeout(finish, 260);
      else window.addEventListener("load", () => window.setTimeout(finish, 180), { once: true });
      window.setTimeout(finish, 2400);
    }
  } else {
    root.classList.remove("is-loading");
  }

  /* 03. Défilement doux et progression ------------------------------------ */
  const progressBar = $("[data-progress]");
  const header = $(".site-header");
  let lenis = null;
  let headerHidden = false;
  let lastScroll = window.scrollY || 0;
  // L'en-tête ne se masque qu'après un geste réel de la personne : un
  // rechargement avec position restaurée ou une ancre ne le fait jamais
  // disparaître, et il reste toujours accessible au clavier.
  let userIntent = false;
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach((type) => {
    window.addEventListener(type, () => {
      userIntent = true;
    }, { passive: true, once: true });
  });

  const onScrollFrame = (scrolled, limit) => {
    if (progressBar) {
      const ratio = limit > 0 ? Math.min(scrolled / limit, 1) : 0;
      progressBar.style.transform = `scaleX(${ratio.toFixed(4)})`;
    }
    if (!header) return;
    header.classList.toggle("is-scrolled", scrolled > 12);
    const goingDown = scrolled > lastScroll + 2;
    const goingUp = scrolled < lastScroll - 2;
    lastScroll = scrolled;
    if (goingUp && headerHidden) {
      headerHidden = false;
      header.classList.remove("is-hidden");
    } else if (
      goingDown &&
      userIntent &&
      scrolled > 480 &&
      !headerHidden &&
      !header.classList.contains("is-menu-open")
    ) {
      headerHidden = true;
      header.classList.add("is-hidden");
    }
  };

  /* Lenis n'est activé que sur un pointeur fin, sans préférence de réduction
     et hors mode économie de données. Le clavier et les ancres natives
     continuent de fonctionner dans tous les cas. */
  const useSmooth = Boolean(Lenis) && canAnimate && finePointer.matches && !saveData;
  if (useSmooth) {
    lenis = new Lenis({
      lerp: 0.1,
      wheelMultiplier: 1,
      touchMultiplier: 1.6,
      smoothWheel: true,
      syncTouch: false,
    });
    lenis.on("scroll", ({ scroll, limit }) => {
      onScrollFrame(scroll, limit);
      ScrollTrigger?.update();
    });
    const raf = (time) => {
      lenis.raf(time);
      window.requestAnimationFrame(raf);
    };
    window.requestAnimationFrame(raf);
    root.classList.add("has-smooth-scroll");
  }

  let framePending = false;
  const refreshScrollState = () => {
    if (framePending) return;
    framePending = true;
    window.requestAnimationFrame(() => {
      framePending = false;
      const scrolled = window.scrollY || root.scrollTop;
      const limit = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      onScrollFrame(scrolled, limit);
    });
  };
  window.addEventListener("scroll", refreshScrollState, { passive: true });
  window.addEventListener("resize", refreshScrollState, { passive: true });
  refreshScrollState();

  const scrollToTarget = (target, offset = 0) => {
    if (lenis) {
      lenis.scrollTo(target, { offset, duration: 1.1 });
      return;
    }
    if (target === 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const node = typeof target === "string" ? document.querySelector(target) : target;
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  /* 04. Curseur personnalisé ---------------------------------------------- */
  if (finePointer.matches && !blocked()) {
    const ring = $("[data-cursor]");
    const dot = $("[data-cursor-dot]");
    if (ring && dot) {
      root.classList.add("has-custom-cursor");
      let x = window.innerWidth / 2;
      let y = window.innerHeight / 2;
      let ringX = x;
      let ringY = y;
      let visible = null;
      const render = () => {
        ringX += (x - ringX) * 0.18;
        ringY += (y - ringY) * 0.18;
        ring.style.transform = `translate3d(${ringX.toFixed(1)}px, ${ringY.toFixed(1)}px, 0)`;
        dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        window.requestAnimationFrame(render);
      };
      window.requestAnimationFrame(render);
      const setVisible = (value) => {
        if (value === visible) return;
        visible = value;
        ring.style.opacity = value ? "1" : "0";
        dot.style.opacity = value ? "1" : "0";
      };
      setVisible(false);  // état initial explicite : jamais visible avant la souris
      const interactive = "a, button, [role='button'], summary, .satellite, input, label, select";
      const isView = (node) => Boolean(node.closest(".project-card, .certificate-image, .portrait-frame"));
      document.addEventListener("pointermove", (event) => {
        if (event.pointerType && event.pointerType !== "mouse") return;
        x = event.clientX;
        y = event.clientY;
        setVisible(true);
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;
        const label = target.closest("[data-cursor-label]")?.dataset.cursorLabel || "";
        const view = !label && isView(target);
        ring.dataset.mode = label || (view ? "view" : target.closest(interactive) ? "link" : "");
        ring.dataset.label = label || (view ? "Voir" : "");
      });
      document.addEventListener("mouseleave", () => setVisible(false));
      document.addEventListener("mouseenter", () => setVisible(true));
      window.addEventListener("blur", () => setVisible(false));
    }
  }

  /* 05. En-tête, menu et section active ----------------------------------- */
  const menuButton = $(".menu-toggle");
  const navigation = $(".navigation");
  if (header && menuButton && navigation) {
    header.classList.add("nav-ready");
    const setOpen = (open, returnFocus = false) => {
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      navigation.classList.toggle("is-open", open);
      header.classList.toggle("is-menu-open", open);
      root.classList.toggle("is-locked", open && !desktop.matches);
      navigation.inert = !open && !desktop.matches;
      if (open) {
        if (lenis) lenis.stop();
        navigation.querySelector("a")?.focus({ preventScroll: true });
      } else {
        if (lenis) lenis.start();
        if (returnFocus) menuButton.focus();
      }
    };
    setOpen(false);
    menuButton.addEventListener("click", () => {
      setOpen(menuButton.getAttribute("aria-expanded") !== "true");
    });
    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => setOpen(false));
    });
    desktop.addEventListener("change", () => setOpen(false));
    document.addEventListener("click", (event) => {
      if (!header.contains(event.target)) setOpen(false);
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuButton.getAttribute("aria-expanded") === "true") {
        setOpen(false, true);
      }
    });
    // Le panneau n'est pas modal : il se referme quand le focus le quitte.
    document.addEventListener("focusin", (event) => {
      if (menuButton.getAttribute("aria-expanded") !== "true") return;
      if (!header.contains(event.target)) setOpen(false);
    });
    navigation.addEventListener("keydown", (event) => {
      if (event.key === "Tab" && desktop.matches) setOpen(false);
    });
  }

  // Liens internes : défilement doux et focus déplacé sur la cible.
  document.addEventListener("click", (event) => {
    const link = event.target instanceof Element ? event.target.closest('a[href^="#"]') : null;
    if (!link || event.metaKey || event.ctrlKey || event.shiftKey || event.button > 0) return;
    const hash = link.getAttribute("href");
    if (!hash || hash.length < 2) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (!target) return;
    const samePage = link.pathname === "" || link.pathname === window.location.pathname;
    // Un lien interne ne doit jamais empêcher le navigateur de changer de page.
    if (!samePage) return;
    event.preventDefault();
    scrollToTarget(target, -14);
    history.pushState(null, "", hash);
    target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  // Indication de la section consultée dans la navigation de l'accueil.
  const sectionLinks = $$(".nav-links a[data-section]");
  if (sectionLinks.length && "IntersectionObserver" in window) {
    const sections = sectionLinks
      .map((link) => document.getElementById(link.dataset.section))
      .filter(Boolean);
    const setActive = (id) => {
      sectionLinks.forEach((link) => {
        if (link.dataset.section === id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };
    const visible = new Map();
    const watcher = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.set(entry.target.id, entry.intersectionRatio);
          else visible.delete(entry.target.id);
        });
        if (!visible.size) return setActive("");
        const best = [...visible.entries()].sort((a, b) => b[1] - a[1])[0][0];
        setActive(best);
      },
      { rootMargin: "-32% 0px -48% 0px", threshold: [0, 0.2, 0.5, 0.85] },
    );
    sections.forEach((section) => watcher.observe(section));
  }

  /* 06. Révélations ------------------------------------------------------- */
  const revealNodes = $$("[data-reveal]");
  const splitTargets = $$('[data-split-lines] .line > span');

  const revealAll = () => {
    revealNodes.forEach((node) => {
      node.style.opacity = "";
      node.style.transform = "";
    });
    $$("[data-stagger] > *").forEach((child) => {
      child.style.opacity = "";
      child.style.transform = "";
    });
    splitTargets.forEach((span) => {
      span.style.transform = "";
    });
  };

  if (canAnimate) {
    const hero = $("[data-hero]");
    const heroLines = $$(".hero-title .line > span", hero || document);
    const heroBits = $$("[data-hero-item]", hero || document);
    const portrait = $("[data-hero-portrait]");

    const intro = () => {
      if (!gsap) return;
      if (heroLines.length) {
        gsap.set(heroLines, { yPercent: 115, opacity: 0 });
        gsap.set(heroBits, { y: 20, opacity: 0 });
        if (portrait) gsap.set(portrait, { scale: 0.95, opacity: 0, y: 24 });
        const timeline = gsap.timeline({ defaults: { ease: "power3.out" } });
        timeline
          .to(heroLines, { yPercent: 0, opacity: 1, duration: 1.15, stagger: 0.09, clearProps: "transform" }, 0.08)
          .to(heroBits, { y: 0, opacity: 1, duration: 0.85, stagger: 0.08, clearProps: "transform" }, 0.4);
        if (portrait) {
          timeline.to(
            portrait,
            { scale: 1, opacity: 1, y: 0, duration: 1.2, clearProps: "transform" },
            0.3,
          );
        }
      }
    };

    if (preloader && preloader.dataset.state !== "done") {
      window.addEventListener("tchatz:revealed", intro, { once: true });
    } else {
      intro();
    }

    // Éléments révélés au défilement (une seule fois).
    revealNodes.forEach((node) => {
      if (hero && node.closest("[data-hero]")) return;
      const children = node.hasAttribute("data-stagger") ? [...node.children] : null;
      const targets = children && children.length ? children : [node];
      let shown = false;
      const show = () => {
        if (shown) return;
        shown = true;
        gsap.to(targets, {
          opacity: 1,
          y: 0,
          duration: 0.85,
          ease: "power3.out",
          stagger: 0.07,
          clearProps: "transform",
          overwrite: true,
        });
      };
      gsap.set(targets, { opacity: 0, y: 24 });
      ScrollTrigger.create({ trigger: node, start: "top 90%", once: true, onEnter: show });
      // Si l'élément est déjà au-dessus du seuil au chargement (ancre, retour
      // arrière), il ne doit jamais rester invisible.
      if (node.getBoundingClientRect().top < window.innerHeight * 0.9) show();
    });

    // Titres découpés en lignes.
    $$("[data-split-lines]").forEach((node) => {
      const spans = $$(".line > span", node);
      if (!spans.length || (hero && node.closest("[data-hero]"))) return;
      let shown = false;
      const show = () => {
        if (shown) return;
        shown = true;
        gsap.to(spans, { yPercent: 0, duration: 0.95, ease: "power3.out", stagger: 0.075, clearProps: "transform" });
      };
      gsap.set(spans, { yPercent: 105 });
      ScrollTrigger.create({ trigger: node, start: "top 88%", once: true, onEnter: show });
      if (node.getBoundingClientRect().top < window.innerHeight * 0.88) show();
    });

    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener("load", () => window.setTimeout(() => ScrollTrigger.refresh(), 300));
  } else {
    revealAll();
  }

  /* 07. Parallaxe --------------------------------------------------------- */
  if (canAnimate) {
    $$("[data-parallax]").forEach((node) => {
      const depth = Number(node.dataset.parallax) || 0.12;
      if (!desktop.matches) return;
      gsap.fromTo(
        node,
        { yPercent: -depth * 40 },
        {
          yPercent: depth * 40,
          ease: "none",
          scrollTrigger: {
            trigger: node.closest("[data-parallax-scope]") || node,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    });
    if (desktop.matches && !saveData) {
      $$(".project-media img").forEach((image) => {
        gsap.fromTo(
          image,
          { scale: 1.1 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: {
              trigger: image.closest(".project-card"),
              start: "top bottom",
              end: "top 40%",
              scrub: true,
            },
          },
        );
      });
    }
  }

  /* 08. Micro-interactions ------------------------------------------------ */
  if (finePointer.matches && !reduceMotion.matches) {
    // Halo qui suit le pointeur sur les cartes de projets.
    $$(".project-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        if (event.pointerType && event.pointerType !== "mouse") return;
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${(((event.clientX - rect.left) / rect.width) * 100).toFixed(2)}%`);
        card.style.setProperty("--my", `${(((event.clientY - rect.top) / rect.height) * 100).toFixed(2)}%`);
      });
    });
    // Boutons magnétiques : déplacement très léger, jamais indispensable.
    if (canAnimate) {
      $$("[data-magnetic]").forEach((node) => {
        const strength = 0.22;
        node.addEventListener("pointermove", (event) => {
          if (event.pointerType && event.pointerType !== "mouse") return;
          const rect = node.getBoundingClientRect();
          gsap.to(node, {
            x: (event.clientX - (rect.left + rect.width / 2)) * strength,
            y: (event.clientY - (rect.top + rect.height / 2)) * strength,
            duration: 0.45,
            ease: "power2.out",
            overwrite: "auto",
          });
        });
        node.addEventListener("pointerleave", () => {
          gsap.to(node, { x: 0, y: 0, duration: 0.7, ease: "elastic.out(1, 0.5)", overwrite: "auto" });
        });
      });
    }
  }

  // Compteurs : uniquement des valeurs réelles fournies dans le contenu.
  const counters = $$("[data-count]");
  if (counters.length) {
    const showFinal = (node) => {
      node.textContent = node.dataset.count;
    };
    if (canAnimate && "IntersectionObserver" in window) {
      const watcher = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const node = entry.target;
            watcher.unobserve(node);
            const value = Number(node.dataset.count);
            if (!Number.isFinite(value)) return showFinal(node);
            const suffix = node.dataset.countSuffix || "";
            const state = { value: 0 };
            gsap.to(state, {
              value,
              duration: 1.3,
              ease: "power2.out",
              onUpdate: () => {
                node.textContent = `${Math.round(state.value)}${suffix}`;
              },
              onComplete: () => showFinal(node),
            });
          });
        },
        { threshold: 0.55 },
      );
      counters.forEach((node) => watcher.observe(node));
    } else {
      counters.forEach(showFinal);
    }
  }

  /* 09. Constellation ----------------------------------------------------- */
  /* Les orbites tournent en CSS. Ce script fige le système au survol, révèle
     le nom de la compétence pointée, propose une pause explicite et coupe
     l'animation si la personne refuse le mouvement. */
  $$("[data-constellation]").forEach((scene) => {
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
      captionName.textContent = node?.dataset.name || restName;
      captionKind.textContent = node?.dataset.kind || restKind;
    };

    scene.querySelectorAll(".satellite").forEach((node) => {
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
    scene.addEventListener("click", (event) => {
      const node = event.target.closest(".satellite");
      if (node) describe(node);
    });

    if (blocked()) {
      scene.dataset.paused = "true";
      if (pauseButton) pauseButton.hidden = true;
    } else if (pauseButton) {
      pauseButton.hidden = false;
      pauseButton.addEventListener("click", () => {
        const paused = pauseButton.getAttribute("aria-pressed") === "true";
        pauseButton.setAttribute("aria-pressed", String(!paused));
        scene.dataset.paused = String(!paused);
        if (pauseLabel) pauseLabel.textContent = paused ? "Mettre en pause" : "Reprendre le mouvement";
      });
    }
  });

  /* 10. Téléchargement APK ------------------------------------------------ */
  /* Le lien est un vrai fichier servi par le site : aucun script ne fabrique
     d'URL ni ne simule une fin de téléchargement. On indique seulement le
     contexte matériel et l'état du fichier. */
  $$("[data-download]").forEach((panel) => {
    const link = panel.querySelector("a[download]");
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

  /* 11. Visionneuse de certificats ---------------------------------------- */
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
        openLink.setAttribute("aria-label", `Ouvrir le PDF : ${name} (nouvel onglet)`);
        downloadLink.href = pdf;
        downloadLink.setAttribute("aria-label", `Télécharger le PDF : ${name}`);
        dialog.showModal();
        document.body.classList.add("dialog-open");
        if (lenis) lenis.stop();
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
      if (lenis) lenis.start();
      trigger?.focus();
    });
  }
  // Sans dialogue natif (ou sans JavaScript), les contrôles restent des liens
  // vers les PDF originaux.

  /* 12. Divers ------------------------------------------------------------ */
  $$("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
  $$("[data-to-top]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToTarget(0);
      $("main")?.focus({ preventScroll: true });
    });
  });
  // Un changement de préférence système fige immédiatement les mouvements.
  reduceMotion.addEventListener?.("change", (event) => {
    if (!event.matches) return;
    revealAll();
    $$("[data-constellation]").forEach((scene) => {
      scene.dataset.paused = "true";
    });
    $$("[data-orbit-pause]").forEach((button) => {
      button.hidden = true;
    });
  });
})();
