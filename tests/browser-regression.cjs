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
  try {
    await page.waitForFunction(fn, null, { timeout: 15000 });
  } catch (error) {
    console.error(message, await page.locator("audio").evaluate((audio) => ({
      src: audio.currentSrc, paused: audio.paused, readyState: audio.readyState,
      time: audio.currentTime, error: audio.error?.message,
      status: document.querySelector("#musicStatus")?.textContent
    })));
    throw error;
  }
  check(true, message);
}
async function activate(locator) {
  // Windows WebKit reports scaled hit-test coordinates inconsistently on
  // high-DPI displays. Use real keyboard activation there; Chromium covers taps.
  if (locator.page().context().browser().browserType().name() === "webkit") {
    await locator.waitFor({ state: "visible" });
    await locator.press("Enter");
  } else if (await locator.page().evaluate(() => navigator.maxTouchPoints > 0)) {
    try {
      await locator.tap();
    } catch (error) {
      // Windows can report touch points even when the context has no touch
      // support enabled; fall back to a normal click in that case.
      await locator.click();
    }
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
    // Navigation moves focus to the new heading on a timer. Wait for that
    // before focusing Next/Back again, or WebKit's key press can be stolen.
    await page.waitForFunction(
      (expected) => document.querySelector(".screen.is-active")?.dataset.screen === expected,
      names[index],
      { timeout: 5000 }
    );
    await page.waitForFunction(() => document.activeElement ===
      document.querySelector(".screen.is-active h1, .screen.is-active h2"));
  }
  check(await page.locator(`#screen-${name}`).isVisible(), `${name} navigation`);
}
async function unlock(page) {
  await activate(page.locator("#openSurprise"));
  await page.waitForFunction(() => document.activeElement === document.querySelector("#identity-title"));
  await activate(page.locator("#yesBtn"));
  await page.waitForFunction(() => document.activeElement === document.querySelector("#secret-title"));
  await page.locator("#secretAnswer").fill("babyyyy");
  await activate(page.locator("#secretForm button[type=submit]"));
  await page.waitForFunction(() => document.activeElement === document.querySelector("#secretSuccessTitle"));
  await activate(page.locator("#enterSurprise"));
}

async function flow(browserType, options, label) {
  // Explicit opt-out for Windows WebKit runtimes whose standalone MP3 player
  // fails with MEDIA_ERR_SRC_NOT_SUPPORTED. Chromium still checks every song.
  const skipAudio = browserType === webkit && process.env.WYN_SKIP_WEBKIT_AUDIO === "1";
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
    if (!skipAudio) {
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
    } else console.log("SKIP: Windows WebKit MP3 playback (standalone decoder unavailable; Chromium verifies audio)");
    await chapter(page, "letter");
    await activate(page.locator("#letterNext"));
    check((await page.locator("#letterProgressText").textContent()).includes("2"), "letter advances");
    await page.goto(base);
    check(await page.locator("#screen-letter").isVisible(), "returning to the page restores chapter");
    check((await page.locator("#letterProgressText").textContent()).includes("2"), "returning restores letter page");
    if (!skipAudio) {
      await activate(page.locator("#musicToggle"));
      await waitFor(page, () => !document.querySelector("audio").paused, "music resumes with one tap after returning");
      await activate(page.locator("#musicToggle"));
    }
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
    await page.goto(base);
    check((await page.locator("#reasonsStatus").textContent()).includes("Reason 2"), "reason survives returning to the page");
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
    await page.goto(base);
    check(await page.locator("#screen-gift").isVisible(), "gift chapter restores");
    check(await page.locator("#giftExtra").isVisible(), "opened gift restores");
    await chapter(page, "memories");
    await activate(page.locator('[data-memory-id="secret"]'));
    check(await page.locator("#detailDialog").isVisible(), "secret memory unlocks");
    await activate(page.locator("#dialogClose"));
    await chapter(page, "final");
    if (!skipAudio) check(await page.evaluate(() => document.querySelector("audio").paused), "navigation respects deliberate pause");
    await page.reload();
    check(await page.locator("#screen-welcome").isVisible(), "browser reload restarts at welcome");
    await waitFor(page, () => window.scrollY === 0, "reload resets Safari's scroll restoration");
    const reloadState = await page.evaluate(() => {
      const $ = (selector) => document.querySelector(selector);
      return {
        letter: $("#letterProgressText").textContent === "Page 1 of 4",
        reasons: $("#reasonsStatus").textContent.startsWith("Reason 1 "),
        question: !$("#secretCard").hidden && $("#secretSuccess").hidden,
        gift: $("#giftReveal").hidden && $("#giftExtra").hidden,
        game: $("#lovePercent").textContent === "0%" && !$("#loveYes").disabled,
        audio: $("audio").paused && $("audio").currentTime === 0 && $("audio").volume === 0.45,
        navigation: $("#topbar").hidden && window.scrollY === 0
      };
    });
    check(Object.values(reloadState).every(Boolean), `browser reload resets all state: ${JSON.stringify(reloadState)}`);
    await unlock(page);
    await chapter(page, "final");
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
    console.log(`${label}: main flow, ${skipAudio ? "audio checks skipped" : "13 songs"}, reload reset, touch cancellation, and responsive checks passed`);
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
    await page.goto(base);
    await waitFor(page, () => document.querySelector("audio").currentTime >= 19.5, "song position survives returning to the page");
    check(await page.evaluate(() => document.querySelector("audio").paused), "saved pause survives returning to the page");

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
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await context.route("**/vendor/three.min.js", async (route) => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + `
        window.__renders = 0;
        const OriginalRenderer = THREE.WebGLRenderer;
        THREE.WebGLRenderer = class extends OriginalRenderer {
          constructor(...args) {
            super(...args);
            const render = this.render;
            this.render = (...args) => { window.__renders++; return render.apply(this, args); };
          }
        };` });
    });
    const page = await context.newPage();
    await page.goto(base);
    check(await page.evaluate(() => !window.THREE), "desktop does not download Three.js at startup");
    await unlock(page);
    await chapter(page, "love");
    await waitFor(page, () => window.__renders > 2, "3D heart renders when its chapter opens");
    let before = await page.evaluate(() => window.__renders);
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
    console.log("Desktop lazy 3D rendering, context loss, and chapter lifecycle: passed");
  } finally { await browser.close(); }
}

