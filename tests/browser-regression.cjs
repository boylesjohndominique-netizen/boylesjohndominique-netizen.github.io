/* Optional QA dependency: npm install --no-save --package-lock=false playwright
   Then: npx playwright install chromium webkit && node tests/browser-regression.cjs */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const { chromium, webkit, devices } = require("playwright");

const root = path.resolve(__dirname, "..");
let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks += 1;
}
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const filename = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  if (!filename.startsWith(root + path.sep) || !fs.existsSync(filename) || fs.statSync(filename).isDirectory()) {
    res.writeHead(404).end();
    return;
  }
  const size = fs.statSync(filename).size;
  const type = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css", ".mp3": "audio/mpeg", ".jpg": "image/jpeg", ".png": "image/png" }[path.extname(filename)] || "application/octet-stream";
  const headers = { "Content-Type": type, "Accept-Ranges": "bytes" };
  const match = /bytes=(\d+)-(\d*)/.exec(req.headers.range || "");
  const start = match ? Number(match[1]) : 0;
  const end = match && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;
  if (start >= size) {
    res.writeHead(416, { "Content-Range": `bytes */${size}` }).end();
    return;
  }
  if (match) headers["Content-Range"] = `bytes ${start}-${end}/${size}`;
  headers["Content-Length"] = end - start + 1;
  res.writeHead(match ? 206 : 200, headers);
  if (req.method === "HEAD") res.end();
  else fs.createReadStream(filename, { start, end }).pipe(res);
});

async function waitFor(page, fn, message) {
  await page.waitForFunction(fn, null, { timeout: 15000 });
  check(true, message);
}
async function activate(locator) {
  // Windows WebKit reports scaled hit-test coordinates inconsistently on
  // high-DPI displays. Use real keyboard activation there; Chromium covers taps.
  if (locator.page().context().browser().browserType().name() === "webkit") {
    await locator.waitFor({ state: "visible" });
    await locator.press("Enter");
  } else if (await locator.page().evaluate(() => navigator.maxTouchPoints > 0)) {
    await locator.tap();
  } else await locator.click();
}
async function chapter(page, name) {
  // Exercise the actual Next/Back controls across all chapters.
  const names = ["reveal", "letter", "memories", "reasons", "love", "game", "gift", "final"];
  const current = await page.locator(".screen.is-active").getAttribute("data-screen");
  let index = names.indexOf(current);
  while (index !== names.indexOf(name)) {
    const forward = index < names.indexOf(name);
    await activate(page.locator(forward ? "#nextBtn" : "#prevBtn"));
    index += forward ? 1 : -1;
  }
  check(await page.locator(`#screen-${name}`).isVisible(), `${name} navigation`);
}
async function unlock(page) {
  await activate(page.locator("#openSurprise"));
  await activate(page.locator("#yesBtn"));
  await page.locator("#secretAnswer").fill("babyyyy");
  await activate(page.locator("#secretForm button[type=submit]"));
  await activate(page.locator("#enterSurprise"));
}

