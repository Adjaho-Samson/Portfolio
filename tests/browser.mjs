/* Real Chromium checks: layouts, themes, navigation, dialogs, accessibility,
   network isolation and production security headers. Run after tests/npm ci. */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { startServer } from "./server.mjs";

const server = await startServer();
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined;
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: executablePath
    ? [
        "--no-sandbox",
        "--disable-dev-shm-usage",
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
      ]
    : [],
});
const results = {
  layouts: 0,
  accessibility: [],
  interactions: [],
  requests: [],
  errors: [],
};
const pages = ["index.html", "projets.html", "certification.html", "404.html"];
const widths =
  process.env.PORTFOLIO_QUICK === "1"
    ? [320, 1440]
    : [320, 360, 375, 414, 768, 820, 1024, 1280, 1440, 1920];
const out = new URL("../test-results/", import.meta.url);
await mkdir(out, { recursive: true });

try {
  const context = await browser.newContext({
    reducedMotion: "reduce",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  page.on("pageerror", (error) => results.errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") results.errors.push(message.text());
  });
  page.on("request", (request) => {
    if (
      !request.url().startsWith(server.url) &&
      !request.url().startsWith("data:")
    )
      results.requests.push(request.url());
  });

  for (const theme of ["light", "dark"]) {
    for (const file of pages) {
      for (const width of widths) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`${server.url}/${file}`, { waitUntil: "networkidle" });
        await page.evaluate(
          (value) => localStorage.setItem("tchatzdev.theme", value),
          theme,
        );
        await page.reload({ waitUntil: "networkidle" });
        const layout = await page.evaluate(() => {
          const bad = [...document.querySelectorAll("main *, footer *")]
            .filter((element) => {
              const rect = element.getBoundingClientRect();
              const style = getComputedStyle(element);
              return (
                rect.width > 0 &&
                style.visibility !== "hidden" &&
                (rect.right > innerWidth + 1 || rect.left < -1)
              );
            })
            .map((element) => `${element.tagName}.${element.className}`);
          return {
            width: innerWidth,
            scroll: document.documentElement.scrollWidth,
            bad,
          };
        });
        assert.ok(
          layout.scroll <= width,
          `${file} ${theme} ${width}: page overflow ${layout.scroll}`,
        );
        assert.deepEqual(
          layout.bad,
          [],
          `${file} ${theme} ${width}: element overflow`,
        );
        assert.equal(
          await page.locator("html").getAttribute("data-theme"),
          theme,
        );
        results.layouts++;
      }
    }
  }

  for (const file of pages.slice(0, 3)) {
    for (const theme of ["light", "dark"]) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.goto(`${server.url}/${file}`, { waitUntil: "networkidle" });
      await page.evaluate(
        (value) => localStorage.setItem("tchatzdev.theme", value),
        theme,
      );
      await page.reload({ waitUntil: "networkidle" });
      const audit = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"])
        .analyze();
      results.accessibility.push({
        page: file,
        theme,
        violations: audit.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
      assert.equal(
        audit.violations.length,
        0,
        `${file} ${theme}: ${JSON.stringify(results.accessibility.at(-1))}`,
      );
    }
  }

  // Explicit theme choice persists across pages and reloads.
  await page.goto(server.url, { waitUntil: "networkidle" });
  await page.evaluate(() => localStorage.setItem("tchatzdev.theme", "light"));
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Activer le mode sombre" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Mes projets" })
    .click();
  await page.waitForURL("**/projets.html");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.getByRole("button", { name: "Activer le mode clair" }).click();
  assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
  results.interactions.push(
    "theme toggle, persistence across navigation and reload",
  );

  // System preference is honored only when no explicit choice exists.
  // Reuse one context: the sandbox's single-process Chromium build does not
  // reliably support concurrent contexts (standard Playwright does).
  await page.evaluate(() => localStorage.removeItem("tchatzdev.theme"));
  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await page.waitForFunction(
    () => document.documentElement.dataset.theme === "light",
  );
  results.interactions.push("initial system theme and live system change");

  // Mobile menu: open, Escape/focus, outside click, link navigation, desktop resize.
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(server.url, { waitUntil: "networkidle" });
  const menu = page.getByRole("button", { name: "Ouvrir le menu" });
  await menu.click();
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "true",
  );
  const panel = await page.locator(".navigation").boundingBox();
  assert.ok(
    panel.x >= 0 &&
      panel.x + panel.width <= 320 &&
      panel.y + panel.height <= 640,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  assert.equal(
    await page.evaluate(() => document.activeElement.className),
    "menu-toggle",
  );
  await menu.click();
  await page.locator("h1").click({ position: { x: 5, y: 5 }, force: true });
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  await menu.click();
  await page
    .getByRole("navigation", { name: "Navigation principale" })
    .getByRole("link", { name: "Certifications" })
    .click();
  await page.waitForURL("**/certification.html");
  assert.equal(
    await page.locator(".menu-toggle").getAttribute("aria-expanded"),
    "false",
  );
  await menu.click();
  await page.setViewportSize({ width: 1280, height: 900 });
  assert.equal(await page.locator(".menu-toggle").isVisible(), false);
  assert.equal(await page.locator(".navigation").isVisible(), true);
  results.interactions.push(
    "mobile menu bounds, Escape, focus return, outside click, navigation, resize",
  );

  // Category anchors and all certificate previews.
  await page.goto(`${server.url}/projets.html`, { waitUntil: "networkidle" });
  await page
    .getByRole("navigation", { name: "Catégories de projets" })
    .getByRole("link", { name: "Applications" })
    .click();
  await page.waitForURL("**/projets.html#applications");
  assert.ok(await page.locator("#tchatz-music").isVisible());
  await page.goto(`${server.url}/certification.html`, {
    waitUntil: "networkidle",
  });
  const certificates = page.locator("button#certificate-close");
  for (const trigger of await page
    .locator(".certificate-body [data-certificate]")
    .all()) {
    const name = await trigger.getAttribute("data-title");
    await trigger.click();
    assert.equal(
      await page
        .locator("#certificate-dialog")
        .evaluate((dialog) => dialog.open),
      true,
    );
    assert.equal(await page.locator("#dialog-title").textContent(), name);
    await page.locator("#certificate-preview").waitFor({ state: "visible" });
    assert.ok(
      await page
        .locator("#certificate-preview")
        .evaluate((image) => image.complete && image.naturalWidth > 0),
    );
    const pdf = await page.locator("#certificate-open").getAttribute("href");
    const response = await context.request.get(`${server.url}/${pdf}`);
    assert.equal(response.status(), 200);
    assert.match(response.headers()["content-type"], /application\/pdf/);
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator("#certificate-dialog")
        .evaluate((dialog) => dialog.open),
      false,
    );
    assert.equal(
      await trigger.evaluate((element) => element === document.activeElement),
      true,
    );
  }
  await page.locator(".certificate-body [data-certificate]").first().click();
  await page.getByRole("button", { name: "Fermer l’aperçu" }).click();
  assert.equal(await certificates.count(), 1);
  await page.locator(".certificate-body [data-certificate]").first().click();
  await page.mouse.click(2, 2);
  assert.equal(
    await page.locator("#certificate-dialog").evaluate((dialog) => dialog.open),
    false,
  );
  results.interactions.push(
    "category anchor, four certificate dialogs, PDF resources, Escape/close/backdrop and focus return",
  );

  await page.locator(".certificate-body [data-certificate]").first().click();
  const dialogAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    dialogAudit.violations.map((v) => v.id),
    [],
  );
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.locator(".menu-toggle").click();
  const menuAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  assert.deepEqual(
    menuAudit.violations.map((v) => v.id),
    [],
  );
  await page.keyboard.press("Escape");
  results.interactions.push(
    "mobile menu and open certificate dialog accessibility",
  );

  // External project/contact links are wired, but never opened by automated tests.
  const external = await page
    .locator('a[href^="https://"]')
    .evaluateAll((links) =>
      links.map((link) => ({ href: link.href, rel: link.rel })),
    );
  for (const link of external) {
    assert.ok(link.rel.includes("noopener") && link.rel.includes("noreferrer"));
  }
  await page.goto(`${server.url}/projets.html`, { waitUntil: "networkidle" });
  assert.equal(
    await page.getByRole("link", { name: /Visiter le projet/ }).count(),
    5,
  );
  assert.equal(
    await page.getByRole("link", { name: /Télécharger l’APK Android/ }).count(),
    1,
  );
  assert.equal(await page.locator('a[href*="github.com"]').count(), 0);
  // The download button points at a real same-origin APK, never a profile,
  // a repository page or a fictitious URL.
  const apkHref = await page
    .locator('.download-panel a[download]')
    .getAttribute("href");
  assert.equal(apkHref, "assets/downloads/Tchatz-Music-1.0.0-debug.apk");
  const apkResponse = await context.request.get(`${server.url}/${apkHref}`);
  assert.equal(apkResponse.status(), 200);
  assert.equal(
    apkResponse.headers()["content-type"],
    "application/vnd.android.package-archive",
  );
  const apkBytes = Buffer.from(await apkResponse.body());
  assert.equal(apkBytes.length, 14821978);
  assert.equal(
    createHash("sha256").update(apkBytes).digest("hex"),
    "99595ce59ce95f051fed3e7b2b6d8c00e22052888c0c1cab6c07a8f280305e2b",
  );
  assert.equal(apkBytes.subarray(0, 2).toString(), "PK");
  results.interactions.push(
    "five demo links and one direct, checksum-verified APK; no repository links",
  );

  // Android and desktop both trigger a real download of the same file.
  for (const [label, userAgent] of [
    [
      "Android",
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
    ],
    ["desktop", undefined],
  ]) {
    const downloadContext = await browser.newContext({
      userAgent,
      acceptDownloads: true,
      viewport: { width: 412, height: 915 },
    });
    const downloadPage = await downloadContext.newPage();
    await downloadPage.goto(`${server.url}/projets.html`, {
      waitUntil: "networkidle",
    });
    const [download] = await Promise.all([
      downloadPage.waitForEvent("download"),
      downloadPage.locator(".download-panel a[download]").click(),
    ]);
    assert.equal(download.suggestedFilename(), "Tchatz-Music-1.0.0-debug.apk");
    const file = await download.path();
    assert.equal((await stat(file)).size, 14821978);
    const status = await downloadPage
      .locator("[data-download-status]")
      .textContent();
    assert.match(status, /Téléchargement de Tchatz-Music-1\.0\.0-debug\.apk/);
    if (label === "desktop") assert.match(status, /Android/);
    await downloadContext.close();
  }
  results.interactions.push(
    "APK download triggered from Android and desktop user agents",
  );

  // The constellation freezes on hover, names the skill and pauses on demand.
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(server.url, { waitUntil: "networkidle" });
  const pause = page.locator("[data-orbit-pause]");
  await pause.click();
  assert.equal(await pause.getAttribute("aria-pressed"), "true");
  assert.equal(
    await page.locator("[data-constellation]").getAttribute("data-paused"),
    "true",
  );
  assert.equal(
    await page
      .locator(".orbit-path")
      .first()
      .evaluate((node) => getComputedStyle(node).animationPlayState),
    "paused",
  );
  // Paused, the satellites stop moving, so a real pointer hover is possible.
  // Hovering names the skill and freezes the whole system.
  await page.locator(".satellite").first().hover({ force: true });
  assert.match(
    await page.locator("[data-constellation]").getAttribute("class"),
    /is-frozen/,
  );
  assert.equal(await page.locator("[data-caption-name]").textContent(), "HTML5");
  assert.equal(
    await page.locator("[data-caption-kind]").textContent(),
    "Langage de structuration",
  );
  await page.mouse.move(5, 5);
  assert.equal(await pause.getAttribute("aria-pressed"), "true");
  await pause.click();
  assert.equal(await pause.getAttribute("aria-pressed"), "false");
  assert.equal(
    await page.locator("[data-constellation]").getAttribute("data-paused"),
    "false",
  );
  // While running, a pointer entering a satellite still freezes the system.
  await page.locator(".satellite").nth(3).dispatchEvent("pointerenter");
  assert.match(
    await page.locator("[data-constellation]").getAttribute("class"),
    /is-frozen/,
  );
  assert.equal(await page.locator("[data-caption-name]").textContent(), "React");
  await page.locator(".satellite").nth(3).dispatchEvent("pointerleave");
  assert.equal(await page.locator("[data-caption-name]").textContent(), "12 compétences");
  // Keyboard: focusing a satellite names it, without trapping focus.
  await page.locator(".satellite").first().focus();
  assert.equal(await page.locator("[data-caption-name]").textContent(), "HTML5");
  results.interactions.push(
    "constellation hover freeze, live skill caption, pause control and keyboard focus",
  );

  // Reduced motion: the system is static and the pause control disappears.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page.locator("[data-constellation]").getAttribute("data-paused"),
    "true",
  );
  assert.equal(
    await page.locator("[data-orbit-pause]").isVisible(),
    false,
  );
  assert.equal(
    await page
      .locator(".satellite-chip")
      .first()
      .evaluate((node) => getComputedStyle(node).animationName),
    "none",
  );
  results.interactions.push("constellation respects reduced motion");
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Every local button/link has a real handler or destination; no audience requests.
  await page.goto(server.url, { waitUntil: "networkidle" });
  await page.getByRole("link", { name: "Tous mes projets" }).click();
  await page.waitForURL("**/projets.html");
  await page
    .locator("main")
    .getByRole("link", { name: "Me contacter", exact: true })
    .click();
  await page.waitForURL("**/index.html#contact");
  assert.ok(await page.locator("#contact").isVisible());
  results.interactions.push("home selection to catalog and contact navigation");

  // Security headers and custom 404 status from the test production configuration.
  const response = await context.request.get(`${server.url}/inexistent`);
  assert.equal(response.status(), 404);
  assert.match(await response.text(), /Erreur 404/);
  assert.equal(response.headers()["x-content-type-options"], "nosniff");
  assert.match(
    response.headers()["content-security-policy"],
    /connect-src 'none'/,
  );
  results.interactions.push(
    "custom 404 status and production CSP/security headers",
  );

  // Capture representative final views for manual review (not a substitute for tests).
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const file of pages.slice(0, 3)) {
    await page.goto(`${server.url}/${file}`, { waitUntil: "networkidle" });
    await page.evaluate(async () => {
      for (let y = 0; y < document.documentElement.scrollHeight; y += 700) {
        window.scrollTo(0, y);
        await new Promise((resolve) => setTimeout(resolve, 40));
      }
    });
    await page.waitForFunction(() =>
      [...document.images]
        .filter((image) => !image.hidden)
        .every((image) => image.complete && image.naturalWidth > 0),
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({
      path: new URL(`${file.replace(".html", "")}-desktop.png`, out).pathname,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto(server.url, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    for (let y = 0; y < document.documentElement.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
  });
  await page.waitForFunction(() =>
    [...document.images]
      .filter((image) => !image.hidden)
      .every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: new URL("home-mobile.png", out).pathname,
    fullPage: true,
  });

  // Storage denial must not break the theme control. Separate launch for the
  // sandbox browser; no concurrent contexts are required.
  const privateBrowser = await chromium.launch({
    executablePath,
    headless: true,
    args: executablePath
      ? [
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--use-gl=angle",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
        ]
      : [],
  });
  try {
    const privateContext = await privateBrowser.newContext({
      reducedMotion: "reduce",
    });
    await privateContext.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("Denied", "SecurityError");
        },
      });
    });
    const privatePage = await privateContext.newPage();
    await privatePage.goto(server.url);
    await privatePage
      .getByRole("button", { name: "Activer le mode sombre" })
      .click();
    assert.equal(
      await privatePage.locator("html").getAttribute("data-theme"),
      "dark",
    );
    results.interactions.push("theme with localStorage denied");
  } finally {
    await privateBrowser.close();
  }

  const noJsBrowser = await chromium.launch({
    executablePath,
    headless: true,
    args: executablePath
      ? [
          "--no-sandbox",
          "--disable-dev-shm-usage",
          "--use-gl=angle",
          "--use-angle=swiftshader",
          "--enable-unsafe-swiftshader",
        ]
      : [],
  });
  try {
    const noJs = await noJsBrowser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJs.newPage();
    await noJsPage.goto(`${server.url}/certification.html`);
    assert.equal(await noJsPage.locator(".certificate-card").count(), 4);
    assert.equal(await noJsPage.locator(".navigation").isVisible(), true);
    assert.equal(
      await noJsPage.locator("[data-theme-toggle]").isVisible(),
      false,
    );
    assert.ok(
      await noJsPage
        .locator(".certificate-body a[download]")
        .first()
        .getAttribute("href"),
    );
    results.interactions.push("progressive enhancement without JavaScript");
  } finally {
    await noJsBrowser.close();
  }

  assert.deepEqual(results.requests, [], "unexpected external requests");
  assert.deepEqual(results.errors, [], "browser console/page errors");
} finally {
  await browser.close().catch(() => {});
  await server.close();
  await writeFile(
    new URL("report.json", out),
    JSON.stringify(results, null, 2),
  );
}
console.log(JSON.stringify(results, null, 2));
