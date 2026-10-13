#!/usr/bin/env node
// Builds the gallery into C:\projects\art-gallery\site from works.js.
//
//   node build.js
//
// It makes web-sized copies of each picture (make-images.py), then writes the
// gallery wall (index.html), a page for every work, and the About page. The
// pages are plain files: they open straight from the folder, and nothing on
// them calls another company's servers.
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { WORKS, SITE, FILMS = [], CINEMA = {} } = require('./works');

const OUT = path.join(__dirname, 'site');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KIND = { painting: 'Painting', digital: 'AI-generated image' };
const STATUS = { available: 'Available', sold: 'Sold', nfs: 'Not for sale' };

// With selling switched off in works.js, the gallery is built as if no work had a buy link or a sale
// status and no shop were set, so nothing to do with sales reaches any page.
const SELLING = SITE.selling === true;
// With digital images switched off in works.js, they are left out before anything is built: no picture, no page, no mention.
const DIGITAL = SITE.showDigital !== false;
const onShow = WORKS.filter((w) => w.show !== false && (DIGITAL || w.kind !== 'digital')).map((w) => (SELLING ? w : { ...w, buy: '', buyLabel: '', status: '', linkFound: false }));
// If works.js names a selection, only those works are shown, in that order.
const works = !SITE.selection ? onShow : SITE.selection.map((id) => { const w = onShow.find((x) => x.id === id); if (!w) throw new Error(`works.js: the selection names "${id}", which is not a work on show`); return w; });
if (SITE.selection && new Set(SITE.selection).size !== SITE.selection.length) throw new Error('works.js: the selection names a work twice');
// The shop the pieces are sold through, if one has been set in works.js.
const shop = SELLING && SITE.shop && SITE.shop.url ? SITE.shop : null;
if (shop && !/^https:\/\/[^\s"<>]+$/.test(shop.url)) throw new Error('the shop link must be a full address starting with https://');
for (const w of works) {
  if (!/^[a-z0-9-]+$/.test(w.id)) throw new Error(`"${w.id}" is not a usable id: use small letters, numbers and dashes`);
  if (!KIND[w.kind]) throw new Error(`${w.id}: kind must be "painting" or "digital"`);
  if (!fs.existsSync(w.file)) throw new Error(`${w.id}: no image at ${w.file}`);
  if (w.buy && !/^https:\/\/[^\s"<>]+$/.test(w.buy)) throw new Error(`${w.id}: the buy link must be a full address starting with https://`);
  if (w.mark && !['left', 'right', 'none'].includes(w.mark)) throw new Error(`${w.id}: mark (the corner the watermark goes in) must be 'left', 'right' or 'none'`);
  if (works.filter((x) => x.id === w.id).length > 1) throw new Error(`two works share the id "${w.id}"`);
}

// ── Pictures ───────────────────────────────────────────────────────────────
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'work'), { recursive: true });
const sizes = execFileSync('python', [path.join(__dirname, 'make-images.py')], { input: works.map((w) => `${w.id}|${w.file}|${w.kind === 'digital' ? 'none' : (w.mark || 'left')}|${w.sign === false || w.kind === 'digital' ? 'no' : 'yes'}`).join('\n'), encoding: 'utf8' });
for (const line of sizes.trim().split(/\r?\n/)) {
  const [id, width, height, fullW, fullH, marks, colour, ink, repaired] = line.split('|');
  Object.assign(works.find((w) => w.id === id), { ink, repaired, width: +width, height: +height, sourceLongest: Math.max(+fullW, +fullH), marks, colour: colour.split(',').map(Number) });
}

// ── No duplicates ──────────────────────────────────────────────────────────
// Each picture has a fingerprint of 256 light-or-dark marks (make-images.py). Two
// photographs of the same painting differ in only a few of them, even when one is
// larger or brighter. If two works on the wall are that close, the build stops and
// names them, so the same painting cannot be hung twice by mistake. To keep both on
// purpose, give one of them  allowTwin: true  in works.js.
const SAME_PICTURE = 26;      // of 256 marks. Different paintings differ by about 100 or more.
const apart = (a, b) => { let n = 0; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++; return n; };
const twins = [];
for (let i = 0; i < works.length; i++) for (let j = i + 1; j < works.length; j++) {
  const d = apart(works[i].marks, works[j].marks);
  if (d <= SAME_PICTURE && !works[i].allowTwin && !works[j].allowTwin) twins.push(`"${works[i].title}" and "${works[j].title}" (${d} of 256 marks apart)`);
}
if (twins.length) throw new Error(`the same picture appears twice on the wall:\n  ${twins.join('\n  ')}\nTake one down (show: false) in works.js.`);

// ── Pages ──────────────────────────────────────────────────────────────────
const page = ({ title, description, body, depth = 0, image = '', walk = false }) => {
  const up = depth ? '../' : '';
  return `<!doctype html>
<html lang="en" data-wall="${SITE.wall || 'plaster'}">
<meta charset="utf-8">
<title>${esc(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="${esc(description)}">
${image ? `<meta property="og:image" content="${esc(image)}">\n` : ''}<link rel="icon" type="image/png" href="${up}brand/icon.png">
<link rel="stylesheet" href="${up}style.css">
<script>try { var w = localStorage.getItem('gallery-wall'); if (w && ${JSON.stringify(WALLS)}.indexOf(w) >= 0) document.documentElement.setAttribute('data-wall', w); } catch (e) {}</script>

<header class="top">
  <a class="name" href="${up}index.html"><img class="emblem" src="${up}brand/k.png" alt="" width="40" height="40">${esc(SITE.name)}<span>${esc(SITE.tagline)}</span></a>
  <nav aria-label="Site"><a href="${up}index.html">All work</a><a class="enter" href="${up}walk.html">Enter the gallery</a>${FILMS.length ? `<a href="${up}cinema.html">Cinema</a>` : ''}<a href="${up}about.html">About</a><a href="${up}built.html">How it was built</a><a href="${up}about.html#contact">Contact</a>${shop ? `<a href="${esc(shop.url)}" target="_blank" rel="noopener">Shop</a>` : ''}</nav>
  <div class="wallpick"><span>Wall</span>${swatches(WALLS, 'wall', 'Choose the wall')}</div>
</header>

${body}
${walk ? '' : `
<footer class="foot">
  <p><a href="${up}built.html">How this gallery was built</a></p>
  <p>${esc(SITE.rights || `\u00a9 ${SITE.name}. All rights reserved.`)} <a href="${up}about.html#use">Using the images</a></p>
  ${SITE.madeShort ? `<p class="made-note">${esc(SITE.madeShort)} <a href="${up}about.html#made">How the work was made</a></p>` : ''}
</footer>`}
</html>
`;
};
// A picture in its frame. The frame is three nested boxes drawn by the page:
// the moulding, an inner lip, and (when asked for) a card mount. Because they
// are borders and not a stretched image, they keep their width on every side
// whatever the size or shape of the picture.
// 'auto' is the frame the gallery picks to suit whichever wall is showing. Every picture is framed: there is no bare option.
const FRAMES = ['gold', 'wood', 'oak', 'black', 'white'];
// The plain walls are the colours galleries use: a neutral mid grey (the usual choice, as it does not
// tint how a picture's colours are read), white and off-white, a warm greige, and two muted darks.
// There are no strong colours, because a saturated wall reflects onto the pictures. The photographed
// walls come after them.
const WALLS = ['grey', 'white', 'plaster', 'greige', 'charcoal', 'navy', 'stucco', 'stone', 'brick', 'tile', 'mosaic'];
// The frame that suits a picture, when works.js does not name one. It is chosen from the picture's
// own overall colour, the way a framer would:
//   a digital image              black, with a white card mount: the modern way to hang a print
//   a dark painting              gold, which lifts a dark picture off the wall
//   a warm, earthy painting      dark wood, which sits with browns, ochres and reds
//   a cool or green painting     gold, the classic frame for skies, water and landscape
//   a light, bright painting     oak, which does not weigh it down
function suitedFrame(w) {
  if (w.kind === 'digital') return 'black';
  const [r, g, b] = w.colour, light = (r + g + b) / 3, warm = r - b;
  if (light < 95) return 'gold';
  if (warm > 38) return 'wood';
  if (light > 150) return 'oak';
  return 'gold';
}
const frameOf = (w) => w.frame || suitedFrame(w);
const mountOf = (w) => (w.mount === undefined ? w.kind === 'digital' : Boolean(w.mount));
for (const w of works) if (!FRAMES.includes(frameOf(w))) throw new Error(`${w.id}: frame must be one of ${FRAMES.join(', ')}`);
if (!WALLS.includes(SITE.wall || 'plaster')) throw new Error(`the wall must be one of ${WALLS.join(', ')}`);
const framed = (w, src, lazy) => `<span class="fr fr-${frameOf(w)}${mountOf(w) ? ' has-mount' : ''}"><span class="lamp" aria-hidden="true"></span><span class="lip"><span class="mount"><img src="${src}" width="${w.width}" height="${w.height}" alt="${esc(w.title)}, ${KIND[w.kind].toLowerCase()} by ${esc(SITE.name)}"${lazy ? ' loading="lazy"' : ''}></span></span></span>`;
const swatches = (list, attr, label) => `<span class="swatches" role="group" aria-label="${label}">${list.map((n) => `<button type="button" class="sw sw-${n}" data-${attr}="${n}" aria-pressed="false" title="${n.charAt(0).toUpperCase() + n.slice(1)}"><span class="sr">${n}</span></button>`).join('')}</span>`;

// A painting and the digital image it was based on point to each other, once works.js says they belong together.
for (const w of works) {
  if (!w.basedOn) continue;
  const image = works.find((x) => x.id === w.basedOn);
  if (!image) throw new Error(`${w.id}: basedOn names "${w.basedOn}", which is not a work on the wall`);
  if (w.kind !== 'painting' || image.kind !== 'digital') throw new Error(`${w.id}: basedOn links a painting to the digital image it was based on`);
}
const related = (w) => {
  const image = w.basedOn && works.find((x) => x.id === w.basedOn);
  const paintings = works.filter((x) => x.basedOn === w.id);
  if (image) return `<p class="pair">Based on the digital image <a href="${image.id}.html">${esc(image.title)}</a>.</p>`;
  if (paintings.length) return `<p class="pair">The painting made from this image: ${paintings.map((p) => `<a href="${p.id}.html">${esc(p.title)}</a>`).join(', ')}.</p>`;
  return '';
};

const details = (w) => [w.medium, w.size, w.year].filter(Boolean).map(esc).join(' &middot; ');
// How to get in touch: a form that sends its message through the server, and a LinkedIn link. Given a
// picture's title, the message says which picture it is about. No email address is written into any page.
const contact = SITE.contact || {};
if (contact.email) throw new Error('works.js: take the email address out of SITE.contact. It belongs in wrangler.jsonc, so that it is in no page.');
if (contact.linkedin && !/^https:\/\/[^\s"<>]+$/.test(contact.linkedin)) throw new Error('the LinkedIn link must be a full address starting with https://');
const contactBlock = (title) => `<form class="ask" id="ask" novalidate>
      <h2>${title ? 'Inquire about this image' : 'Contact'}</h2>
      <p class="who">Your message goes to ${esc(contact.name || SITE.name)} by email, and the reply comes to the address you give.</p>
      <input type="hidden" name="work" value="${esc(title)}">
      <label>Your name<input type="text" name="name" autocomplete="name" maxlength="80"></label>
      <label>Your email<input type="email" name="email" autocomplete="email" maxlength="120" required></label>
      <label>Your message<textarea name="message" rows="4" maxlength="2000" required>${title ? `I am inquiring about "${esc(title)}".` : ''}</textarea></label>
      <label class="trap" aria-hidden="true">Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
      <button type="submit">Send</button>
      <p class="note" id="ask-note" aria-live="polite"></p>
      ${contact.linkedin ? `<p class="also">Or find ${esc(contact.name || SITE.name)} on <a href="${esc(contact.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>.</p>` : ''}
    </form>`;
const badge = (w) => (STATUS[w.status] ? `<span class="status ${w.status}">${STATUS[w.status]}</span>` : '');

const counts = { painting: works.filter((w) => w.kind === 'painting').length, digital: works.filter((w) => w.kind === 'digital').length };
// The AI-generated images hang in a room of their own, the last one. That only works out if the paintings fill
// their rooms exactly: four to a room, not counting the centrepiece, which has a wall to itself.
if (counts.digital) {
  const onWalls = counts.painting - (works.some((w) => w.id === SITE.featured && w.kind === 'painting') ? 1 : 0);
  if (onWalls % 4 !== 0) throw new Error(`works.js: with AI-generated images on show, the paintings must fill whole rooms of four. There are ${onWalls} on the walls: add ${4 - onWalls % 4} or take down ${onWalls % 4}.`);
  if (counts.digital < 4 || counts.digital > 7) throw new Error('works.js: the AI room holds between 4 and 7 pictures');
}

// ── The front page ─────────────────────────────────────────────────────────
// One page, shown two ways. As written it is a wall of framed, lit pictures:
// that is what a phone shows, what a search engine reads, and what anyone sees
// if 3D is not available. On a wider screen hall3d.js (three.js) takes over and
// turns the same list of works into rooms to walk through.
//
// Either way, clicking a picture opens it on its own with its details and its
// link, over the gallery, and closing it returns you to where you were.
const gallery = {
  // The cinema's entrance stands on the end wall of the last room. This is what its sign says and where it leads.
  cinema: FILMS.length ? { title: (CINEMA.sign || {}).title || 'Cinema', by: CINEMA.sign ? `${CINEMA.sign.by} ${CINEMA.sign.name}` : '', poster: `cinema/${FILMS[0].id}.jpg`, posters: FILMS.map((f) => `cinema/${f.id}.jpg`), href: 'cinema.html' } : null,
  site: { name: SITE.name, tagline: SITE.tagline, about: SITE.about, featured: SITE.featured || '', rights: SITE.rights || '', use: SITE.use || [], made: SITE.made || [], contact: { name: contact.name || SITE.name, linkedin: contact.linkedin || '' }, shop: shop && shop.url ? { name: shop.name, url: shop.url } : null },
  works: works.map((w) => ({
    id: w.id, title: w.title, kind: w.kind, kindLabel: KIND[w.kind], w: w.width, h: w.height, mount: mountOf(w), frame: frameOf(w),
    small: `img/${w.id}-small.jpg`, large: `img/${w.id}.jpg`,
    medium: w.medium || '', size: w.size || '', year: w.year || '', status: STATUS[w.status] || '', about: w.about || '',
    buy: w.buy || '', buyLabel: w.buy ? (w.buyLabel || (shop ? `Buy a print on ${shop.name}` : 'Buy this piece')) : '', basedOn: w.basedOn || '',
  })),
};
// The centrepiece, if works.js names one.
const star = works.find((w) => w.id === SITE.featured) || null;
if (SITE.featured && !star) throw new Error(`works.js names "${SITE.featured}" as the featured work, but no work on show has that id`);
const wallOf = (list) => list.map((w) => `    <a class="piece" href="work/${w.id}.html" data-kind="${w.kind}" data-work="${w.id}">
      ${framed(w, `img/${w.id}-small.jpg`, true)}
      <span class="label"><b>${esc(w.title)}</b><i>${KIND[w.kind]}${details(w) ? ' &middot; ' + details(w) : ''}${w.buy ? ' &middot; for sale' : ''}</i>${badge(w)}</span>
    </a>`).join('\n');
const SHEET = `<div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Opened from the gallery" hidden>
  <div class="sheet-card">
    <button type="button" class="sheet-back" id="sheet-back">&larr; Back to the gallery</button>
    <div class="sheet-body" id="sheet-body"></div>
  </div>
</div>`;
fs.writeFileSync(path.join(OUT, 'walk.html'), page({
  title: `Walk through the gallery | ${SITE.name}`,
  description: `A gallery of ${works.length} works by ${SITE.name} to walk through: ${counts.painting} paintings${counts.digital ? ` and ${counts.digital} AI-generated images` : ''}, each framed and lit.`,
  body: `<div class="view3d" id="view" hidden>
  <canvas id="stage" aria-label="The gallery in 3D. Use the arrow keys to walk and turn. Every work is also listed under All works."></canvas>
  <p class="where" id="where" aria-live="polite"></p>
  <div class="tools">
    <a class="tool" href="index.html">All work</a>
    <button type="button" id="btn-tour">Auto tour</button>
    <button type="button" id="btn-people" aria-pressed="true">People: on</button>
    <button type="button" id="btn-sound" aria-pressed="false">Sound: off</button>
    <button type="button" id="btn-index">Thumbnails</button>
    <button type="button" id="btn-start">Entrance</button>
    <button type="button" id="btn-help">How to move</button>
  </div>
  <div class="pad" id="pad" aria-label="Walk and turn">
    <button type="button" data-hold="left" aria-label="Turn left">&#8630;</button>
    <span><button type="button" data-hold="on" aria-label="Walk forward">&uarr;</button><button type="button" data-hold="back" aria-label="Walk back">&darr;</button></span>
    <button type="button" data-hold="right" aria-label="Turn right">&#8631;</button>
  </div>
</div>

<main class="wall" id="flat">
  <h1 class="sr">${esc(SITE.name)}: ${esc(SITE.tagline)}</h1>
  <h2 class="room-title">Paintings <span>${counts.painting}</span></h2>
  <div class="grid">
${wallOf(works.filter((w) => w.kind === 'painting'))}
  </div>
${counts.digital ? `  <h2 class="room-title">AI-generated images <span>${counts.digital}</span></h2>
  <div class="grid">
${wallOf(works.filter((w) => w.kind === 'digital'))}
  </div>
` : ''}</main>

${SHEET}

<script>window.GALLERY = ${JSON.stringify(gallery).replace(/</g, '\\u003c')};</script>
<script src="gallery.js"></script>
<script type="module" src="hall3d.js"></script>`,
}));

// ── The opening page ───────────────────────────────────────────────────────
// Every work on one wall, framed and lit, with a button into the 3D gallery. A
// click on a picture opens it on its own with its details and its link. This
// is the whole gallery on a phone, where there is no walking.
fs.writeFileSync(path.join(OUT, 'index.html'), page({
  title: `${SITE.name}: ${SITE.tagline.toLowerCase()}`,
  description: `${works.length} works by ${SITE.name}: ${counts.painting} paintings${counts.digital ? ` and ${counts.digital} AI-generated images` : ''}, each framed and lit. Walk through the gallery in 3D, or see them all on one wall.`,
  body: `<main class="wall" id="flat">
  <h1 class="sr">${esc(SITE.name)}: ${esc(SITE.tagline)}</h1>
${star ? `  <section class="feature" aria-label="Featured work">
    <a class="piece" href="work/${star.id}.html" data-kind="${star.kind}" data-work="${star.id}">
      ${framed(star, `img/${star.id}.jpg`, false)}
      <span class="label"><i>Featured work</i><b>${esc(star.title)}</b><i>${KIND[star.kind]}${details(star) ? ' &middot; ' + details(star) : ''}</i></span>
    </a>
  </section>
` : ''}  <div class="way-in">
    <a class="button big" href="walk.html">Enter the gallery</a>
    <p>Walk through the rooms in 3D, or let the tour take you round.</p>
  </div>
  <p class="count">${counts.painting} paintings</p>
  <div class="grid" id="grid">
${wallOf(works.filter((w) => w !== star && w.kind === 'painting'))}
  </div>
${counts.digital ? `  <h2 class="room-title" id="ai">AI-generated images <span>${counts.digital}</span></h2>
  <p class="count">The pictures below were generated with AI. They are not paintings, and they carry no signature.</p>
  <div class="grid">
${wallOf(works.filter((w) => w.kind === 'digital'))}
  </div>` : ''}
</main>

${SHEET}

<script>window.GALLERY = ${JSON.stringify(gallery).replace(/</g, '\\u003c')};</script>
<script src="gallery.js"></script>`,
}));

// A page for each work, with the one before and the one after.
works.forEach((w, i) => {
  const prev = works[(i - 1 + works.length) % works.length], next = works[(i + 1) % works.length];
  fs.writeFileSync(path.join(OUT, 'work', `${w.id}.html`), page({
    depth: 1,
    title: `${w.title} | ${SITE.name}`,
    description: `${w.title}: ${KIND[w.kind].toLowerCase()} by ${SITE.name}.${w.medium ? ' ' + w.medium + '.' : ''}${w.about ? ' ' + w.about : ''}`.slice(0, 158),
    body: `<main class="work">
  <a class="frame" href="../img/${w.id}.jpg" id="open" title="Open the picture on its own" style="--shape: ${(w.width / w.height).toFixed(3)}">
    ${framed(w, `../img/${w.id}.jpg`, false)}
  </a>
  <section class="plate">
    <p class="kind">${KIND[w.kind]}</p>
    <h1>${esc(w.title)}</h1>
    ${details(w) ? `<p class="facts">${details(w)}</p>` : ''}
    ${badge(w)}
    ${w.about ? `<p class="about">${esc(w.about)}</p>` : ''}
    ${w.buy ? `<p class="buy"><a class="button" href="${esc(w.buy)}" target="_blank" rel="noopener">${esc(w.buyLabel || (shop ? `Buy a print on ${shop.name}` : 'Buy this piece'))}</a><span class="hint">Opens ${esc(shop ? shop.name : 'the shop')} in a new tab, where the sale is handled.</span></p>` : ''}
    <p class="made">${esc(w.kind === 'digital' ? (SITE.digitalNote || '') : (SITE.paintingNote || ''))} <a href="../about.html#made">How the work was made</a></p>
    ${related(w)}
    <div class="try" id="try" data-frame="${frameOf(w)}" data-mount="${mountOf(w)}">
      <h2>See it framed</h2>
      <p class="hint">It hangs in the frame chosen to suit it. Try another: each fits itself to the picture.</p>
      ${swatches(FRAMES, 'frame', 'Choose a frame')}
      <label class="check"><input type="checkbox" id="mount"${mountOf(w) ? ' checked' : ''}> With a card mount</label>
    </div>
    ${contactBlock(w.title)}
  </section>
  <nav class="turn" aria-label="Other works">
    <a href="${prev.id}.html">&larr; ${esc(prev.title)}</a>
    <a href="../walk.html">Back to your place in the gallery</a>
    <a href="${next.id}.html">${esc(next.title)} &rarr;</a>
  </nav>
</main>

<script src="../gallery.js"></script>`,
  }));
});

// How the gallery was built: a page for technical visitors. The words are in how-built.js; the numbers are counted here.
{
  const SOURCES = ['hall3d.js', 'people3d.js', 'sound3d.js', 'gallery.js', 'build.js', 'how-built.js', 'make-images.py', 'make-walls.py', 'signature.py', 'worker.js', 'ask-core.mjs', 'ask_test.mjs', 'style.css', 'works.js'];
  const lines = SOURCES.reduce((n, f) => n + fs.readFileSync(path.join(__dirname, f), 'utf8').split('\n').length, 0);
  const hanging = works.length - (works.some((w) => w.id === SITE.featured) ? 1 : 0);          // the centrepiece has a wall of its own
  fs.writeFileSync(path.join(OUT, 'built.html'), page({
    title: `How this gallery was built | ${SITE.name}`,
    description: `How ${SITE.name}'s walk-through 3D art gallery was made: three.js, plain JavaScript, sound and figures made in code, and what it took from a person and an AI to get it right.`,
    body: require('./how-built.js')({ name: SITE.name, paintings: works.length, rooms: Math.max(1, Math.floor(hanging / 4)), lines: Math.round(lines / 100) * 100, files: SOURCES.length, three: JSON.parse(fs.readFileSync(path.join(__dirname, 'node_modules', 'three', 'package.json'), 'utf8')).version }),
  }));
}

