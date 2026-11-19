# LAXTLINE Portfolio

> **Live:** https://laxtline.github.io/laxt-line-studio3/

---

## What is this?

My portfolio website. I'm a video editor / visual storyteller from Bhubaneswar, Odisha. This site shows my work — cinematic edits, VFX, color grading, gaming montages, photo edits, design.

Built it myself over ~3 months (on and off between client work). No frameworks, no build step, no backend. Just HTML, CSS, vanilla JS. Hosted free on GitHub Pages.

---

## Why I built it this way

Tried Next.js + Sanity CMS first. Spent 2 weeks fighting TypeScript errors and CMS schema. Realized I was over-engineering a *portfolio*.

What I actually needed:
- Fast, no build step
- Easy to update media (drag-drop, no code changes)
- Looks cinematic (it's a video portfolio, after all)
- Free hosting

So I started over. Plain files. ImageKit for media (generous free tier). Admin panel that lives in the browser — no backend, no database, no auth server. Just a private key I paste in when I want to upload.

---

## Features that actually work

- **Hero canvas** — particles + grid lines. Pauses when you scroll away or switch tabs (saves CPU)
- **Custom cursor** — dot + trailing ring. Disables itself on touch devices (learned this the hard way — `mix-blend-mode: difference` makes mobile screens dark)
- **Marquee skills** — two rows scrolling opposite directions. Red glow lines. Pauses on hover
- **Project Gallery** (max 15) + **All Projects** (max 100) — masonry grid, CSS columns
- **Hover-to-play videos** (desktop) / **tap-to-unmute** (mobile) — respects `prefers-reduced-motion`
- **Fullscreen viewer** — play/pause, seek bar, volume, prev/next, keyboard shortcuts (← → space ESC)
- **Smart lazy loading** — videos load when ~900px from viewport, **RELEASE MEMORY** when ~1400px away (this was the biggest pain point — page would freeze after scrolling past 20 videos)
- **Auto quality** — detects slow connection (Network API + Resource Timing + rebuffer signals), drops to poster-only mode
- **Hidden admin panel** — gear icon top-right → login → drag-drop upload / delete / reorder. Updates live on every device instantly
- **SEO basics** — meta, OG/Twitter cards, sitemap.xml, PWA manifest

---

## Tech Stack

| Layer | What I Used |
|-------|-------------|
| **Frontend** | HTML5, CSS3, Vanilla JS (ES6+) — zero frameworks, zero build step |
| **Styling** | CSS Custom Properties, CSS Columns (native masonry), `contain`, `content-visibility`, GPU animations |
| **Media CDN** | ImageKit — transforms (`?tr=w-`), video thumbnails (`/ik-thumbnail.jpg`), signed browser uploads |
| **Hosting** | GitHub Pages — push to main, live in 2 minutes, custom domain ready |
| **Fonts** | Google Fonts: Bebas Neue, DM Sans, Space Mono |
| **Auth** | Client-side only — sessionStorage + HMAC-SHA1 via Web Crypto (no backend!) |

**Explicitly NOT used:** React, Vue, Next.js, TypeScript, Webpack, Vite, Node.js, databases, package.json, node_modules, CI/CD yaml.

---

## Key Features

- **Cinematic hero** — animated particle/grid canvas, giant brand watermark, scroll indicator
- **Custom cursor** — red dot + easing ring, auto-disabled on touch (saves mobile users from darkened screens)
- **Marquee skills** — dual-direction infinite scroll, red glow, pauses on hover
- **Two galleries** — Project Gallery (15 curated) + All Projects (100 max), CSS Columns masonry
- **Smart video** — hover-to-play with sound (desktop), tap-to-unmute (mobile), gesture unlock, Instagram-style sound toggle
- **Fullscreen viewer** — seek, volume, prev/next, keyboard (←/→/Space/ESC), quality badge
- **Lazy load + memory release** — load at 900px, **unload at 1400px** (frees decoded buffer, layout stable)
- **Auto quality (LaxtNet)** — 3 signals (Network API + Resource Timing + rebuffer stalls) → 3 tiers
- **Hidden admin** — gear icon → login → drag-drop upload/delete/reorder → instant live update
- **Instant paint** — localStorage mirror renders instantly, background reconcile via signature comparison
- **Batched ratios** — N metadata events → 1 rAF flush → 1 layout pass (masonry stability)

---

## Folder Structure

```
laxt-line-studio3/
├── index.html           # main entry — open this
├── README.md            # this file
├── robots.txt
├── sitemap.xml
├── site.webmanifest
├── .nojekyll            # tells GitHub Pages: don't run Jekyll
├── assets/              # static images (hero, about, backgrounds, logo)
├── css/
│   ├── main.css         # nav, hero, marquee, sections, responsive
│   ├── gallery.css      # grid cards, fullscreen viewer
│   └── admin.css        # login modal, upload panel
└── js/
    ├── 00-net-quality.js   # auto quality tier (LaxtNet)
    ├── 01-cursor-init.js   # creates cursor elements (runs early, before 02)
    ├── 02-interactions.js  # hero canvas, cursor motion, scroll-reveal, nav, hamburger
    ├── 04-gallery-video.js # video engine, lazy load, ratio, fullscreen viewer (biggest file)
    ├── 05-media-engine.js  # ImageKit API, manifest read/write, admin upload signing
    └── 06-admin.js         # gear trigger, login modal, media manager panel
```

**Load order matters:** CSS → `main.css` → `gallery.css` → `admin.css`  
JS → `01` → `02` → `04` → `05` → `06` (numbered so they load in order)

---

## How to Run Locally

**Option 1 — Open directly:** double-click `index.html`. Everything is static, so no build step and no backend needed. Gallery loads media from ImageKit, so you need internet.

**Option 2 — Local server (recommended; some browsers limit video autoplay on `file://`):**

```bash
python -m http.server 8000      # Python 3
# or
npx serve .                     # Node.js
```

Then open `http://localhost:8000`

**Admin panel locally:** it works on any static server (including a plain file open), because there is no backend — the panel signs uploads in the browser with your pasted ImageKit private key. Note that the Web Crypto signing API requires a secure context, so use `http://localhost` (treated as secure) rather than a `file://` path when testing uploads.

---

## Demo Login Credentials

> **For reviewers only** — these are placeholder values in the source. Replace with your own if you fork this.

| Field | Value |
|-------|-------|
| **Username** | `user` |
| **Password** | `9938` |

> **How it works:** The login is just a UI gate (base64 in `js/06-admin.js`). The *real* credential is the ImageKit private key embedded in `js/05-media-engine.js` (base64, decoded at runtime, held in `sessionStorage` only — cleared on tab close). Never written to file, never committed.

**To use your own:**
1. Create free ImageKit account → get public/private keys + URL endpoint
2. Create folders `Laxt-Line-Studio/Project-Gallery` and `Laxt-Line-Studio/All-Project`
3. Upload empty `manifest.json` (`[]`) to each folder
4. Edit `window.LAXT_IK` in `index.html` with your keys/URLs
5. Edit `js/05-media-engine.js` — update `IK_KEY_B64` (base64 of your private key)
6. Edit `js/06-admin.js` — update `CREDS_B64` (base64 of `youruser:yourpass`)

---

## Live Demo

**🌐 https://laxtline.github.io/laxt-line-studio3/**

**GitHub:** https://github.com/laxtline/laxt-line-studio3

### What to look for when you visit:

1. **Hero** — particle/grid canvas animates, pauses when you scroll down or switch tabs
2. **Cursor** — red dot + ring follows mouse (desktop only). Hover over buttons/gallery cards → expands
3. **Marquee** — skills scroll opposite directions. Hover to pause. Red items = specialties
4. **Project Gallery** — hover a video → plays with sound. Move away → pauses. Tap speaker icon → mute/unmute
5. **All Projects** — same interactions, full catalogue (100 max)
6. **Fullscreen viewer** — click any card → play/pause, seek, volume, prev/next, keyboard (←/→/Space/ESC)
7. **Admin panel** — gear icon top-right → login with `user` / `9938` → drag-drop upload → instant live update

---

## Screenshots

> *Add your own screenshots here. Suggested: hero section, gallery hover state, fullscreen viewer, admin panel.*

```
📸 Hero section with canvas animation
📸 Project Gallery — hover playing video
📸 Fullscreen viewer with controls
📸 Admin panel — media manager with upload progress
```

---

## What I Learned (the real stuff)

| Thing | How I learned it |
|-------|------------------|
| `IntersectionObserver` for lazy load + unload | Page froze after 30 videos. Chrome DevTools Memory tab showed detached `<video>` elements holding decoded buffers. `unloadVid()` + `load()` fixed it. |
| Batched ratio writes via `requestAnimationFrame` | Each `loadedmetadata` triggered a layout reflow. 20 videos = 20 reflows = jank. Queued writes, flush once per frame. |
| `sessionStorage` not `localStorage` for private key | First version used localStorage. Realized key persists across tabs/sessions. Switched to sessionStorage — clears on tab close. |
| CSS `columns` masonry + `padding-bottom` ratio | Flex/grid masonry needs JS. CSS columns = native, free. But height must be known → `padding-bottom: calc(h/w * 100%)` on wrapper. |
| Web Crypto `subtle.importKey` for HMAC-SHA1 | ImageKit upload signature = HMAC-SHA1(token + expire). No crypto lib needed — browser has it. Works on HTTPS + localhost. |
| `contain: layout style` on gallery cards | Huge perf win. Isolates each card's layout/paint. Masonry rebalances only changed column. |
| `content-visibility: auto` on cards | Off-screen cards skip layout/paint entirely. But breaks IntersectionObserver for `.reveal` elements — removed from `#all-work`. |
| `prefers-reduced-motion` | Some users get motion sickness. All animations respect it. `@media (prefers-reduced-motion: reduce) { animation-duration: 0.01ms }` |
| `navigator.connection.saveData` | Data Saver mode = explicit "send me less". Outranks measured speed. Tier → slow. |
| GitHub Pages case sensitivity | `Assets/Logo.JPG` works on Windows, 404s on Pages (Linux). Keep all paths lowercase. |

---

## Known Issues / TODO

- [ ] Favicon is 500KB JPEG — should be square PNGs (192/512), update `site.webmanifest` + `<link rel="icon">`
- [ ] `about-dp.jpg` (~350KB) — re-export as WebP
- [ ] No Content-Security-Policy header (inline scripts/styles block strict CSP)
- [ ] Mobile hamburger menu doesn't trap focus (accessibility)
- [ ] Fullscreen viewer seek bar sometimes buggy on iOS Safari
- [ ] Admin panel: drag-reorder on mobile is janky (pointer vs touch events)
- [ ] Hero canvas particle connections O(n²) — drops frames on old phones (reduced to 25 on mobile)
- [ ] Manual High/Saver quality modes removed (Auto only) — some users wanted manual override

---

## Credits / References

- **Fonts:** Google Fonts — Bebas Neue, DM Sans, Space Mono
- **ImageKit** — media CDN, transforms, upload API
- **Hero canvas particles** — inspired by a CodePen, rewrote from scratch to add grid lines + pause-on-hidden
- **Custom cursor** — learned from CSS-Tricks but had to fix `mix-blend-mode` darkening on mobile
- **Masonry with CSS columns** — Smashing Magazine article
- **HMAC-SHA1 in Web Crypto** — MDN docs + ImageKit API reference
- **Stack Overflow** — too many tabs to count. Specifically: video `object-fit: cover` black bars, `IntersectionObserver` rootMargin syntax, `FormData` multipart upload, `sessionStorage` vs `localStorage` security

---

## License

MIT — but honestly, this is *my* portfolio with *my* work media. Fork the code structure if useful, but please don't deploy my edits/photos as yours.

---

## Contact

- **Email:** suryakant321pradhan@gmail.com
- **Phone:** +91 78480 03467
- **Location:** Bhubaneswar, Odisha, India
- **Instagram:** [@laxtline](https://instagram.com/laxtline)
- **LinkedIn:** [suryakant-pradhan](https://linkedin.com/in/suryakant-pradhan)
- **GitHub:** [laxtline](https://github.com/laxtline)
- **YouTube:** [LAXTLINE](https://youtube.com/@laxtline)

---

*Built with too much coffee, `console.log` debugging, and the occasional 3am "why is this not working" moment. If you're a recruiter reading this — hi! 👋 The code isn't perfect but I had fun building it and learned a ton. Happy to walk through any part of it.*