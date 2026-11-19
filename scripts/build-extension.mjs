import { build } from "esbuild";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

const root = process.cwd();
const output = path.join(root, "extension-dist");
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
await fs.cp(path.join(root, "dist/assets"), path.join(output, "assets"), {
  recursive: true,
});
let html = await fs.readFile(path.join(root, "dist/index.html"), "utf8");
html = html.replace(/\s*<link rel="manifest"[^>]*>/g, "");
await fs.writeFile(path.join(output, "index.html"), html);
await fs.copyFile(
  path.join(root, "extension/manifest.json"),
  path.join(output, "manifest.json"),
);
for (const filename of [
  "favicon.svg",
  "theme.js",
  "icon-16.png",
  "icon-48.png",
  "icon-128.png",
])
  await fs.copyFile(
    path.join(root, "public", filename),
    path.join(output, filename),
  );
await build({
  entryPoints: ["extension/background.ts", "extension/content.ts"],
  outdir: output,
  bundle: true,
  minify: true,
  sourcemap: false,
  platform: "browser",
  format: "iife",
  target: "chrome139",
});

// Export authored sample pages so their source links lead to readable, owned content.
const samples = await build({
  entryPoints: ["src/seed.ts"],
  bundle: true,
  write: false,
  format: "esm",
  platform: "node",
  define: {
    location: JSON.stringify({
      origin: "https://tab-brain-memory.vercel.app",
      protocol: "https:",
    }),
  },
});
const { samplePages } = await import(
  "data:text/javascript;base64," +
    Buffer.from(samples.outputFiles[0].text).toString("base64")
);
const escape = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
await fs.mkdir(path.join(root, "dist/samples"), { recursive: true });
for (const page of samplePages) {
  const paragraphs = page.text
    .split("\n\n")
    .map((text) => `<p>${escape(text).replaceAll("\n", "<br>")}</p>`)
    .join("\n");
  const sample = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(page.title)} — Tab Brain field notes</title><meta name="referrer" content="no-referrer"><style>body{margin:0;background:#f5f7ee;color:#3a4e31;font-family:Georgia,serif;line-height:1.85}main{max-width:700px;margin:55px auto;padding:35px;background:#fffefa;border:1px solid #dce5d0;border-radius:14px}h1{font-size:38px;line-height:1.2;font-weight:400}p{font-size:17px}header,footer{font:12px system-ui;color:#83976e;margin-bottom:28px}a{color:#4e7538}aside{padding:12px;background:#edf4e1;font:12px/1.8 system-ui;border-radius:6px;margin:20px 0}@media(max-width:700px){main{margin:18px;padding:25px}h1{font-size:30px}p{font-size:15px}}</style></head><body><main><header>TAB BRAIN / THE READING ROOM</header><article><h1>${escape(page.title)}</h1>${paragraphs}</article><aside>This is an authored example page for Tab Brain. Sample tool names, features, and prices are fictional demonstration data.</aside><footer><a href="../">Return to your Tab Brain workspace</a></footer></main></body></html>`;
  await fs.writeFile(
    path.join(root, "dist/samples", `${page.slug}.html`),
    sample,
  );
}

async function walk(directory, prefix = "") {
  const paths = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name === "downloads" || entry.name === "sw.js") continue;
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory())
      paths.push(...(await walk(path.join(directory, entry.name), relative)));
    else paths.push("./" + relative);
  }
  return paths;
}
const files = await walk(path.join(root, "dist"));
const digest = createHash("sha256");
digest.update("offline-shell-v2");
for (const file of files.sort()) {
  digest.update(file);
  digest.update(await fs.readFile(path.join(root, "dist", file)));
}
const version = digest.digest("hex").slice(0, 12);
const worker = `
const CACHE = 'tab-brain-shell-${version}';
const FILES = ${JSON.stringify(files)};
const SHELL = new Set(FILES.map(file => new URL(file, self.location.href).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys
    .filter(key => key.startsWith('tab-brain-shell-') && key !== CACHE)
    .map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/downloads/')) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    // These are fixed, public build files. CORS headers such as Vary: Origin
    // must not make a page's module request miss its precached copy.
    const cached = SHELL.has(url.href) ? await cache.match(url.href, { ignoreVary: true }) : undefined;
    if (cached && event.request.mode !== 'navigate') return cached;
    try {
      return await fetch(event.request);
    } catch (error) {
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const shell = await cache.match(new URL('./index.html', self.location.href).href, { ignoreVary: true });
        if (shell) return shell;
      }
      throw error;
    }
  })());
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const memoryId = typeof event.notification.data?.memoryId === 'string' ? event.notification.data.memoryId : '';
  const target = new URL('./index.html', self.registration.scope);
  target.hash = 'reminders' + (memoryId ? '?memory=' + encodeURIComponent(memoryId) : '');
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async clients => {
    const client = clients.find(client => new URL(client.url).origin === target.origin);
    if (client) { await client.navigate(target.href); return client.focus(); }
    return self.clients.openWindow(target.href);
  }));
});
`;
await fs.writeFile(path.join(root, "dist/sw.js"), worker);
process.stdout.write(
  `Chrome extension built. Offline shell ${version}: ${files.length} local assets.\n`,
);