async function mobileStability(browserType, options, label) {
  const browser = await browserType.launch();
  try {
    // Keep normal motion enabled: reduced-motion tests would hide this failure.
    const context = await browser.newContext({ ...options, reducedMotion: "no-preference" });
    await context.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    const page = await context.newPage();
    const errors = [];
    const missing = [];
    let graphicsDownloads = 0;
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("crash", () => errors.push("Browser page crashed"));
    page.on("response", (response) => { if (response.status() >= 400) missing.push(response.url()); });
    page.on("request", (request) => { if (request.url().includes("three.min.js")) graphicsDownloads++; });
    await page.addInitScript(() => {
      window.__webglContexts = 0;
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...args) {
        if (/webgl/.test(type)) window.__webglContexts++;
        return original.call(this, type, ...args);
      };
    });
    await page.goto(base);
    check(await page.locator(".ambient__wash").first().evaluate((el) => getComputedStyle(el).filter === "none"), "mobile ambient gradients do not allocate blur surfaces");
    check(await page.locator("body").evaluate((el) => getComputedStyle(el, "::after").display === "none"), "phone does not composite a full-screen SVG noise filter");
    await unlock(page);
    for (let round = 0; round < 3; round++) {
      for (const name of ["letter", "memories", "reasons", "love", "game", "gift", "final"]) {
        await chapter(page, name);
        if (name === "letter") {
          check(await page.locator(".letter-page.is-active p").first().evaluate((el) => {
            const style = getComputedStyle(el);
            return style.maskImage === "none" && style.animationName === "none";
          }), "mobile letter avoids animated text masks");
          await activate(page.locator("#letterNext"));
        }
        if (name === "memories") {
          const photo = page.locator(".memory-card:visible img").first();
          await photo.scrollIntoViewIfNeeded();
          await waitFor(page, () => {
            const img = document.querySelector(".memory-card:not([hidden]) img");
            return img.complete && img.naturalWidth > 0;
          }, "scrapbook thumbnail loads");
          check(await photo.evaluate((img) => Math.max(img.naturalWidth, img.naturalHeight) <= 640), "card decodes only a thumbnail");
          await activate(page.locator(".memory-card:visible").first());
          await waitFor(page, () => document.querySelector("#dialogMedia img")?.naturalWidth > 0, "original memory photo loads in dialog");
          check(await page.locator("#dialogMedia img").evaluate((img) => img.src.includes("/our-pictures/")), "dialog keeps the original photo");
          await activate(page.locator("#dialogClose"));
          check(await page.locator("#dialogMedia img").count() === 0, "closing releases full-size photo element");
        }
        if (name === "love") {
          check(await page.locator(".love3d__fallback").isVisible(), "phone shows the lightweight heart");
          await activate(page.locator("#measureBtn"));
          await waitFor(page, () => document.querySelector("#lovePercent").textContent === "∞%", "mobile love meter completes without WebGL");
          await activate(page.locator("#loveReset"));
        }
        if (round === 0 && ["letter", "memories", "love"].includes(name)) {
          await page.screenshot({ path: path.join(root, ".tmp", `${browserType.name()}-${name}.png`), fullPage: true });
        }
      }
    }
    check(graphicsDownloads === 0 && await page.evaluate(() => window.__webglContexts === 0), "phone never downloads Three.js or allocates WebGL");
    // Dwell beyond the reported seconds-to-a-minute failure window with music.
    for (let i = 0; i < 3; i++) {
      await page.waitForTimeout(20000);
      check(await page.locator("#screen-final").isVisible(), "mobile page survives extended browsing");
      console.log(`${label}: stability dwell ${(i + 1) * 20}/60 seconds`);
    }
    await page.screenshot({ path: path.join(root, ".tmp", `mobile-${browserType.name()}.png`), fullPage: true });
    check(errors.length === 0, `no mobile errors or crashes: ${errors.join(", ")}`);
    check(missing.length === 0, `no missing mobile assets: ${missing.join(", ")}`);
    await context.close();
    console.log(`${label}: normal-motion repeated browsing and 60-second dwell passed`);
  } finally { await browser.close(); }
}

let base;
(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  fs.mkdirSync(path.join(root, ".tmp"), { recursive: true });
  const suite = process.env.WYN_TEST_SUITE;
  if (!suite || suite === "chromium") {
    await flow(chromium, { viewport: { width: 1280, height: 900 } }, "Chromium");
  }
  if (!suite || suite === "webkit") {
    await flow(webkit, { viewport: { width: 390, height: 844 }, hasTouch: true }, "WebKit at phone widths (keyboard activation)");
  }
  if (!suite || suite === "failures") {
    await failureCases();
  }
  if (!suite || suite === "graphics") {
    await graphicsLifecycle();
  }
  if (!suite || suite === "mobile") {
    await mobileStability(chromium, devices["iPhone 13"], "Chromium iPhone emulation");
    await mobileStability(webkit, { viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 3 }, "WebKit phone layout");
  }
  if (!suite || suite === "audio") await slowMusic();
  console.log(`PASS: ${checks} checks`);
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
