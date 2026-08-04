# LAXTLINE — Portfolio Website

A cinematic, single‑page portfolio for **LAXTLINE** — a visual storyteller & video editor based in
Bhubaneswar, Odisha, India. The site showcases video edits, VFX, color grading, gaming montages,
photo edits and design work through an interactive, animation‑rich gallery experience.

> Built with plain **HTML + CSS + JavaScript** (no frameworks, no build step, no backend). All
> portfolio media is served from **ImageKit** and managed through a **hidden admin panel** that runs
> entirely in the browser — updating the portfolio needs zero code changes.

**Live:**

- 🌐 GitHub Pages: <https://laxtline.github.io/laxt-line-studio3/>

---

## 📑 Table of Contents

1. [Features](#-features)
2. [Dynamic Media System](#-dynamic-media-system)
3. [Admin Panel](#-admin-panel)
4. [Folder Structure](#-folder-structure)
5. [File Reference](#-file-reference)
6. [How to Run](#-how-to-run)
7. [Deployment & Going Live](#-deployment--going-live)
8. [SEO & Meta Files](#-seo--meta-files)
9. [Tech Stack](#-tech-stack)
10. [Performance Notes](#-performance-notes)
11. [Security](#-security)
12. [Editing Guide](#-editing-guide)
13. [Branding Note](#-branding-note)
14. [Contact](#-contact)

---

## ✨ Features

- **Hero section** with an animated particle/grid canvas background and a large brand watermark.
- **Custom cursor** with a smooth trailing follower (auto‑disabled on touch devices).
- **Marquee ribbons** of skills scrolling in both directions.
- **Work / Project Gallery** — dynamic masonry layout (up to 15 items) with hover‑to‑play videos
  and sound.
- **"All Projects" section** — the complete catalogue (up to 100 items), fully ImageKit‑driven.
- **Hidden admin panel** — login from the site itself, then upload / delete / reorder media; the
  site updates instantly on every device. See [Admin Panel](#-admin-panel).
- **Fullscreen viewer (lightbox)** — play/pause, seek bar, volume, prev/next, keyboard shortcuts.
- **About, Services, Software & Tools, Contact, Socials** sections.
- **Section‑entrance animations** — content slides/fades in each time a section scrolls into view;
  replays on every scroll‑back. GPU‑only and respects `prefers‑reduced‑motion`.
- **Smart, memory‑safe lazy loading** — videos load only when near the viewport and are released
  from memory once far off‑screen, so the page stays smooth at any media count.
- **SEO‑ready** — meta description, Open Graph & Twitter cards, sitemap and a PWA manifest.
- Fully **responsive** and performance‑optimised (GPU‑friendly animations, throttled scroll,
  paused off‑screen work, keyboard `:focus-visible` support).

---

## 🎞 Dynamic Media System

There are **no hardcoded media files** in the HTML. Both gallery sections render at runtime from
the owner's **ImageKit** account (`ik.imagekit.io/ggpmxiqgxf`):

| Section | ImageKit folder | Max items | localStorage cache key |
| --- | --- | --- | --- |
| Project Gallery (`#projectGalleryGrid`) | `Laxt-Line-Studio/Poject-Gallery` | 15 | `laxtline_gallery` |
| All Projects (`#galleryGrid`) | `Laxt-Line-Studio/All-Project` | 100 | `laxtline_allprojects` |

How it works (`js/05-media-engine.js`):

- Each ImageKit folder holds the media files plus a small public `manifest.json` storing the curated
  **selection + order + metadata**. The public site reads only the manifest and public delivery URLs
  — no key, no backend. Manifest writes are serialized so rapid edits can't corrupt order.
- **Type detection** from MIME first, then file extension — `.mp4` → video logic, `.jpg/.png/.webp`
  → image logic. Never cross‑applied.
- **Native aspect ratio** is detected from the real media dimensions — a 9:16 reel renders 9:16, a
  16:9 video renders 16:9. No cropping, no stretching, no fixed slots.
- **ImageKit transforms** — images resize with `?tr=w-<width>`; video posters come from
  `<url>/ik-thumbnail.jpg`. No pre‑generation needed.
- **Instant paint** — the last known state is cached in `localStorage` and painted immediately,
  then reconciled against the manifest in the background.
- Grid is fully fluid: the section ends exactly at the last item, whether there is 1 or 100.

---

## 🔐 Admin Panel

- A small, low‑key **gear icon fixed at the top‑right** of the page opens the login modal.
- After login, the **Media Manager** panel slides in with two independent zones (Project Gallery
  and All Projects), each showing a live count (e.g. `9 / 15`).
- Per item: **upload** (file picker or drag‑and‑drop), **delete**, **reorder** (drag rows or use
  ▲/▼ buttons). Accepted formats: JPG, JPEG, PNG, WEBP, MP4.
- Large videos (up to 4K) upload **directly from the browser to ImageKit** using a short‑lived
  signed request with a real progress bar — the UI never freezes.
- **Login = pasting the ImageKit private key.** This is a fully static site with no server to check a
  password, so what actually protects the galleries is the private key itself: nothing can be
  uploaded or changed without it. The key is held **only in `sessionStorage`** (this browser tab),
  cleared when the tab closes, and is **never written to any file or committed to the repo**.
- The panel's DOM is **built only after login** — logged‑out visitors have nothing to inspect, and
  without the private key no upload or manifest write can be signed.

---

## 📁 Folder Structure

```
laxt-line-studio/
├── index.html                  ← Main entry point (open / host this)
├── README.md                   ← This file
│
├── robots.txt                  ← Crawler rules + sitemap pointer (must be at the root)
├── sitemap.xml                 ← List of URLs for search engines
├── site.webmanifest            ← PWA / "Add to Home Screen" metadata
│
├── .nojekyll                   ← GitHub Pages: serve files as-is (no Jekyll processing)
│
├── assets/                     ← Static page images (hero, about, backgrounds, logo)
│
├── css/
│   ├── main.css                ← Global styles (nav, hero, sections, responsive)
│   ├── gallery.css             ← Gallery grid + fullscreen viewer styles
│   └── admin.css               ← Admin trigger, login modal & upload panel styles
│
├── js/
│   ├── 00-net-quality.js      ← Auto quality tier (LaxtNet): image/poster widths, preload
│   ├── 01-cursor-init.js       ← Creates the custom cursor (desktop only)
│   ├── 02-interactions.js      ← Hero canvas, cursor, scroll‑reveal, nav, menu
│   ├── 04-gallery-video.js     ← Video engine, lazy‑load + memory release, viewer
│   ├── 05-media-engine.js      ← Dynamic media renderer + ImageKit API (LaxtMedia)
│   └── 06-admin.js             ← Hidden admin login + upload panel
│
└── Docs/                       ← Author's notes & documentation (not part of the site)
```

> **Load order matters:** CSS loads as `main.css` → `gallery.css` → `admin.css`; JS loads
> `01 → 06` in order at their original positions. Every `.html`, `.css` and `.js` file starts with
> a header comment block explaining *what it does and why*.

---

## 🗂 File Reference

| File | What it does |
|------|--------------|
| `index.html` | Page markup: head/SEO meta, the `window.LAXT_IK` config (ImageKit endpoint, public key, folder paths, manifest URLs, limits), all sections, empty gallery grids (filled by JS) and the entrance‑animation blocks. |
| `css/main.css` | Brand variables (`:root`), nav, hero, marquee, sections, footer, `:focus-visible`, responsive breakpoints. |
| `css/gallery.css` | Masonry gallery cards, hover overlays, play/mute buttons and all `.fsv-*` fullscreen‑viewer styles. |
| `css/admin.css` | Admin gear icon, login modal, Media Manager panel, progress bars, toasts. |
| `js/00-net-quality.js` | Auto quality engine (`window.LaxtNet`): picks image/poster widths, preload and autoplay by connection tier. |
| `js/01-cursor-init.js` | Inserts the cursor dot + ring (skipped on touch devices). |
| `js/02-interactions.js` | Hero canvas animation, custom‑cursor motion, scroll‑reveal observer, nav scroll state, hamburger menu. |
| `js/04-gallery-video.js` | Playback engine: hover/touch play, autoplay‑unmute, **lazy‑load + memory release**, ratio sizing, fullscreen viewer, `reinitGallery()`/`unwireGallery()` hooks for re-renders. |
| `js/05-media-engine.js` | Reads a public `manifest.json` per ImageKit folder, builds gallery cards from public ImageKit URLs, exposes `window.LaxtMedia` (get / add / remove / reorder). Mutations sign an upload locally with the pasted private key and POST straight to ImageKit's CORS‑open upload endpoint; "remove" is a soft‑delete that rewrites the manifest. |
| `js/06-admin.js` | Gear trigger, login modal (pastes the ImageKit private key into `sessionStorage`), Media Manager panel (upload zones, counts, delete, drag reorder). |
| `sitemap.xml` | Lists the homepage + main section anchors for search engines. |
| `site.webmanifest` | App name, colors and icon for installable‑PWA / mobile home‑screen. |

---

## 🚀 How to Run

**Option 1 — Open directly:** double‑click `index.html`. Everything is static, so no build step and
no backend are needed. The gallery loads media from ImageKit, so you need internet.

**Option 2 — Local server (recommended; some browsers limit video autoplay on `file://`):**

```bash
python -m http.server 8000      # Python 3
# or
npx serve .                     # Node.js
```

Then open <http://localhost:8000>.

**Admin panel locally:** it works on any static server (including a plain file open), because there
is no backend — the panel signs uploads in the browser with your pasted ImageKit private key. Note
that the Web Crypto signing API requires a secure context, so use `http://localhost` (treated as
secure) rather than a `file://` path when testing uploads.

---

## 🌐 Deployment & Going Live

The site is deployed on **GitHub Pages** from the GitHub repo
([`laxtline/laxt-line-studio3`](https://github.com/laxtline/laxt-line-studio3)):

- **GitHub Pages**: <https://laxtline.github.io/laxt-line-studio3/> — served from the `main` branch.

To publish changes: commit and `git push origin main` — GitHub Pages redeploys automatically.

**One-time setup:** in the repo on GitHub → **Settings → Pages** → set **Source** to *Deploy from a
branch*, branch `main`, folder `/ (root)`. The `.nojekyll` file tells Pages to serve every file
as-is (no Jekyll processing), so nothing in the repo is silently dropped.

There is no build step — the repository root *is* the site, so every path in `index.html` is
relative and works directly.

> **Case sensitivity:** GitHub Pages serves from Linux, where `Assets/Logo.JPG` and `assets/logo.jpg`
> are different files — Windows won't warn you. Keep asset paths lowercase and exactly matching the
> filename on disk.

> **⚠️ If you move to a custom domain later**, replace the site URL in:
>
> 1. `sitemap.xml` → every `<loc>` URL
> 2. `index.html` → the `canonical`, `og:url`, `og:image` and `twitter:image` tags

---

## 🔎 SEO & Meta Files

These make the site look professional in Google results and in link previews (WhatsApp, Instagram
bio link, LinkedIn, X):

- **`<head>` meta** — `description`, `keywords`, `author`, `robots`, plus **Open Graph** and
  **Twitter Card** tags so a shared link shows a title, description and image preview.
- **`sitemap.xml`** — a map of the site's URLs to help search engines crawl it.
- **`site.webmanifest`** — lets the site be "Added to Home Screen" like an app, with the brand name,
  theme color and icon.

> **Icon tip:** the manifest/favicon point to `assets/logo.jpeg`. Two things worth fixing:
>
> 1. **It is ~500 KB** — a favicon is displayed at 32 px, so this downloads half a megabyte on
>    every page load for something the size of a thumbnail.
> 2. Export square PNGs (`icon-192.png`, `icon-512.png`), then update the `icons` array in
>    `site.webmanifest` and the `<link rel="icon">` tags in `index.html`.
>
> `assets/about-dp.jpg` (~350 KB) is worth re-exporting as WebP for the same reason.

---

## 🧱 Tech Stack

- **HTML5** — semantic, single‑page structure.
- **CSS3** — custom properties, grid & flexbox, multi‑column masonry, keyframe animations,
  backdrop filters, `content-visibility` and containment for performance.
- **Vanilla JavaScript** — no frameworks, no dependencies. Uses `IntersectionObserver`,
  `requestAnimationFrame`, `fetch`/`XMLHttpRequest` and the HTML5 `<video>` API.
- **Media backend** — **ImageKit** for permanent media URLs, on‑the‑fly image resizing (`?tr=w-…`)
  and video posters (`/ik-thumbnail.jpg`). Uploads are signed in the browser (Web Crypto HMAC‑SHA1)
  with the admin's pasted private key and sent to ImageKit's CORS‑open upload endpoint — no server.
- **Google Fonts** — Bebas Neue, DM Sans, Space Mono.

---

## ⚡ Performance Notes

The gallery has to stay smooth with up to 115 media items across the two sections. Every technique
below exists to keep the amount of work proportional to what the visitor can actually see.

> **Animations are never removed for performance.** Hero glows, marquee, cursor and hover reveals
> all stay exactly as designed — the optimisations only *pause* off-screen work and avoid
> re-doing work that was already done.

### Video lifecycle

A card holds the least data it can while still looking finished:

```
  placeholder  →  metadata  →  playing  →  released
  (ratio box)     (dims +      (hover /   (buffer freed once
                   1st frame)   tap)       ~1400px off-screen)
```

- **Lazy loading** — a video's `data-src` becomes `src` only within ~300 px of the viewport.
- **Memory release** — past ~1400 px away, `unloadVid()` detaches the source and frees the decoded
  buffer; it reloads automatically on scroll-back. Layout never shifts, because the wrapper keeps
  its aspect-ratio padding. This is what stops the page degrading after scrolling past many clips.
- **Re-render safety** — `unwireGallery()` detaches old nodes from the observers before a grid is
  rebuilt, so observer references (and memory) don't accumulate across admin edits.

### Avoiding repeated work

- **No duplicate render on load.** The list paints instantly from the `localStorage` mirror, then
  reconciles against the manifest. A content signature is compared first, so the (normal) case of
  "nothing changed" skips the rebuild entirely instead of tearing down and recreating every card.
- **Uploads append, they don't rebuild.** `LaxtMedia.addMany()` adds one card per finished file and
  writes the manifest **once** for the whole batch. Previously each file in a batch triggered a full
  grid teardown plus its own manifest round-trip, so a 10-file upload rebuilt the grid 10 times and
  re-fetched every existing video's metadata — the main cause of post-upload lag.
- **Aspect ratios are known before paint.** The grid is CSS multi-column masonry, so changing one
  card's height re-balances every column. Ratios therefore come from `w`/`h` recorded in the
  manifest at upload time, with a `laxtline_ratios` localStorage fallback for older media. Any
  ratio that still has to be measured is applied in a batched `requestAnimationFrame` flush, so N
  metadata events cost one layout pass instead of N.

### Network

- **Responsive images** — grid photos ship a `srcset` (400–1600 px) with `sizes` matching the column
  counts, so a phone downloads a ~400 px file instead of a fixed 1200 px one. The fullscreen viewer
  loads the original.
- **`preconnect` to ImageKit** — opens DNS/TCP/TLS to `ik.imagekit.io` and `upload.imagekit.io`
  before the first card asks for media.
- **Hero image preload** with `fetchpriority="high"` — it is the LCP element.
- **Cache headers** — GitHub Pages serves static files with its own default caching. There is no
  build step, so filenames are not content‑hashed; if a change doesn't appear after a deploy, do a
  hard refresh (`Ctrl/Cmd‑Shift‑R`) to bypass the browser cache.

### Rendering

- **Off-screen work is paused** — hero canvas, glows and marquee stop when scrolled away or when the
  browser tab is hidden.
- **Containment** — `contain: layout style` on gallery cards isolates their layout and paint.
- **No dead CSS** — every class in the stylesheets is reachable from the markup (verified; the
  old Work-section triptych, testimonials and contact-form rules were removed after the sections
  themselves were replaced).

---

## 🔒 Security

### The public site is completely key‑less

The public site reads only a public `manifest.json` and public ImageKit delivery URLs, so page load
needs no credentials and no backend at all. Only the **public key**
(`window.LAXT_IK.publicKey`) appears in `index.html` — that is safe by design; on its own it cannot
upload or delete anything.

### The private key never touches the repo

This is a fully static site (GitHub Pages) with **no server**, so there is nowhere safe to store a
secret server‑side and there is no password to check. Instead, the ImageKit **private key is the
credential**: nothing can be uploaded or changed without it.

- "Logging in" to the admin panel means **pasting the private key**. It is stored **only in
  `sessionStorage`** (this one browser tab) and is cleared the moment the tab closes.
- The key is **never written to any file and never committed** — it is not in `index.html`, not in
  the JS, not anywhere in the repo. Open the repo's source and you will not find a `private_…` string.
- With the key, `js/05-media-engine.js` signs each upload locally using **Web Crypto HMAC‑SHA1**
  (`signature = HMAC‑SHA1(token + expire)`) and POSTs to ImageKit's CORS‑open upload endpoint
  (`upload.imagekit.io`). No `Authorization` header, no backend.

### "Delete" is a soft‑delete (by design)

ImageKit's Management API (list / hard‑delete) is **not reachable from the browser** — its endpoints
reject cross‑origin preflight requests. So "Remove" in the panel does **not** call a delete API.
Instead it drops the item from `manifest.json` and re‑uploads the manifest (the upload endpoint *is*
CORS‑open, with `overwriteFile=true`). The item disappears from the site immediately; the underlying
file stays in ImageKit storage. To remove the file for good, delete it from the **ImageKit
dashboard**.

### What this does and doesn't protect

- ✅ Visitors can only *read* — they never receive the private key, so they cannot upload or change
  anything.
- ✅ The private key never persists to disk or git; a closed tab forgets it.
- ⚠️ Anyone who has the private key has **full ImageKit account access**. Keep it secret, and only
  ever paste it on the real site over HTTPS.

> ⚠️ **Rotate the key.** Any private key that has ever been shared in chat, a screenshot or git
> history should be treated as burned — **regenerate it in the ImageKit dashboard** and only ever
> paste the new value into the login box at runtime (never into a file).

### Other hardening

- Untrusted strings (ImageKit filenames, categories) are HTML‑escaped before entering `innerHTML` in
  `04-gallery-video.js`, `05-media-engine.js` and `06-admin.js`.
- Upload signing uses Web Crypto, which requires a secure context — the panel only works over HTTPS
  (GitHub Pages) or `http://localhost`.

### Recommended next

- **Content-Security-Policy** is not set. Adding one is worthwhile but needs care: the page uses
  inline `<script>`/`<style>` blocks and `document.write`, so a strict policy will break it without
  either nonces or a refactor.
- Anything genuinely private should never be committed — this is a public repo.

---

## 🛠 Editing Guide

- **Update portfolio media:** don't touch the code — click the gear icon (top‑right), log in, and
  use the Media Manager to upload / delete / reorder. Changes go live instantly on all devices.
- **Change styling:** edit `css/main.css` (general look) or `css/gallery.css` (gallery & viewer) or
  `css/admin.css` (admin panel). Brand colors live in `:root` at the top of `main.css`.
- **Change behaviour:** edit the relevant file in `js/` (each has a header explaining its job).
- **Change ImageKit folders / limits:** edit the `window.LAXT_IK` config block in `index.html`'s
  head (folder paths must match the folders you created in ImageKit).
- **Admin access:** there is no stored password — access is controlled by the ImageKit **private
  key** you paste at login. To revoke access, rotate the key in the ImageKit dashboard.

---

## 🏷 Branding Note

The visible brand name is **LAXTLINE** (shown in the nav, hero watermark, footer and titles, with the
"LINE" half accented in brand red). The following are **real account links / contact details** and are
intentionally left unchanged so they keep working — update them only with your own new handles:

- Social usernames in the Socials section (Instagram, LinkedIn, GitHub, YouTube, Snapchat, etc.)
- The Google Drive link
- Email & phone in the Contact section

---

## 📬 Contact

- **Email:** suryakant321pradhan@gmail.com
- **Phone:** +91 78480 03467
- **Location:** Bhubaneswar, Odisha, India

---

© 2025–2026 LAXTLINE Studio. All Rights Reserved.
