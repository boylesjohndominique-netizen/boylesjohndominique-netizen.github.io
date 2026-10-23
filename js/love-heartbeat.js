/* ============================================================
   Love Meter — Interactive Heartbeat Component
   Lightweight, highly optimized, aesthetically pleasing & fun!
   Replaces heavy 3D WebGL model with smooth, accessible SVG/CSS
   animations, dynamic BPM cardiology monitor, and tap interactions.
   ============================================================ */

(function () {
  "use strict";

  const stage = document.getElementById("loveStage");
  const heartCore = document.getElementById("loveHeartCore");
  const heartBurst = document.getElementById("loveHeartBurst");
  const bpmValue = document.getElementById("loveBpm");
  const bpmStatus = document.getElementById("loveBpmStatus");
  const bubble = document.getElementById("loveBubble");
  const bubbleText = document.getElementById("loveBubbleText");

  if (!stage || !heartCore) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  // State
  let active = false;
  let progress = 0;
  let isCelebrating = false;
  let baseBpm = 72;
  let currentBpm = 72;
  let tapBonus = 0;
  let tapTimer = null;
  let bubbleTimer = null;
  let holdTimer = null;
  let holdFired = false;

  const LOVE_TAGS = [
    "thump thump! 💓",
    "you make my heart skip! 🦋",
    "lub-dub, lub-dub! 🩺",
    "beating only for you 🥰",
    "wynwynwynwyn ❤️",
    "1000% pure love ✨",
    "can't slow down! 💘",
    "always you, baby 🌸",
    "heart rate: off the charts! 📈",
    "my favorite thought 💭",
    "butterflies in my chest! 🦋",
    "so deeply in love with you 🥺💗",
    "boop! 🍓"
  ];
  let tagIndex = 0;

  const EMOJI_BURST = ["💗", "💖", "💕", "✨", "🥰", "🌸", "🍓", "💘", "💓", "♥"];

  function getStatusForProgress(pct, celebrating) {
    if (celebrating || pct >= 100) {
      return "CRITICAL LOVE OVERLOAD! 📈💖";
    }
    if (pct >= 85) return "Pounding so fast! 😳";
    if (pct >= 65) return "Fluttering fast! ⚡";
    if (pct >= 40) return "Heart skipping beats! 🦋";
    if (pct >= 18) return "Butterflies warming up... 💓";
    return "Resting calm beat 💓";
  }

  function updateHeartbeat() {
    if (!active) return;

    if (isCelebrating || progress >= 100) {
      currentBpm = 220 + tapBonus;
      if (bpmValue) bpmValue.textContent = "∞ BPM";
    } else {
      baseBpm = Math.round(72 + (progress / 100) * 115);
      currentBpm = baseBpm + tapBonus;
      if (bpmValue) bpmValue.textContent = `${currentBpm} BPM`;
    }

    if (bpmStatus) {
      bpmStatus.textContent = getStatusForProgress(progress, isCelebrating);
    }

    // Convert BPM to animation cycle duration in seconds: 60 / BPM
    const clampedBpm = Math.max(currentBpm, 40);
    const duration = isCelebrating ? 0.28 : Math.max(0.32, 60 / clampedBpm);
    stage.style.setProperty("--beat-duration", `${duration.toFixed(3)}s`);

    // Dynamic glow and pulse intensity
    const intensity = progress / 100;
    stage.style.setProperty("--love-intensity", intensity.toFixed(2));
  }

  function showBubble(text, durationMs = 2200) {
    if (!bubble || !bubbleText) return;
    bubbleText.textContent = text;
    bubble.classList.remove("is-visible");
    void bubble.offsetWidth; // Force reflow
    bubble.classList.add("is-visible");

    if (bubbleTimer) clearTimeout(bubbleTimer);
    bubbleTimer = setTimeout(() => {
      bubble.classList.remove("is-visible");
    }, durationMs);
  }

  function spawnBurst(originX, originY, count = 5) {
    if (!heartBurst) return;
    const burstRect = heartBurst.getBoundingClientRect();

    const cx = originX !== undefined && burstRect.width > 0 ? (originX - burstRect.left) : (burstRect.width / 2 || 60);
    const cy = originY !== undefined && burstRect.height > 0 ? (originY - burstRect.top) : (burstRect.height / 2 || 60);

    for (let i = 0; i < count; i++) {
      const el = document.createElement("span");
      el.className = "burst-particle";
      el.textContent = EMOJI_BURST[Math.floor(Math.random() * EMOJI_BURST.length)];

      const angle = (Math.PI * 2 * i) / count + (Math.random() * 0.4 - 0.2);
      const distance = 40 + Math.random() * 55;
      const tx = Math.cos(angle) * distance;
      const ty = Math.sin(angle) * distance - 25; // drift upward
      const rot = (Math.random() - 0.5) * 50;
      const size = 14 + Math.random() * 12;

      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      el.style.fontSize = `${size}px`;
      el.style.setProperty("--tx", `${tx}px`);
      el.style.setProperty("--ty", `${ty}px`);
      el.style.setProperty("--rot", `${rot}deg`);

      heartBurst.appendChild(el);
      el.addEventListener("animationend", () => el.remove(), { once: true });
      setTimeout(() => el.remove(), 1200); // Safety cleanup
    }
  }

  function handleTap(event) {
    if (holdFired) {
      holdFired = false;
      return;
    }
    // Bounce heart
    heartCore.classList.remove("is-tapped");
    void heartCore.offsetWidth;
    heartCore.classList.add("is-tapped");

    // Spawn emoji burst
    const clientX = event && typeof event.clientX === "number" ? event.clientX : undefined;
    const clientY = event && typeof event.clientY === "number" ? event.clientY : undefined;
    spawnBurst(clientX, clientY, 5);

    // Pick next cute message
    const tag = LOVE_TAGS[tagIndex % LOVE_TAGS.length];
    tagIndex++;
    showBubble(tag, 2200);

    // Temporary BPM spike for fun interactivity
    tapBonus = Math.min(tapBonus + 14, 60);
    updateHeartbeat();

    if (tapTimer) clearTimeout(tapTimer);
    tapTimer = setTimeout(() => {
      tapBonus = 0;
      updateHeartbeat();
    }, 1800);
  }

  function startHold() {
    holdFired = false;
    if (holdTimer) clearTimeout(holdTimer);
    holdTimer = setTimeout(() => {
      holdFired = true;
      heartCore.classList.add("is-hugging");
      stage.classList.add("is-hug-active");
      spawnBurst(undefined, undefined, 8);
      showBubble("giving you the biggest, warmest hug... 🤗💗", 3000);
    }, 450);
  }

  function endHold() {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
    }
    heartCore.classList.remove("is-hugging");
    stage.classList.remove("is-hug-active");
  }

  function bindEvents() {
    heartCore.addEventListener("click", handleTap);
    heartCore.addEventListener("pointerdown", startHold);
    window.addEventListener("pointerup", endHold);
    window.addEventListener("pointercancel", endHold);

    document.addEventListener("visibilitychange", () => {
      if (document.hidden) {
        pause();
      } else if (active) {
        resume();
      }
    });

    const onMotion = () => updateHeartbeat();
    if (reducedMotion.addEventListener) reducedMotion.addEventListener("change", onMotion);
    else if (reducedMotion.addListener) reducedMotion.addListener(onMotion);
  }

  function resume() {
    stage.classList.add("is-running");
    updateHeartbeat();
  }

  function pause() {
    stage.classList.remove("is-running");
  }

  function setActive(val) {
    active = Boolean(val);
    if (active) {
      resume();
    } else {
      pause();
      endHold();
    }
  }

  function setProgress(val) {
    progress = Math.min(Math.max(Number(val) || 0, 0), 100);
    if (progress < 100) isCelebrating = false;
    updateHeartbeat();
  }

  function celebrate() {
    isCelebrating = true;
    stage.classList.add("is-celebrating");
    updateHeartbeat();
    spawnBurst(undefined, undefined, 12);
    showBubble("100%? NOPE, INFINITE LOVE! 🎉💖", 4000);
  }

  function reset() {
    progress = 0;
    isCelebrating = false;
    tapBonus = 0;
    stage.classList.remove("is-celebrating");
    showBubble("beating softly for you 💓", 1800);
    updateHeartbeat();
  }

  bindEvents();
  const loveScreen = document.getElementById("screen-love");
  if (loveScreen && !loveScreen.hidden) {
    setActive(true);
  }

  const api = {
    setActive,
    setProgress,
    celebrate,
    reset,
    triggerBeat: handleTap
  };

  window.LoveHeartbeat = api;
  window.Love3D = api;
})();