async function flow(browserType, options, label) {
  const browser = await browserType.launch();
  try {
    const context = await browser.newContext({ ...options, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Fonts are optional; keep the regression suite independent of Google.
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await page.addInitScript(() => {
      window.__webglContexts = 0;
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (/webgl/.test(type)) window.__webglContexts += 1;
        return original.call(this, type, ...args);
      };
    });
    await page.goto(base);
    check(await page.evaluate(() => window.__webglContexts === 0), "WebGL stays unallocated at startup");
    await activate(page.locator("#openSurprise"));
    await activate(page.locator("#noBtn"));
    check(await page.locator("#identityResponse").isVisible(), "identity rejection works");
    await activate(page.locator("#retryIdentity"));
    await activate(page.locator("#yesBtn"));
    await activate(page.locator("#hintBtn"));
    check(await page.locator("#hintText").isVisible(), "hint opens");
    await page.locator("#secretAnswer").fill("wrong");
    await activate(page.locator("#secretForm button[type=submit]"));
    check(await page.locator("#secretAnswer").getAttribute("aria-invalid") === "true", "wrong answer stays on page");
    await page.locator("#secretAnswer").fill("Babyyyy");
    await activate(page.locator("#secretForm button[type=submit]"));
    await activate(page.locator("#enterSurprise"));
    await waitFor(page, () => !document.querySelector("audio").paused && document.querySelector("audio").currentTime > 0.2, "music advances after first tap");
    for (let index = 0; index < 13; index += 1) {
      await activate(page.locator(".track").nth(index));
      await waitFor(page, () => !document.querySelector("audio").paused && document.querySelector("audio").currentTime > 0.1, `track ${index + 1} plays`);
    }
    const sameTrack = await page.locator(".track.is-current").getAttribute("aria-label");
    await page.evaluate(() => {
      window.__trackLoads = 0;
      document.querySelector("audio").addEventListener("loadstart", () => window.__trackLoads++);
    });
    await activate(page.locator(".track.is-current"));
    check(await page.evaluate(() => window.__trackLoads === 0), "selecting current track preserves its buffer");
    await activate(page.locator("#musicToggle"));
    check(await page.evaluate(() => document.querySelector("audio").paused), "pause works");
    await activate(page.locator("#musicNext"));
    await waitFor(page, () => !document.querySelector("audio").paused, "next track plays");
    await activate(page.locator("#musicPrev"));
    check(await page.locator(".track.is-current").getAttribute("aria-label") === sameTrack, "previous track follows history");
    await chapter(page, "letter");
    await activate(page.locator("#letterNext"));
    check((await page.locator("#letterProgressText").textContent()).includes("2"), "letter advances");
    await page.reload();
    check(await page.locator("#screen-letter").isVisible(), "reload restores chapter");
    check((await page.locator("#letterProgressText").textContent()).includes("2"), "reload restores letter page");
    await activate(page.locator("#musicToggle"));
    await waitFor(page, () => !document.querySelector("audio").paused, "music resumes with one tap after reload");
    await activate(page.locator("#musicToggle"));
    await chapter(page, "memories");
    for (let i = 0; i < 8; i++) {
      await activate(page.locator(".memory-card:visible").nth(i));
      check(await page.locator("#detailDialog").isVisible(), `memory ${i + 1} opens`);
      await activate(page.locator(i % 2 ? "#dialogDone" : "#dialogClose"));
    }
    await chapter(page, "reasons");
    await activate(page.locator("#reasonNext"));
    await waitFor(page, () => document.querySelector("#reasonsStatus").textContent.includes("Reason 2"), "reason advances");
    await page.locator("#reasonsGrid").dispatchEvent("pointerdown", { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    await page.locator("#reasonsGrid").dispatchEvent("pointercancel", { pointerId: 1 });
    check((await page.locator("#reasonsStatus").textContent()).includes("Reason 2"), "cancelled touch does not advance reasons");
    await page.reload();
    check((await page.locator("#reasonsStatus").textContent()).includes("Reason 2"), "reason survives reload");
    await chapter(page, "love");
    await activate(page.locator("#measureBtn"));
    await waitFor(page, () => document.querySelector("#lovePercent").textContent === "∞%", "love meter completes");
    await chapter(page, "game");
    await activate(page.locator("#loveYes"));
    check(await page.locator("#gameResponse").isVisible(), "game response opens");
    await chapter(page, "gift");
    await activate(page.locator("#giftBox"));
    await activate(page.locator("#giftMore"));
    check(await page.locator("#giftExtra").isVisible(), "gift extra opens");
    await page.reload();
    check(await page.locator("#screen-gift").isVisible(), "gift chapter restores");
    check(await page.locator("#giftExtra").isVisible(), "opened gift restores");
    await chapter(page, "memories");
    await activate(page.locator('[data-memory-id="secret"]'));
    check(await page.locator("#detailDialog").isVisible(), "secret memory unlocks");
    await activate(page.locator("#dialogClose"));
    await chapter(page, "final");
    check(await page.evaluate(() => document.querySelector("audio").paused), "navigation respects deliberate pause");
    await activate(page.locator("#replayBtn"));
    check(await page.locator("#screen-welcome").isVisible(), "explicit replay returns to welcome");
    await page.reload();
    check(await page.locator("#screen-welcome").isVisible(), "replay clears saved chapter");
    await unlock(page);
    // Check all chapters at common phone widths, including the fixed controls.
    for (const width of [320, 375, 390, 430, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of ["reveal", "letter", "memories", "reasons", "love", "game", "gift", "final"]) {
        await chapter(page, name);
        check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name} fits ${width}px`);
      }
    }
    check(errors.length === 0, `no JavaScript errors: ${errors.join(", ")}`);
    await context.close();
    console.log(`${label}: main flow, 13 songs, reload recovery, touch cancellation, and responsive checks passed`);
  } finally { await browser.close(); }
}

async function failureCases() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    // Storage being unavailable cannot disable unrelated buttons.
    await page.addInitScript(() => {
      Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new Error("Storage disabled"); };
    });
    await page.route("**/*.mp3", (route) => route.fulfill({ status: 404, body: "Missing" }));
    await page.goto(base);
    await unlock(page);
    await chapter(page, "letter");
    check(await page.locator("#screen-letter").isVisible(), "buttons work with missing music and blocked storage");
    check(errors.length === 0, `missing assets cause no page error: ${errors.join(", ")}`);
    await context.close();
    console.log("Missing music and unavailable storage: passed");
  } finally { await browser.close(); }
}

async function slowMusic() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"], defaultBrowserType: undefined, reducedMotion: "reduce" });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const page = await context.newPage();
    await page.clock.install();
    const pending = [];
    let holding = true;
    await page.route("**/*.mp3", async (route) => {
      if (holding) await new Promise((resolve) => pending.push(resolve));
      await route.continue().catch(() => {}); // Earlier selections may already be cancelled.
    });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await unlock(page);
    check((await page.locator("#musicToggle").textContent()).includes("Loading"), "slow music has a loading state");
    await activate(page.locator("#musicToggle"));
    check(await page.evaluate(() => document.querySelector("audio").paused), "loading music can be paused");
    holding = false;
    pending.splice(0).forEach((resolve) => resolve());
    await waitFor(page, () => document.querySelector("audio").readyState >= 2, "slow track finishes loading");
    check(await page.evaluate(() => document.querySelector("audio").paused), "completed download respects pause");
    await activate(page.locator("#musicToggle"));
    await waitFor(page, () => document.querySelector("audio").currentTime > 0.2, "buffered track resumes");

    holding = true;
    for (const index of [2, 8, 1]) await activate(page.locator(".track").nth(index));
    holding = false;
    pending.splice(0).forEach((resolve) => resolve());
    await waitFor(page, () => document.querySelector("audio").currentTime > 0.2 && !document.querySelector("audio").paused, "rapid track changes finish playing");
    check((await page.locator(".track.is-current").getAttribute("aria-label")).includes("love."), "latest track selection wins");
    check((await page.locator("audio").getAttribute("src")).includes("wave to earth - love."), "late requests cannot replace selected track");

    await page.evaluate(() => {
      window.__loads = 0;
      document.querySelector("audio").addEventListener("loadstart", () => window.__loads++);
      window.dispatchEvent(new Event("pageshow"));
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await waitFor(page, () => document.querySelector("audio").currentTime > 1.2, "playback survives return to page");
    check(await page.evaluate(() => window.__loads === 0), "healthy playback is not reloaded on return");
    await page.evaluate(() => {
      const audio = document.querySelector("audio");
      window.__endingSource = audio.currentSrc;
      audio.currentTime = audio.duration - 0.1;
    });
    await waitFor(page, () => document.querySelector("audio").currentSrc !== window.__endingSource &&
      !document.querySelector("audio").paused && document.querySelector("audio").currentTime > 0.1,
      "finished song automatically advances to the next track");
    await page.evaluate(() => { document.querySelector("audio").currentTime = 20; });
    await activate(page.locator("#musicToggle"));
    await page.reload();
    await waitFor(page, () => document.querySelector("audio").currentTime >= 19.5, "song position survives reload");
    check(await page.evaluate(() => document.querySelector("audio").paused), "saved pause survives reload");

    // Freeze the media clock to simulate a stream that claims to be playing
    // but supplies no audio, and fast-forward only the browser's timers.
    await activate(page.locator("#musicToggle"));
    await page.evaluate(() => {
      const audio = document.querySelector("audio");
      window.__recoveries = 0;
      window.__seeks = [];
      Object.defineProperty(audio, "currentTime", { configurable: true, get: () => 20, set: (v) => window.__seeks.push(v) });
      Object.defineProperty(audio, "paused", { configurable: true, get: () => false });
      Object.defineProperty(audio, "seeking", { configurable: true, get: () => false });
      audio.load = () => window.__recoveries++;
    });
    await page.clock.runFor(20000);
    check(await page.evaluate(() => window.__recoveries === 0 && window.__seeks.length === 0), "short stalls preserve the current buffer");
    await page.clock.runFor(110000);
    const recoveries = await page.evaluate(() => window.__recoveries);
    check(recoveries <= 2 && recoveries > 0, `prolonged stall retries are bounded (${recoveries})`);
    check(await page.evaluate(() => window.__seeks.length === 0), "stall recovery never seeks backward");
    await context.close();
    console.log("Slow downloads, pause during loading, rapid selection, playback position, and bounded stall recovery: passed");
  } finally { await browser.close(); }
}

async function graphicsLifecycle() {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ ...devices["iPhone 13"] });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const page = await context.newPage();
    await page.goto(base);
    await unlock(page);
    await page.evaluate(() => {
      window.__renders = 0;
      const OriginalRenderer = THREE.WebGLRenderer;
      THREE.WebGLRenderer = class extends OriginalRenderer {
        constructor(...args) {
          super(...args);
          const render = this.render;
          this.render = (...renderArgs) => {
            window.__renders++;
            return render.apply(this, renderArgs);
          };
        }
      };
    });
    await chapter(page, "love");
    await waitFor(page, () => window.__renders > 2, "3D heart renders when its chapter opens");
    let before = await page.evaluate(() => window.__renders);
    await page.waitForTimeout(600);
    const frames = await page.evaluate(() => window.__renders) - before;
    check(frames > 0 && frames <= 20, `phone rendering is capped at 30 fps (${frames} frames in 600 ms)`);
    await page.locator("#love3dCanvas").dispatchEvent("webglcontextlost", { cancelable: true });
    check(await page.locator("#love3d").evaluate((el) => el.classList.contains("love3d--off")), "lost graphics context falls back safely");
    before = await page.evaluate(() => window.__renders);
    await page.waitForTimeout(150);
    check(await page.evaluate(() => window.__renders) === before, "context loss stops rendering");
    await page.locator("#love3dCanvas").dispatchEvent("webglcontextrestored");
    await waitFor(page, () => !document.querySelector("#love3d").classList.contains("love3d--off"), "graphics can recover");
    await chapter(page, "game");
    before = await page.evaluate(() => window.__renders);
    await page.waitForTimeout(150);
    check(await page.evaluate(() => window.__renders) === before, "leaving love chapter stops rendering");
    await context.close();
    console.log("Mobile 3D rendering, frame cap, context loss, and chapter lifecycle: passed");
  } finally { await browser.close(); }
}

let base;
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  if (process.env.WYN_TEST_SUITE !== "audio") {
    await flow(chromium, { viewport: { width: 1280, height: 900 } }, "Chromium");
    await flow(webkit, { viewport: { width: 390, height: 844 }, hasTouch: true }, "WebKit at phone widths (keyboard activation)");
    await failureCases();
    await graphicsLifecycle();
  }
  await slowMusic();
  console.log(`PASS: ${checks} checks`);
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