// About and contact.
// ── The cinema ─────────────────────────────────────────────────────────────
// One screen and a row of films to choose from. The films and their stills are copied from the cinema
// folder as they are. The host takes files up to 25 MiB, so a larger film stops the build here, by name.
if (FILMS.length) {
  const from = path.join(__dirname, 'cinema'), to = path.join(OUT, 'cinema');
  fs.mkdirSync(to, { recursive: true });
  for (const f of FILMS) {
    for (const ext of ['.mp4', '.jpg']) {
      const file = path.join(from, f.id + ext);
      if (!fs.existsSync(file)) throw new Error(`works.js: the film "${f.id}" has no ${ext} file in the cinema folder`);
      if (fs.statSync(file).size > 25 * 1024 * 1024) throw new Error(`cinema/${f.id}${ext} is over 25 MiB, which the host will not take`);
      fs.copyFileSync(file, path.join(to, f.id + ext));
    }
    if (f.work && !works.some((w) => w.id === f.work)) throw new Error(`works.js: the film "${f.id}" points at "${f.work}", which is not a work on show`);
  }
  const credit = CINEMA.credit ? `<a href="${esc(CINEMA.credit.url)}" rel="noopener">${esc(CINEMA.credit.text)}</a>` : '';
  const films = FILMS.map((f) => ({ id: f.id, title: f.title, about: f.about || '', work: f.work || '', workTitle: f.work ? works.find((w) => w.id === f.work).title : '' }));
  fs.writeFileSync(path.join(OUT, 'cinema.html'), page({
    title: `Cinema | ${SITE.name}`,
    description: `${FILMS.length} short films in which pictures from ${SITE.name}'s gallery are set in motion: ${FILMS.map((f) => f.title).join(', ')}.`,
    image: `cinema/${FILMS[0].id}.jpg`,
    body: `<main class="cinema">
  <div class="marquee">
    <h1>${esc((CINEMA.sign || {}).title || 'Cinema')}</h1>
    ${CINEMA.sign ? `<p>${esc(CINEMA.sign.by)} <a href="${esc(CINEMA.sign.url)}" rel="noopener">${esc(CINEMA.sign.name)}</a></p>` : ''}
  </div>
  <p class="lede">${esc(CINEMA.lede || '')}</p>
  <div class="screen" id="theatre"><video id="film" controls playsinline muted loop preload="metadata" poster="cinema/${esc(FILMS[0].id)}.jpg" src="cinema/${esc(FILMS[0].id)}.mp4"></video></div>
  <div class="booth" role="group" aria-label="The film">
    <button type="button" id="film-play">Play</button>
    <button type="button" id="film-sound">Sound: off</button>
  </div>
  <div class="now">
    <h2 id="film-title">${esc(films[0].title)}</h2>
    <p id="film-about">${esc(films[0].about)}</p>
    <p class="credit"><span id="film-work">${films[0].work ? `<a href="work/${esc(films[0].work)}.html">See the painting</a> &middot; ` : ''}</span>${credit}</p>
  </div>
  <div class="reel" role="group" aria-label="Films">
${films.map((f, i) => `    <button type="button" data-film="${esc(f.id)}" aria-pressed="${i === 0}"><img src="cinema/${esc(f.id)}.jpg" alt="" loading="lazy"><span>${esc(f.title)}</span></button>`).join('\n')}
  </div>
  <p class="made-note">${esc(CINEMA.note || '')}</p>
  <p><a class="way-back" href="walk.html?at=cinema">Back to the gallery</a></p>
</main>
<script>
// The film waits until Play is pressed, and the button then reads Pause. Choosing a film from the row puts it on
// the screen and plays it. The films start silent; the Sound button turns the sound on.
(function () {
  var films = ${JSON.stringify(films)};
  var screen = document.getElementById('film');
  document.querySelector('.reel').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-film]');
    if (!b) return;
    var f = films.filter(function (x) { return x.id === b.dataset.film; })[0];
    document.querySelectorAll('.reel button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
    screen.poster = 'cinema/' + f.id + '.jpg';
    screen.src = 'cinema/' + f.id + '.mp4';
    screen.play().catch(function () {});
    document.getElementById('film-title').textContent = f.title;
    document.getElementById('film-about').textContent = f.about;
    document.getElementById('film-work').innerHTML = f.work ? '<a href="work/' + f.work + '.html">See the painting</a> &middot; ' : '';
    document.getElementById('theatre').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  // The two buttons under the room. They work the film itself, so they do the same with or without the 3D room.
  var play = document.getElementById('film-play'), sound = document.getElementById('film-sound');
  play.addEventListener('click', function () { if (screen.paused) screen.play().catch(function () {}); else screen.pause(); });
  screen.addEventListener('play', function () { play.textContent = 'Pause'; });
  screen.addEventListener('pause', function () { play.textContent = 'Play'; });
  sound.addEventListener('click', function () { screen.muted = !screen.muted; sound.textContent = 'Sound: ' + (screen.muted ? 'off' : 'on'); });
})();
</script>
<script type="module" src="cinema3d.js"></script>
`,
  }));
}

