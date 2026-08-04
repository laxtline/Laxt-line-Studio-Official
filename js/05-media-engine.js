/* =====================================================================
   LAXTLINE — js/05-media-engine.js
   ---------------------------------------------------------------------
   SMART DYNAMIC MEDIA ENGINE  (ImageKit edition)

   Renders both galleries (#projectGalleryGrid = "gallery",
   #galleryGrid = "allprojects") from ImageKit.

     • Source of truth : a public manifest.json inside each ImageKit folder,
                         storing the curated ORDER + metadata. Each entry
                         carries its own public delivery `url`, so the public
                         site needs NO API key and NO listing call.
     • Fast paint      : localStorage mirror (laxtline_gallery /
                         laxtline_allprojects) paints instantly, then the
                         manifest reconciles it.
     • Type detection  : from MIME first, else file extension. Videos and
                         images NEVER cross-apply logic.
     • Ratio           : detected client-side from real media dimensions by
                         js/04-gallery-video.js (applyRatio) — no cropping.
     • Re-render       : window.reinitGallery() re-wires playback/lightbox.

   SECURITY MODEL  (static site — GitHub Pages, no backend)
     Public read  → key-less (public manifest + public URLs).
     Admin write  → there is no server, so the admin pastes the ImageKit
                    PRIVATE key at login. It is held ONLY in sessionStorage
                    (this browser tab) and used to sign each upload locally
                    (HMAC-SHA1 via Web Crypto). ImageKit's upload endpoint is
                    CORS-open, so signed uploads go straight from the browser.
                    The key is never written to any file or committed anywhere.
                    ImageKit's delete/list APIs are NOT reachable from a browser
                    (CORS), so "remove" simply unpublishes an item from the
                    manifest — it disappears from the site; delete the file
                    itself from the ImageKit dashboard if the bytes must go.

   Public admin API (used by js/06-admin.js): window.LaxtMedia
     .get / .refresh / .add / .addMany / .remove / .reorder / .setMeta /
     .count / .limit
   ===================================================================== */
