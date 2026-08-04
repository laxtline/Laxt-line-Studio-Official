/* =====================================================================
   LAXTLINE — js/06-admin.js
   ---------------------------------------------------------------------
   HIDDEN ADMIN + UPLOAD PANEL   (static site — GitHub Pages, no backend)

     • A small inconspicuous icon (top-right) opens a login modal.
     • This is a STATIC site, so there is no server to check a password.
       "Logging in" is a simple username + password gate that just flips a
       session flag; the ImageKit key used to sign uploads is embedded in the
       site (see 05-media-engine.js) so the owner never has to paste anything.
     • The Upload Panel DOM is BUILT ONLY AFTER login — it never exists in the
       page for logged-out visitors.
     • Two independent zones: Project Gallery (max 15) and All Projects
       (max 100), each with live count, upload, delete and reorder.
     • All media operations go through window.LaxtMedia (05-media-engine),
       which signs uploads locally with the embedded key.

   SECURITY: because there is no backend, the username/password only gate the
   admin UI — they are not a cryptographic secret. The embedded ImageKit key is
   what actually authorises uploads; keep it an upload-only Restricted key and
   rotate it if ever misused. "Delete" unpublishes an item from the manifest
   (it vanishes from the site); the file itself can be removed from the
   ImageKit dashboard if needed.
   ===================================================================== */