fs.writeFileSync(path.join(OUT, 'about.html'), page({
  title: `About | ${SITE.name}`,
  description: `About ${SITE.name}, and how to get in touch.`,
  body: `<main class="about-page">
  <h1>About</h1>
  ${SITE.about.map((p) => `<p>${esc(p)}</p>`).join('\n  ')}
  <h2 id="use">Copyright and using the images</h2>
  <p>${esc(SITE.rights || '')}</p>
  ${(SITE.use || []).map((p) => `<p>${esc(p)}</p>`).join('\n  ')}
  ${(SITE.made || []).length ? `<h2 id="made">How the work was made</h2>\n  ${SITE.made.map((p) => `<p>${esc(p)}</p>`).join('\n  ')}` : ''}
  <div id="contact">${contactBlock('')}</div>
  <p><a class="button" href="walk.html">Back to your place in the gallery</a> <a class="button" href="index.html">All work</a></p>
</main>`,
}));

for (const f of ['style.css', 'gallery.js', 'hall3d.js', 'people3d.js', 'sound3d.js', 'cinema3d.js']) fs.copyFileSync(path.join(__dirname, f), path.join(OUT, f));
// A last check that no email address has found its way into anything a visitor's browser is sent.
(function noAddressInPages(dir) {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (fs.statSync(file).isDirectory()) { if (name !== 'vendor') noAddressInPages(file); continue; }
    if (/\.(html|js|css)$/.test(name) && /mailto:|[\w.+-]+@(gmail|outlook|yahoo|hotmail)\.[a-z]+/i.test(fs.readFileSync(file, 'utf8'))) throw new Error(`${file} contains an email address or an email link. The address must stay out of the pages.`);
  }
})(OUT);
// three.js, the 3D drawing engine, served from this site's own folder so nothing is fetched from elsewhere.
fs.mkdirSync(path.join(OUT, 'vendor'), { recursive: true });
for (const f of ['three.module.js', 'three.core.js']) fs.copyFileSync(path.join(__dirname, 'node_modules', 'three', 'build', f), path.join(OUT, 'vendor', f));
// The floor's mirror is one of three.js's own extras. It asks for the library by name, which a page cannot answer
// without more setup, so its copy is pointed at the library file beside it.
fs.writeFileSync(path.join(OUT, 'vendor', 'Reflector.js'), fs.readFileSync(path.join(__dirname, 'node_modules', 'three', 'examples', 'jsm', 'objects', 'Reflector.js'), 'utf8').replace("from 'three';", "from './three.module.js';"));
// The photographed walls, made into tiles that repeat without a seam.
const wallTiles = execFileSync('python', [path.join(__dirname, 'make-walls.py')], { encoding: 'utf8' }).trim().split(/\r?\n/);
for (const line of wallTiles) { const [n, w, h, kb, how] = line.split('|'); console.log(`  wall ${n}: ${w} x ${h}, ${kb} KB, used ${how}`); }

