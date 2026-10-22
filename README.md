# Wyn Keysha's Birthday Website 💗

A complete, hand-built birthday surprise for **Wyn Keysha Gonzales** — October 24, 2026.
Made with love by **John Dominique G. Boyles**.

This is a fully working static website made with **HTML5, CSS3, and vanilla JavaScript only**.
No frameworks, no build step, no backend, no database, no analytics, and no tracking.

---

## What's inside

- A romantic envelope welcome screen
- A playful "Are you Wyn Keysha Gonzales?" check
- A secret question that accepts **John Dominique G. Boyles** or **Babyy** (case-insensitive, spaces trimmed)
- A cinematic birthday reveal with a live Manila-time countdown and confetti
- A four-page birthday letter
- A five-card memories scrapbook (plus one secret memory), with an accessible detail dialog
- Flip cards with little reasons
- A comically overflowing love meter
- A shy, runaway "No..." button mini-game with a touch-friendly fallback and a skip option
- A CSS gift box with a hidden note and a scrapbook surprise
- Hidden secrets in the logo, the date, and the scrapbook
- Background music (off by default, with play/pause and volume)
- A labeled **Home** button (`W ♥ J Home`) in the top bar that returns to the birthday reveal
- A final message, replay button, and an exploration summary
- Responsive layouts for phones, tablets, laptops, and desktops
- Reduced-motion support, keyboard navigation, visible focus states, semantic HTML, and accessible dialogs

Everything runs locally in the browser. The secret question is a playful interaction, **not security**.

---

## Project structure

```text
wyn-birthday-website/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
├── assets/
│   ├── images/
│   │   ├── couple-1.jpg
│   │   ├── couple-2.jpg
│   │   ├── couple-3.jpg
│   │   └── memories/
│   │       ├── memory-4.jpg
│   │       ├── memory-5.jpg
│   │       └── memory-6.jpg   (secret memory)
│   ├── audio/
│   │   └── background-music.mp3
│   └── icons/
│       └── heart.svg
├── README.md
└── .gitignore
```

All paths are **relative**, so the site works on GitHub Pages, in a subfolder, or by opening
`index.html` directly in a browser.

### Preview it

1. Download or unzip the project folder.
2. Double-click `index.html`.

Optional local server (recommended while editing):

```bash
# If you have Python installed:
python -m http.server 8000
# then open http://localhost:8000

# If you use VS Code:
# Install the "Live Server" extension and click "Go Live".
```

---

## Personal details already set

