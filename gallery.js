// Behaviour for the gallery: choosing which kind of work is on the wall,
// opening a picture to fill the screen, and sending a question about a piece.
// Every page works without this file; it only adds convenience.
'use strict';
(function () {
  // ── The wall: all work, paintings only, or digital work only ─────────────
  const filter = document.querySelector('.filter');
  if (filter) {
    const show = (kind) => {
      for (const b of filter.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.kind === kind));
      for (const p of document.querySelectorAll('.piece')) p.hidden = kind !== 'all' && p.dataset.kind !== kind;
    };
    filter.addEventListener('click', (e) => {
      const b = e.target.closest('button[data-kind]');
      if (!b) return;
      show(b.dataset.kind);
      history.replaceState(null, '', b.dataset.kind === 'all' ? location.pathname : '#' + b.dataset.kind);
    });
    const asked = location.hash.slice(1);
    if (asked === 'painting' || asked === 'digital') show(asked);
  }

  // ── The sheet: a picture on its own, a text, or the thumbnails ───────────
  // It opens over the gallery and closes back to it, so wherever you were (your
  // place in the 3D halls, or how far down the wall you had scrolled) is exactly
  // where you return to. Used by the 3D gallery and by the wall of pictures alike.
  const DATA = window.GALLERY, sheet = document.getElementById('sheet');
  if (DATA && sheet) {
    const body = document.getElementById('sheet-body'), backButton = document.getElementById('sheet-back');
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const byId = (id) => DATA.works.find((w) => w.id === id);
    let cameFrom = null;
    const Sheet = window.GallerySheet = {
      closed: () => sheet.hidden,
      onTake: null,            // set by the 3D gallery: take the visitor to a work
      onEntrance: null,        // set by the 3D gallery: take the visitor back to the entrance
      open(html, kind) {
        if (sheet.hidden) cameFrom = document.activeElement;
        body.className = 'sheet-body ' + kind;
        body.innerHTML = html;
        sheet.hidden = false;
        document.documentElement.classList.add('sheet-open');
        backButton.focus();
      },
      close() {
        sheet.hidden = true; body.innerHTML = '';
        document.documentElement.classList.remove('sheet-open');
        if (cameFrom && cameFrom.focus) cameFrom.focus({ preventScroll: true });
      },
      // (The contact links under a picture are made by contactLinks, below.)
      // One work: the picture, what it is, the link to where it is sold if selling is on, and a way to get in touch.
      openWork(id) {
        const w = byId(id);
        if (!w) return;
        const facts = [w.medium, w.size, w.year].filter(Boolean).map(esc).join(' &middot; ');
        const source = w.basedOn ? byId(w.basedOn) : null, made = DATA.works.filter((p) => p.basedOn === w.id);
        Sheet.open(`<figure><img src="${esc(w.large)}" alt="${esc(w.title)}, ${esc(w.kindLabel.toLowerCase())} by ${esc(DATA.site.name)}"></figure>
          <div class="facts"><p class="kind">${esc(w.kindLabel)}</p><h2>${esc(w.title)}</h2>
          ${facts ? `<p>${facts}</p>` : ''}${w.status ? `<p class="status">${esc(w.status)}</p>` : ''}${w.about ? `<p>${esc(w.about)}</p>` : ''}
          ${source ? `<p>Based on the digital image <button type="button" class="linkish" data-work="${esc(source.id)}">${esc(source.title)}</button>.</p>` : ''}
          ${made.length ? `<p>The painting made from this image: ${made.map((p) => `<button type="button" class="linkish" data-work="${esc(p.id)}">${esc(p.title)}</button>`).join(', ')}.</p>` : ''}
          ${w.buy ? `<p><a class="button" href="${esc(w.buy)}" target="_blank" rel="noopener">${esc(w.buyLabel)}</a></p><p class="small">Opens in a new tab. This page stays where you are.</p>` : ''}
          ${contactLinks(w.id)}</div>`, 'one');
      },
      // Thumbnails of everything. Clicking one takes you to it in the halls, or opens it where there are no halls.
      openIndex() {
        const group = (name, kind) => {
          const list = DATA.works.filter((w) => w.kind === kind);
          return list.length ? `<h3>${name}</h3><div class="thumbs">${list.map((w) => `<button type="button" data-take="${esc(w.id)}"><img src="${esc(w.small)}" loading="lazy" width="${w.w}" height="${w.h}" alt=""><span>${esc(w.title)}</span></button>`).join('')}</div>` : '';
        };
        Sheet.open(`<h2>All works</h2><p>${Sheet.onTake ? 'Click a picture to be taken to where it hangs.' : 'Click a picture to see it on its own.'}</p>${group('Paintings', 'painting')}${DATA.works.some((w) => w.kind === 'digital') ? group('Digital images', 'digital') : ''}`, 'index');
      },
      openText(html) { Sheet.open(html, 'text'); },
    };
    sheet.addEventListener('click', (e) => {
      const take = e.target.closest('[data-take]'), work = e.target.closest('[data-work]'), go = e.target.closest('[data-go]'), open = e.target.closest('[data-open]');
      if (take) { if (Sheet.onTake) { Sheet.close(); Sheet.onTake(take.dataset.take); } else Sheet.openWork(take.dataset.take); }
      else if (work) Sheet.openWork(work.dataset.work);
      else if (go) { Sheet.close(); if (Sheet.onEntrance) Sheet.onEntrance(); else window.scrollTo({ top: 0 }); }
      else if (open) Sheet.openIndex();
      else if (e.target === sheet) Sheet.close();
    });
    backButton.addEventListener('click', Sheet.close);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheet.hidden) Sheet.close(); });
    const indexButton = document.getElementById('btn-index');
    if (indexButton) indexButton.addEventListener('click', Sheet.openIndex);
    // On the wall of pictures, a click opens the picture on its own instead of leaving the page.
    document.addEventListener('click', (e) => {
      const piece = e.target.closest('a.piece[data-work]');
      if (!piece || e.ctrlKey || e.metaKey || e.shiftKey) return;
      e.preventDefault();
      Sheet.openWork(piece.dataset.work);
    });
  }

  // ── The wall: any page, remembered on this device ───────────────────────
  const root = document.documentElement;
  const markWall = () => { for (const b of document.querySelectorAll('[data-wall].sw')) b.setAttribute('aria-pressed', String(b.dataset.wall === root.getAttribute('data-wall'))); };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-wall]');
    if (!b) return;
    root.setAttribute('data-wall', b.dataset.wall);
    try { localStorage.setItem('gallery-wall', b.dataset.wall); } catch (_) { /* it still changes for this page */ }
    markWall();
  });
  markWall();

  // ── One work: try a frame and a mount on it ─────────────────────────────
  const tryBox = document.getElementById('try');
  if (tryBox) {
    const fr = document.querySelector('.work .fr'), mount = document.getElementById('mount');
    const apply = (frame) => {
      fr.className = `fr fr-${frame}${mount.checked ? ' has-mount' : ''}`;
      tryBox.dataset.frame = frame;
      for (const b of tryBox.querySelectorAll('button[data-frame]')) b.setAttribute('aria-pressed', String(b.dataset.frame === frame));
    };
    tryBox.addEventListener('click', (e) => { const b = e.target.closest('button[data-frame]'); if (b) apply(b.dataset.frame); });
    mount.addEventListener('change', () => apply(tryBox.dataset.frame));
    apply(tryBox.dataset.frame);
  }

  // ── One work: click the picture to see it fill the screen ────────────────
  const open = document.getElementById('open');
  if (open) {
    open.addEventListener('click', (e) => {
      e.preventDefault();
      const full = document.createElement('div');
      full.className = 'full';
      full.setAttribute('role', 'dialog'); full.setAttribute('aria-label', 'The picture, full screen');
      const img = document.createElement('img');
      img.src = open.getAttribute('href'); img.alt = open.querySelector('img').alt;
      const close = document.createElement('button');
      close.type = 'button'; close.textContent = 'Close';
      full.append(img, close);
      const shut = () => { full.remove(); document.removeEventListener('keydown', onKey); open.focus(); };
      const onKey = (k) => { if (k.key === 'Escape') shut(); };
      full.addEventListener('click', shut);
      document.addEventListener('keydown', onKey);
      document.body.append(full);
      close.focus();
    });
  }

  // Under a clicked picture: the way to the contact form on that picture's own page, and the artist's LinkedIn.
  function contactLinks(id) {
    const c = (DATA.site && DATA.site.contact) || {};
    const form = `<a class="button quiet" href="work/${encodeURIComponent(id)}.html#ask">Inquire about this image</a>`;
    const linked = c.linkedin ? `<a class="button quiet" href="${String(c.linkedin).replace(/"/g, '&quot;')}" target="_blank" rel="noopener">LinkedIn</a>` : '';
    return `<p class="reach">${form} ${linked}</p>`;
  }

  // ── Ask about this piece ─────────────────────────────────────────────────
  // The message is sent to the site's own server, which emails it to the
  // artist. Opened straight from a folder there is no server, and it says so.
  const ask = document.getElementById('ask');
  if (ask) {
    const note = document.getElementById('ask-note');
    const say = (text, kind) => { note.textContent = text; note.className = 'note ' + kind; };
    ask.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(ask));
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email || '')) { say('Please give an email address so Ken can reply.', 'bad'); ask.email.focus(); return; }
      if (!(data.message || '').trim()) { say('Please write a message.', 'bad'); ask.message.focus(); return; }
      if (location.protocol === 'file:') { say('This copy is on your own computer, so nothing was sent. The form works once the gallery is online.', 'bad'); return; }
      const button = ask.querySelector('button');
      button.disabled = true; say('Sending...', '');
      try {
        const r = await fetch('/api/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) });
        const out = await r.json().catch(() => ({}));
        if (r.ok && out.ok) { say('Sent. Ken will reply by email.', 'ok'); ask.message.value = ''; }
        // A copy of the gallery shown from a computer, before it is published, has no mail server behind it.
        else if (r.status === 404) say('This copy of the gallery is not online yet, so nothing was sent. The form works once it is published.', 'bad');
        else say(out.error || 'It could not be sent just now. Please try again later.', 'bad');
      } catch (_) { say('It could not be sent just now. Please try again later.', 'bad'); }
      button.disabled = false;
    });
  }
})();