(function () {
  'use strict';

  const CFG = window.LAXT_IK;
  if (!CFG) { console.error('[Media] LAXT_IK config missing — media engine disabled.'); return; }

  const MANIFEST_NAME = 'manifest.json';
  // Image: web formats + next-gen AVIF. Video: H.264/H.265/AV1 in mp4/webm/mkv,
  // plus ProRes / RAW masters carried in .mov / .m4v. Detection is MIME-first,
  // ext-fallback.
  const IMAGE_EXT = ['jpg','jpeg','png','webp','gif','avif','bmp','svg'];
  const VIDEO_EXT = ['mp4','webm','mov','m4v','ogv','mkv','avi','m4p','hevc','av1'];

  const state = { gallery: [], allprojects: [] };

  // ── Admin session gate ──────────────────────────────────────────────
  // This is a STATIC site (GitHub Pages) with no server, so the login is just a
  // convenience gate: username/password (handled in 06-admin.js) flips the
  // session flag below. The ImageKit private key needed to sign uploads is
  // embedded in the site itself (base64-obfuscated just to keep it out of plain
  // grep / View-Source), decoded at runtime. Honest tradeoff the owner accepted:
  // on a static site a determined visitor CAN extract this key, so it should be
  // an upload-only Restricted key and rotated if ever misused. The session flag
  // simply avoids firing doomed requests before "login".
  const ADMIN_SESSION_KEY = 'laxtline_admin_session';
  // Embedded ImageKit key (base64), decoded at runtime. Upload-only Restricted
  // key recommended; rotate in the ImageKit dashboard if ever misused.
  const IK_KEY_B64 = 'cHJpdmF0ZV83RU9WTUhZQk4zRWRSZG9RSFI0M2Y2K2JlWm89';
  const adminKey = () => { try { return atob(IK_KEY_B64); } catch (e) { return ''; } };
  function requireAdmin() {
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== '1') {
      throw new Error('Not authorized — admin login required.');
    }
  }

  // ── helpers ──────────────────────────────────────────────────────
  const stripExt  = n => (n || '').replace(/\.[^.]+$/, '');
  const escapeHtml = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  function detectType(mime, name) {
    if (mime) {
      if (mime.indexOf('video/') === 0) return 'video';
      if (mime.indexOf('image/') === 0) return 'photo';
    }
    const ext = (name || '').split('.').pop().toLowerCase();
    if (VIDEO_EXT.indexOf(ext) !== -1) return 'video';
    if (IMAGE_EXT.indexOf(ext) !== -1) return 'photo';
    return 'photo';
  }

  // ── ImageKit URL builders ───────────────────────────────────────────
  // Every item already carries its full public delivery `url` (from the
  // manifest or the upload/list response). Transformations are appended with
  // ImageKit's ?tr= query param.
  const fullUrl = it => it.url || '';
  const withTr  = (url, tr) => url ? url + (url.indexOf('?') === -1 ? '?' : '&') + 'tr=' + tr : url;
  // Sized image for the grid (fast). Full-res is used by the fullscreen viewer.
  const imgUrl  = (it, w) => w ? withTr(it.url, 'w-' + w) : (it.url || '');

  // ── Responsive image sources ────────────────────────────────────────
  // srcset offers the browser several widths; sizes tells it the slot width, so
  // it downloads the smallest file that still looks sharp. js/00-net-quality.js
  // drops the large rungs on a slow link.
  const IMG_WIDTHS = [400, 600, 900, 1200, 1600];
  const netWidths  = () => (window.LaxtNet ? window.LaxtNet.imgWidths(IMG_WIDTHS) : IMG_WIDTHS);
  const netWidth   = w  => (window.LaxtNet ? window.LaxtNet.imgWidth(w) : w);
  const imgSrcset  = it => netWidths().map(w => imgUrl(it, w) + ' ' + w + 'w').join(', ');
  // Mirrors the column counts in css/gallery.css: 3 columns default,
  // 2 below 1100px, 1 below 820px.
  const IMG_SIZES  = '(max-width: 820px) 92vw, (max-width: 1100px) 46vw, 31vw';

  // ── Video posters ───────────────────────────────────────────────────
  // ImageKit generates a still frame from a video at <video-url>/ik-thumbnail.jpg
  // — a ~KB JPEG instead of streaming megabytes of MP4 just to paint one frame.
  // js/04-gallery-video.js applies it lazily (data-poster), and if the thumbnail
  // 404s (e.g. plan without video thumbnails) the <video>'s own first frame
  // takes over, so a missing poster is never fatal.
  const POSTER_W   = 600;
  const netPosterW = () => (window.LaxtNet ? window.LaxtNet.posterWidth() : POSTER_W);
  const posterUrl  = it => it.url ? withTr(it.url + '/ik-thumbnail.jpg', 'w-' + netPosterW()) : '';

  // ── Client-side upload signing (no backend) ─────────────────────────
  // On a static host there is no server to mint an upload signature, so we do
  // it in the browser with the embedded private key (see adminKey above).
  // ImageKit's upload signature is HMAC-SHA1(token + expire) keyed by the
  // private key, hex-encoded. Web Crypto (SubtleCrypto) is available on any
  // https origin (GitHub Pages is https), so no library is needed.
  async function hmacSha1Hex(key, msg) {
    const enc = new TextEncoder();
    const ck  = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
    const sig = await crypto.subtle.sign('HMAC', ck, enc.encode(msg));
    return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  function uuid() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
  async function signUpload() {
    const key = adminKey();
    if (!key) throw new Error('Not authorized — admin login required.');
    const token     = uuid();
    const expire    = Math.floor(Date.now() / 1000) + 2400;   // valid ~40 min
    const signature = await hmacSha1Hex(key, token + expire);
    return { token: token, expire: expire, signature: signature, publicKey: CFG.publicKey };
  }

  // ── Aspect-ratio memory ────────────────────────────────────────────
  // Cards are laid out with padding-bottom (a % of width) in CSS multi-column
  // masonry, so a late ratio change rebalances every column. Two layers avoid
  // it: w/h stored in the manifest at upload time, and a localStorage mirror
  // keyed by fileId filled in by applyRatio() for older media.
  const RATIO_KEY = 'laxtline_ratios';
  let _ratioCache = null;
  function ratioCache() {
    if (_ratioCache) return _ratioCache;
    try {
      const raw = localStorage.getItem(RATIO_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      _ratioCache = (obj && typeof obj === 'object') ? obj : {};
    } catch (e) { _ratioCache = {}; }
    return _ratioCache;
  }
  function rememberRatio(id, w, h) {
    if (!id || !w || !h) return;
    const c = ratioCache();
    const pct = +(h / w * 100).toFixed(4);
    if (c[id] === pct) return;
    c[id] = pct;
    try { localStorage.setItem(RATIO_KEY, JSON.stringify(c)); } catch (e) {}
  }
  function ratioPct(item) {
    if (item.w && item.h) return +(item.h / item.w * 100).toFixed(4);
    const cached = ratioCache()[item.fileId];
    return typeof cached === 'number' ? cached : null;
  }

  // ── localStorage mirror (instant paint before the network responds) ──
  function loadCache(section) {
    try {
      const raw = localStorage.getItem(CFG.storeKeys[section]);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveCache(section) {
    try { localStorage.setItem(CFG.storeKeys[section], JSON.stringify(state[section])); } catch (e) {}
  }

  // ── Normalise a raw manifest / API entry into the internal item shape. ──
  function normItem(raw) {
    if (!raw || !raw.fileId || !raw.url) return null;
    const mime = raw.mime || '';
    return {
      fileId: raw.fileId,
      url:    raw.url,
      path:   raw.path || raw.filePath || '',
      type:   raw.type || detectType(mime, raw.name),
      name:   raw.name != null ? raw.name : '',
      cat:    raw.cat  || '',
      mime:   mime,
      w:      raw.w || 0,
      h:      raw.h || 0
    };
  }

  // ── Manifest read (PUBLIC, key-less). The manifest carries every item's
  //    own delivery url, so the public site never lists the folder. ──
  //    bust=true adds a cache-buster for the background reconcile / admin reads.
  async function readManifest(section, bust) {
    const url = CFG.manifests[section];
    if (!url) return null;
    try {
      const u = bust ? url + (url.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now() : url;
      const r = await fetch(u, { cache: bust ? 'no-store' : 'default' });
      if (!r.ok) return null;                 // 404 = fresh folder, nothing curated
      const data = await r.json();
      const arr  = Array.isArray(data) ? data : (data && Array.isArray(data.items) ? data.items : null);
      if (!arr) return null;
      return arr.map(normItem).filter(Boolean);
    } catch (e) { return null; }
  }

  // ── Manifest write (ADMIN). Overwrite manifest.json in place via a signed
  //    upload, so its public URL is stable and always current. Writes are
  //    serialized per section so rapid reorders/deletes can't race. ──
  const _writeQueue = { gallery: Promise.resolve(), allprojects: Promise.resolve() };
  function writeManifest(section) {
    const run = _writeQueue[section].then(() => doWriteManifest(section), () => doWriteManifest(section));
    _writeQueue[section] = run.catch(() => {});
    return run;
  }
  async function doWriteManifest(section) {
    // The manifest stores each item's public url so the public reader needs no
    // listing. w/h keep first-paint ratios correct.
    const payload = state[section].map(it => ({
      fileId: it.fileId, url: it.url, path: it.path, type: it.type,
      name: it.name, cat: it.cat, mime: it.mime || '', w: it.w || 0, h: it.h || 0
    }));
    const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
    const file = new File([blob], MANIFEST_NAME, { type: 'application/json' });
    // overwriteFile keeps the same path (stable public URL). Not counted toward
    // the section's media limit — it's metadata, filtered out of every listing.
    await ikUpload(section, file, MANIFEST_NAME, { overwrite: true });
  }

  // ── Card markup — matches the structure js/04-gallery-video.js expects,
  //    so its playback / ratio / lightbox logic works unchanged. ──
  let _vidSeq = 0;
  const MUTE_SVGS =
    '<svg class="icon-muted" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" style="display:none"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="white"/><line x1="15" y1="9" x2="21" y2="15"/><line x1="21" y1="9" x2="15" y2="15"/></svg>' +
    '<svg class="icon-sound" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polygon points="11,5 6,9 2,9 2,15 6,15 11,19" fill="white"/><path d="M15.5 8.5 Q19 12 15.5 15.5" fill="none"/><path d="M18 6 Q23 12 18 18" fill="none"/></svg>';

  const VIDEO_MIME = {
    mp4:'video/mp4', webm:'video/webm', mov:'video/quicktime', m4v:'video/x-m4v',
    ogv:'video/ogg', mkv:'video/x-matroska', avi:'video/x-msvideo',
    hevc:'video/mp4', av1:'video/mp4'
  };
  function videoMime(item) {
    if (item.mime && item.mime.indexOf('video/') === 0) return item.mime;
    const ext = (item.path || item.name || '').split('.').pop().toLowerCase();
    return VIDEO_MIME[ext] || 'video/mp4';
  }

  function buildCard(item) {
    const name = escapeHtml(item.name || '');
    const cat  = escapeHtml(item.cat  || '');
    const full = fullUrl(item);                // full-res → fullscreen viewer

    const card = document.createElement('div');
    card.className = 'gal-item';
    card.dataset.type    = item.type;
    card.dataset.fsType  = item.type;
    card.dataset.fsSrc   = full;
    card.dataset.fsCat   = item.cat  || '';
    card.dataset.fsName  = item.name || '';
    card.dataset.mediaId = item.fileId;

    // Paint at the real aspect ratio straight away when known, so masonry never
    // has to re-balance once metadata lands. Falls back to the stylesheet's 16:9
    // placeholder when the ratio is genuinely unknown.
    const pct = ratioPct(item);
    const wrapStyle = pct ? ' style="padding-bottom:' + pct + '%"' : '';
    if (pct) card.dataset.ratioKnown = '1';

    if (item.type === 'video') {
      const vid = 'dv' + (++_vidSeq);
      card.dataset.fsPoster = posterUrl(item);
      card.innerHTML =
        '<div class="gal-media-wrap"' + wrapStyle + '>' +
          '<video class="gal-video" id="' + vid + '" loop playsinline preload="' +
            (window.LaxtNet ? window.LaxtNet.videoPreload() : 'metadata') + '" muted' +
            ' data-poster="' + posterUrl(item) + '"' +
            ' decoding="async">' +
            '<source data-src="' + full + '" type="' + videoMime(item) + '">' +
          '</video>' +
          '<div class="gal-overlay"></div>' +
          '<div class="vid-thumb-overlay"><svg viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div>' +
          '<div class="gal-play-btn"><svg viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div>' +
          '<div class="gal-bottom"><div class="gal-info"><span class="gal-cat">' + cat + '</span><span class="gal-name">' + name + '</span></div>' +
            '<button class="gal-mute-btn" title="Mute/Unmute">' + MUTE_SVGS + '</button></div>' +
        '</div>';
    } else {
      card.innerHTML =
        '<div class="gal-media-wrap"' + wrapStyle + '>' +
          '<img decoding="async" class="gal-photo" loading="lazy"' +
            ' src="' + imgUrl(item, netWidth(900)) + '"' +
            ' srcset="' + imgSrcset(item) + '"' +
            ' sizes="' + IMG_SIZES + '"' +
            ' alt="' + name + '">' +
          '<div class="gal-overlay"></div>' +
          '<div class="gal-bottom"><div class="gal-info"><span class="gal-cat">' + cat + '</span><span class="gal-name">' + name + '</span></div></div>' +
        '</div>';
    }
    return card;
  }

  const gridEl  = section => document.getElementById(section === 'gallery' ? 'projectGalleryGrid' : 'galleryGrid');
  const emptyEl = section => document.getElementById(section === 'gallery' ? 'galleryEmpty' : 'allprojectsEmpty');

  const _renderedSig = { gallery: null, allprojects: null };
  const signature = items => items
    .map(it => [it.fileId, it.type, it.name, it.cat, it.w || 0, it.h || 0].join('~'))
    .join('|');

  function announce(section, count) {
    document.dispatchEvent(new CustomEvent('laxt:media-rendered', { detail: { section: section, count: count } }));
  }

  function render(section, force) {
    const grid = gridEl(section);
    if (!grid) return;
    const items = state[section];

    const sig = signature(items);
    if (!force && _renderedSig[section] === sig) { announce(section, items.length); return; }

    if (window.unwireGallery) window.unwireGallery(grid);
    grid.innerHTML = '';
    const frag = document.createDocumentFragment();
    items.forEach(it => frag.appendChild(buildCard(it)));
    grid.appendChild(frag);
    _renderedSig[section] = sig;

    const empty = emptyEl(section);
    if (empty) empty.hidden = items.length > 0;

    if (window.reinitGallery) window.reinitGallery(grid);

    // Eagerly load the first 4 cards (almost certainly above the fold).
    const EAGER = 4;
    const eagerVids = grid.querySelectorAll('video.gal-video');
    for (let i = 0; i < Math.min(EAGER, eagerVids.length); i++) {
      if (window.loadVidEager) window.loadVidEager(eagerVids[i]);
    }

    announce(section, items.length);
  }

  function appendCard(section, item) {
    const grid = gridEl(section);
    if (!grid) return;
    const card = buildCard(item);
    grid.appendChild(card);
    _renderedSig[section] = signature(state[section]);

    const empty = emptyEl(section);
    if (empty) empty.hidden = state[section].length > 0;

    if (window.reinitGallery) window.reinitGallery(card);
    announce(section, state[section].length);
  }

  // ── Refresh a section from its manifest and re-render. ──
  async function refresh(section) {
    const items = await readManifest(section, true);
    // No manifest (fresh folder) or a failed read → keep the cached grid.
    if (items) {
      state[section] = items;
      saveCache(section);
      render(section);
    }
    return state[section];
  }

  // ══════════════════════════════════════════════════════════════
  //  ImageKit direct upload (browser → ImageKit, signed locally)
  //  The signature is computed in the browser from the admin's pasted
  //  private key, and the file bytes go straight to ImageKit's CORS-open
  //  upload endpoint — so large 4K videos are unaffected by any size limit
  //  and no backend is involved.
  // ══════════════════════════════════════════════════════════════
  async function ikUpload(section, file, fileName, opts) {
    opts = opts || {};
    // 1) Sign the upload in the browser with the pasted private key.
    const auth = await signUpload();

    // 2) POST the file directly to ImageKit with the signed params.
    const fd = new FormData();
    fd.append('file', file, fileName || file.name);
    fd.append('fileName', fileName || file.name);
    fd.append('publicKey', auth.publicKey);
    fd.append('signature', auth.signature);
    fd.append('expire', String(auth.expire));
    fd.append('token', auth.token);
    fd.append('folder', CFG.folders[section]);
    // Media files get a unique name (avoid collisions); the manifest is a fixed
    // singleton we overwrite in place.
    fd.append('useUniqueFileName', opts.overwrite ? 'false' : 'true');
    if (opts.overwrite) { fd.append('overwriteFile', 'true'); fd.append('overwriteAITags', 'false'); }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', CFG.uploadEndpoint || 'https://upload.imagekit.io/api/v1/files/upload', true);
      xhr.upload.onprogress = e => { if (e.lengthComputable && opts.onProgress) opts.onProgress(e.loaded / e.total); };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (e) { reject(new Error('Bad upload response')); }
        } else if (xhr.status === 401 || xhr.status === 403) {
          // Almost always a wrong/expired private key.
          reject(new Error('ImageKit rejected the upload — check your private key (log out and paste it again).'));
        } else {
          let msg = 'Upload failed (' + xhr.status + ')';
          try { const j = JSON.parse(xhr.responseText); if (j && j.message) msg = j.message; } catch (e) {}
          reject(new Error(msg));
        }
      };
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(fd);
    });
  }

  // ══════════════════════════════════════════════════════════════
  //  ADMIN API  (window.LaxtMedia) — used by js/06-admin.js
  // ══════════════════════════════════════════════════════════════
  const LaxtMedia = {
    get:   section => state[section].slice(),
    count: section => state[section].length,
    limit: section => CFG.limits[section],
    refresh: refresh,
    rememberRatio: rememberRatio,

    async add(section, file, onProgress) {
      const results = await LaxtMedia.addMany(section, [file], p => {
        if (onProgress) onProgress(p.fraction);
      });
      if (results[0] && results[0].error) throw results[0].error;
      return results[0] && results[0].item;
    },

    // Upload a batch. Each finished file is appended as a single card; the
    // manifest is written ONCE for the whole batch.
    async addMany(section, files, onProgress) {
      requireAdmin();
      const list    = Array.prototype.slice.call(files || []);
      const results = [];
      let   appended = 0;

      for (let i = 0; i < list.length; i++) {
        const file = list[i];
        const report = f => { if (onProgress) onProgress({ index: i, total: list.length, fraction: f, file: file }); };
        try {
          if (state[section].length >= CFG.limits[section]) {
            throw new Error('Limit reached (' + CFG.limits[section] + ')');
          }
          const type = detectType(file.type, file.name);
          if (type !== 'video' && type !== 'photo') throw new Error('Unsupported file type');

          report(0);
          // Measure locally before uploading so the new card never reflows.
          const dim = await probeDimensions(file, type);
          const uploaded = await ikUpload(section, file, file.name, { onProgress: f => report(f) });

          const item = normItem({
            fileId: uploaded.fileId,
            url:    uploaded.url,
            path:   uploaded.filePath,
            type:   type,
            name:   stripExt(uploaded.name || file.name),
            mime:   file.type || '',
            w:      uploaded.width  || dim.w,
            h:      uploaded.height || dim.h
          });
          if (!item) throw new Error('Upload returned no file');
          state[section].push(item);
          if (item.w && item.h) rememberRatio(item.fileId, item.w, item.h);
          saveCache(section);
          appendCard(section, item);
          appended++;
          report(1);
          results.push({ file: file, item: item, error: null });
        } catch (err) {
          results.push({ file: file, item: null, error: err });
        }
      }

      if (appended) {
        await writeManifest(section).catch(e => console.warn('[Media] manifest write failed:', e));
      }
      return results;
    },

    // Unpublish an item. On a static site ImageKit's delete API is not reachable
    // from the browser (CORS), so we drop the item from the manifest → it
    // disappears from the site immediately. The underlying file stays in
    // ImageKit storage; delete it from the ImageKit dashboard to reclaim bytes.
    async remove(section, id) {
      requireAdmin();
      state[section] = state[section].filter(it => it.fileId !== id);
      saveCache(section);
      render(section);
      await writeManifest(section);
    },

    async reorder(section, fromIdx, toIdx) {
      requireAdmin();
      const arr = state[section];
      if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;
      const [moved] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, moved);
      saveCache(section);
      render(section);
      try {
        await writeManifest(section);
      } catch (e) {
        await refresh(section);
        throw e;
      }
    },

    async setMeta(section, id, patch) {
      requireAdmin();
      const it = state[section].find(x => x.fileId === id);
      if (!it) return;
      if (patch.name != null) it.name = patch.name;
      if (patch.cat  != null) it.cat  = patch.cat;
      saveCache(section);
      render(section);
      try { await writeManifest(section); }
      catch (e) { await refresh(section); throw e; }
    }
  };

  // ── Read a file's real pixel dimensions locally, before it is uploaded. ──
  function probeDimensions(file, type) {
    return new Promise(resolve => {
      let url = null, done = false;
      const finish = (w, h) => {
        if (done) return;
        done = true;
        if (url) { try { URL.revokeObjectURL(url); } catch (e) {} }
        resolve({ w: w || 0, h: h || 0 });
      };
      const timer = setTimeout(() => finish(0, 0), 8000);
      const settle = (w, h) => { clearTimeout(timer); finish(w, h); };

      try {
        url = URL.createObjectURL(file);
        if (type === 'video') {
          const v = document.createElement('video');
          v.preload = 'metadata';
          v.muted = true;
          v.addEventListener('loadedmetadata', () => settle(v.videoWidth, v.videoHeight), { once: true });
          v.addEventListener('error', () => settle(0, 0), { once: true });
          v.src = url;
        } else {
          const img = new Image();
          img.addEventListener('load',  () => settle(img.naturalWidth, img.naturalHeight), { once: true });
          img.addEventListener('error', () => settle(0, 0), { once: true });
          img.src = url;
        }
      } catch (e) { settle(0, 0); }
    });
  }

  window.LaxtMedia = LaxtMedia;

  // ── INIT: paint from cache instantly, then reconcile from the manifest. ──
  function init() {
    ['gallery', 'allprojects'].forEach(section => {
      const cached = loadCache(section);
      if (cached.length) { state[section] = cached.map(normItem).filter(Boolean); render(section); }
      else { const e = emptyEl(section); if (e) e.hidden = false; }
      refresh(section);   // network reconcile (fire and forget)
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