| Detail | Value |
| --- | --- |
| Her name | Wyn Keysha Gonzales |
| Birthday | October 24, 2026 |
| Your name | John Dominique G. Boyles |
| Accepted secret answers | `John Dominique`, `John Dominique Boyles`, `Baby` (any extra y's, e.g. `babyyyyy`) |
| Countdown timezone | Asia/Manila (UTC+8) |

The accepted answers are checked case-insensitively and leading/trailing spaces are ignored.
(For forgiveness, the full `John Dominique G. Boyles` with or without the period is also accepted.)
The website also accepts any capitalization of those answers, and `Baby` may be written with
any number of extra `y`s at the end (`Babyy`, `babyyyyy`, and so on).

---

## Add your couple photos

The site ships with attractive **original placeholder illustrations** (JPG) so nothing is ever
broken. Replace them with real photos whenever you're ready.

### Replace an existing photo

1. Look inside `assets/images/`:
   - `couple-1.jpg` — Instagram Notes beginning
   - `couple-2.jpg` — movie nights
   - `couple-3.jpg` — late-night talks
2. Look inside `assets/images/memories/`:
   - `memory-4.jpg` — figuring things out
   - `memory-5.jpg` — games and silly calls
   - `memory-6.jpg` — the secret memory
3. Give your new photo the **exact same filename** and put it in the same folder.
   The simplest approach is to overwrite the placeholder file.
4. Use JPG, PNG, WEBP, or another browser-supported format. If you change the extension,
   update the `image:` path in the `MEMORIES` array in `js/script.js`.
5. Keep the file size reasonable — around 1200 × 900 pixels and under 500 KB per photo is plenty
   for a phone. Very large photos make the scrapbook slow.

### Update the alternative text

Open `js/script.js` and find the `MEMORIES` array near the memories section.
For each memory, update the `alt` value to describe the actual photo, for example:

```js
alt: "Wyn and John on our first movie night"
```

Good alt text helps screen-reader users and also appears if a photo fails to load.

### Adjust how photos are cropped

In `css/style.css`, find:

```css
.memory-card__img {
  object-fit: cover;
}
```

`cover` crops the image to fill the frame. Use `contain` if you need to show the entire photo
instead (it may leave empty space). The frame is 4:3; the dialog version also uses 4:3.

### Add a new memory card

In `js/script.js`, copy an object inside the `MEMORIES` array and change:

```js
{
  id: "new-memory",              // unique, no spaces
  title: "Our New Memory",
  caption: "a little caption",
  sticker: "💗",                 // small decorative emoji
  image: "assets/images/memories/memory-7.jpg",
  alt: "Description of the photo",
  body: "First paragraph.\\n\\nSecond paragraph."
}
```

Add the photo to `assets/images/memories/` with a matching path. The grid automatically
handles layout and the scrapbook rotation. The secret card is identified by `secret: true`;
you do not need another secret card.

If a photo is missing, the site shows a designed placeholder instead of a broken image.
To replace the built-in placeholders without changing code, simply overwrite the same filenames.

---

## Add background music

The site has a small **music player / playlist** on the birthday reveal screen. It reads the
track list from the `MUSIC_TRACKS` array in `js/script.js`. The playlist currently ships with 13
songs (wave to earth, Frank Ocean, The 1975, Mitski, Miguel, H.E.R., dhruv, and more) taken from
the MP3 files in `assets/audio/`:

```js
const MUSIC_TRACKS = [
  { title: "seasons", artist: "wave to earth", src: "assets/audio/wave to earth - seasons.mp3" },
  { title: "love.", artist: "wave to earth", src: "assets/audio/wave to earth - love. (Official Lyric Video).mp3" },
  // ...and the rest
];
```

**Shuffle:** playback order is randomized. The player uses a shuffle bag so every song is played
once before any repeats, and it automatically moves to the next random song when one finishes.
The **◀ / ▶** buttons skip through the shuffled order; clicking a row in the track list jumps
straight to that song.

**Start on open:** the first screen preloads one random song, and tapping **Open Your Surprise**
starts it playing (a first tap or keypress works too). Playback is requested directly during the
gesture so iPhone Safari can allow it. A slow download continues buffering without repeated seeks.
The play/pause button also cancels playback while loading, and selecting the current song keeps
its position. Switching chapters does not change the audio source.

**Returning to the page:** this tab remembers the current chapter, letter page, reasons card,
opened gift, discoveries, song, playback position, and volume in `sessionStorage`. Returning to
the page can restore that progress; tap play if Safari needs a fresh gesture. Deliberate pauses
stay paused. **The browser's Reload/Refresh button restarts the entire experience**, including
the welcome screen, questions, chapters, gifts, and music. Navigation reported by the browser as
a reload always starts fresh. **Replay from the start** also resets the saved experience.
This is temporary data in your browser tab and is never sent to a server. Storage being blocked
does not disable the site.

The 3D heart is initialized only when its chapter opens. Phones use a lower graphics resolution,
simpler geometry, fewer decorations, and a 30 fps cap. Rendering stops outside that chapter or
in a background tab. If WebGL fails, the love meter and its buttons remain usable.

### Use your own songs

1. Get the songs from a source you're allowed to use (purchased, ripped from a CD you own, or with
   permission). **Do not download copyrighted songs from unofficial sources.**
2. Put the files in `assets/audio/`.
3. Edit the `MUSIC_TRACKS` array in `js/script.js` so each `src` matches your filename. The title
   and artist are just for display.
