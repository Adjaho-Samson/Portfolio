(() => {
  const byId = (id) => document.getElementById(id);
  const loginView = byId("login-view");
  const dashboardView = byId("dashboard-view");
  const form = byId("login-form");
  const loginMessage = byId("login-message");
  const loginButton = form?.querySelector("button[type=submit]");
  const config = window.PORTFOLIO_ANALYTICS;
  const storageKey = "tchatzdev.admin.session.v1";
  const labels = {
    "/": "Accueil",
    "/index.html": "Accueil",
    "/certification.html": "Certifications",
    tchatzsafe: "TchatzSafe",
    "tchatz-klassio": "Tchatz Klassio",
    speedtype: "SpeedType",
    trinahook: "Trina Hook",
    princeart: "Prince Art",
    direct: "Accès direct",
    search: "Moteur de recherche",
    social: "Réseau social",
    referral: "Autre site",
    other: "Autre",
    desktop: "Ordinateur",
    mobile: "Mobile",
    tablet: "Tablette",
  };
  const state = { accessToken: null, days: 30, loading: false };

  const setLoginMessage = (text, isError = true) => {
    if (!loginMessage) return;
    loginMessage.textContent = text;
    loginMessage.style.color = isError ? "#f0b69c" : "#c6ed76";
  };
  const setButtonBusy = (busy) => {
    if (!loginButton) return;
    loginButton.disabled = busy;
    loginButton.textContent = busy ? "Connexion…" : "Se connecter →";
  };
  const showLogin = (message = "") => {
    loginView.hidden = false;
    dashboardView.hidden = true;
    if (message) setLoginMessage(message);
  };
  const saveSession = (token) => {
    state.accessToken = token;
    try {
      sessionStorage.setItem(storageKey, token);
    } catch {
      /* session will remain in memory */
    }
  };
  const clearSession = () => {
    state.accessToken = null;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* storage may be disabled */
    }
  };
  const isConfigured = Boolean(
    config?.supabaseUrl &&
      config?.publishableKey &&
      /^https:\/\//.test(config.supabaseUrl),
  );
  const baseUrl = isConfigured
    ? String(config.supabaseUrl).replace(/\/+$/, "")
    : "";

  async function request(
    path,
    { method = "GET", body, token = state.accessToken } = {},
  ) {
    const headers = {
      apikey: config.publishableKey,
      Accept: "application/json",
    };
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "omit",
    });
    let data = null;
    try {
      data = await response.json();
    } catch {
      /* empty response */
    }
    if (!response.ok) {
      const error = new Error("Supabase request failed");
      error.status = response.status;
      error.code = data?.error_code || data?.code || "";
      throw error;
    }
    return data;
  }

  async function loadStats() {
    if (!state.accessToken || state.loading) return;
    state.loading = true;
    const message = byId("dashboard-message");
    message.hidden = true;
    try {
      const data = await request("/rest/v1/rpc/portfolio_dashboard", {
        method: "POST",
        body: { p_days: state.days },
      });
      renderDashboard(data || {});
      loginView.hidden = true;
      dashboardView.hidden = false;
      byId("updated-at").textContent =
        `Données chargées le ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date())} UTC`;
    } catch (error) {
      if (
        error.status === 401 ||
        error.status === 403 ||
        error.code === "42501"
      ) {
        clearSession();
        showLogin(
          "Ce compte ne dispose pas des droits administrateur, ou la session a expiré.",
        );
      } else {
        message.textContent =
          "Impossible de charger les statistiques pour le moment. Vérifiez la configuration Supabase ou réessayez.";
        message.hidden = false;
        loginView.hidden = true;
        dashboardView.hidden = false;
      }
    } finally {
      state.loading = false;
    }
  }

  function number(value) {
    const result = Number(value);
    return Number.isFinite(result) && result > 0 ? result : 0;
  }

  function renderDashboard(data) {
    const totals = data.totals || {};
    byId("stat-total").textContent = number(totals.total_views).toLocaleString(
      "fr-FR",
    );
    byId("stat-unique").textContent = number(
      totals.unique_visitors,
    ).toLocaleString("fr-FR");
    byId("stat-today").textContent = number(totals.today_views).toLocaleString(
      "fr-FR",
    );
    byId("stat-week").textContent = number(totals.week_views).toLocaleString(
      "fr-FR",
    );
    byId("stat-month").textContent = number(totals.month_views).toLocaleString(
      "fr-FR",
    );
    byId("music-downloads").textContent = number(
      totals.music_downloads,
    ).toLocaleString("fr-FR");
    renderChart(Array.isArray(data.daily) ? data.daily : []);
    renderRanking(
      "pages-list",
      Array.isArray(data.top_pages) ? data.top_pages : [],
      "path",
      "views",
      (path) => labels[path] || path || "Page inconnue",
    );
    renderRanking(
      "project-views-list",
      Array.isArray(data.top_project_views) ? data.top_project_views : [],
      "project",
      "views",
      (slug) => labels[slug] || slug || "Projet",
    );
    renderRanking(
      "project-clicks-list",
      Array.isArray(data.top_project_clicks) ? data.top_project_clicks : [],
      "project",
      "clicks",
      (slug) => labels[slug] || slug || "Projet",
    );
    renderBreakdown(
      "sources-list",
      Array.isArray(data.sources) ? data.sources : [],
      "source",
      "count",
    );
    renderBreakdown(
      "devices-list",
      Array.isArray(data.devices) ? data.devices : [],
      "device",
      "count",
    );
    renderBreakdown(
      "browsers-list",
      Array.isArray(data.browsers) ? data.browsers : [],
      "browser",
      "count",
    );
  }

  function renderRanking(elementId, values, labelKey, countKey, labelFor) {
    const list = byId(elementId);
    list.replaceChildren();
    if (!values.length) {
      const empty = document.createElement("li");
      empty.className = "list-empty";
      empty.textContent = "Aucune donnée disponible pour cette période.";
      list.append(empty);
      return;
    }
    values.forEach((item, index) => {
      const row = document.createElement("li");
      const rank = document.createElement("span");
      rank.className = "rank-index";
      rank.textContent = String(index + 1).padStart(2, "0");
      const name = document.createElement("span");
      name.className = "rank-name";
      name.textContent = labelFor(String(item[labelKey] ?? ""));
      const count = document.createElement("span");
      count.className = "rank-count";
      count.textContent = number(item[countKey]).toLocaleString("fr-FR");
      row.append(rank, name, count);
      list.append(row);
    });
  }

  function renderBreakdown(elementId, values, labelKey, countKey) {
    const list = byId(elementId);
    list.replaceChildren();
    if (!values.length) {
      const empty = document.createElement("li");
      empty.className = "list-empty";
      empty.textContent = "Aucune donnée.";
      list.append(empty);
      return;
    }
    const largest = Math.max(
      1,
      ...values.map((item) => number(item[countKey])),
    );
    values.forEach((item) => {
      const row = document.createElement("li");
      const bar = document.createElement("span");
      bar.className = "breakdown-bar";
      bar.style.width = `${Math.max(0, Math.min(100, (number(item[countKey]) / largest) * 100))}%`;
      const label = document.createElement("span");
      label.className = "breakdown-label";
      const raw = String(item[labelKey] ?? "other");
      label.textContent = labels[raw] || raw;
      const count = document.createElement("span");
      count.className = "breakdown-count";
      count.textContent = number(item[countKey]).toLocaleString("fr-FR");
      row.append(bar, label, count);
      list.append(row);
    });
  }

  function renderChart(series) {
    const chart = byId("traffic-chart");
    const axis = byId("chart-axis");
    chart.replaceChildren();
    axis.replaceChildren();
    if (
      !series.length ||
      !series.some((point) => number(point.views) || number(point.visitors))
    ) {
      const empty = document.createElement("p");
      empty.className = "empty-chart";
      empty.textContent = "Aucune visite enregistrée sur cette période.";
      chart.append(empty);
      return;
    }
    const NS = "http://www.w3.org/2000/svg";
    const width = 780;
    const height = 190;
    const padX = 9;
    const padY = 15;
    const maxValue = Math.max(
      1,
      ...series.flatMap((point) => [
        number(point.views),
        number(point.visitors),
      ]),
    );
    const xAt = (index) =>
      padX +
      (series.length < 2
        ? (width - 2 * padX) / 2
        : (index * (width - 2 * padX)) / (series.length - 1));
    const yAt = (value) =>
      height - padY - (number(value) / maxValue) * (height - padY * 2);
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("role", "img");
    svg.setAttribute(
      "aria-label",
      `Visites et visiteurs uniques estimés sur ${series.length} jours`,
    );
    const defs = document.createElementNS(NS, "defs");
    const gradient = document.createElementNS(NS, "linearGradient");
    gradient.setAttribute("id", "visits-gradient");
    gradient.setAttribute("x1", "0");
    gradient.setAttribute("x2", "0");
    gradient.setAttribute("y1", "0");
    gradient.setAttribute("y2", "1");
    [
      ["0%", "rgba(198,237,118,.2)"],
      ["100%", "rgba(198,237,118,0)"],
    ].forEach(([offset, color]) => {
      const stop = document.createElementNS(NS, "stop");
      stop.setAttribute("offset", offset);
      stop.setAttribute("stop-color", color);
      gradient.append(stop);
    });
    defs.append(gradient);
    svg.append(defs);
    [0, 0.5, 1].forEach((fraction) => {
      const line = document.createElementNS(NS, "line");
      const y = padY + fraction * (height - 2 * padY);
      line.setAttribute("x1", "0");
      line.setAttribute("x2", String(width));
      line.setAttribute("y1", String(y));
      line.setAttribute("y2", String(y));
      line.setAttribute("class", "chart-gridline");
      svg.append(line);
    });
    const visitsPoints = series.map(
      (point, index) => `${xAt(index)},${yAt(point.views)}`,
    );
    const uniquePoints = series.map(
      (point, index) => `${xAt(index)},${yAt(point.visitors)}`,
    );
    const area = document.createElementNS(NS, "polygon");
    area.setAttribute("class", "chart-area");
    area.setAttribute(
      "points",
      `${xAt(0)},${height - padY} ${visitsPoints.join(" ")} ${xAt(series.length - 1)},${height - padY}`,
    );
    svg.append(area);
    [
      [visitsPoints, "chart-line"],
      [uniquePoints, "unique-line"],
    ].forEach(([points, className]) => {
      const line = document.createElementNS(NS, "polyline");
      line.setAttribute("class", className);
      line.setAttribute("points", points.join(" "));
      svg.append(line);
    });
    const stride =
      series.length > 30
        ? Math.ceil(series.length / 15)
        : series.length > 10
          ? 3
          : 1;
    series.forEach((point, index) => {
      if (index % stride !== 0 && index !== series.length - 1) return;
      [
        [point.views, "chart-dot", "visites"],
        [point.visitors, "chart-dot-unique", "visiteurs uniques estimés"],
      ].forEach(([value, className, label]) => {
        const circle = document.createElementNS(NS, "circle");
        circle.setAttribute("class", className);
        circle.setAttribute("cx", String(xAt(index)));
        circle.setAttribute("cy", String(yAt(value)));
        circle.setAttribute("r", "3.5");
        const title = document.createElementNS(NS, "title");
        title.textContent = `${point.label || point.day}: ${number(value)} ${label}`;
        circle.append(title);
        svg.append(circle);
      });
    });
    chart.append(svg);
    const labelIndexes = [
      ...new Set([0, Math.floor((series.length - 1) / 2), series.length - 1]),
    ];
    labelIndexes.forEach((index) => {
      const label = document.createElement("span");
      label.textContent = String(
        series[index].label || series[index].day || "",
      );
      axis.append(label);
    });
  }

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!isConfigured)
      return setLoginMessage(
        "Supabase n’est pas configuré. Suivez le guide docs/supabase-analytics.md pour activer l’espace administrateur.",
      );
    setButtonBusy(true);
    setLoginMessage("", false);
    const formData = new FormData(form);
    try {
      const result = await request("/auth/v1/token?grant_type=password", {
        method: "POST",
        body: {
          email: formData.get("email"),
          password: formData.get("password"),
        },
        token: null,
      });
      if (!result?.access_token) throw new Error("Authentication failed");
      saveSession(result.access_token);
      await loadStats();
    } catch {
      clearSession();
      setLoginMessage(
        "Connexion impossible. Vérifiez vos identifiants et les droits de l’administrateur.",
      );
    } finally {
      setButtonBusy(false);
    }
  });

  byId("logout-button")?.addEventListener("click", async () => {
    const token = state.accessToken;
    clearSession();
    try {
      if (token && isConfigured)
        await request("/auth/v1/logout", { method: "POST", token });
    } catch {
      /* local session is already cleared */
    }
    showLogin("Vous êtes déconnecté.");
    form?.reset();
  });

  document.querySelectorAll("[data-days]").forEach((button) => {
    button.addEventListener("click", () => {
      state.days = Number(button.dataset.days);
      document
        .querySelectorAll("[data-days]")
        .forEach((candidate) =>
          candidate.setAttribute("aria-pressed", String(candidate === button)),
        );
      loadStats();
    });
  });

  if (!isConfigured) {
    setLoginMessage(
      "Espace non configuré. Renseignez l’URL et la clé publique Supabase, puis déployez la fonction de collecte.",
    );
    if (loginButton) loginButton.disabled = true;
  } else {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        state.accessToken = saved;
        request("/auth/v1/user")
          .then((user) => {
            if (!user?.id) throw new Error("No user");
            return loadStats();
          })
          .catch(() => {
            clearSession();
            showLogin("Votre session a expiré. Veuillez vous reconnecter.");
          });
      }
    } catch {
      showLogin(
        "La session du navigateur n’est pas disponible. Vous pouvez vous reconnecter.",
      );
    }
  }
})();