let closest = { d: 999 };
for (let i = 0; i < works.length; i++) for (let j = i + 1; j < works.length; j++) { const d = apart(works[i].marks, works[j].marks); if (d < closest.d) closest = { d, a: works[i].title, b: works[j].title }; }
const forSale = works.filter((w) => w.buy).length;
const provisional = works.filter((w) => w.provisional).length;
const small = works.filter((w) => w.sourceLongest < 1200).map((w) => `${w.title} (${w.sourceLongest}px)`);
console.log(`built ${works.length} works (${counts.painting} paintings, ${counts.digital} digital${DIGITAL ? '' : ': digital images are switched off'}) into ${OUT}`);
const tally = {}; for (const w of works) tally[frameOf(w)] = (tally[frameOf(w)] || 0) + 1;
console.log(`  frames: ${Object.entries(tally).map(([k, n]) => `${n} ${k}`).join(', ')}`);
console.log(`  no duplicates: the two most alike are "${closest.a}" and "${closest.b}", ${closest.d} of 256 marks apart (the same picture would be ${SAME_PICTURE} or fewer)`);
console.log(SELLING ? `  ${forSale} of ${works.length} works have a buy link${shop ? `, shop: ${shop.name}` : '; no shop set yet'}` : '  selling is off: no shop link, buy buttons or sale marks on any page');
const found = works.filter((w) => w.linkFound).map((w) => w.title);
if (found.length) console.log(`  ${found.length} buy links were found by search and need confirming: ${found.join(', ')}`);
if (provisional) console.log(`  ${provisional} titles are provisional: ${works.filter((w) => w.provisional).map((w) => w.title).join(", ")}`);
if (small.length) console.log(`  small originals, soft when enlarged: ${small.join(', ')}`);
const signedWhite = works.filter((w) => w.ink === 'white').length, signedBlack = works.filter((w) => w.ink === 'black').length;
console.log(`  signature: ${signedWhite} in white, ${signedBlack} in black, ${works.length - signedWhite - signedBlack} unsigned; ${works.filter((w) => w.repaired).length} old signatures painted out`);