(function () {
  'use strict';

  const SESSION_KEY = 'laxtline_admin_session';

  // ── "Login" = a simple username + password gate ─────────────────────
  // There is no server to verify against, so this only unlocks the admin UI.
  // Credentials are compared as base64("user:pass") to keep them out of a plain
  // grep of the source. The actual upload authority is the embedded ImageKit
  // key in 05-media-engine.js — not these credentials.
  const CREDS_B64 = 'c3VyeWE6OTkzOA==';   // base64("user:pass")
  const credsMatch = (user, pass) => {
    try { return btoa(user + ':' + pass) === CREDS_B64; } catch (e) { return false; }
  };
  function login() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }
  const SECTIONS = [
    { key: 'gallery',     label: 'Project Gallery' },
    { key: 'allprojects', label: 'All Projects' }
  ];

  const isLoggedIn = () => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; }
    catch (e) { return false; }
  };

  // Escape media names before they go into the admin row's innerHTML (attribute
  // + text). Filenames come from ImageKit and could contain " or < > payloads.
  const esc = s => String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

  // ── Inconspicuous trigger icon (top-right) ──
  function buildTrigger() {
    const btn = document.createElement('button');
    btn.id = 'adminTrigger';
    btn.className = 'admin-trigger';
    btn.setAttribute('aria-label', 'Admin');
    btn.title = '';
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' +
        '<circle cx="12" cy="12" r="3"/>' +
        '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' +
      '</svg>';
    btn.addEventListener('click', () => { isLoggedIn() ? openPanel() : openLogin(); });
    document.body.appendChild(btn);
  }
  // ── Login modal (built on demand, removed on close) ──
  function openLogin() {
    if (document.getElementById('adminLogin')) return;
    const modal = document.createElement('div');
    modal.id = 'adminLogin';
    modal.className = 'admin-modal';
    modal.innerHTML =
      '<div class="admin-modal-card" role="dialog" aria-modal="true" aria-label="Admin login">' +
        '<button class="admin-modal-close" aria-label="Close">&times;</button>' +
        '<h3 class="admin-modal-title">Admin</h3>' +
        '<form id="adminLoginForm" autocomplete="off">' +
          '<input class="admin-input" id="adminUser" type="text" placeholder="Username" autocomplete="off" spellcheck="false" autocapitalize="off">' +
          '<input class="admin-input" id="adminPass" type="password" placeholder="Password" autocomplete="off" spellcheck="false">' +
          '<div class="admin-error" id="adminError" hidden></div>' +
          '<button class="admin-btn admin-btn-primary" type="submit">Unlock</button>' +
        '</form>' +
      '</div>';
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add('is-in'));

    const close = () => { modal.classList.remove('is-in'); setTimeout(() => modal.remove(), 200); };
    modal.querySelector('.admin-modal-close').addEventListener('click', close);
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', function esc(e) {
      if (e.key === 'Escape' && document.getElementById('adminLogin')) { close(); document.removeEventListener('keydown', esc); }
    });

    const form = modal.querySelector('#adminLoginForm');
    const err  = modal.querySelector('#adminError');
    form.addEventListener('submit', e => {
      e.preventDefault();
      const user = modal.querySelector('#adminUser').value.trim();
      const pass = modal.querySelector('#adminPass').value;
      err.hidden = true;
      if (!credsMatch(user, pass)) {
        err.textContent = 'Wrong username or password.';
        err.hidden = false;
        modal.querySelector('#adminPass').value = '';
        return;
      }
      login();
      modal.querySelector('#adminPass').value = '';
      close();
      openPanel();
    });
    setTimeout(() => modal.querySelector('#adminUser').focus(), 60);
  }

  // ── Upload panel — built ONLY when logged in (never in DOM otherwise) ──
  function openPanel() {
    if (!isLoggedIn()) { openLogin(); return; }
    if (document.getElementById('adminPanel')) return;

    const panel = document.createElement('div');
    panel.id = 'adminPanel';
    panel.className = 'admin-panel';

    let zonesHtml = '';
    SECTIONS.forEach(s => {
      zonesHtml +=
        '<section class="ap-zone" data-section="' + s.key + '">' +
          '<div class="ap-zone-head">' +
            '<h4 class="ap-zone-title">' + s.label + '</h4>' +
            '<span class="ap-count" id="apCount-' + s.key + '">0 / ' + window.LaxtMedia.limit(s.key) + '</span>' +
          '</div>' +
          '<label class="ap-drop" id="apDrop-' + s.key + '">' +
            '<input type="file" class="ap-file" id="apFile-' + s.key + '" accept="image/*,video/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.mp4,.webm,.mov,.m4v,.mkv,.avi" multiple hidden>' +
            '<span class="ap-drop-text">Drop files or <b>click to upload</b><br><small>JPG · PNG · WEBP · MP4</small></span>' +
          '</label>' +
          '<div class="ap-progress" id="apProgress-' + s.key + '" hidden><div class="ap-progress-bar"></div><span class="ap-progress-label"></span></div>' +
          '<div class="ap-list" id="apList-' + s.key + '"></div>' +
        '</section>';
    });

    panel.innerHTML =
      '<div class="ap-inner" role="dialog" aria-modal="true" aria-label="Upload panel">' +
        '<div class="ap-header">' +
          '<span class="ap-title">Media Manager</span>' +
          '<div class="ap-header-btns">' +
            '<button class="admin-btn ap-logout" id="apLogout">Log out</button>' +
            '<button class="ap-close" id="apClose" aria-label="Close">&times;</button>' +
          '</div>' +
        '</div>' +
        '<div class="ap-body">' + zonesHtml + '</div>' +
      '</div>';
    document.body.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add('is-in'));

    document.getElementById('apClose').addEventListener('click', closePanel);
    document.getElementById('apLogout').addEventListener('click', () => {
      try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
      closePanel();
    });
    panel.addEventListener('click', e => { if (e.target === panel) closePanel(); });

    SECTIONS.forEach(s => wireZone(s.key));
    SECTIONS.forEach(s => { renderList(s.key); updateCount(s.key); });
  }

  function closePanel() {
    const p = document.getElementById('adminPanel');
    if (!p) return;
    p.classList.remove('is-in');
    setTimeout(() => p.remove(), 200);
  }

  const LaxtMediaLimit = key => (window.LaxtMedia ? window.LaxtMedia.limit(key) : 0);

  // All web + master formats a video editor's portfolio needs: WebP/JPG/PNG/GIF/
  // AVIF images, and H.264/H.265/AV1/ProRes/RAW video carried in mp4/webm/mov/mkv.
  const ACCEPT_EXT = ['jpg','jpeg','png','webp','gif','avif','bmp','svg',
                      'mp4','webm','mov','m4v','ogv','mkv','avi','hevc','av1'];
  const isAccepted = file => {
    const ext = (file.name || '').split('.').pop().toLowerCase();
    return ACCEPT_EXT.indexOf(ext) !== -1 ||
           (file.type && (file.type.indexOf('image/') === 0 || file.type.indexOf('video/') === 0));
  };

  // ── Wire one zone: file picker, drag-and-drop, overflow guard, upload ──
  function wireZone(key) {
    const drop  = document.getElementById('apDrop-' + key);
    const input = document.getElementById('apFile-' + key);
    if (!drop || !input) return;

    input.addEventListener('change', () => { handleFiles(key, input.files); input.value = ''; });

    ['dragenter', 'dragover'].forEach(ev =>
      drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('is-drag'); }));
    ['dragleave', 'drop'].forEach(ev =>
      drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('is-drag'); }));
    drop.addEventListener('drop', e => {
      if (e.dataTransfer && e.dataTransfer.files) handleFiles(key, e.dataTransfer.files);
    });
  }

  // ── Upload a batch sequentially (keeps UI responsive, real progress) ──
  async function handleFiles(key, fileList) {
    const files = Array.prototype.slice.call(fileList || []);
    if (!files.length) return;

    const limit   = LaxtMediaLimit(key);
    let   current = window.LaxtMedia.count(key);
    const bar     = document.getElementById('apProgress-' + key);
    const barFill = bar.querySelector('.ap-progress-bar');
    const barLbl  = bar.querySelector('.ap-progress-label');

    let queued = [];
    for (const f of files) {
      if (!isAccepted(f)) { toast('Skipped "' + f.name + '" — only JPG/PNG/WEBP/MP4 allowed'); continue; }
      if (current + queued.length >= limit) { toast('Limit reached: ' + limit + ' files max for this section.'); break; }
      queued.push(f);
    }
    if (!queued.length) return;

    bar.hidden = false;
    // addMany appends one card per finished file instead of rebuilding the whole
    // grid per file, and writes the manifest once for the batch rather than once
    // per file. Uploading N files used to cost N grid teardowns + N manifest
    // round-trips, which is what made the gallery crawl after an upload.
    const results = await window.LaxtMedia.addMany(key, queued, p => {
      barLbl.textContent  = 'Uploading ' + (p.index + 1) + ' / ' + p.total + ' — ' + p.file.name;
      barFill.style.width = Math.round(p.fraction * 100) + '%';
      if (p.fraction === 1) { renderList(key); updateCount(key); }
    });

    results.forEach(r => {
      if (r.error) toast('Upload failed: ' + (r.error.message || 'error'));
    });
    renderList(key);
    updateCount(key);

    barLbl.textContent = 'Done';
    setTimeout(() => { bar.hidden = true; barFill.style.width = '0%'; }, 700);
  }

  // ── Live count badge (e.g. 9 / 15) ──
  function updateCount(key) {
    const el = document.getElementById('apCount-' + key);
    if (!el || !window.LaxtMedia) return;
    const n = window.LaxtMedia.count(key), lim = LaxtMediaLimit(key);
    el.textContent = n + ' / ' + lim;
    el.classList.toggle('is-full', n >= lim);
  }

  // ── Admin item list with delete + reorder (up/down) ──
  function renderList(key) {
    const list = document.getElementById('apList-' + key);
    if (!list || !window.LaxtMedia) return;
    const items = window.LaxtMedia.get(key);
    list.innerHTML = '';
    if (!items.length) { list.innerHTML = '<div class="ap-empty">No files yet.</div>'; return; }

    items.forEach((it, idx) => {
      const row = document.createElement('div');
      row.className = 'ap-row';
      row.draggable = true;
      row.dataset.idx = idx;
      const thumb = it.type === 'video'
        ? '<img class="ap-thumb" loading="lazy" src="' + esc(it.url + '/ik-thumbnail.jpg?tr=w-120') + '" alt="">'
        : '<img class="ap-thumb" loading="lazy" src="' + esc(it.url + '?tr=w-120') + '" alt="">';
      row.innerHTML =
        thumb +
        '<span class="ap-row-name" title="' + esc(it.name || '') + '">' + esc(it.name || '(untitled)') + '</span>' +
        '<span class="ap-row-type">' + esc(it.type) + '</span>' +
        '<span class="ap-row-actions">' +
          '<button class="ap-icon ap-up"   title="Move up"   ' + (idx === 0 ? 'disabled' : '') + '>&#9650;</button>' +
          '<button class="ap-icon ap-down" title="Move down" ' + (idx === items.length - 1 ? 'disabled' : '') + '>&#9660;</button>' +
          '<button class="ap-icon ap-del"  title="Delete">&times;</button>' +
        '</span>';

      row.querySelector('.ap-up').addEventListener('click', async () => {
        await window.LaxtMedia.reorder(key, idx, idx - 1); renderList(key);
      });
      row.querySelector('.ap-down').addEventListener('click', async () => {
        await window.LaxtMedia.reorder(key, idx, idx + 1); renderList(key);
      });
      row.querySelector('.ap-del').addEventListener('click', async () => {
        if (!confirm('Remove "' + (it.name || 'this file') + '" from the site? It disappears from the gallery immediately. (The original stays in ImageKit — delete it from the ImageKit dashboard if you want the file gone for good.)')) return;
        row.classList.add('is-busy');
        try { await window.LaxtMedia.remove(key, it.fileId); } catch (e) { toast('Delete failed'); }
        renderList(key); updateCount(key);
      });

      // Drag-and-drop reorder
      row.addEventListener('dragstart', e => { e.dataTransfer.setData('text/plain', idx); row.classList.add('is-dragging'); });
      row.addEventListener('dragend',   () => row.classList.remove('is-dragging'));
      row.addEventListener('dragover',  e => { e.preventDefault(); row.classList.add('is-over'); });
      row.addEventListener('dragleave', () => row.classList.remove('is-over'));
      row.addEventListener('drop', async e => {
        e.preventDefault();
        row.classList.remove('is-over');
        const from = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const to   = idx;
        if (!isNaN(from) && from !== to) { await window.LaxtMedia.reorder(key, from, to); renderList(key); }
      });

      list.appendChild(row);
    });
  }

  // ── Tiny toast for warnings ──
  function toast(msg) {
    let t = document.getElementById('adminToast');
    if (!t) { t = document.createElement('div'); t.id = 'adminToast'; t.className = 'admin-toast'; document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.add('is-in');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('is-in'), 3200);
  }

  // ── Keep the panel's list + count in sync when the engine re-renders ──
  document.addEventListener('laxt:media-rendered', e => {
    const key = e.detail && e.detail.section;
    if (!key || !document.getElementById('adminPanel')) return;
    updateCount(key);
  });

  // ── Boot ──
  function boot() { buildTrigger(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