4. Keep each file reasonably small so phones load quickly.

The player automatically skips any track whose file is missing, so the site never breaks. If no
track can be loaded you'll see a friendly note instead of an error.

### Hosting behind a tunnel (ngrok, etc.)

Free tunnels such as **ngrok** show a "You are about to visit…" welcome screen. On phones, the
browser asks for the song in the background with a request that can't include the tunnel's bypass
header, so every track comes back as that HTML page instead of audio and none of them play — even
though the page, styles, and photos look fine.

GitHub Pages and ordinary hosts stream directly through `<audio>`, allowing playback before a
complete song download. Only on ngrok, after a direct media error, the player retries with the
`ngrok-skip-browser-warning` header and a temporary blob URL. Fetches time out after 25 seconds,
are cancelled when the track changes, and old blob URLs are released after switching sources.

**Encoding:** the bundled songs are 128 kbps stereo MP3s at 44.1 kHz so they start quickly and
stream smoothly on mobile data; the three tracks that were already 64 kbps were left untouched.
Encode new 192 kbps or larger files down to about 128 kbps instead of shipping full-quality
masters. Dropping below roughly 96 kbps starts to sound rough on headphones.

**Copyright:** Do not download songs from unofficial sources. Use music you created, purchased,
or have written permission to use. GitHub Pages is public, so any file you add is publicly
downloadable.

**iPhone note:** Some iPhone browsers do not allow websites to change media volume
programmatically. The on-device volume buttons will still work.

---

## Edit the birthday letter

The letter is stored as normal HTML so it's easy to edit. Open `index.html` and search for:

```text
Everything I Want You to Know
```

Inside `.letter-pages` there are four `.letter-page` blocks. Edit the `<p>` paragraphs directly.
The final page contains the `.letter-signoff`.

Rules that keep the layout working:

- Keep each page inside `<div class="letter-page" data-page="0"> ... </div>`.
- The **first page** needs `class="letter-page is-active"` and no `hidden` attribute.
- Additional pages need `class="letter-page"` and the `hidden` attribute.
- Keep the number of pages flexible. The page dots and "Page X of Y" text are generated
  automatically by JavaScript from the actual pages in the HTML.
- To add a page, copy one full `.letter-page` block and give it the next `data-page` number.
  Remove `hidden` only from the first page.
- Keep the greeting and sign-off if you want the personal letter feel.

You can reread the letter at any time from the navigation, from the final screen
("Read your letter again"), or by revisiting the chapter.

---

## Edit names, dates, and accepted answers

### Change names and messages

Most visible personal text is in **`index.html`**. Search for the old name and replace it.
The important places are:

- The welcome footer: `For Wyn Keysha Gonzales · October 24, 2026`
- The identity question: `Are you Wyn Keysha Gonzales?`
- The "not my baby" message: `...reserved for Wyn Keysha Gonzales!`
- The reveal heading: `Happy Birthday, My Wyn Keysha!`
- The final signature and footer: `John Dominique G. Boyles`
- The letter greeting and sign-off
- The page `<title>` and meta description

Chapter names and the live countdown copy are in **`js/script.js`**:

- `CHAPTERS` — chapter titles used in the top bar and bottom navigation
- `SCREEN_TITLES` — browser tab titles
- `LOVE_MESSAGES` — messages while the love meter fills
- The final love-meter message inside `finishLoveMeter()`
- `updateCountdown()` — birthday greeting / after-birthday copy

### Change the birthday date and timezone

In `js/script.js`, find:

```js
const BIRTHDAY_START = Date.parse("2026-10-24T00:00:00+08:00");
const BIRTHDAY_END = BIRTHDAY_START + 24 * 60 * 60 * 1000;
```

Change the date and the `+08:00` offset if needed. `BIRTHDAY_END` is midnight at the end of
the birthday; keep the 24-hour addition unless you want a different celebration window.

