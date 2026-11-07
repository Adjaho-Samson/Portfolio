/* Small test-only static server. Applies the production headers from vercel.json.
   The public preview can still use `python3 -m http.server 4173 --bind 0.0.0.0`. */
import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const config = JSON.parse(
  await readFile(new URL("../vercel.json", import.meta.url), "utf8"),
);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".apk": "application/vnd.android.package-archive",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

export async function startServer() {
  const server = http.createServer(async (request, response) => {
    let pathname;
    try {
      pathname = decodeURIComponent(
        new URL(request.url, "http://localhost").pathname,
      );
    } catch {
      response.writeHead(400).end();
      return;
    }
    let file = resolve(root, "." + pathname);
    if (file !== resolve(root) && !file.startsWith(resolve(root) + sep)) {
      response.writeHead(403).end();
      return;
    }
    if (pathname.endsWith("/")) file = resolve(file, "index.html");
    let status = 200;
    let body;
    try {
      body = await readFile(file);
    } catch {
      status = 404;
      file = resolve(root, "404.html");
      body = await readFile(file);
    }
    const headers = {
      "Content-Type": types[extname(file)] || "application/octet-stream",
    };
    for (const rule of config.headers || []) {
      const expression = new RegExp("^" + rule.source + "$");
      if (expression.test(pathname))
        for (const header of rule.headers) headers[header.key] = header.value;
    }
    response.writeHead(status, headers);
    response.end(request.method === "HEAD" ? undefined : body);
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((done) => server.close(done)),
  };
}
