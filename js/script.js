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

  const VISIT_KEY = "wyn-birthday-visit-v1";
  let progressReady = false;
  let savedVisit = null;
  try {
    savedVisit = JSON.parse(sessionStorage.getItem(VISIT_KEY));
    if (savedVisit?.version !== 1) savedVisit = null;
  } catch (error) {
    // Private browsing or disabled storage must never stop the experience.
  }

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
    if (prefersReducedMotion() || document.hidden) return;

    const layer = $("#particleLayer");
    if (!layer) return;
    count = Math.min(count, window.matchMedia("(pointer: coarse)").matches ? 18 : 34);
    count = Math.max(0, Math.min(count, 60 - layer.childElementCount));

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
        if (screen.hidden) return;
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

    if (window.Love3D) {
      window.Love3D.setActive(name === "love");
    }
    saveProgress();
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
      if (state.current === "identity") showScreen("secret");
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

  // Rotating reactions for every wrong guess, so it never feels repetitive.
  const SECRET_REJECTIONS = [
    "Hmmmm... try again, baby. You know this one! 💗",
    "Close, but nope! It's the name of the boy who built this for you. 😌",
    "Not quite, babe. Think of the two-syllable name you call me when you're sweet. 💗",
    "Aww, wrong answer — but still cute. Try again, babyy. 🥺",
    "Nope, that's not me. I'm your favorite Instagram Notes boy. 😌💗",
    "Mm, not it. But keep guessing, I love watching you try. 😏💗",
    "Wrong, but I still love you. One more guess, my love? 💗",
    "That's not your boyfriend, baby. Think harder! 😤💗",
    "So close to unlocking me... try the name you whisper at night. 🌙💗",
    "Nuh-uh, cutie. You know me better than that. 💗"
  ];

  let secretRejectionIndex = 0;

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

    const rejection = SECRET_REJECTIONS[secretRejectionIndex % SECRET_REJECTIONS.length];
    secretRejectionIndex += 1;

    setSecretError(rejection);
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
    saveProgress();

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
      title: "Instagram Notes Interaction",
      caption: "first interaction",
      sticker: "💌",
      image: "assets/images/our-pictures/our-first-interaction.jpg",
      alt: "Our first interaction — the Instagram Notes beginning",
      body:
        "Ka random lang gyud noh nga tungod lang sa pa dungog-dungog nato sa ig notes kay nagkaila ta? Like sa always nakong iingon na wala ko ga expect na mag notes ka about nako, and I'm glad na niuna ka hehe. Then ni reply ko atong notes nimo tapos adto na nag sugod, from tiktok streak tas chat and playing roblox games, tapos now look at us now. I'm so glad that I met you, and I'm so glad that you're mine. I love you so much babyyy hehehe. 💗"
    },
    {
      id: "calls-one",
      title: "Pictures in Video calls",
      caption: "random picture together",
      sticker: "📱",
      image: "assets/images/our-pictures/us-laptopcall-picture2.jpg",
      alt: "Us on a laptop video call",
      body:
        "So cute ohh HAHAHA, us taking picture always sa video call(sa video call pa gani na ha what more pa sa personal na). of course always ta mag picture sa call kay pretty manka kaayo hehehe. I LOVEE YOUUU ALWAYSSS and more pictures with you soon."
    },
    {
      id: "calls-two",
      title: "Night-calls",
      caption: "my favorite part of the day",
      sticker: "🌙",
      image: "assets/images/our-pictures/us-laptopcall-picture3.jpg",
      alt: "Us together on another late-night laptop call",
      body:
        "Of course my favorite part of the day is maka video call na nimo hehe, asa raba nang ldr if magka talk nata sa video call diba? HAHAHAH"
    },
    {
      id: "games",
      title: "Playing Games",
      caption: "boring? no oyy magduwa ta",
      sticker: "🎮",
      image: "assets/images/our-pictures/us-playing-roblox.jpg",
      alt: "Us playing Roblox together",
      body:
        "Maka remember pako sauna ba lisod kaayo mag communicate ta tas magduwa kay mauwaw pa mag call HAHAHA. More games to play with you soon babyyy"
    },
    {
      id: "silly",
      title: "Weirdddd",
      caption: "ambot ngano ta ani HAHAHA",
      sticker: "😝",
      image: "assets/images/our-pictures/us-weird-faces3.jpg",
      alt: "Us making silly faces together",
      body:
        "Maka hinomdom pako ani imo kung gitudloan, tapos ikaw ray maka saktog buhat sa mata HAHAHA cutieee. Same humor og vibe jud always ba"
    },
    {
      id: "keysha",
      title: "My Baby Keysha",
      caption: "the prettiest girl ever",
      sticker: "💗",
      image: "assets/images/our-pictures/my-baby-keysha.jpg",
      alt: "A photo of my baby, Keysha",
      body:
        "The PRETTIESSTTTT GIRLLLL, wala nakoy maingon pa HAHAHAH. I LOVEEE YOUUUU BABYYYY!!!"
    },
    {
      id: "gift",
      title: "Me With Your Gift",
      caption: "cute na gift, the best ever",
      sticker: "🎁",
      image: "assets/images/our-pictures/me-with-her-gift.jpg",
      alt: "Me holding the gift she gave me",
      body:
        "Wala jud ko nag expect na mag gift ka nako ani, cuteee kaayo hehehe. Pinaka cute na gift na akoang na receive kay naay nawong nimo:>"
    },
    {
      id: "imagined",
      title: "AI rani haa",
      caption: "haysss ai",
      sticker: "✨",
      image: "assets/images/our-pictures/us-generated-ai.jpg",
      alt: "An AI-generated picture of us",
      body:
        "Katawaa nato ani while nag himo ani ba HAHAHAH soon tinuod nana oyy bantay lang"
    },
    {
      id: "secret",
      title: "The Chapter We're Still Writing",
      caption: "to be continued...",
      sticker: "💫",
      secret: true,
      image: "assets/images/our-pictures/secret-together.jpg",
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
     Reasons I love you — swipeable card deck
  ============================================================ */
  const REASONS = [
    "Because you make ordinary moments feel special.",
    "Because I love our random jokes and late-night conversations.",
    "Because I'll sit through any horror game just to hear you laugh.",
    "Because I love every picture of the future we draw together.",
    "Because you always try to understand me, even on my off days.",
    "Because being with you gives me a thousand more memories to look forward to.",
    "Because your good-morning and goodnight messages fix my whole day.",
    "Because you make the long distance feel a little less far.",
    "Because praying with you at night is my favorite way to end a day.",
    "Because you're the prettiest girl I've ever seen, and you're mine.",
    "Because you believe in me when I forget how to believe in myself.",
    "Because your laugh is my favorite sound in the whole world.",
    "Because even our quiet moments together feel warm and safe.",
    "Because you choose to fix things with me instead of walking away.",
    "Because you turned one little Instagram Note into the best part of my life.",
    "Because you make me want to be a better man every single day.",
    "Because no matter what we're doing, I'd rather be doing it with you."
  ];

  const reasonsStack = $("#reasonsGrid");
  const reasonsStatus = $("#reasonsStatus");
  const reasonsDots = $("#reasonsDots");
  const reasonPrev = $("#reasonPrev");
  const reasonNext = $("#reasonNext");
  const shuffleReasonsBtn = $("#shuffleReasons");
  const resetReasonsBtn = $("#resetReasons");

  const REASON_COUNT = REASONS.length;
  const REASON_VISIBLE = 4;
  const REASON_TILTS = [-3.2, 2.4, -1.8, 3.4, -2.6, 1.6, -3.6, 2.8];

  let reasonsOrder = REASONS.map((reason, index) => index);
  let reasonPos = 0;
  let reasonCards = [];
  let reasonAnimating = false;
  let reasonSwipeTimer = null;
  let reasonDrag = null;
  let reasonDots = [];

  const reasonTopCard = () => reasonCards[reasonsOrder[reasonPos]] || null;

  function buildReasonDots() {
    reasonsDots.innerHTML = "";
    reasonDots = reasonsOrder.map(() => {
      const dot = document.createElement("span");
      dot.className = "reasons-dot";
      reasonsDots.appendChild(dot);
      return dot;
    });
  }

  function updateReasonNav() {
    reasonsStatus.textContent = `Reason ${reasonPos + 1} of ${REASON_COUNT}`;
    reasonPrev.disabled = reasonPos <= 0;
    reasonNext.disabled = reasonPos >= REASON_COUNT - 1;

    reasonDots.forEach((dot, index) => {
      dot.classList.toggle("is-seen", index < reasonPos);
      dot.classList.toggle("is-current", index === reasonPos);
    });
  }

  function layoutReasons(instant = false) {
    if (instant) reasonsStack.classList.add("is-instant");

    reasonCards.forEach((card) => {
      const index = Number(card.dataset.index);
      const offset = reasonsOrder.indexOf(index) - reasonPos;
      card.style.visibility = offset >= 0 && offset < REASON_VISIBLE ? "visible" : "hidden";
      const tilt = REASON_TILTS[index % REASON_TILTS.length];
      card.style.setProperty("--tilt", `${tilt}deg`);

      if (offset === 0) {
        card.style.transform = `translate3d(0, 0, 0) rotate(${tilt}deg) scale(1)`;
        card.style.opacity = "1";
        card.style.zIndex = String(REASON_COUNT);
        card.classList.add("is-top");
        card.setAttribute("aria-hidden", "false");
      } else if (offset > 0 && offset < REASON_VISIBLE) {
        card.style.transform =
          `translate3d(0, ${offset * 14}px, ${-offset * 34}px) rotate(${tilt * 0.5 + offset * 0.9}deg) scale(${1 - offset * 0.05})`;
        card.style.opacity = String(1 - offset * 0.12);
        card.style.zIndex = String(REASON_COUNT - offset);
        card.classList.remove("is-top");
        card.setAttribute("aria-hidden", "true");
      } else {
        const dir = offset < 0 ? -1 : 1;
        card.style.transform =
          `translate3d(${dir * 46}px, ${offset < 0 ? -12 : 12}px, -140px) rotate(${dir * 7}deg) scale(0.88)`;
        card.style.opacity = "0";
        card.style.zIndex = "0";
        card.classList.remove("is-top");
        card.setAttribute("aria-hidden", "true");
      }
    });

    if (instant) {
      void reasonsStack.offsetWidth;
      reasonsStack.classList.remove("is-instant");
    }

    updateReasonNav();
  }

  function popReasonCard(card) {
    if (!card || prefersReducedMotion()) return;
    card.classList.remove("is-incoming");
    void card.offsetWidth;
    card.classList.add("is-incoming");
  }

  function flashReasonDeck() {
    const deck = reasonsStack.closest(".reasons-deck");
    if (!deck || prefersReducedMotion()) return;
    deck.classList.remove("is-swiping");
    void deck.offsetWidth;
    deck.classList.add("is-swiping");
    window.setTimeout(() => deck.classList.remove("is-swiping"), 620);
  }

  function buildReasonCards() {
    reasonsStack.innerHTML = "";
    reasonCards = [];

    REASONS.forEach((reason, index) => {
      const card = document.createElement("article");
      card.className = "reason-card";
      card.dataset.index = String(index);
      card.setAttribute("role", "group");
      card.setAttribute("aria-roledescription", "card");
      card.setAttribute("aria-label", `Reason ${index + 1} of ${REASON_COUNT}`);
      card.innerHTML = `
        <span class="reason-card__pin" aria-hidden="true">♥</span>
        <span class="reason-card__num">Reason No. ${pad(index + 1)}</span>
        <span class="reason-card__quote" aria-hidden="true">&ldquo;</span>
        <p class="reason-card__text">${reason}</p>
        <span class="reason-card__scribble" aria-hidden="true">♡</span>
      `;
      reasonsStack.appendChild(card);
      reasonCards.push(card);
    });
  }

  function resetReasonsDeck(options = {}) {
    window.clearTimeout(reasonSwipeTimer);
    reasonCards.forEach((card) => card.classList.remove("is-flying", "is-dragging", "is-incoming", "is-bouncing"));
    reasonsOrder = REASONS.map((reason, index) => index);
    if (options.shuffle) {
      for (let i = reasonsOrder.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [reasonsOrder[i], reasonsOrder[j]] = [reasonsOrder[j], reasonsOrder[i]];
      }
    }
    reasonPos = 0;
    reasonAnimating = false;
    reasonDrag = null;
    buildReasonDots();
    layoutReasons(true);
  }

  function bounceReasonCard(direction) {
    const card = reasonTopCard();
    if (!card) return;
    card.classList.add("is-bouncing");
    card.style.transform =
      `translate3d(${direction === "next" ? -26 : 26}px, 0, 0) rotate(${direction === "next" ? -5 : 5}deg) scale(0.99)`;
    window.setTimeout(() => {
      card.classList.remove("is-bouncing");
      layoutReasons();
    }, 200);
  }

  function commitReasonSwipe(direction) {
    if (reasonAnimating) return;

    if (direction === "next" && reasonPos >= REASON_COUNT - 1) {
      bounceReasonCard("next");
      showToast("That's the last one... but there are always more, babyy. 💗");
      return;
    }
    if (direction === "prev" && reasonPos <= 0) {
      bounceReasonCard("prev");
      return;
    }

    reasonAnimating = true;
    const card = reasonTopCard();
    const width = reasonsStack.offsetWidth || 340;
    const dir = direction === "next" ? -1 : 1;

    card.classList.remove("is-dragging", "is-incoming", "is-bouncing");
    card.classList.add("is-flying");
    card.style.transform =
      `translate3d(${dir * width * 1.35}px, ${dir * 26}px, 0) rotate(${dir * 24}deg) scale(0.9)`;
    card.style.opacity = "0";

    burstFromElement(reasonsStack, 8);
    flashReasonDeck();

    reasonSwipeTimer = window.setTimeout(() => {
      reasonPos += direction === "next" ? 1 : -1;

      // Snap the leaving card to its new stack slot without animating.
      card.classList.add("no-anim");
      card.classList.remove("is-flying");
      layoutReasons(true);
      void card.offsetWidth;
      card.classList.remove("no-anim");

      reasonAnimating = false;
      popReasonCard(reasonTopCard());
      saveProgress();
    }, 440);
  }

  function endReasonDrag(event) {
    if (!reasonDrag || (event && event.pointerId !== reasonDrag.id)) return;

    const drag = reasonDrag;
    reasonDrag = null;

    const card = reasonTopCard();
    if (card) card.classList.remove("is-dragging");

    const threshold = Math.min(130, (reasonsStack.offsetWidth || 340) * 0.25);

    if (drag.axis === "x" && Math.abs(drag.x) > threshold) {
      commitReasonSwipe(drag.x < 0 ? "next" : "prev");
    } else if (!drag.axis) {
      commitReasonSwipe("next");
    } else {
      layoutReasons();
    }
  }

  reasonsStack.addEventListener("pointerdown", (event) => {
    if (reasonAnimating || reasonPos < 0) return;
    if (event.button !== undefined && event.button !== 0) return;

    const card = reasonTopCard();
    if (!card) return;

    reasonDrag = {
      id: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
      axis: null,
      moved: false
    };
    try {
      reasonsStack.setPointerCapture(event.pointerId);
    } catch (error) {
      /* pointer capture is best-effort */
    }
    card.classList.add("is-dragging");
  });

  reasonsStack.addEventListener("pointermove", (event) => {
    if (!reasonDrag || event.pointerId !== reasonDrag.id) return;

    const dx = event.clientX - reasonDrag.startX;
    const dy = event.clientY - reasonDrag.startY;

    if (!reasonDrag.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      reasonDrag.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }
    if (reasonDrag.axis !== "x") return;

    reasonDrag.x = dx;
    reasonDrag.y = dy;
    if (Math.abs(dx) > 6) reasonDrag.moved = true;

    const card = reasonTopCard();
    if (!card) return;
    const tilt = REASON_TILTS[Number(card.dataset.index) % REASON_TILTS.length];
    card.style.transform =
      `translate3d(${dx}px, ${dy * 0.2}px, 0) rotate(${tilt + dx * 0.06}deg) scale(1)`;
    card.style.opacity = String(Math.max(0.3, 1 - Math.abs(dx) / ((reasonsStack.offsetWidth || 340) * 1.1)));
  });

  reasonsStack.addEventListener("pointerup", endReasonDrag);
  reasonsStack.addEventListener("pointercancel", () => {
    reasonDrag = null;
    reasonTopCard()?.classList.remove("is-dragging");
    layoutReasons();
  });

  reasonsStack.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      commitReasonSwipe("prev");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      commitReasonSwipe("next");
    }
  });

  reasonNext.addEventListener("click", () => commitReasonSwipe("next"));
  reasonPrev.addEventListener("click", () => commitReasonSwipe("prev"));

  shuffleReasonsBtn.addEventListener("click", () => {
    resetReasonsDeck({ shuffle: true });
    popReasonCard(reasonTopCard());
    burstFromElement(reasonsStack, 16);
    showToast("Shuffled the deck. Swipe away, babyy. 💗");
  });

  resetReasonsBtn.addEventListener("click", () => {
    resetReasonsDeck();
    showToast("Back to the first reason. ♡");
  });

  buildReasonCards();
  resetReasonsDeck();

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
    if (window.Love3D) window.Love3D.setProgress(clamped);
  }

  function finishLoveMeter(options = {}) {
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
    saveProgress();
    if (options.celebrate !== false) {
      burstFromElement(loveBar, 28);
      if (window.Love3D) window.Love3D.celebrate();
    }
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
    if (window.Love3D) window.Love3D.reset();
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
  const gameResponseFace = $("#gameResponseFace");
  const gameResponseText = $("#gameResponseText");
  const skipGame = $("#skipGame");
  let lastPointerType = "mouse";
  let lastDodgeTime = 0;

  const LOVE_IMAGE = "assets/icons/cat-hand-heart.png";

  // Rotating reactions for every "No..." tap, so it never feels repetitive.
  const NO_REACTIONS = [
    {
      image: "assets/icons/cat-no-meme/cat-angry.png",
      text: "Hey! That button is not an option, baby. 😤"
    },
    {
      image: "assets/icons/cat-no-meme/cat-angry2.png",
      text: "Nope, nope. You're stuck with me forever. 😠💗"
    },
    {
      image: "assets/icons/cat-no-meme/cat-bleeh.png",
      text: "Blehh! Nice try, but “No” isn't in our vocabulary. 😝"
    },
    {
      image: "assets/icons/cat-no-meme/cat-brokenheart.png",
      text: "My heart! You really tried to press that? 🥺💔"
    },
    {
      image: "assets/icons/cat-no-meme/cat-crying.png",
      text: "Waaah! That one hurt a little. Pick yes, babyy. 😭💗"
    },
    {
      image: "assets/icons/cat-no-meme/cat-crying2.png",
      text: "Crying in five languages over here. You love me, right? 🥺💗"
    }
  ];

  let noReactionIndex = 0;

  function showGameResponse(message, isLove, image) {
    gameResponseText.textContent = message;
    gameResponse.classList.toggle("is-love", Boolean(isLove));
    gameResponse.hidden = false;

    if (image) {
      gameResponseFace.src = image;
      gameResponseFace.hidden = false;
    } else {
      gameResponseFace.hidden = true;
    }
  }

  function showNoReaction() {
    const reaction = NO_REACTIONS[noReactionIndex % NO_REACTIONS.length];
    noReactionIndex += 1;
    showGameResponse(reaction.text, false, reaction.image);
  }

  function moveNoButton() {
    if (state.gameDone) return;

    lastDodgeTime = Date.now();
    state.dodges += 1;

    const x = 24 + Math.random() * 52;
    const y = 40 + Math.random() * 36;
    loveNo.style.left = `${x}%`;
    loveNo.style.top = `${y}%`;
    dodgeField.classList.add("has-moved");

    // The "No" button never gives up — it keeps running away forever.
    showNoReaction();
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
      showNoReaction();
      return;
    }

    const isKeyboard = event.detail === 0;

    if (isKeyboard || lastPointerType !== "touch") {
      showNoReaction();
      burstFromElement(loveNo, 20);
      return;
    }

    // Touch has no hover, so a tap is what makes it run away — and it never stops.
    moveNoButton();
    burstFromElement(loveNo, 14);
  });

  loveYes.addEventListener("click", () => {
    state.gameDone = true;
    loveYes.disabled = true;
    loveYes.textContent = "I love you too, babyy! 💗";
    dodgeField.hidden = true;
    showGameResponse("I knew it. Of course you do — and I love you more, babyy. 💗", true, LOVE_IMAGE);
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
    gameResponse.hidden = true;
    gameResponse.classList.remove("is-love");
    gameResponseText.textContent = "";
    gameResponseFace.src = NO_REACTIONS[0].image;
    gameResponseFace.hidden = false;
    noReactionIndex = 0;
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
      if (state.current !== "gift") return;
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
  let musicIntent = false;   // true only while the visitor wants music playing
  let recoveryAttempts = 0;  // consecutive recovery tries since the song last played
  let recoveryNudged = false; // have we already asked the visitor to tap play?
  let recoveryCooldownUntil = 0; // stops tight resume loops on stubborn phones
  let lastProgressAt = 0;    // heartbeat: last time the playhead actually moved
  let lastProgressTime = -1; // heartbeat: the playhead value at that moment
  let healthySince = 0;      // when the current uninterrupted playback began

  // Free a used blob URL, but only after the <audio> element has moved on, so
  // we never abort a read that is still in progress.
  function releaseBlobLater(url) {
    if (!url) return;
    setTimeout(() => URL.revokeObjectURL(url), 20000);
  }

  audio.volume = 0.45;
  audio.loop = false;

  const trackLabel = (track) => (track.artist ? `${track.title} — ${track.artist}` : track.title);

  // Tell the phone's lock screen / notification about the song. This keeps the
  // media session alive so phones are far less likely to silently kill playback
  // when the screen locks or the visitor switches apps.
  function updateMediaSession(track) {
    if (!track || !("mediaSession" in navigator) || typeof window.MediaMetadata !== "function") return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist || "Wyn Keysha 💗",
        album: "Our Little Soundtrack"
      });
    } catch (error) {
      /* Metadata is a nice-to-have — never let it break playback. */
    }
  }

  function setMediaSessionState(playing) {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.playbackState = playing ? "playing" : "paused";
    } catch (error) {
      /* Not supported everywhere. */
    }
  }

  function setMusicStatus(message) {
    if (musicStatus) musicStatus.textContent = message;
  }

  function updateNowPlaying() {
    const track = MUSIC_TRACKS[trackIndex];
    if (!track) return;
    if (musicNow) musicNow.hidden = false;
    if (musicNowTitle) musicNowTitle.textContent = trackLabel(track);
    updateMediaSession(track);

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
    noteHealthyPlayback();
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
    musicIntent = true;
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
    musicIntent = true;
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
    musicIntent = true;
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
    musicIntent = true;
    noteHealthyPlayback();
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
    if (!userActivated) {
      userActivated = true;
      beginSoundtrack();
      return;
    }
    // Later taps can also wake the music back up if the phone paused it. A tap
    // is exactly the gesture the browser wants, so clear any stale block too.
    autoplayBlocked = false;
    noteHealthyPlayback();
    resumeIfNeeded();
  }

  ["pointerdown", "keydown", "touchstart"].forEach((type) => {
    document.addEventListener(type, markUserActivated, { passive: true });
  });

  function tryStartMusic() {
    musicIntent = true;
    noteHealthyPlayback();
    playCurrent({ silent: true }).then((ok) => {
      if (ok) return;
      autoplayBlocked = true;
      if (state.current === "welcome") {
        showToast("Tap anywhere, babyy — our soundtrack starts on your first tap. 🎶");
      }
    });
  }

  // Phones love to silently pause media (screen lock, app switch, audio-focus
  // loss). This quietly brings the music back whenever we still want it playing.
  let resumeScheduled = false;

  // Called whenever the song is genuinely making sound again, so the next
  // interruption gets a fresh set of recovery attempts.
  function noteHealthyPlayback() {
    recoveryAttempts = 0;
    recoveryNudged = false;
    recoveryCooldownUntil = 0;
  }

  // Bring the soundtrack back when we still want it but the phone went quiet.
  // Handles both a hard pause and the sneaky "not paused, but silent" stall.
  function recoverPlayback() {
    if (!musicIntent || audioFailed || autoplayBlocked || audio.ended) return;
    if (document.visibilityState !== "visible") return;
    if (Date.now() < recoveryCooldownUntil) return;

    // If the phone keeps killing playback no matter what, stop looping forever
    // and ask the visitor for a tap instead.
    if (recoveryAttempts >= 4) {
      if (!recoveryNudged) {
        recoveryNudged = true;
        setMusicStatus("The music needs a little tap. Press play to bring it back. 🎶");
        showToast("Tap the music button to bring our soundtrack back. 🎶");
      }
      return;
    }

    recoveryAttempts += 1;
    recoveryCooldownUntil = Date.now() + 1500;

    if (audio.paused) {
      playCurrent({ silent: true }).then((ok) => {
        if (!ok) autoplayBlocked = true;
      });
      return;
    }

    // It reports "playing" but nothing is coming out — nudge the playhead so the
    // browser drops the dead buffer and re-requests the stream.
    setMusicStatus("Buffering… hang on, babyy. 🎶");
    try {
      audio.currentTime = Math.max(0, audio.currentTime - 0.1);
    } catch (error) {
      /* The stream isn't seekable yet. */
    }
    const attempt = audio.play();
    if (attempt && typeof attempt.catch === "function") {
      attempt.catch(() => {});
    }
  }

  function resumeIfNeeded() {
    recoverPlayback();
  }

  function scheduleResume(delay) {
    if (resumeScheduled) return;
    resumeScheduled = true;
    window.setTimeout(() => {
      resumeScheduled = false;
      resumeIfNeeded();
    }, delay);
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") scheduleResume(400);
  });

  // On phones the element can report "playing" while it silently sits in a dead
  // buffer stall — which is exactly why a song can look like it's running but
  // make no sound. This heartbeat watches the real playhead (not the paused
  // flag) and revives the song the moment it stops moving, even if no
  // "stalled"/"waiting" event ever fires.
  window.setInterval(() => {
    if (!musicIntent || audioFailed || autoplayBlocked || audio.ended) {
      lastProgressTime = -1;
      return;
    }

    const now = Date.now();
    const position = audio.currentTime;

    if (audio.seeking) {
      lastProgressTime = position;
      lastProgressAt = now;
      return;
    }

    if (lastProgressTime < 0) {
      lastProgressTime = position;
      lastProgressAt = now;
      return;
    }

    if (position > lastProgressTime + 0.2) {
      lastProgressTime = position;
      lastProgressAt = now;
      // Only treat playback as "healthy" after it has run uninterrupted for a
      // while — this stops a phone that flaps play/pause from looping forever.
      if (healthySince && now - healthySince > 15000) noteHealthyPlayback();
      return;
    }

    if (now - lastProgressAt > 5000) {
      lastProgressTime = -1;
      recoverPlayback();
    }
  }, 2000);

  async function toggleMusic() {
    if (audio.paused) {
      musicIntent = true;
      noteHealthyPlayback();
      if (!audio.src) {
        loadTrack(trackIndex, { autoplay: true });
        return;
      }
      playCurrent();
    } else {
      musicIntent = false;
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
    healthySince = Date.now();
    const track = MUSIC_TRACKS[trackIndex];
    setMusicStatus(`Now playing “${track.title}”${track.artist ? " — " + track.artist : ""}. 🎶`);
    setMediaSessionState(true);
    updateMusicUI();
  });

  audio.addEventListener("pause", () => {
    setMediaSessionState(false);
    updateMusicUI();

    // The visitor still wants music and didn't pause it themselves — the phone
    // (or another app) did. Try to bring it back instead of leaving it silent.
    if (musicIntent && !audio.ended && !audioFailed && !autoplayBlocked) {
      scheduleResume(500);
      return;
    }

    if (!audioFailed && !autoplayBlocked && state.current !== "welcome") {
      setMusicStatus("Music paused. Press play whenever you want it back.");
    }
  });

  audio.addEventListener("ended", () => {
    playNext(true);
  });

  audio.addEventListener("error", handleTrackError);

  // Lock-screen / notification controls (phones keep the media session alive
  // while these are registered, which stops the music from being killed).
  if ("mediaSession" in navigator) {
    const mediaHandlers = {
      play: () => {
        musicIntent = true;
        noteHealthyPlayback();
        playCurrent();
      },
      pause: () => {
        musicIntent = false;
        audio.pause();
      },
      nexttrack: () => playNext(true),
      previoustrack: () => playPrev()
    };
    Object.keys(mediaHandlers).forEach((action) => {
      try {
        navigator.mediaSession.setActionHandler(action, mediaHandlers[action]);
      } catch (error) {
        /* Some actions are not supported on every device. */
      }
    });
  }

  volumeRange.addEventListener("input", () => {
    const volume = Number(volumeRange.value);
    audio.volume = volume / 100;
    volumeValue.textContent = `${volume}%`;
    if (audioFailed) {
      setMusicStatus("Music volume is set. Add the song files to hear them. 💗");
    }
  });

  buildTrackList();
  const savedMusic = savedVisit?.music;
  trackIndex = Number.isInteger(savedMusic?.index) && MUSIC_TRACKS[savedMusic.index]
    ? savedMusic.index : Math.floor(Math.random() * MUSIC_TRACKS.length);
  if (Number.isFinite(savedMusic?.volume)) {
    audio.volume = Math.max(0, Math.min(savedMusic.volume, 1));
    volumeRange.value = Math.round(audio.volume * 100);
    volumeValue.textContent = `${volumeRange.value}%`;
  }
  updateMusicUI();
  loadTrack(trackIndex, { position: savedMusic?.position });
  if (savedMusic?.intent) {
    musicIntent = true;
    autoplayBlocked = true;
    setMusicStatus("Tap to continue our soundtrack where you left off. 🎶");
  } else if (savedMusic?.intent === false) {
    userActivated = true;
    setMusicStatus("Music paused. Press play whenever you want it back.");
  } else {
    setMusicStatus("Our soundtrack starts with your first tap. 🎶");
  }

  /* ============================================================
     Replay
  ============================================================ */
  const replayBtn = $("#replayBtn");

  function resetExperience() {
    progressReady = false;
    savedVisit = null;
    try { sessionStorage.removeItem(VISIT_KEY); } catch (error) { /* Storage is optional. */ }
    // Close any open dialog first.
    if (detailDialog.open) closeDialog();

    // Stop and rewind music.
    musicIntent = false;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch (error) {
      /* Audio may not be loaded yet. */
    }
    audioFailed = false;
    audioErrorToastShown = false;
    musicIntent = true;
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
    secretRejectionIndex = 0;
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
    resetReasonsDeck();

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
    progressReady = true;
    saveProgress();
    showToast("Let's start over, babyy. Same love, fresh adventure. 💗");
  }

  replayBtn.addEventListener("click", resetExperience);

  /* ---------- Recover this tab after a refresh or an iPhone tab reload ---------- */
  function saveProgress() {
    if (!progressReady) return;
    const snapshot = {
      version: 1,
      current: state.current,
      visited: [...state.visited],
      secrets: [...state.secretsFound],
      revealSeen: state.revealSeen,
      finalSeen: state.finalSeen,
      giftOpened: state.giftOpened,
      giftExtra: !giftExtra.hidden,
      loveMeasured: state.loveMeasured,
      gameDone: state.gameDone,
      secretPassed: !secretSuccess.hidden,
      letterPage: state.letterPage,
      reasonsOrder,
      reasonPos,
      scrollY: window.scrollY,
      music: {
        index: trackIndex,
        position: resumePosition || audio.currentTime || 0,
        intent: musicIntent,
        volume: audio.volume
      }
    };
    try {
      sessionStorage.setItem(VISIT_KEY, JSON.stringify(snapshot));
    } catch (error) {
      // Storage limits must never break a button, navigation, or playback.
    }
  }

  function restoreProgress() {
    if (!savedVisit || !screens.has(savedVisit.current)) return;
    state.visited = new Set(Array.isArray(savedVisit.visited)
      ? savedVisit.visited.filter((id) => chapterIndex(id) !== -1) : []);
    state.secretsFound = new Set(Array.isArray(savedVisit.secrets) ? savedVisit.secrets : []);
    state.revealSeen = Boolean(savedVisit.revealSeen);
    state.finalSeen = Boolean(savedVisit.finalSeen);
    setLetterPage(Number.isInteger(savedVisit.letterPage) ? savedVisit.letterPage : 0);

    const order = savedVisit.reasonsOrder;
    if (Array.isArray(order) && order.length === REASON_COUNT && new Set(order).size === REASON_COUNT &&
        order.every((index) => Number.isInteger(index) && index >= 0 && index < REASON_COUNT)) {
      reasonsOrder = order;
      reasonPos = Math.max(0, Math.min(Number(savedVisit.reasonPos) || 0, REASON_COUNT - 1));
      layoutReasons(true);
    }
    if (savedVisit.secretPassed) {
      secretCard.hidden = true;
      secretSuccess.hidden = false;
    }
    if (savedVisit.giftOpened) {
      state.giftOpened = true;
      giftBox.classList.add("is-open");
      giftBox.setAttribute("aria-expanded", "true");
      giftHint.textContent = "Opened with love 💗";
      giftReveal.hidden = false;
      giftExtra.hidden = !savedVisit.giftExtra;
      giftMore.setAttribute("aria-expanded", String(Boolean(savedVisit.giftExtra)));
      unlockSecretMemory(false);
    }
    if (savedVisit.loveMeasured) {
      finishLoveMeter({ celebrate: false });
    }
    if (savedVisit.gameDone) {
      state.gameDone = true;
      loveYes.disabled = true;
      loveYes.textContent = "I love you too, babyy! 💗";
      dodgeField.hidden = true;
      showGameResponse("I knew it. Of course you do — and I love you more, babyy. 💗", true, LOVE_IMAGE);
    }
    showScreen(savedVisit.current, { focus: false });
    const scrollY = Number(savedVisit.scrollY) || 0;
    requestAnimationFrame(() => window.scrollTo(0, scrollY));
  }

  // Save after handlers have applied their changes, including dialog secrets.
  document.addEventListener("click", () => window.setTimeout(saveProgress, 0));
  document.addEventListener("change", saveProgress);
  window.addEventListener("pagehide", saveProgress);
  document.addEventListener("visibilitychange", () => {
    document.body.classList.toggle("is-background", document.hidden);
    if (document.hidden) saveProgress();
  });

  /* ============================================================
     Initial setup
  ============================================================ */
  restoreProgress();
  progressReady = true;
  updateFinalStats();
  updateChapterUI(state.current);
})();
