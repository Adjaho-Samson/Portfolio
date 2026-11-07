(() => {
  const menuButton = document.querySelector(".menu-toggle");
  const navigation = document.querySelector(".nav-links");

  function closeMenu({ returnFocus = false } = {}) {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Ouvrir le menu");
    navigation.classList.remove("is-open");
    document.body.classList.remove("menu-open");
    if (returnFocus) menuButton.focus();
  }

  if (menuButton && navigation) {
    menuButton.addEventListener("click", () => {
      const isOpen = menuButton.getAttribute("aria-expanded") === "true";
      menuButton.setAttribute("aria-expanded", String(!isOpen));
      menuButton.setAttribute(
        "aria-label",
        isOpen ? "Ouvrir le menu" : "Fermer le menu",
      );
      navigation.classList.toggle("is-open", !isOpen);
      document.body.classList.toggle("menu-open", !isOpen);
      if (!isOpen) navigation.querySelector("a")?.focus();
    });
    navigation.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => closeMenu());
    });
    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth > 740) closeMenu();
      },
      { passive: true },
    );
    document.addEventListener("click", (event) => {
      if (
        menuButton.getAttribute("aria-expanded") === "true" &&
        !navigation.contains(event.target) &&
        !menuButton.contains(event.target)
      )
        closeMenu();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      menuButton?.getAttribute("aria-expanded") === "true"
    )
      closeMenu({ returnFocus: true });
  });

  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  const revealItems = document.querySelectorAll("[data-reveal]");
  if (reducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  } else {
    revealItems.forEach((item) => item.classList.add("hidden"));
    const observer = new IntersectionObserver(
      (entries, currentObserver) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            currentObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -35px 0px" },
    );
    revealItems.forEach((item) => observer.observe(item));
  }

  const year = document.getElementById("current-year");
  if (year) year.textContent = String(new Date().getFullYear());

  // No requests are sent until configuration is present and the visitor opts in.
  // Do Not Track and Global Privacy Control always suppress collection.
  const analyticsConfig = window.PORTFOLIO_ANALYTICS;
  const privacyBanner = document.getElementById("privacy-banner");
  const privacySettings = document.getElementById("privacy-settings");
  const privacyCopy = document.getElementById("privacy-copy");
  const privacyAccept = document.getElementById("privacy-accept");
  const privacyRefuse = document.getElementById("privacy-refuse");
  const preferenceKey = "tchatzdev.analytics.preference.v1";
  const doNotTrack =
    navigator.doNotTrack === "1" ||
    window.doNotTrack === "1" ||
    navigator.globalPrivacyControl === true;
  const analyticsUrl = String(analyticsConfig?.supabaseUrl || "").replace(
    /\/+$/,
    "",
  );
  const functionName = String(
    analyticsConfig?.functionName || "portfolio-event",
  );
  const analyticsReady = Boolean(
    analyticsUrl &&
      analyticsConfig?.publishableKey &&
      /^https:\/\//.test(analyticsUrl) &&
      /^[a-z0-9-]+$/.test(functionName) &&
      !location.pathname.endsWith("admin.html"),
  );
  let preferenceStorage;
  try {
    preferenceStorage = window.localStorage;
  } catch {
    preferenceStorage = null;
  }
  let tracker = null;
  let trackingActive = false;
  let preferences = null;
  try {
    preferences = preferenceStorage?.getItem(preferenceKey);
  } catch {
    /* ask again next visit */
  }

  const closePrivacyBanner = () => {
    if (privacyBanner) privacyBanner.hidden = true;
    privacySettings?.focus();
  };
  const openPrivacyBanner = ({ focus = true } = {}) => {
    if (!privacyBanner) return;
    if (doNotTrack) {
      if (privacyCopy)
        privacyCopy.textContent =
          "Votre navigateur signale Do Not Track ou Global Privacy Control. Aucun événement ne sera envoyé tant que cette préférence est active.";
      if (privacyAccept) privacyAccept.hidden = true;
      if (privacyRefuse) privacyRefuse.textContent = "Compris";
    }
    privacyBanner.hidden = false;
    if (focus)
      (privacyAccept && !privacyAccept.hidden
        ? privacyAccept
        : privacyRefuse
      )?.focus();
  };
  const setPreference = (value) => {
    preferences = value;
    try {
      preferenceStorage?.setItem(preferenceKey, value);
    } catch {
      /* applies for this page view */
    }
    if (value === "accepted") startAnalytics();
    else {
      trackingActive = false;
      try {
        const store = window.sessionStorage;
        store.removeItem("tchatzdev.analytics.session.v1");
        store.removeItem(
          `tchatzdev.analytics.page.v1:${location.pathname || "/"}`,
        );
      } catch {
        /* storage can be disabled */
      }
    }
    if (privacyAccept) privacyAccept.hidden = false;
    if (privacyRefuse) privacyRefuse.textContent = "Refuser";
    if (privacyBanner) privacyBanner.hidden = true;
    privacySettings?.focus();
  };

  function startAnalytics() {
    if (!analyticsReady || doNotTrack) return;
    trackingActive = true;
    if (!tracker) {
      let storage;
      try {
        storage = window.sessionStorage;
      } catch {
        storage = {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }
      const sessionKey = "tchatzdev.analytics.session.v1";
      const createSessionId = () => {
        if (window.crypto?.getRandomValues)
          return Array.from(
            window.crypto.getRandomValues(new Uint8Array(16)),
            (byte) => byte.toString(16).padStart(2, "0"),
          ).join("");
        return Array.from({ length: 32 }, () =>
          Math.floor(Math.random() * 16).toString(16),
        ).join("");
      };
      let sessionId;
      try {
        sessionId = storage.getItem(sessionKey);
        if (!sessionId) {
          sessionId = createSessionId();
          storage.setItem(sessionKey, sessionId);
        }
      } catch {
        sessionId = createSessionId();
      }
      const referrerInfo = (() => {
        if (!document.referrer)
          return { referrer_source: "direct", referrer_domain: null };
        try {
          const host = new URL(document.referrer).hostname
            .replace(/^www\./, "")
            .toLowerCase();
          const search =
            /google\.|bing\.|yahoo\.|duckduckgo\.|baidu\.|yandex\./.test(host);
          const social =
            /facebook\.|instagram\.|linkedin\.|tiktok\.|twitter\.|x\.com$|whatsapp\.|t\.co$/.test(
              host,
            );
          return {
            referrer_source: search ? "search" : social ? "social" : "referral",
            referrer_domain: host.slice(0, 120),
          };
        } catch {
          return { referrer_source: "other", referrer_domain: null };
        }
      })();
      const agent = navigator.userAgent;
      const browser = /Edg\//.test(agent)
        ? "Edge"
        : /Firefox\//.test(agent)
          ? "Firefox"
          : /CriOS|Chrome\//.test(agent)
            ? "Chrome"
            : /Safari\//.test(agent)
              ? "Safari"
              : /Opera|OPR\//.test(agent)
                ? "Opera"
                : "Other";
      const device = /iPad|Tablet|PlayBook|Silk/i.test(agent)
        ? "tablet"
        : /Mobi|Android/i.test(agent)
          ? "mobile"
          : "desktop";
      const send = (eventType, projectSlug = null) => {
        if (!trackingActive) return;
        const body = {
          event_type: eventType,
          session_id: sessionId,
          path: location.pathname || "/",
          project_slug: projectSlug,
          ...referrerInfo,
          device_category: device,
          browser,
        };
        fetch(`${analyticsUrl}/functions/v1/${functionName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: analyticsConfig.publishableKey,
          },
          body: JSON.stringify(body),
          keepalive: true,
          credentials: "omit",
        }).catch(() => {});
      };
      tracker = { storage, sessionKey, send };
      document.querySelectorAll("[data-track-project]").forEach((link) => {
        if (link.dataset.analyticsBound) return;
        link.dataset.analyticsBound = "true";
        link.addEventListener("click", () =>
          send("project_click", link.dataset.trackProject),
        );
      });
      document
        .querySelectorAll("[data-track-music-download]")
        .forEach((link) => {
          if (link.dataset.analyticsBound) return;
          link.dataset.analyticsBound = "true";
          link.addEventListener("click", () => send("music_download"));
        });
      const projectCards = [
        ...document.querySelectorAll("[data-track-project-view]"),
      ];
      if (projectCards.length && "IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
          (entries, currentObserver) => {
            entries.forEach((entry) => {
              if (!entry.isIntersecting || entry.intersectionRatio < 0.55)
                return;
              const slug = entry.target.dataset.trackProjectView;
              const seenKey = `tchatzdev.analytics.project-view.v1:${slug}`;
              try {
                if (!storage.getItem(seenKey)) {
                  storage.setItem(seenKey, "1");
                  send("project_view", slug);
                }
              } catch {
                send("project_view", slug);
              }
              currentObserver.unobserve(entry.target);
            });
          },
          { threshold: 0.55 },
        );
        projectCards.forEach((card) => observer.observe(card));
      }
    }
    const pageSeenKey = `tchatzdev.analytics.page.v1:${location.pathname || "/"}`;
    try {
      if (!tracker.storage.getItem(pageSeenKey)) {
        tracker.storage.setItem(pageSeenKey, "1");
        tracker.send("page_view");
      }
    } catch {
      tracker.send("page_view");
    }
  }

  if (analyticsReady && privacySettings && privacyBanner) {
    privacySettings.hidden = false;
    privacySettings.addEventListener("click", openPrivacyBanner);
    privacyAccept?.addEventListener("click", () =>
      doNotTrack ? closePrivacyBanner() : setPreference("accepted"),
    );
    privacyRefuse?.addEventListener("click", () =>
      doNotTrack ? closePrivacyBanner() : setPreference("refused"),
    );
    if (doNotTrack) {
      // Do not prompt or collect when the browser has explicitly opted out.
    } else if (preferences === "accepted") startAnalytics();
    else if (!preferences) openPrivacyBanner({ focus: false });
  }

  // The PDF viewer keeps keyboard focus predictable and retains the existing
  // certification links/downloads instead of replacing them.
  const modal = document.getElementById("cert-modal");
  const viewer = document.getElementById("cert-viewer");
  const closeButton = document.getElementById("cert-close");
  if (modal && viewer) {
    let previouslyFocused = null;
    const closeModal = () => {
      if (modal.getAttribute("aria-hidden") !== "false") return;
      viewer.src = "";
      modal.setAttribute("aria-hidden", "true");
      document.body.classList.remove("menu-open");
      previouslyFocused?.focus();
    };
    const openModal = (pdf, trigger) => {
      if (!pdf) return;
      previouslyFocused = trigger;
      viewer.src = encodeURI(pdf);
      modal.setAttribute("aria-hidden", "false");
      document.body.classList.add("menu-open");
      closeButton?.focus();
    };
    document.querySelectorAll(".certification-card").forEach((card) => {
      const viewButton = card.querySelector(".btn-view");
      viewButton?.addEventListener("click", () =>
        openModal(card.dataset.pdf, viewButton),
      );
    });
    closeButton?.addEventListener("click", closeModal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) closeModal();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeModal();
      if (
        event.key === "Tab" &&
        modal.getAttribute("aria-hidden") === "false"
      ) {
        const focusable = [...modal.querySelectorAll("button, iframe")].filter(
          (node) => !node.disabled,
        );
        if (event.shiftKey && document.activeElement === focusable[0]) {
          event.preventDefault();
          focusable.at(-1)?.focus();
        } else if (
          !event.shiftKey &&
          document.activeElement === focusable.at(-1)
        ) {
          event.preventDefault();
          focusable[0]?.focus();
        }
      }
    });
  }
})();