Also update the visible date in `index.html` near `date-chip` and the welcome footer.
The countdown automatically shows:

- remaining time before the date
- a birthday greeting on the day (Manila time)
- "The birthday celebration continues! 💗" afterward — never a negative countdown

### Change accepted secret answers

In `js/script.js`, find:

```js
const ACCEPTED_ANSWERS = new Set([
  "john dominique g. boyles",
  "john dominique g boyles",
  "babyy"
]);
```

Answers are normalized first: extra spaces are collapsed, leading/trailing spaces are removed,
and everything is lowercased. So `  BABYY  ` matches `babyy`. Add or remove entries as you like.
This is not a real password or security feature.

---

## Edit the scrapbook, reasons, gifts, and secrets

### Memories

Edit the `MEMORIES` array in `js/script.js`. Each object's `title`, `caption`, `sticker`, `image`,
`alt`, and `body` are rendered in the scrapbook. Use `\n\n` in `body` to create paragraph breaks.

The **secret memory** (id `secret`) stays hidden until the gift is opened. Its content should
not pretend to be a specific real event; keep it general, like the included "chapter we're
still writing".

### Reasons I love you

Edit the `REASONS` array in `js/script.js`. The number of cards, the "Reveal all" button, and the
status count adapt automatically. Keep reasons sincere and specific to your relationship.

### Gift message and hidden note

In `index.html`, search for `Your gift is a little collection`. The main gift message is there.
The secondary note is inside `#giftExtra`.

### Secrets

There are four optional secrets:

1. **The logo** — tap `W ♥ J` five times (the top bar only appears after the surprise opens).
2. **The date** — tap `October 24, 2026` three times on the reveal screen.
3. **The scrapbook star** — the small gold ✦ button near the scrapbook heading.
4. **The secret memory** — open the gift, then open the new card in the scrapbook.

All four are optional. None of them block navigation or hide essential content. Secret text is in
`openNote(...)` calls and the secret `MEMORIES` object in `js/script.js`. If you add or remove a
secret, update `SECRET_TOTAL` near the top of `js/script.js` so the final summary stays accurate.

---

## Change colors, shadows, spacing, and typography

All design tokens are at the top of `css/style.css`:

```css
:root {
  --cream: #fbf4ea;
  --rose: #c34f63;
  --rose-deep: #9c3049;
  --burgundy: #542331;
  --lavender-deep: #7e6aa0;
  --gold: #c2964d;
  --ink: #39272e;
  --font-display: "Cormorant Garamond", Georgia, serif;
  --font-body: "Manrope", "Segoe UI", system-ui, sans-serif;
  --font-hand: "Caveat", "Segoe Script", cursive;
  --radius-xl: 36px;
  --shadow-soft: 0 26px 50px -32px rgba(84, 35, 49, 0.38);
}
```

- Change `--rose`, `--rose-deep`, and `--burgundy` to shift the main romantic palette.
- Change `--lavender`, `--peach`, and `--gold` for accent decorations.
- Change the `--font-*` variables and the Google Fonts `<link>` in `index.html` to use different typefaces.
- The fallback fonts are intentional: if Google Fonts is blocked or offline, the site still
  looks usable in Georgia / Segoe UI / cursive.
- Radius and shadow tokens control the soft, iOS-inspired 3D surfaces.
- Section-specific styling is grouped with clear comments such as `Scrapbook`, `Letter`, and `Gift`.

If you make dramatic color changes, check text contrast, especially on the primary buttons.
The current palette is designed for dark ink on cream and white on burgundy/rose.

---

## Privacy and honest behaviour

- The site collects **no personal information**.
- There is no server, database, analytics, or tracking.
- It does not request camera, microphone, or location access.
- It does not use cookies or local storage.
- It uses temporary `sessionStorage` to remember your place when returning; browser reload clears it.
- The secret question is a playful interaction, **not real authentication** and not a way to
  protect private information.
