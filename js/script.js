/* ============================================================
   Wyn Keysha Gonzales — Birthday Website
   All interactions. Vanilla JavaScript only.
   ============================================================ */

(function () {
  "use strict";

  /* ---------- Small helpers ---------- */
  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const prefersReducedMotion = () => reducedMotionQuery.matches;

  const pad = (value) => String(value).padStart(2, "0");

  /* ---------- State (kept for the whole visit) ---------- */
  const CHAPTERS = [
    { id: "reveal", title: "The Big Day" },
    { id: "letter", title: "Your Letter" },
    { id: "memories", title: "Our Scrapbook" },
    { id: "reasons", title: "Little Reasons" },
    { id: "love", title: "Love Meter" },
    { id: "game", title: "A Silly Game" },
    { id: "gift", title: "Your Gift" },
    { id: "final", title: "One Last Thing" }
  ];

  const SCREEN_TITLES = {
    welcome: "A Little Something for Wyn Keysha 💗",
    identity: "Is that you, babyy?",
    secret: "One tiny question",
    reveal: "Happy Birthday, Wyn Keysha! 💗",
    letter: "Your Birthday Letter",
    memories: "Our Scrapbook",
    reasons: "Little Reasons Why I Love You",
    love: "How Much Do I Love You?",
    game: "Do You Love Me?",
    gift: "Your Gift",
    final: "Always Yours"
  };

  const state = {
    current: "welcome",
    unlocked: false,
    visited: new Set(),
    secretsFound: new Set(),
    revealSeen: false,
    finalSeen: false,
    giftOpened: false,
    memoryUnlocked: false,
    reasonsRevealed: new Set(),
    loveMeasured: false,
    gameDone: false,
    dodges: 0,
    letterPage: 0
  };

  const SECRET_TOTAL = 4;
  const screens = new Map($$(".screen").map((screen) => [screen.dataset.screen, screen]));

  const topbar = $("#topbar");
  const chapterNav = $("#chapterNav");
  const chapterLabel = $("#chapterLabel");
  const chapterShort = $("#chapterShort");
  const chapterFill = $("#chapterFill");
  const chapterNavCurrent = $("#chapterNavCurrent");
  const prevBtn = $("#prevBtn");
  const nextBtn = $("#nextBtn");
  const toast = $("#toast");

  let toastTimer = null;
  let brandTapTimer = null;
  let dateTapCount = 0;
  let brandTapCount = 0;

  /* ============================================================
     Toasts & particles
  ============================================================ */
  function showToast(message, duration = 4200) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, duration);
  }

  function burst(x, y, count = 34) {
    if (prefersReducedMotion()) return;

    const layer = $("#particleLayer");
    if (!layer) return;

    const colors = ["#c34f63", "#e4c78c", "#7e6aa0", "#f3c9ad", "#d96779", "#c2566b"];
    const startX = typeof x === "number" ? x : window.innerWidth / 2;
    const startY = typeof y === "number" ? y : window.innerHeight * 0.32;

    for (let i = 0; i < count; i += 1) {
      const particle = document.createElement("span");
      const angle = Math.random() * Math.PI * 2;
      const distance = 70 + Math.random() * 250;
      const size = 8 + Math.random() * 11;
      const duration = 1.5 + Math.random() * 1.1;
      const delay = Math.random() * 0.28;

      particle.className = "particle particle--heart";
      particle.textContent = Math.random() < 0.55 ? "♥" : "✦";
      particle.setAttribute("aria-hidden", "true");
      particle.style.setProperty("--start-x", `${startX}px`);
      particle.style.setProperty("--start-y", `${startY}px`);
      particle.style.setProperty("--dx", `${Math.cos(angle) * distance}px`);
      particle.style.setProperty("--dy", `${Math.sin(angle) * distance - 40}px`);
      particle.style.setProperty("--rotate", `${Math.random() * 260 - 130}deg`);
      particle.style.setProperty("--size", `${size}px`);
      particle.style.setProperty("--duration", `${duration}s`);
      particle.style.setProperty("--delay", `${delay}s`);
      particle.style.setProperty("--color", colors[Math.floor(Math.random() * colors.length)]);

      layer.appendChild(particle);
      window.setTimeout(() => particle.remove(), (duration + delay) * 1000 + 250);
    }
  }

  function burstFromElement(element, count = 30) {
    if (!element) return;
    const rect = element.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height / 2, count);
  }

  /* ============================================================
     Screen navigation
  ============================================================ */
  function chapterIndex(id) {
    return CHAPTERS.findIndex((chapter) => chapter.id === id);
  }

  function focusScreenHeading(screen) {
    const heading = $("h1, h2", screen);
    if (!heading) return;
    if (!heading.hasAttribute("tabindex")) heading.setAttribute("tabindex", "-1");
    window.setTimeout(() => {
      try {
        heading.focus({ preventScroll: true });
      } catch (error) {
        heading.focus();
      }
    }, prefersReducedMotion() ? 0 : 80);
  }

  function updateChapterUI(id) {
    const index = chapterIndex(id);

    if (index === -1) {
      topbar.hidden = true;
      chapterNav.hidden = true;
      return;
    }

    topbar.hidden = false;
    chapterNav.hidden = false;

    const count = CHAPTERS.length;
    chapterLabel.textContent = `Chapter ${index + 1} of ${count}`;
    chapterShort.textContent = `${index + 1}/${count}`;
    chapterFill.style.width = `${((index + 1) / count) * 100}%`;
    chapterNavCurrent.textContent = CHAPTERS[index].title;

    prevBtn.hidden = index === 0;
    nextBtn.hidden = index === count - 1;

    if (index > 0) {
      prevBtn.setAttribute("aria-label", `Back: ${CHAPTERS[index - 1].title}`);
    }
    if (index < count - 1) {
      nextBtn.setAttribute("aria-label", `Next: ${CHAPTERS[index + 1].title}`);
    }
  }

  function showScreen(name, options = {}) {
    const target = screens.get(name);
    if (!target) return;

    screens.forEach((screen, key) => {
      const isTarget = key === name;
      screen.classList.toggle("is-active", isTarget);
      screen.hidden = !isTarget;
    });

    state.current = name;
    state.unlocked = chapterIndex(name) !== -1;
    document.title = SCREEN_TITLES[name] || SCREEN_TITLES.welcome;

    if (state.unlocked) {
      state.visited.add(name);
      updateChapterUI(name);
    } else {
      updateChapterUI(name);
    }

    window.scrollTo(0, 0);

    if (options.focus !== false) {
      focusScreenHeading(target);
    }

    if (name === "reveal" && !state.revealSeen) {
      state.revealSeen = true;
      window.setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.3, 38), 220);
    }

    if (name === "final") {
      updateFinalStats();
      if (!state.finalSeen) {
        state.finalSeen = true;
        window.setTimeout(() => burst(window.innerWidth / 2, window.innerHeight * 0.34, 30), 260);
      }
    }

    if (name === "memories" && state.memoryUnlocked) {
      unlockSecretMemory(false);
    }
  }

  function goToChapter(id) {
    if (!screens.has(id) || chapterIndex(id) === -1) return;
    if (id === "letter" && state.current === "final") {
      setLetterPage(0);
    }
    showScreen(id);
  }

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-go]");
    if (!trigger) return;
    const destination = trigger.dataset.go;
    if (destination) goToChapter(destination);
  });

  prevBtn.addEventListener("click", () => {
    const index = chapterIndex(state.current);
    if (index > 0) goToChapter(CHAPTERS[index - 1].id);
  });

  nextBtn.addEventListener("click", () => {
    const index = chapterIndex(state.current);
    if (index > -1 && index < CHAPTERS.length - 1) goToChapter(CHAPTERS[index + 1].id);
  });

  /* ============================================================
     Welcome → identity → secret
  ============================================================ */
  const openSurprise = $("#openSurprise");
  const identityCard = $("#identityCard");
  const identityResponse = $("#identityResponse");
  const identityResponseImage = $("#identityResponseImage");
  const identityResponseText = $("#identityResponseText");
  const yesBtn = $("#yesBtn");
  const noBtn = $("#noBtn");
  const retryIdentity = $("#retryIdentity");
  let identityLocked = false;

  // Rotating reactions for every "Nope!" tap, so it never feels repetitive.
  const IDENTITY_REJECTIONS = [
    {
      image: "assets/icons/cat-up-eyebrow.png",
      text: "Excuse me?! You're not my baby. This little surprise is reserved for Wyn Keysha Gonzales! 💗",
      toast: "Nice try, cutie. The surprise knows who it's for. 😤💗"
    },
    {
      image: "assets/icons/cat-think.png",
      text: "Hmm... still not her. This website only opens for one very special person. 💗",
      toast: "Wrong again, cutie. Think of a certain birthday girl. 🤨"
    },
    {
      image: "assets/icons/cat-tears-handplease.png",
      text: "Aw, you're cute for trying. But my heart (and this website) belongs to Wyn Keysha Gonzales. 🥺💗",
      toast: "So close! The answer is still Wyn Keysha. 🥺💗"
    },
    {
      image: "assets/icons/cat-nerd.png",
      text: "Nope, nope, nope. Nice try though — this surprise is a Keysha-only zone! 💗",
      toast: "The surprise is very picky. It only wants Wyn Keysha. 💗"
    }
  ];

  // Warm the reaction images so switching between them never flickers.
  IDENTITY_REJECTIONS.forEach((rejection) => {
    const preload = new Image();
    preload.src = rejection.image;
  });

  let identityRejectionIndex = 0;

  openSurprise.addEventListener("click", () => {
    burstFromElement(openSurprise, 18);
    beginSoundtrack();
    showScreen("identity");
  });

  yesBtn.addEventListener("click", () => {
    if (identityLocked) return;
    identityLocked = true;
    identityCard.classList.add("is-celebrating");
    burstFromElement(identityCard, 26);

    window.setTimeout(() => {
      identityCard.classList.remove("is-celebrating");
      showScreen("secret");
      identityLocked = false;
    }, prefersReducedMotion() ? 0 : 620);
  });

  noBtn.addEventListener("click", () => {
    if (identityLocked) return;

    const rejection = IDENTITY_REJECTIONS[identityRejectionIndex % IDENTITY_REJECTIONS.length];
    identityRejectionIndex += 1;

    if (identityResponseImage) identityResponseImage.src = rejection.image;
    if (identityResponseText) identityResponseText.textContent = rejection.text;

    identityResponse.hidden = false;
    identityResponse.classList.remove("is-active");
    // Restart the animation even on repeated clicks.
    void identityResponse.offsetWidth;
    identityResponse.classList.add("is-active");
    identityCard.classList.remove("is-shaking");
    void identityCard.offsetWidth;
    identityCard.classList.add("is-shaking");
    identityResponse.focus({ preventScroll: true });
    showToast(rejection.toast);
  });

  retryIdentity.addEventListener("click", () => {
    identityResponse.hidden = true;
    identityResponse.classList.remove("is-active");
    identityCard.classList.remove("is-shaking");
    yesBtn.focus({ preventScroll: true });
  });

  /* ---------- Secret question ---------- */
  const secretForm = $("#secretForm");
  const secretAnswer = $("#secretAnswer");
  const secretFeedback = $("#secretFeedback");
  const secretCard = $("#secretCard");
  const secretSuccess = $("#secretSuccess");
  const hintBtn = $("#hintBtn");
  const hintText = $("#hintText");
  const enterSurprise = $("#enterSurprise");

  const ACCEPTED_ANSWERS = new Set([
    "john dominique",
    "john dominique boyles",
    "john dominique g. boyles",
    "john dominique g boyles"
  ]);

  // "baby", "babyy", "babyyyy" ... (the longer the y, the sweeter).
  const BABY_PATTERN = /^baby+$/;

  const normalizeAnswer = (value) =>
    String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

  function setSecretError(message) {
    secretFeedback.textContent = message;
    secretFeedback.classList.remove("is-success");
    secretFeedback.classList.add("is-error");
    secretAnswer.classList.add("is-error");
    secretAnswer.setAttribute("aria-invalid", "true");
  }

  function clearSecretError() {
    secretFeedback.textContent = "";
    secretFeedback.classList.remove("is-error");
    secretAnswer.classList.remove("is-error");
    secretAnswer.removeAttribute("aria-invalid");
  }

  secretForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const answer = normalizeAnswer(secretAnswer.value);

    if (!answer) {
      setSecretError("Don't be shy, baby. Type something first. 💗");
      secretAnswer.focus({ preventScroll: true });
      return;
    }

    if (ACCEPTED_ANSWERS.has(answer) || BABY_PATTERN.test(answer)) {
      clearSecretError();
      secretAnswer.setAttribute("aria-invalid", "false");
      secretCard.hidden = true;
      secretSuccess.hidden = false;
      burstFromElement(secretSuccess, 40);
      focusScreenHeading(secretSuccess);
      return;
    }

    setSecretError("Hmmmm... try again, baby. You know this one! 💗");
    secretAnswer.focus({ preventScroll: true });
    secretAnswer.select();
  });

  secretAnswer.addEventListener("input", () => {
    if (secretAnswer.classList.contains("is-error")) clearSecretError();
  });

  hintBtn.addEventListener("click", () => {
    const isOpen = hintBtn.getAttribute("aria-expanded") === "true";
    hintBtn.setAttribute("aria-expanded", String(!isOpen));
    hintText.hidden = isOpen;
    if (!isOpen) hintText.focus?.({ preventScroll: true });
  });

  enterSurprise.addEventListener("click", () => {
    burstFromElement(enterSurprise, 36);
    showScreen("reveal");
  });

  /* ============================================================
     Countdown — October 24, 2026 in Asia/Manila (UTC+8)
  ============================================================ */
  const BIRTHDAY_START = Date.parse("2026-10-24T00:00:00+08:00");
  const BIRTHDAY_END = BIRTHDAY_START + 24 * 60 * 60 * 1000;

  const cdDays = $("#cdDays");
  const cdHours = $("#cdHours");
  const cdMinutes = $("#cdMinutes");
  const cdSeconds = $("#cdSeconds");
  const countdownGrid = $("#countdownGrid");
  const countdownMessage = $("#countdownMessage");
  const countdownLabel = $("#countdownLabel");

  function updateCountdown() {
    const now = Date.now();

    if (now < BIRTHDAY_START) {
      const diff = BIRTHDAY_START - now;
      const days = Math.floor(diff / 86400000);
      const hours = Math.floor((diff % 86400000) / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      countdownGrid.hidden = false;
      countdownMessage.hidden = true;
      countdownLabel.textContent = "Counting down to your day";
      cdDays.textContent = pad(days);
      cdHours.textContent = pad(hours);
      cdMinutes.textContent = pad(minutes);
      cdSeconds.textContent = pad(seconds);
      return;
    }

    countdownGrid.hidden = true;
    countdownMessage.hidden = false;

    if (now < BIRTHDAY_END) {
      countdownLabel.textContent = "Today is the day";
      countdownMessage.textContent = "It's October 24 in Manila — happy birthday, my love! 🎂";
    } else {
      countdownLabel.textContent = "Still celebrating you";
      countdownMessage.textContent = "The birthday celebration continues! 💗";
    }
  }

  updateCountdown();
  window.setInterval(updateCountdown, 1000);

  /* ============================================================
     Letter — three pages
  ============================================================ */
  const letterPages = $$(".letter-page");
  const letterDots = $("#letterDots");
  const letterPrev = $("#letterPrev");
  const letterNext = $("#letterNext");
  const letterProgressText = $("#letterProgressText");

  function buildLetterDots() {
    letterDots.innerHTML = "";
    letterPages.forEach((page, index) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = "page-dot";
      dot.setAttribute("aria-label", `Go to letter page ${index + 1}`);
      dot.addEventListener("click", () => setLetterPage(index));
      letterDots.appendChild(dot);
    });
  }

  function setLetterPage(index, options = {}) {
    const pageCount = letterPages.length;
    const nextIndex = Math.min(Math.max(index, 0), pageCount - 1);
    state.letterPage = nextIndex;

    letterPages.forEach((page, pageIndex) => {
      const isCurrent = pageIndex === nextIndex;
      page.hidden = !isCurrent;
      page.classList.toggle("is-active", isCurrent);
    });

    $$(".page-dot", letterDots).forEach((dot, dotIndex) => {
      const isCurrent = dotIndex === nextIndex;
      dot.classList.toggle("is-active", isCurrent);
      if (isCurrent) {
        dot.setAttribute("aria-current", "page");
      } else {
        dot.removeAttribute("aria-current");
      }
    });

    letterProgressText.textContent = `Page ${nextIndex + 1} of ${pageCount}`;
    letterPrev.disabled = nextIndex === 0;
    letterNext.textContent = nextIndex === pageCount - 1 ? "On to our memories →" : "Next page →";

    if (options.focus) {
      const heading = letterPages[nextIndex];
      if (heading) {
        heading.setAttribute("tabindex", "-1");
        heading.focus({ preventScroll: true });
      }
    }
  }

  letterPrev.addEventListener("click", () => setLetterPage(state.letterPage - 1, { focus: true }));
  letterNext.addEventListener("click", () => {
    if (state.letterPage === letterPages.length - 1) {
      goToChapter("memories");
      return;
    }
    setLetterPage(state.letterPage + 1, { focus: true });
  });

  buildLetterDots();
  setLetterPage(0);

  /* ============================================================
     Memories scrapbook
  ============================================================ */
  const MEMORIES = [
    {
      id: "instagram",
      title: "Our First Interaction",
      caption: "where it all started",
      sticker: "💌",
      image: "assets/images/our-pictures/our-first-interaction.jpg",
      alt: "Our first interaction — the Instagram Notes beginning",
      body:
        "Some stories start in the most ordinary places. Ours started with Instagram Notes — and me being the one brave enough to approach you first.\n\nI didn't know then that a small hello would turn into someone I talk to every day, plan a future with, and call my favorite person. But I'm really glad I sent it."
    },
    {
      id: "calls-one",
      title: "Our Laptop Calls",
      caption: "screen to screen",
      sticker: "📱",
      image: "assets/images/our-pictures/us-laptopcall-picture2.jpg",
      alt: "Us on a laptop video call",
      body:
        "Long-distance means our favorite hangout is a glowing screen, and honestly? I'd take a laptop call with you over almost anything else.\n\nSeeing your face, hearing you laugh, watching you get distracted mid-sentence — it all makes the distance feel a little smaller."
    },
    {
      id: "calls-two",
      title: "Late-Night Calls",
      caption: "still not tired of you",
      sticker: "🌙",
      image: "assets/images/our-pictures/us-laptopcall-picture3.jpg",
      alt: "Us together on another late-night laptop call",
      body:
        "My favorite kind of night is the one where the messages get longer and the hours get smaller.\n\nWe talk about our future, imagine what it will be like to finally be together, and make each other laugh about absolutely nothing. Those conversations are some of my favorite places to be."
    },
    {
      id: "games",
      title: "Games Together",
      caption: "brain fog, but make it cute",
      sticker: "🎮",
      image: "assets/images/our-pictures/us-playing-roblox.jpg",
      alt: "Us playing Roblox together",
      body:
        "Multiplayer games, random jokes, and calls where the conversation goes completely off the rails.\n\nWhen brain fog hits and your eyes do that little split-apart thing, it makes me laugh every time — not at you, just because it's such a \"you\" moment and I love being on the other side of the screen for it. Consider this our very serious private joke."
    },
    {
      id: "silly",
      title: "Our Silly Faces",
      caption: "certified goofballs",
      sticker: "😝",
      image: "assets/images/our-pictures/us-weird-faces3.jpg",
      alt: "Us making silly faces together",
      body:
        "No one makes me laugh as easily as you do. This is us without filters, without plans, just being ridiculous together.\n\nI think that's why we work — we never take ourselves too seriously. Keep the funny faces coming, baby."
    },
    {
      id: "keysha",
      title: "My Baby Keysha",
      caption: "the prettiest girl ever",
      sticker: "💗",
      image: "assets/images/our-pictures/my-baby-keysha.jpg",
      alt: "A photo of my baby, Keysha",
      body:
        "I could look at this photo forever. You, being effortlessly pretty without even trying.\n\nThank you for being mine, for being patient with me, and for making my days better just by existing. You really are the prettiest girl ever."
    },
    {
      id: "gift",
      title: "Me With Your Gift",
      caption: "I still smile at this one",
      sticker: "🎁",
      image: "assets/images/our-pictures/me-with-her-gift.jpg",
      alt: "Me holding the gift she gave me",
      body:
        "Something from you means more than it probably should, and I'm not even sorry about it.\n\nI keep every little thing you give me close. It's not about what it is — it's about who it came from. Thank you, baby."
    },
    {
      id: "imagined",
      title: "Us, Imagined",
      caption: "how I picture our future",
      sticker: "✨",
      image: "assets/images/our-pictures/us-generated-ai.jpg",
      alt: "An AI-generated picture of us",
      body:
        "We might not have a real photo of every moment yet, so I made one to hold us over — a little peek at the future I keep daydreaming about.\n\nOne day the distance won't be between us. Until then, I'll keep imagining us like this and working toward it."
    },
    {
      id: "secret",
      title: "The Chapter We're Still Writing",
      caption: "to be continued...",
      sticker: "💫",
      secret: true,
      image: "assets/images/our-pictures/ai-imagination-ofus.jpg",
      alt: "An imagined picture of our next chapter",
      body:
        "This chapter isn't finished, because it's still happening. It's all the ordinary days ahead: more calls, more games, more late-night talks, and more chances to choose each other.\n\nI don't know every detail of what's coming. I just know I want more of it with you."
    }
  ];

  const memoryGrid = $("#memoryGrid");
  const scrapbookSecretHint = $("#scrapbookSecretHint");

  function attachImageFallback(image) {
    image.addEventListener("error", () => {
      const card = image.closest(".memory-card");
      if (card) card.classList.add("is-missing");
    });
  }

  function renderMemories() {
    memoryGrid.innerHTML = "";

    const tilts = [-2.4, 1.5, -1.4, 2.2, -1.8, 1.3];

    MEMORIES.forEach((memory, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "memory-card";
      if (memory.secret) card.classList.add("memory-card--secret");
      card.dataset.memoryId = memory.id;
      card.style.setProperty("--tilt", `${tilts[index % tilts.length]}deg`);
      card.setAttribute("aria-label", `Open memory: ${memory.title} — ${memory.caption}`);

      card.innerHTML = `
        <span class="memory-card__frame">
          <span class="memory-card__tape" aria-hidden="true"></span>
          <span class="memory-card__img-wrap">
            <img class="memory-card__img" src="${memory.image}" alt="${memory.alt}"
              width="900" height="1200" loading="lazy" decoding="async">
            <span class="memory-card__fallback" aria-hidden="true">
              ♡<span>our photo goes here</span>
            </span>
          </span>
          <span class="memory-card__caption">
            <span class="memory-card__title">${memory.title}</span>
            <span class="memory-card__sub">${memory.caption}</span>
          </span>
          <span class="memory-card__sticker" aria-hidden="true">${memory.sticker}</span>
        </span>
      `;

      card.addEventListener("click", () => openMemory(memory));
      memoryGrid.appendChild(card);

      const image = $("img", card);
      if (image) attachImageFallback(image);

      if (memory.secret && !state.giftOpened) {
        card.hidden = true;
      }
    });
  }

  function unlockSecretMemory(announce) {
    if (!state.giftOpened) return;
    state.memoryUnlocked = true;

    const secretCard = memoryGrid.querySelector('[data-memory-id="secret"]');
    if (secretCard && secretCard.hidden) {
      secretCard.hidden = false;
      secretCard.classList.add("is-revealing");
      window.setTimeout(() => secretCard.classList.remove("is-revealing"), 800);
    }

    if (scrapbookSecretHint) {
      scrapbookSecretHint.textContent = "A new memory just appeared above. Go on, open it. ✨";
      scrapbookSecretHint.classList.add("is-unlocked");
    }

    if (announce) showToast("A secret memory just unlocked in our scrapbook. ✨");
  }

  $("#scrapbookSecret").addEventListener("click", (event) => {
    openNote(
      "Movie Night Confession",
      "You're the bravest person I know. You watch horror like it's a comedy. I watch it through my fingers like it's a crime scene.\n\nAnd I'd still choose movie night with you every single time. (Please don't make me watch the scary one alone.)",
      "A secret from the scrapbook",
      "scrapbook-star"
    );
    burstFromElement(event.currentTarget, 16);
  });

  renderMemories();

  /* ============================================================
     Detail dialog (memories + secret notes)
  ============================================================ */
  const detailDialog = $("#detailDialog");
  const dialogMedia = $("#dialogMedia");
  const dialogEyebrow = $("#dialogEyebrow");
  const dialogTitle = $("#dialogTitle");
  const dialogBody = $("#dialogBody");
  const dialogClose = $("#dialogClose");
  const dialogDone = $("#dialogDone");

  function fillParagraphs(container, text) {
    container.innerHTML = "";
    text.split("\n\n").forEach((paragraph) => {
      const p = document.createElement("p");
      p.textContent = paragraph;
      container.appendChild(p);
    });
  }

  function openDialog() {
    if (typeof detailDialog.showModal === "function") {
      if (!detailDialog.open) detailDialog.showModal();
    } else {
      detailDialog.setAttribute("open", "");
    }
    document.body.classList.add("modal-open");
  }

  function closeDialog() {
    if (detailDialog.open && typeof detailDialog.close === "function") {
      detailDialog.close();
    } else {
      detailDialog.removeAttribute("open");
      document.body.classList.remove("modal-open");
    }
  }

  function setDialogImage(image) {
    dialogMedia.innerHTML = "";
    dialogMedia.hidden = false;

    const img = document.createElement("img");
    img.src = image.image;
    img.alt = image.alt;
    img.width = 900;
    img.height = 1200;
    img.decoding = "async";

    img.addEventListener("error", () => {
      dialogMedia.innerHTML = `
        <div class="photo-fallback" role="img" aria-label="Placeholder for our photo">
          ♡<span>our photo goes here</span>
        </div>
      `;
    });

    dialogMedia.appendChild(img);
  }

  function openMemory(memory) {
    dialogEyebrow.textContent = memory.secret ? "A secret memory" : "A memory of us";
    dialogTitle.textContent = memory.title;
    fillParagraphs(dialogBody, memory.body);
    setDialogImage(memory);
    openDialog();

    if (memory.secret && !state.secretsFound.has("hidden-memory")) {
      state.secretsFound.add("hidden-memory");
      updateFinalStats();
    }
  }

  function openNote(title, body, eyebrow, secretKey) {
    dialogMedia.hidden = true;
    dialogMedia.innerHTML = "";
    dialogEyebrow.textContent = eyebrow || "A tiny secret";
    dialogTitle.textContent = title;
    fillParagraphs(dialogBody, body);
    openDialog();

    if (secretKey && !state.secretsFound.has(secretKey)) {
      state.secretsFound.add(secretKey);
      updateFinalStats();
    }
  }

  dialogClose.addEventListener("click", closeDialog);
  dialogDone.addEventListener("click", closeDialog);

  detailDialog.addEventListener("click", (event) => {
    if (event.target === detailDialog) closeDialog();
  });

  detailDialog.addEventListener("close", () => {
    document.body.classList.remove("modal-open");
  });

  detailDialog.addEventListener("cancel", () => {
    document.body.classList.remove("modal-open");
  });

  /* ============================================================
     Reasons I love you
  ============================================================ */
  const REASONS = [
    "Because you make ordinary moments feel special.",
    "Because I love our random jokes and conversations.",
    "Because I enjoy spending time with you, even when a horror game scares me.",
    "Because I love imagining our future together.",
    "Because I appreciate the times we try to understand each other.",
    "Because being with you gives me more memories to look forward to."
  ];

  const reasonsGrid = $("#reasonsGrid");
  const reasonsStatus = $("#reasonsStatus");
  const revealAllReasons = $("#revealAllReasons");
  const resetReasonsBtn = $("#resetReasons");

  function setReasonState(card, index, revealed) {
    card.classList.toggle("is-revealed", revealed);
    card.setAttribute("aria-pressed", String(revealed));

    const front = $(".reason-face--front", card);
    const back = $(".reason-face--back", card);
    if (front) front.setAttribute("aria-hidden", String(revealed));
    if (back) back.setAttribute("aria-hidden", String(!revealed));

    if (revealed) {
      state.reasonsRevealed.add(index);
    } else {
      state.reasonsRevealed.delete(index);
    }
  }

  function updateReasonsStatus() {
    reasonsStatus.textContent = `${state.reasonsRevealed.size} of ${REASONS.length} reasons opened`;
  }

  function renderReasons() {
    reasonsGrid.innerHTML = "";

    REASONS.forEach((reason, index) => {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "reason-card";
      card.setAttribute("aria-pressed", "false");
      card.innerHTML = `
        <span class="reason-card__inner">
          <span class="reason-face reason-face--front" aria-hidden="false">
            <span class="reason-card__num">Reason No. ${pad(index + 1)}</span>
            <span class="reason-card__prompt">open me</span>
            <span class="reason-card__icon" aria-hidden="true">♡</span>
          </span>
          <span class="reason-face reason-face--back" aria-hidden="true">
            <span class="reason-card__quote" aria-hidden="true">“</span>
            <span class="reason-card__text">${reason}</span>
            <span class="reason-card__close-hint">tap to close</span>
          </span>
        </span>
      `;

      card.addEventListener("click", () => {
        setReasonState(card, index, !card.classList.contains("is-revealed"));
        updateReasonsStatus();
      });

      reasonsGrid.appendChild(card);
      setReasonState(card, index, false);
    });

    updateReasonsStatus();
  }

  revealAllReasons.addEventListener("click", () => {
    $$(".reason-card", reasonsGrid).forEach((card, index) => {
      setReasonState(card, index, true);
    });
    updateReasonsStatus();
    burstFromElement(reasonsGrid, 20);
  });

  resetReasonsBtn.addEventListener("click", () => {
    $$(".reason-card", reasonsGrid).forEach((card, index) => {
      setReasonState(card, index, false);
    });
    updateReasonsStatus();
  });

  renderReasons();

  /* ============================================================
     Love meter
  ============================================================ */
  const loveCard = $("#loveCard");
  const lovePercent = $("#lovePercent");
  const loveBadge = $("#loveBadge");
  const loveBar = $("#loveBar");
  const loveHeart = $("#loveHeart");
  const loveMessage = $("#loveMessage");
  const measureBtn = $("#measureBtn");
  const loveReset = $("#loveReset");

  const LOVE_MESSAGES = [
    { at: 0, message: "Okay, starting the measurement... 💗" },
    { at: 18, message: "Already significant. I'm not surprised." },
    { at: 42, message: "The needle is sweating a little." },
    { at: 66, message: "Babe. This is getting out of hand." },
    { at: 88, message: "Wait... it's still going?" }
  ];

  let loveRunning = false;
  let loveAnimationFrame = null;
  let lastLoveTier = -1;

  function paintLove(pct) {
    const clamped = Math.min(Math.max(pct, 0), 100);
    loveBar.value = clamped;
    loveHeart.style.left = `${clamped}%`;
    loveBar.setAttribute("aria-valuetext", `${Math.round(clamped)} percent of the meter`);
  }

  function finishLoveMeter() {
    paintLove(100);
    lovePercent.textContent = "∞%";
    loveBadge.textContent = "off the charts";
    loveCard.classList.add("is-overflowing");
    loveMessage.textContent =
      "100%? Nah, that's not enough. My love for you doesn't fit on this meter. 💗";
    loveBar.value = 100;
    loveBar.setAttribute("aria-valuetext", "More than 100 percent — completely off the charts");
    measureBtn.hidden = true;
    measureBtn.disabled = false;
    loveReset.hidden = false;
    loveRunning = false;
    state.loveMeasured = true;
    burstFromElement(loveBar, 28);
  }

  function measureLove() {
    if (loveRunning) return;
    loveRunning = true;
    loveCard.classList.add("is-measuring");
    loveCard.classList.remove("is-overflowing");
    lovePercent.textContent = "0%";
    loveBadge.textContent = "warming up";
    loveMessage.textContent = LOVE_MESSAGES[0].message;
    loveReset.hidden = true;
    measureBtn.disabled = true;
    measureBtn.hidden = false;
    lastLoveTier = -1;
    paintLove(0);

    if (prefersReducedMotion()) {
      window.setTimeout(finishLoveMeter, 120);
      return;
    }

    const duration = 3400;
    const start = performance.now();

    function frame(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const pct = eased * 100;

      paintLove(pct);
      lovePercent.textContent = `${Math.round(pct)}%`;

      for (let i = LOVE_MESSAGES.length - 1; i >= 0; i -= 1) {
        if (pct >= LOVE_MESSAGES[i].at && i > lastLoveTier) {
          lastLoveTier = i;
          loveMessage.textContent = LOVE_MESSAGES[i].message;
          if (pct > 45) loveBadge.textContent = "very serious";
          if (pct > 78) loveBadge.textContent = "suspiciously large";
          break;
        }
      }

      if (progress < 1) {
        loveAnimationFrame = requestAnimationFrame(frame);
      } else {
        finishLoveMeter();
      }
    }

    loveAnimationFrame = requestAnimationFrame(frame);
  }

  function resetLoveMeter() {
    if (loveAnimationFrame) cancelAnimationFrame(loveAnimationFrame);
    loveAnimationFrame = null;
    loveRunning = false;
    state.loveMeasured = false;
    loveCard.classList.remove("is-measuring", "is-overflowing");
    lovePercent.textContent = "0%";
    loveBadge.textContent = "warming up";
    loveMessage.textContent = "Press the button. I'll do the math. 😌";
    loveBar.value = 0;
    loveHeart.style.left = "0%";
    loveBar.setAttribute("aria-valuetext", "Not measured yet");
    measureBtn.hidden = false;
    measureBtn.disabled = false;
    loveReset.hidden = true;
  }

  measureBtn.addEventListener("click", measureLove);
  loveReset.addEventListener("click", resetLoveMeter);

  /* ============================================================
     Runaway "No..." button mini-game
  ============================================================ */
  const dodgeField = $("#dodgeField");
  const loveNo = $("#loveNo");
  const loveYes = $("#loveYes");
  const gameResponse = $("#gameResponse");
  const skipGame = $("#skipGame");
  let lastPointerType = "mouse";
  let lastDodgeTime = 0;

  function showGameResponse(message, isLove) {
    gameResponse.textContent = message;
    gameResponse.classList.toggle("is-love", Boolean(isLove));
  }

  function moveNoButton() {
    if (state.gameDone || state.dodges >= 5) return;

    lastDodgeTime = Date.now();
    state.dodges += 1;

    const x = 24 + Math.random() * 52;
    const y = 40 + Math.random() * 36;
    loveNo.style.left = `${x}%`;
    loveNo.style.top = `${y}%`;
    dodgeField.classList.add("has-moved");

    if (state.dodges >= 5) {
      loveNo.classList.add("is-tired");
      loveNo.setAttribute("aria-label", "No... (the button has officially given up running)");
      showGameResponse("Even the “No...” button is out of breath. My love, however, is not. 😂💗");
    }
  }

  dodgeField.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse" || state.gameDone) return;
    if (Date.now() - lastDodgeTime < 320) return;

    const rect = loveNo.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);

    if (distance < 110) moveNoButton();
  });

  loveNo.addEventListener("pointerdown", (event) => {
    lastPointerType = event.pointerType || "mouse";
  });

  loveNo.addEventListener("click", (event) => {
    if (state.gameDone) {
      showGameResponse("Nice try, baby. You can't escape this much love! 😂💗", true);
      return;
    }

    const isKeyboard = event.detail === 0;

    if (isKeyboard || lastPointerType !== "touch") {
      showGameResponse("Nice try, baby. You can't escape this much love! 😂💗", true);
      burstFromElement(loveNo, 20);
      return;
    }

    // Touch-friendly fallback: a small escape, then a playful message.
    if (state.dodges < 3) {
      moveNoButton();
      showGameResponse("The button moved! It's shy. Try tapping again, baby. 😂💗");
    } else {
      showGameResponse("Nice try, baby. You can't escape this much love! 😂💗", true);
      burstFromElement(loveNo, 18);
    }
  });

  loveYes.addEventListener("click", () => {
    state.gameDone = true;
    loveYes.disabled = true;
    loveYes.textContent = "I love you too, babyy! 💗";
    dodgeField.hidden = true;
    showGameResponse("I knew it. Of course you do — and I love you more, babyy. 💗", true);
    burstFromElement(loveYes, 30);
  });

  skipGame.addEventListener("click", () => {
    goToChapter("gift");
  });

  function resetGame() {
    state.gameDone = false;
    state.dodges = 0;
    dodgeField.hidden = false;
    dodgeField.classList.remove("has-moved");
    loveNo.classList.remove("is-tired");
    loveNo.style.left = "";
    loveNo.style.top = "";
    loveNo.setAttribute("aria-label", "No...");
    loveYes.disabled = false;
    loveYes.textContent = "Of course, babyy!";
    gameResponse.textContent = "";
    gameResponse.classList.remove("is-love");
    lastPointerType = "mouse";
    lastDodgeTime = 0;
  }

  /* ============================================================
     Gift
  ============================================================ */
  const giftBox = $("#giftBox");
  const giftHint = $("#giftHint");
  const giftReveal = $("#giftReveal");
  const giftMore = $("#giftMore");
  const giftExtra = $("#giftExtra");

  giftBox.addEventListener("click", () => {
    if (state.giftOpened) return;

    state.giftOpened = true;
    giftBox.classList.add("is-open");
    giftBox.setAttribute("aria-expanded", "true");
    giftHint.textContent = "Opened with love 💗";
    giftReveal.hidden = false;
    giftReveal.setAttribute("tabindex", "-1");
    burstFromElement(giftBox, 44);

    window.setTimeout(() => {
      giftReveal.focus({ preventScroll: true });
      giftReveal.scrollIntoView({
        behavior: prefersReducedMotion() ? "auto" : "smooth",
        block: "nearest"
      });
    }, 260);

    unlockSecretMemory(true);
  });

  giftMore.addEventListener("click", () => {
    const isOpen = giftMore.getAttribute("aria-expanded") === "true";
    giftMore.setAttribute("aria-expanded", String(!isOpen));
    giftExtra.hidden = isOpen;
    if (!isOpen) showToast("One more tiny secret, just for you. 🎬💗");
  });

  function resetGift() {
    state.giftOpened = false;
    state.memoryUnlocked = false;
    giftBox.classList.remove("is-open");
    giftBox.setAttribute("aria-expanded", "false");
    giftHint.textContent = "Tap to open your gift";
    giftReveal.hidden = true;
    giftExtra.hidden = true;
    giftMore.setAttribute("aria-expanded", "false");
  }

  /* ============================================================
     Easter eggs: brand taps, birthday-date taps, final heart
  ============================================================ */
  const brandBtn = $("#brandBtn");
  const dateBtn = $("#dateBtn");
  const finalHeart = $("#finalHeart");

  brandBtn.addEventListener("click", () => {
    goToChapter("reveal");
    brandTapCount += 1;

    window.clearTimeout(brandTapTimer);
    brandTapTimer = window.setTimeout(() => {
      brandTapCount = 0;
    }, 3200);

    if (brandTapCount === 3) {
      showToast("Something is tickling the logo... two more taps. 👀");
    }

    if (brandTapCount >= 5) {
      brandTapCount = 0;
      openNote(
        "The Cutest Detective",
        "If you found this, you're officially the cutest detective I know. Here's a secret: I still get a little nervous when your name pops up on my phone.\n\nSome things never get old. 💗",
        "A tiny secret",
        "brand-note"
      );
      burstFromElement(brandBtn, 22);
    }
  });

  dateBtn.addEventListener("click", () => {
    dateTapCount += 1;

    if (dateTapCount === 2) {
      showToast("One more tap... 👀");
    }

    if (dateTapCount >= 3) {
      dateTapCount = 0;
      openNote(
        "October 24",
        "October 24 isn't just a date on a calendar. It's the day my favorite person was born.\n\nI'm really glad the universe made you, Keysha. 💗",
        "A tiny secret",
        "date-note"
      );
      burstFromElement(dateBtn, 20);
    }

    window.setTimeout(() => {
      dateTapCount = 0;
    }, 3600);
  });

  finalHeart.addEventListener("click", () => {
    finalHeart.classList.remove("is-pressed");
    void finalHeart.offsetWidth;
    finalHeart.classList.add("is-pressed");
    showToast("Right back at you, babyy. 💗");
    burstFromElement(finalHeart, 18);
  });

  /* ============================================================
     Final stats
  ============================================================ */
  const finalStats = $("#finalStats");

  function updateFinalStats() {
    if (!finalStats) return;
    const explored = state.visited.size;
    const secretCount = state.secretsFound.size;
    const secretWord = secretCount === 1 ? "little secret" : "little secrets";

    finalStats.textContent =
      `You explored ${explored} of ${CHAPTERS.length} chapters and found ` +
      `${secretCount} of ${SECRET_TOTAL} ${secretWord}.`;
  }

  /* ============================================================
     Background music
  ============================================================ */
  const audio = $("#audio");
  const musicCard = $("#musicCard");
  const musicStatus = $("#musicStatus");
  const musicNow = $("#musicNow");
  const musicNowTitle = $("#musicNowTitle");
  const volumeRange = $("#volumeRange");
  const volumeValue = $("#volumeValue");
  const musicToggles = $$("[data-music-toggle]");
  const trackList = $("#trackList");
  const musicPrev = $("#musicPrev");
  const musicNext = $("#musicNext");

  // Our soundtrack. The player shuffles these and plays them from the moment
  // the site opens (starting on the first tap if the browser blocks autoplay).
  const MUSIC_TRACKS = [
    { title: "seasons", artist: "wave to earth", src: "assets/audio/wave to earth - seasons.mp3" },
    { title: "love.", artist: "wave to earth", src: "assets/audio/wave to earth - love. (Official Lyric Video).mp3" },
    { title: "double take", artist: "dhruv", src: "assets/audio/dhruv - _double take (Lyrics).mp3" },
    { title: "Godspeed", artist: "Frank Ocean", src: "assets/audio/Frank Ocean - Godspeed.mp3" },
    { title: "Pink Matter", artist: "Frank Ocean", src: "assets/audio/Pink Matter.mp3" },
    { title: "Best Part", artist: "H.E.R. feat. Daniel Caesar", src: "assets/audio/H.E.R. - Best Part (Lyrics) Ft. Daniel Caesar.mp3" },
    { title: "Sure Thing", artist: "Miguel", src: "assets/audio/Miguel - Sure Thing (Official Video).mp3" },
    { title: "My Love Mine All Mine", artist: "Mitski", src: "assets/audio/Mitski - My Love Mine All Mine (Official Video).mp3" },
    { title: "Old Love", artist: "Yuji Putri Dahlia", src: "assets/audio/Old Love - Yuji Putri Dahlia (Official Lyrics Video).mp3" },
    { title: "About You", artist: "The 1975", src: "assets/audio/The 1975 - About You (Official).mp3" },
    { title: "fallingforyou", artist: "The 1975", src: "assets/audio/The 1975 - fallingforyou.mp3" },
    { title: "Co-Pilot", artist: "Just Hush", src: "assets/audio/Co-Pilot - Just Hush (featuring J.O.L.O. & Rjay Ty) [Official Lyric Video].mp3" },
    { title: "Blessed", artist: "", src: "assets/audio/Blessed.mp3" }
  ];

  let audioFailed = false;
  let audioErrorToastShown = false;
  let trackIndex = 0;
  let autoplayBlocked = false;
  let userActivated = false;  // true once the visitor has tapped or typed
  let pendingAutoplay = false; // start as soon as the song finishes loading
  let fallbackAttempted = false; // did we retry this track as a fetched blob?
  const failedTracks = new Set();
  let bag = [];        // shuffle bag: indices left to play this rotation
  let history = [];    // previously played indices, for the back button
  let loadToken = 0;   // guards against out-of-order (slow) track loads
  let currentBlobUrl = null; // object URL for the song currently loaded

  // Free a used blob URL, but only after the <audio> element has moved on, so
  // we never abort a read that is still in progress.
  function releaseBlobLater(url) {
    if (!url) return;
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }

  audio.volume = 0.45;
  audio.loop = false;

  const trackLabel = (track) => (track.artist ? `${track.title} — ${track.artist}` : track.title);

  function setMusicStatus(message) {
    if (musicStatus) musicStatus.textContent = message;
  }

  function updateNowPlaying() {
    const track = MUSIC_TRACKS[trackIndex];
    if (!track) return;
    if (musicNow) musicNow.hidden = false;
    if (musicNowTitle) musicNowTitle.textContent = trackLabel(track);

    $$(".track", trackList).forEach((item, index) => {
      const isCurrent = index === trackIndex;
      item.classList.toggle("is-current", isCurrent);
      if (isCurrent) {
        item.setAttribute("aria-current", "true");
      } else {
        item.removeAttribute("aria-current");
      }
    });
  }

  function buildTrackList() {
    if (!trackList) return;
    trackList.innerHTML = "";

    MUSIC_TRACKS.forEach((track, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "track";
      button.setAttribute(
        "aria-label",
        track.artist ? `Play ${track.title} by ${track.artist}` : `Play ${track.title}`
      );
      button.innerHTML = `
        <span class="track__num">${pad(index + 1)}</span>
        <span class="track__info">
          <span class="track__title">${track.title}</span>
          <span class="track__artist">${track.artist}</span>
        </span>
        <span class="track__state" aria-hidden="true">♪</span>
      `;
      button.addEventListener("click", () => selectTrack(index));
      item.appendChild(button);
      trackList.appendChild(item);
    });

    updateNowPlaying();
  }

  function updateMusicUI() {
    const playing = !audio.paused && !audio.ended;
    if (musicCard) musicCard.classList.toggle("is-playing", playing);
    $$(".track", trackList).forEach((item) => item.classList.toggle("is-playing", playing));

    musicToggles.forEach((button) => {
      const isTopbarButton = button.classList.contains("music-toggle");
      button.classList.toggle("is-playing", playing);
      button.setAttribute("aria-pressed", String(playing));

      const label = $("[data-music-label]", button);
      if (isTopbarButton) {
        button.setAttribute(
          "aria-label",
          playing ? "Playing — pause background music" : "Music — play background music"
        );
        if (label) label.textContent = playing ? "Playing" : "Music";
      } else {
        button.setAttribute("aria-label", playing ? "Pause music" : "Play music");
        if (label) label.textContent = playing ? "Pause music" : "Play music";
      }
    });
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  function availableIndices() {
    return MUSIC_TRACKS.map((_, index) => index).filter((index) => !failedTracks.has(index));
  }

  // Pick the next random song, avoiding immediate repeats until every playable
  // track has been heard once in this rotation.
  function nextRandomIndex(current) {
    const available = availableIndices();
    if (!available.length) return -1;

    bag = bag.filter((index) => index !== current && !failedTracks.has(index));
    if (!bag.length) {
      bag = shuffle(available.filter((index) => index !== current));
      if (!bag.length) return available.length === 1 && available[0] === current ? -1 : available[0];
    }
    return bag.shift();
  }

  async function loadTrack(index, options = {}) {
    if (!MUSIC_TRACKS.length) return;
    trackIndex = (index + MUSIC_TRACKS.length) % MUSIC_TRACKS.length;
    loadToken += 1;
    fallbackAttempted = false;
    const track = MUSIC_TRACKS[trackIndex];
    updateNowPlaying();
    setMusicStatus(`Loading “${track.title}”…`);

    // Stream straight from the file so playback can start before the whole
    // song is downloaded (this is how normal hosts — GitHub Pages, LAN — work).
    // If a host intercepts media requests (ngrok's free welcome screen returns
    // HTML for them), the audio error handler retries with fetch + blob below.
    if (currentBlobUrl) {
      releaseBlobLater(currentBlobUrl);
      currentBlobUrl = null;
    }
    audio.src = track.src;

    if (options.autoplay) {
      playCurrent({ silent: options.silent });
    } else if (pendingAutoplay) {
      // The visitor already tapped while this song was loading — start it now.
      pendingAutoplay = false;
      playCurrent({ silent: true }).then((ok) => {
        if (!ok) autoplayBlocked = true;
      });
    }
  }

  // Download a song ourselves (so we can send the tunnel-bypass header) and
  // play it from a blob URL. Only used when direct streaming is blocked.
  async function loadTrackFromBlob(index, options = {}) {
    const token = (loadToken += 1);
    const track = MUSIC_TRACKS[index];
    let objectUrl = null;
    try {
      const response = await fetch(track.src, {
        headers: { "ngrok-skip-browser-warning": "true" },
        cache: "no-store"
      });
      const type = (response.headers.get("content-type") || "").toLowerCase();
      if (!response.ok || type.indexOf("text/html") !== -1) return false;
      objectUrl = URL.createObjectURL(await response.blob());
    } catch (error) {
      return false;
    }

    // A newer track started loading while we were fetching — discard this one.
    if (token !== loadToken) {
      URL.revokeObjectURL(objectUrl);
      return false;
    }

    if (currentBlobUrl) releaseBlobLater(currentBlobUrl);
    currentBlobUrl = objectUrl;

    audio.src = objectUrl;
    playCurrent({ silent: options.silent });
    return true;
  }

  function playNext(autoplay = true) {
    const next = nextRandomIndex(trackIndex);
    if (next === -1) {
      if (!failedTracks.has(trackIndex)) {
        loadTrack(trackIndex, { autoplay });
        return;
      }
      allTracksFailed();
      return;
    }
    history.push(trackIndex);
    loadTrack(next, { autoplay });
  }

  function playPrev() {
    let prev = -1;
    while (history.length) {
      const candidate = history.pop();
      if (!failedTracks.has(candidate)) {
        prev = candidate;
        break;
      }
    }
    if (prev === -1) {
      const pool = availableIndices().filter((index) => index !== trackIndex);
      if (pool.length) prev = pool[Math.floor(Math.random() * pool.length)];
    }
    if (prev === -1) return;
    bag = bag.filter((index) => index !== prev);
    loadTrack(prev, { autoplay: true });
  }

  function selectTrack(index) {
    if (failedTracks.has(index)) {
      showToast("That song file isn't there yet. 💗");
      return;
    }
    if (index !== trackIndex) history.push(trackIndex);
    bag = bag.filter((item) => item !== index);
    loadTrack(index, { autoplay: true });
  }

  async function playCurrent(options = {}) {
    try {
      await audio.play();
      audioFailed = false;
      autoplayBlocked = false;
      return true;
    } catch (error) {
      // Blocked autoplay needs another tap; missing files are handled by the error event.
      if (error && error.name === "NotAllowedError") {
        autoplayBlocked = true;
        if (!options.silent) setMusicStatus("Tap anywhere to start our soundtrack. 🎶");
      }
      return false;
    }
  }

  function allTracksFailed() {
    audioFailed = true;
    setMusicStatus(
      "I couldn't load the songs. Check that the MP3 files are in assets/audio/ and listed in MUSIC_TRACKS. The rest of the site still works. 💗"
    );
    if (!audioErrorToastShown) {
      audioErrorToastShown = true;
      showToast("Those songs aren't available right now, but everything else still works. 💗");
    }
    updateMusicUI();
  }

  async function handleTrackError() {
    const index = trackIndex;

    // Direct streaming failed (usually a tunnel welcome screen returning HTML
    // instead of audio). Retry once by fetching the file with the bypass header.
    if (!fallbackAttempted) {
      fallbackAttempted = true;
      const ok = await loadTrackFromBlob(index, { silent: true });
      if (ok) return;
      if (index !== trackIndex) return; // a different track is loading now
    }

    failedTracks.add(index);
    bag = bag.filter((item) => item !== index);
    if (!availableIndices().length) {
      allTracksFailed();
      return;
    }
    playNext(true);
  }

  // Browsers only let audio begin after the visitor interacts with the page.
  // This starts the soundtrack right away (used by "Open Your Surprise" and the
  // music button); if the song is still loading it starts the moment it's ready.
  function beginSoundtrack() {
    if (!audio.paused) return;
    if (!audio.src) {
      pendingAutoplay = true;
      return;
    }
    pendingAutoplay = false;
    playCurrent({ silent: true }).then((ok) => {
      if (!ok) autoplayBlocked = true;
    });
  }

  // First tap/keypress anywhere also begins the music, as a safety net.
  function markUserActivated() {
    if (userActivated) return;
    userActivated = true;
    beginSoundtrack();
  }

  ["pointerdown", "keydown", "touchstart"].forEach((type) => {
    document.addEventListener(type, markUserActivated, { passive: true });
  });

  function tryStartMusic() {
    playCurrent({ silent: true }).then((ok) => {
      if (ok) return;
      autoplayBlocked = true;
      if (state.current === "welcome") {
        showToast("Tap anywhere, babyy — our soundtrack starts on your first tap. 🎶");
      }
    });
  }

  async function toggleMusic() {
    if (audio.paused) {
      if (!audio.src) {
        loadTrack(trackIndex, { autoplay: true });
        return;
      }
      playCurrent();
    } else {
      audio.pause();
      setMusicStatus("Music paused. Press play whenever you want it back.");
    }
  }

  musicToggles.forEach((button) => {
    button.addEventListener("click", toggleMusic);
  });

  if (musicPrev) {
    musicPrev.addEventListener("click", () => {
      if (!availableIndices().length) {
        showToast("Those song files aren't there yet. 💗");
        return;
      }
      playPrev();
    });
  }

  if (musicNext) {
    musicNext.addEventListener("click", () => {
      if (!availableIndices().length) {
        showToast("Those song files aren't there yet. 💗");
        return;
      }
      playNext(true);
    });
  }

  audio.addEventListener("playing", () => {
    audioFailed = false;
    autoplayBlocked = false;
    const track = MUSIC_TRACKS[trackIndex];
    setMusicStatus(`Now playing “${track.title}”${track.artist ? " — " + track.artist : ""}. 🎶`);
    updateMusicUI();
  });

  audio.addEventListener("pause", () => {
    updateMusicUI();
    if (!audioFailed && !autoplayBlocked && state.current !== "welcome") {
      setMusicStatus("Music paused. Press play whenever you want it back.");
    }
  });

  audio.addEventListener("ended", () => {
    playNext(true);
  });

  audio.addEventListener("error", handleTrackError);

  volumeRange.addEventListener("input", () => {
    const volume = Number(volumeRange.value);
    audio.volume = volume / 100;
    volumeValue.textContent = `${volume}%`;
    if (audioFailed) {
      setMusicStatus("Music volume is set. Add the song files to hear them. 💗");
    }
  });

  buildTrackList();
  trackIndex = Math.floor(Math.random() * MUSIC_TRACKS.length);
  updateMusicUI();
  loadTrack(trackIndex).then(tryStartMusic);

  /* ============================================================
     Replay
  ============================================================ */
  const replayBtn = $("#replayBtn");

  function resetExperience() {
    // Close any open dialog first.
    if (detailDialog.open) closeDialog();

    // Stop and rewind music.
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (error) {
      /* Audio may not be loaded yet. */
    }
    audioFailed = false;
    audioErrorToastShown = false;
    failedTracks.clear();
    bag = [];
    history = [];
    if (currentBlobUrl) {
      releaseBlobLater(currentBlobUrl);
      currentBlobUrl = null;
    }
    trackIndex = Math.floor(Math.random() * MUSIC_TRACKS.length);
    updateMusicUI();
    loadTrack(trackIndex, { autoplay: true, silent: true });

    // Reset state.
    state.visited.clear();
    state.secretsFound.clear();
    state.revealSeen = false;
    state.finalSeen = false;
    state.reasonsRevealed.clear();
    state.letterPage = 0;
    brandTapCount = 0;
    dateTapCount = 0;
    identityLocked = false;

    // Gate screens.
    identityRejectionIndex = 0;
    if (identityResponseImage) identityResponseImage.src = IDENTITY_REJECTIONS[0].image;
    if (identityResponseText) identityResponseText.textContent = IDENTITY_REJECTIONS[0].text;
    identityResponse.hidden = true;
    identityResponse.classList.remove("is-active");
    identityCard.classList.remove("is-shaking", "is-celebrating");
    secretCard.hidden = false;
    secretSuccess.hidden = true;
    secretForm.reset();
    secretFeedback.textContent = "";
    secretFeedback.classList.remove("is-error", "is-success");
    secretAnswer.classList.remove("is-error");
    secretAnswer.removeAttribute("aria-invalid");
    hintText.hidden = true;
    hintBtn.setAttribute("aria-expanded", "false");

    // Letter.
    setLetterPage(0);

    // Reasons.
    $$(".reason-card", reasonsGrid).forEach((card, index) => setReasonState(card, index, false));
    updateReasonsStatus();

    // Love meter.
    resetLoveMeter();

    // Game.
    resetGame();

    // Gift + scrapbook secret card.
    resetGift();
    renderMemories();
    scrapbookSecretHint.textContent =
      "There's one more memory hiding. Open your gift first, then come back. ✨";
    scrapbookSecretHint.classList.remove("is-unlocked");

    // Final stats will refresh when final is visited again.
    updateFinalStats();

    // Clear particles.
    const layer = $("#particleLayer");
    if (layer) layer.innerHTML = "";

    showScreen("welcome", { focus: true });
    showToast("Let's start over, babyy. Same love, fresh adventure. 💗");
  }

  replayBtn.addEventListener("click", resetExperience);

  /* ============================================================
     Initial setup
  ============================================================ */
  updateFinalStats();
  updateChapterUI("welcome");
})();
