const menuBtn = document.querySelector(".menu-btn");
const navLinks = document.querySelector(".nav-links");

if (menuBtn && navLinks) {
  menuBtn.setAttribute("aria-expanded", "false");
  menuBtn.addEventListener("click", () => {
    const opened = navLinks.classList.toggle("active");
    // also toggle a body-level flag to ensure menu is visible above everything
    document.body.classList.toggle("menu-open", opened);
    menuBtn.textContent = opened ? "✕" : "☰";
    menuBtn.setAttribute("aria-expanded", opened ? "true" : "false");
    if (opened) {
      const first = navLinks.querySelector("a");
      if (first) first.focus();
    } else {
      menuBtn.focus();
    }
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("active");
      document.body.classList.remove("menu-open");
      menuBtn.textContent = "☰";
      menuBtn.setAttribute("aria-expanded", "false");
    });
  });
}

// Intersection observer for reveal animations (guarded)
const sections = document.querySelectorAll(".section");
if (sections.length > 0 && "IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add("show");
      });
    },
    { threshold: 0.15 },
  );
  sections.forEach((section) => {
    section.classList.add("hidden");
    observer.observe(section);
  });
}

// Accessibility: close menus/modals on Escape (example for future modals)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (navLinks && navLinks.classList.contains("active")) {
      navLinks.classList.remove("active");
      if (menuBtn) {
        menuBtn.textContent = "☰";
        menuBtn.setAttribute("aria-expanded", "false");
        menuBtn.focus();
      }
    }
  }
});

/* Particles background (lightweight) */
(function initParticles() {
  const canvas = document.getElementById("particles");
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext("2d");

  let w = innerWidth;
  let h = innerHeight;
  let DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  ctx.scale(DPR, DPR);

  const particles = [];
  const area = w * h;
  const base = Math.floor(area / 90000);
  const maxCount = w < 700 ? 40 : 120;
  const count = Math.max(20, Math.min(maxCount, base));

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }
  for (let i = 0; i < count; i++)
    particles.push({
      x: rand(0, w),
      y: rand(0, h),
      vx: rand(-0.3, 0.3),
      vy: rand(-0.6, 0.6),
      r: rand(0.6, 1.6),
    });

  let resizeTimeout = null;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        w = innerWidth;
        h = innerHeight;
        DPR = Math.min(2, window.devicePixelRatio || 1);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        canvas.width = Math.floor(w * DPR);
        canvas.height = Math.floor(h * DPR);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(DPR, DPR);
      }, 120);
    },
    { passive: true },
  );

  let frame = 0;
  function step() {
    frame++;
    ctx.clearRect(0, 0, w, h);
    for (let p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.x < 0) p.x = w;
      if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h;
      if (p.y > h) p.y = 0;
      ctx.beginPath();
      ctx.fillStyle = "rgba(255,43,43,0.9)";
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // connect close particles, run less often to save CPU
    if (frame % 3 === 0) {
      const threshold = 90 * 90; // squared distance threshold (~90px)
      for (let i = 0; i < particles.length; i++) {
        const a = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < threshold) {
            const alpha = Math.max(0, 0.12 - (d2 / threshold) * 0.12);
            ctx.strokeStyle = "rgba(255,43,43," + alpha + ")";
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    requestAnimationFrame(step);
  }
  step();
})();

// Close mobile menu when switching to larger viewports to avoid hidden nav
window.addEventListener(
  "resize",
  () => {
    try {
      if (window.innerWidth > 900) {
        if (navLinks && navLinks.classList.contains("active"))
          navLinks.classList.remove("active");
        document.body.classList.remove("menu-open");
        if (menuBtn) {
          menuBtn.setAttribute("aria-expanded", "false");
          menuBtn.textContent = "☰";
        }
      }
    } catch (e) {
      /* ignore */
    }
  },
  { passive: true },
);

/* Name reveal (split into chars and animate) */
(function animateNameReveal() {
  const nameText = document.querySelector("#main-name .name-text");
  if (!nameText) return;
  if (nameText.dataset.animated) return;
  const txt = nameText.textContent.trim();
  nameText.textContent = "";
  for (let i = 0; i < txt.length; i++) {
    const ch = txt[i] === " " ? "\u00A0" : txt[i];
    const span = document.createElement("span");
    span.className = "char";
    span.textContent = ch;
    span.style.animation = `char-reveal 0.82s cubic-bezier(.2,.9,.2,1) ${(i * 0.03).toFixed(2)}s both`;
    nameText.appendChild(span);
  }
  nameText.dataset.animated = "1";
})();