- Do not put private addresses, passwords, financial details, or other sensitive information
  anywhere on the website. A public GitHub Pages site can be read by anyone with the URL.
- The only external request is to Google Fonts. If those fonts fail to load, the site still works.

---

## Publish for free with GitHub Pages

GitHub Pages can host plain HTML, CSS, and JavaScript for free, subject to GitHub's current
service limits and policies. No backend or paid hosting is needed.

### 1. Create a GitHub account

Go to <https://github.com> and sign up for a free account if you don't have one.

### 2. Create a new public repository

1. Click the **+** menu in the top-right, then **New repository**.
2. Name it something like `wyn-birthday`.
3. Choose **Public**.
4. Do not add a README if you are uploading this whole project (you already have one).
5. Click **Create repository**.

Public is required for free GitHub Pages on a free account. (GitHub may offer Pages for private
repositories on paid plans, but that is not needed here.)

### 3. Upload the project files

On the new repository page:

1. Click **Add file → Upload files**.
2. Drag the **contents** of the project folder into the upload area. Make sure the folders
   `css/`, `js/`, and `assets/` are preserved.
3. Do not upload a ZIP as the only file — GitHub Pages must see the individual files.
4. Before committing, confirm that **`index.html` is in the repository root**, not inside
   another folder.
5. Scroll down, add a commit message like `Add birthday website`, and click **Commit changes**.

The repository should look like:

```text
index.html
README.md
.gitignore
css/
js/
assets/
```

If you upload via Git on your computer instead, initialize the repo in the project folder and push
to GitHub. Do not commit `node_modules` (this project has none).

### 4. Open Settings

On the repository page, click the **Settings** tab (it may be under the **...** menu on mobile).

### 5. Find GitHub Pages

In the left sidebar, click **Pages**.

Under **Build and deployment**:

- **Source**: choose **Deploy from a branch**.
- **Branch**: choose `main` (or `master` if that is your default branch) and folder **`/ (root)`**.
- Click **Save**.

### 6. Wait for deployment

GitHub will build the site. This can take from under a minute to a few minutes. Refresh the
**Pages** settings page until a green check mark and a live URL appear.

### 7. Find your website URL

The published URL will look like:

```text
https://YOUR-USERNAME.github.io/wyn-birthday/
```

If `index.html` was in the correct root location, that URL opens the welcome screen.

### 8. Test it on your phone

1. Send the URL to your phone (message, email, or a note to yourself).
2. Open it in Chrome or Safari.
3. Check the welcome envelope, open the surprise, answer the questions, and scroll through.
4. Test with sound: press the music button yourself. Browsers will not start music automatically.
5. Rotate the phone and check the letter, scrapbook, and buttons.

### 9. Update the website later

After editing files on your computer:

1. In the repository, open the file, click the pencil icon to edit, commit; or
2. Use **Add file → Upload files** again to replace changed files, or
3. Push your changes with Git.

GitHub Pages rebuilds automatically. If you don't see changes, wait a minute and hard-refresh
the page (`Ctrl + F5` on Windows, or clear the tab in Safari). You can also check the **Actions**
tab for deployment status.

### Important GitHub Pages notes

- Repository file-size limits apply. Keep photos compressed and audio small; GitHub may block
  files over 100 MB and recommends keeping repositories well under 1 GB.
- Local photos and audio must be uploaded to the repository too. They are not magically fetched
  from your computer.
- The site is publicly accessible if the repository and Pages configuration are public.
  The playful secret question does not protect anything, so don't include sensitive information.
- GitHub Pages does not run backend code. This project doesn't need it.

---

## Troubleshooting

### Photos are not showing

- Check that the filenames match exactly, including capitalization:
  `couple-1.jpg`, `couple-2.jpg`, `couple-3.jpg`, `memory-4.jpg`, `memory-5.jpg`, `memory-6.jpg`.
- Confirm the files are in `assets/images/` and `assets/images/memories/` (not inside another folder).
- If you used a PNG or WEBP, update the `image:` path in the `MEMORIES` array.
- Hard-refresh the page after replacing files. GitHub Pages may take a minute to update.
- If a photo is missing on purpose, the site should show a designed "our photo goes here" fallback.
  If you see that fallback, the path is wrong.

### Music is not playing

- It starts automatically when the page opens, or on the first tap/keypress if the browser blocks
  autoplay — this is a browser autoplay rule.
- Confirm the files in the `MUSIC_TRACKS` array in `js/script.js` exist in `assets/audio/`.
- On a public tunnel (e.g. free ngrok), songs can fail on phones because of the welcome screen —
  see **Hosting behind a tunnel** above. The player already works around this.
- Check the browser console for a media error.
- On iPhone, use the device volume buttons; websites cannot always set media volume.
- If a file is missing, the player skips it and the site keeps working. That is expected.
- Make sure the audio you add is one you own or have permission to use.

### Buttons are not responding

- Make sure JavaScript is enabled.
- Open the browser console and check for errors (F12 → Console).
- Confirm `js/script.js` is present and the path in `index.html` is `js/script.js`.
- Refresh the page. If you opened `index.html` from a ZIP without extracting, extract it first.
- Don't block scripts with an extension, and don't rename the files.

### The secret answer is rejected

- Accepted answers are `John Dominique`, `John Dominique Boyles`, and `Baby` with any number of
  extra `y`s (e.g. `babyyyyy`) — any capitalization, extra spaces trimmed. The full
  `John Dominique G. Boyles` (with or without the period) is also accepted.
- To edit the answers, change `ACCEPTED_ANSWERS` (and `BABY_PATTERN`) in `js/script.js`.
- Clear the field and type again if you pasted hidden characters.

### The layout looks broken on mobile

- Confirm the `<meta name="viewport">` tag is still in the `<head>` of `index.html`.
- Test at actual phone widths; the site is mobile-first and tested around 320–390 px.
- Hard-refresh after editing CSS; old CSS can be cached.
- If you added large fixed-width content (for example a huge image), keep it inside the `.wrap`
  container and give images `max-width: 100%`.
- If a custom letter character or long word overflows, add `overflow-wrap: anywhere` to that element.

### Fonts look different

Google Fonts may be blocked, offline, or slow. The site falls back to Georgia, Segoe UI, and a
cursive system font. Nothing essential depends on the downloaded fonts.

### Everything is too animated

The site respects your device's **Reduce Motion** setting. On Windows: Settings → Accessibility →
Visual effects → Animation effects off. On iPhone: Settings → Accessibility → Motion → Reduce Motion.
The website also skips confetti and floating hearts when reduced motion is enabled.

---

## Quality assurance checklist

### Run the reliability regression suite