/* Collapse effect: horizontal slices that fall (system collapse) */
(function initCollapse() {
  const canvas = document.getElementById("collapse");
  if (!canvas || !canvas.getContext) return;
  if (window.innerWidth < 700) return; // disable on small screens
  const ctx = canvas.getContext("2d");
  let w = (canvas.width = innerWidth);
  let h = (canvas.height = innerHeight);
  let DPR = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.floor(w * DPR);
  canvas.height = Math.floor(h * DPR);
  canvas.style.width = w + "px";
  canvas.style.height = h + "px";
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  const slices = [];
  let animating = false;

  function spawnBurst() {
    const burst = Math.floor(rand(6, 18));
    for (let i = 0; i < burst; i++) {
      const y = rand(0, h * 0.8);
      const sh = Math.floor(rand(6, 90));
      slices.push({
        x: 0,
        y: y,
        h: sh,
        vy: rand(2, 7),
        rot: rand(-0.08, 0.08),
        alpha: 1,
        wobble: rand(0.2, 1.2),
      });
    }
    animating = true;
  }

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  let last = performance.now();
  function frame(t) {
    const dt = t - last;
    last = t;
    ctx.clearRect(0, 0, w, h);
    if (slices.length === 0) {
      animating = false;
    } else {
      animating = true;
    }
    for (let i = slices.length - 1; i >= 0; i--) {
      const s = slices[i];
      s.y += s.vy * (dt / 16);
      s.vy += 0.08 * (dt / 16);
      s.rot += 0.002 * (dt / 16) * (s.wobble > 0.8 ? 1 : 0.6);
      s.alpha -= 0.006 * (dt / 16);
      if (s.alpha <= 0 || s.y > h + s.h) {
        slices.splice(i, 1);
        continue;
      }
      // draw slice
      ctx.save();
      ctx.translate(w / 2, s.y + s.h / 2);
      ctx.rotate(s.rot);
      ctx.globalAlpha = Math.max(0, s.alpha);
      const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
      grad.addColorStop(0, "rgba(10,3,3,0)");
      grad.addColorStop(0.3, "rgba(255,43,43,0.12)");
      grad.addColorStop(1, "rgba(30,10,10,0.06)");
      ctx.fillStyle = grad;
      ctx.fillRect(-w / 2, -s.h / 2, w, s.h);
      // subtle noise lines
      ctx.strokeStyle = "rgba(255,80,80,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -s.h / 4);
      ctx.lineTo(w / 2, -s.h / 4);
      ctx.moveTo(-w / 2, s.h / 6);
      ctx.lineTo(w / 2, s.h / 6);
      ctx.stroke();
      ctx.restore();
    }
    if (animating) requestAnimationFrame(frame);
  }

  // start loop when a burst exists
  function schedule() {
    spawnBurst();
    if (!animating) requestAnimationFrame(frame);
    // schedule next burst with some randomness
    setTimeout(schedule, Math.floor(rand(4000, 9000)));
  }

  // initial small delay
  setTimeout(() => {
    schedule();
  }, 1200);

  // resize handling
  let to = null;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(to);
      to = setTimeout(() => {
        w = innerWidth;
        h = innerHeight;
        DPR = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.floor(w * DPR);
        canvas.height = Math.floor(h * DPR);
        canvas.style.width = w + "px";
        canvas.style.height = h + "px";
        ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
        slices.length = 0;
      }, 120);
    },
    { passive: true },
  );
})();

/* Certificate modal viewer */
(function initCertModal() {
  const modal = document.getElementById("cert-modal");
  const viewer = document.getElementById("cert-viewer");
  const closeBtn = document.getElementById("cert-close");
  if (!modal || !viewer) return;

  function openModal(url) {
    try {
      viewer.src = url ? encodeURI(url) : "";
    } catch (e) {
      viewer.src = url || "";
    }
    modal.setAttribute("aria-hidden", "false");
    closeBtn && closeBtn.focus();
  }
  function closeModal() {
    viewer.src = "";
    modal.setAttribute("aria-hidden", "true");
  }

  document.querySelectorAll(".certification-card").forEach((card) => {
    const btn = card.querySelector(".btn-view");
    const pdf = card.dataset.pdf;
    if (btn)
      btn.addEventListener("click", () => {
        if (pdf) openModal(pdf);
        else window.open(pdf || "#", "_blank");
      });
  });

  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.getAttribute("aria-hidden") === "false")
      closeModal();
  });
})();