The website itself still needs no dependencies or build step. Optional browser tests use
Playwright and start their own local server with audio range-request support:

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium webkit
node tests/browser-regression.cjs
```

The suite checks all 13 real MP3 files, chapter controls, letters, dialogs, touch cancellation,
saved progress, browser reload resetting everything, explicit replay, layouts from 320–1440 px, missing music, blocked storage,
slow downloads, pause during loading, rapid song selection, playback position restoration,
bounded stall recovery, and the mobile 3D lifecycle. Chromium covers pointer/touch interactions;
Windows WebKit uses keyboard activation because its high-DPI click coordinates can be inconsistent.
These browser checks do not replace a final test on a physical iPhone over its actual connection.

### Flows to try

- [ ] Welcome button opens the identity question.
- [ ] "Yes, that's me!" leads to the secret question.
- [ ] "Nope!" shows the humorous response and "Okay, let me try again" works.
- [ ] `John Dominique G. Boyles` is accepted.
- [ ] `Babyy` is accepted.
- [ ] `JOHN DOMINIQUE G. BOYLES` and `  babyy  ` are also accepted.
- [ ] A wrong answer shows the gentle message and the input stays available.
- [ ] Enter submits the secret form.
- [ ] "Step inside" opens the birthday reveal and confetti.
- [ ] The countdown shows a positive time in Manila, with no negative values.
- [ ] The letter opens, pages forward/backward, and the last page leads to memories.
- [ ] Every navigation button (Back/Next, chips, logo home) works.
- [ ] Memory cards open the detail dialog. Close with the X, the Close button, and Escape.
- [ ] Memory dialog cannot leave the page stuck; focus returns to the card.
- [ ] Reasons flip on tap and keyboard, "Reveal all" and "Reset cards" work.
- [ ] The love meter reaches 100% and overflows with the final message; it can be measured again.
- [ ] The "No..." button dodges on desktop but stays usable; touch taps move it and then give a
      playful message; keyboard Enter works; "Skip this silly game" works.
- [ ] The gift opens with a click/tap, shows the message, the extra note, and unlocks the secret
      scrapbook memory.
- [ ] The secret memory appears after the gift, and opening it counts as a secret.
- [ ] Logo (5 taps), date (3 taps), and scrapbook star secrets open their notes.
- [ ] Music plays, pauses, and the volume slider changes volume. Missing audio shows a friendly
      message instead of breaking.
- [ ] Replay returns to the welcome screen and resets the experience.
- [ ] The final footer reads "Made with love by John Dominique G. Boyles."

### Responsive widths to spot-check

320 px, 375 px, 390 px, 768 px, 1024 px, 1440 px.

Look for horizontal scrolling, overlapping text, buttons that are too small, and unreadable letter
text. The buttons are designed to stay at least 42–56 px tall for comfortable tapping.

### Built-in accessibility features

- Semantic headings and landmark elements
- Skip-to-content link
- Keyboard-operable cards, buttons, dots, and dialogs
- Visible focus styles
- `aria-pressed`, `aria-expanded`, `aria-invalid`, `aria-live`, and progressbar semantics where useful
- Native `<dialog>` with focus handling and Escape support
- Alternative text on photos
- Reduced-motion support
- No alert boxes and no hover-only interactions

---

## Verified in this build

The finished project was tested in real Chrome (headless, Playwright) against a local server on
October 17, 2026. Automated results:

- **66/66 end-to-end checks** covering every gate, the accepted answers, the letter, scrapbook,
  reasons, love meter, runaway game, gift, music playback, secrets, final screen, and replay.
- **264/264 responsive checks** across 320, 375, 390, 768, 1024, and 1440 px widths, including
  horizontal overflow, top-bar fit, heading clearance, and touch target sizes on every screen.
- **22/22 edge checks**: missing audio, missing photo fallback, touch interactions, all four
  secrets, countdown on/before/after October 24 in Manila time, and reduced motion.
- **16/16 axe-core WCAG 2.1 A/AA screen scans** with no reported violations.
- **HTML validation** with `html-validate`: no errors.
- No JavaScript console errors or page errors during the main flow.

A fresh look on your own phone is still worthwhile — browser versions and font rendering can vary.
The checklist above is written for that final human pass.

## What's complete, and what you may still want to add

**Complete and working:**
- All requested screens and seven requested features
- Personalization, dates, names, accepted answers, letter, reasons, memories, secrets
- Responsive design, accessibility features, music handling, and deployment docs
- Original placeholder JPG art and an original ambient MP3 loop

**Optional, for you to provide:**
- Real couple photos to replace the six placeholder images
- A song you own or have permission to use, if you prefer it over the included ambient loop

Nothing in the code is a placeholder function, TODO, or unfinished interaction. The photo and audio
files are intentionally designed stand-ins so the site is complete and presentable on day one.

---

## Credits

- Design, writing, and code: **John Dominique G. Boyles** (with love, for Wyn Keysha)
- Placeholder artwork and ambient music: original assets created for this project
- Fonts: Cormorant Garamond, Manrope, and Caveat via Google Fonts (optional, with local fallbacks)

Made with love by **John Dominique G. Boyles**. 💗
