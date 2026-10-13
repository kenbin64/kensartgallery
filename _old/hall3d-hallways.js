// The gallery in three dimensions: short hallways you walk through, turning corners from one to the next.
// Drawn with three.js (the copy in the vendor folder; nothing is fetched from another site).
//
// WHEN THIS RUNS
// Only on a screen wide enough to walk around in, and only where the browser
// can draw 3D. On a phone, or anywhere this cannot run, the page stays as it
// is written: a wall of framed pictures. Nothing below changes that page.
//
// THE PLAN OF THE BUILDING
// The floor is a grid of square cells, each one hall-width across. The halls
// are a path through that grid that winds like this (seen from above; you
// start at the bottom left, facing up):
//
//        +---+---+---+       +---+---+---+
//        | c   >   c |       | c   >   c |      c = a corner
//        +   +---+   +       +   +---+   +
//        | ^ |   | v |       | ^ |   | v |      Each straight stretch between two
//        +   +   +   +       +   +   +   +      corners is one hallway.
//        | ^ |   | v |       | ^ |   | v |
//        +   +   +   +---+---+   +   +   +--
//        | S |   | c   >   c |   |   | c  ...
//        +---+   +---+---+---+   +   +---+
//
// HOW THE PICTURES ARE HUNG
// A long hallway hangs three pictures in a row along one wall, the unbroken
// wall on its outer side. The short hallway that links it to the next hangs
// two, side by side, on its own long wall: the first of them is the picture
// you see ahead of you as you walk up the long hallway. So no hallway holds
// more than three, and no wall that carries pictures carries fewer than two
// (only the very last may, if the works run out). Each hallway has its own
// wall finish, so the walls change as you turn each corner. The path is made
// just long enough for every work: paintings first, then the digital images.
//
// MEASURES are in units of the 3D space, about a hundredth of an inch each.
// x runs to the right, y runs up from the floor, and z runs towards you, so
// "north" (straight ahead at the start) is smaller z.
//
// WHERE YOU ARE is three numbers: x, z and the way you face (0 is north, 90 is
// east). They are remembered while the tab is open, so every picture, panel
// and page can bring you back to the same spot.
import * as THREE from './vendor/three.module.js';

const DATA = window.GALLERY, Sheet = window.GallerySheet;
const $ = (id) => document.getElementById(id);
const wide = window.matchMedia('(min-width: 900px) and (min-height: 520px)').matches;
let renderer = null;
if (wide) { try { renderer = new THREE.WebGLRenderer({ canvas: $('stage'), antialias: true }); } catch (_) { renderer = null; } }
if (renderer) start();

function start() {
  document.documentElement.classList.add('in3d', 'walking');
  const view = $('view');
  view.hidden = false;

  // ── The plan ─────────────────────────────────────────────────────────────
  const CELL = 900, HEIGHT = 640, EYE = 310;
  const KEEP_OFF = 130;        // how close you can get to a wall
  const N = [0, -1], E = [1, 0], S = [0, 1], W = [-1, 0];
  const leftOf = (d) => (d === N ? W : d === S ? E : d === E ? N : S);
  const rightOf = (d) => (d === N ? E : d === S ? W : d === E ? S : N);
  const key = (i, j) => i + ',' + j;
  const works = [...DATA.works.filter((w) => w.kind === 'painting'), ...DATA.works.filter((w) => w.kind === 'digital')];

  // Walk the winding path, laying cells and marking the places where a picture hangs.
  const cells = new Map();     // every cell of floor, by "i,j"
  const places = [];           // where pictures hang, in walking order: { i, j, side, hall }
  const halls = [];            // each hallway: { cells, dir }
  let at = [0, 0];
  cells.set(key(0, 1), { i: 0, j: 1 });        // a small lobby behind the start, so you do not begin against a wall
  cells.set(key(0, 0), { i: 0, j: 0 });
  // One hallway: `steps` cells in direction `dir`. `hangOn` is the side of the cells its pictures hang on.
  function hallway(dir, steps, hangOn) {
    const hall = { dir, cells: [], hangOn, index: halls.length };
    for (let s = 1; s <= steps; s++) {
      at = [at[0] + dir[0], at[1] + dir[1]];
      cells.set(key(at[0], at[1]), { i: at[0], j: at[1], hall: hall.index });
      hall.cells.push(at);
    }
    halls.push(hall);
    return hall;
  }
  cells.get(key(0, 1)).hall = 0; cells.get(key(0, 0)).hall = 0;
  // How many pictures each hallway takes, worked out first so that none is left with one alone. A long hallway
  // takes three and a link two. If that would leave a single picture over, a link takes a third or a long hallway
  // takes two, so the last wall still has company.
  const share = [];
  for (let left = works.length, long = true; left > 0; long = !long) {
    let take = Math.min(long ? 3 : 2, left);
    if (left - take === 1) take = long ? 2 : 3;
    share.push(take); left -= take;
  }
  for (let n = 0, k = 0; n < share.length; n += 2, k++) {
    // A long hallway, north then south by turns. Its pictures hang in a row on its west wall, which is unbroken.
    const along = k % 2 === 0 ? N : S;
    const long = hallway(along, 3, W);
    for (const c of long.cells.slice(0, share[n])) places.push({ i: c[0], j: c[1], side: W, hall: long.index });
    if (n + 1 >= share.length) break;
    // The link to the next long hallway. Its pictures hang side by side on the wall that runs across the end of
    // the long hallway: the first is straight ahead as you come up it, the others beside it round the corner.
    const link = hallway(E, 2, along);
    for (const c of [long.cells[2], link.cells[0], link.cells[1]].slice(0, share[n + 1])) places.push({ i: c[0], j: c[1], side: along, hall: link.index });
  }
  places.length = works.length;                               // a hallway may be left with fewer than its full count
  const centre = (i, j) => [i * CELL, j * CELL];
  const inPath = (x, z) => cells.has(key(Math.round(x / CELL), Math.round(z / CELL)));
  // You may stand where the floor is, and not too near a wall: all four corners of your footprint must be on the path.
  const canStand = (x, z) => inPath(x - KEEP_OFF, z - KEEP_OFF) && inPath(x + KEEP_OFF, z - KEEP_OFF) && inPath(x - KEEP_OFF, z + KEEP_OFF) && inPath(x + KEEP_OFF, z + KEEP_OFF);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070605');
  scene.fog = new THREE.Fog('#070605', 1500, 4800);        // the halls fall away into shadow
  const camera = new THREE.PerspectiveCamera(62, 1, 8, 8000);
  // Light for the frames and lamps, which are solid shapes. The walls and pictures are shown at their own brightness.
  scene.add(new THREE.HemisphereLight('#fff4e0', '#5a4a38', 1.7));
  const sun = new THREE.DirectionalLight('#fff1d6', 1.5); sun.position.set(0.3, 1, 0.6); scene.add(sun);
  // THE LIGHTING. As in a gallery, the room is kept dim and the pictures are lit. The walls, floor and
  // ceiling are shown at a fraction of their own brightness (ROOM), each picture is shown at full
  // brightness, and a pool of warm light falls on the wall around it and on the floor beneath it.
  const ROOM = 0.17;        // on the scale the renderer works in, this shows a wall at about half its own brightness

  // ── Walls ────────────────────────────────────────────────────────────────
  // What each wall is made of, and the frame that suits it. The same choices as the flat page.
  const WALLS = {
    grey: { colour: '#9b9b98', frame: 'black' }, white: { colour: '#f4f4f1', frame: 'black' }, plaster: { colour: '#e9e2d6', frame: 'wood' },
    greige: { colour: '#b9ad9c', frame: 'black' }, charcoal: { colour: '#2f3032', frame: 'gold' }, navy: { colour: '#1e2a3d', frame: 'gold' },
    stucco: { photo: 'walls/stucco.jpg', tile: 900, shade: '#d0d0d0', frame: 'wood' }, stone: { photo: 'walls/stone.jpg', tile: 1000, shade: '#bdbdbd', frame: 'gold' },
    brick: { photo: 'walls/brick.jpg', tile: 760, shade: '#b8b8b8', frame: 'black' }, tile: { photo: 'walls/tile.jpg', tile: 820, shade: '#a8a8a8', frame: 'black' },
    mosaic: { photo: 'walls/mosaic.jpg', tile: 820, shade: '#a4a4a4', frame: 'white' },
  };
  const FRAMES = {
    gold: { color: '#e0b858', metalness: 0.3, roughness: 0.42 }, wood: { color: '#6b4023', metalness: 0, roughness: 0.6 }, oak: { color: '#b89363', metalness: 0, roughness: 0.6 },
    black: { color: '#232325', metalness: 0.2, roughness: 0.45 }, white: { color: '#eeede9', metalness: 0, roughness: 0.5 },
  };
  const loader = new THREE.TextureLoader();
  // One material for each kind of frame, and one for the thin liner inside it: pale linen inside wood, oak and gold, a gold fillet inside black and white.
  const frameMaterials = Object.fromEntries(Object.entries(FRAMES).map(([name, f]) => [name, new THREE.MeshStandardMaterial(f)]));
  const linen = new THREE.MeshStandardMaterial({ color: '#e9e2cf', roughness: 0.9 }), fillet = new THREE.MeshStandardMaterial({ color: '#e0b858', metalness: 0.3, roughness: 0.42 });
  let redraw = true;
  const ask = () => { redraw = true; };

  // The way a wall on each side of a cell faces (its front looks into the cell), as a turn about the upright.
  const TURN_OF = new Map([[N, 0], [S, 180], [W, 90], [E, -90]]);
  const wallGeometry = new THREE.PlaneGeometry(CELL, HEIGHT), skirtGeometry = new THREE.PlaneGeometry(CELL, 22);
  const skirtMaterial = new THREE.MeshBasicMaterial({ color: '#6f6a5f' });
  // Every hallway has its own wall finish, so the walls change as you turn a corner. The finishes follow one
  // another in this order, starting from the one chosen at the top of the page: plain and textured by turns.
  const ORDER = ['grey', 'stucco', 'charcoal', 'stone', 'greige', 'brick', 'plaster', 'navy', 'tile', 'white', 'mosaic'];
  const finishes = {};                       // one material for each finish, made the first time it is needed
  function finish(name) {
    if (finishes[name]) return finishes[name];
    const def = WALLS[name], m = finishes[name] = new THREE.MeshBasicMaterial({ color: new THREE.Color(def.colour || '#5a5650').multiplyScalar(ROOM) });
    if (def.photo) loader.load(def.photo, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(CELL / def.tile, HEIGHT / (def.tile * tex.image.height / tex.image.width));
      m.map = tex; m.color.set(def.shade).multiplyScalar(ROOM * 1.25); m.needsUpdate = true; ask();
    });
    return m;
  }
  // Which hallway a wall belongs to. A wall belongs to the hallway its cell is in, with one exception: the wall
  // across the end of a long hallway belongs to the link beyond it, because the link's pictures hang along it.
  function hallOfWall(c, d) {
    const hall = halls[c.hall], last = hall.cells[hall.cells.length - 1];
    const isCorner = last[0] === c.i && last[1] === c.j;
    return isCorner && d === hall.dir && hall.dir !== E && halls[c.hall + 1] ? c.hall + 1 : c.hall;
  }
  const wallPieces = [];
  for (const c of cells.values()) {
    const [cx, cz] = centre(c.i, c.j);
    for (const d of [N, E, S, W]) {
      if (cells.has(key(c.i + d[0], c.j + d[1]))) continue;                    // the hall carries on that way: no wall
      const m = new THREE.Mesh(wallGeometry, finish('grey'));
      m.position.set(cx + d[0] * CELL / 2, HEIGHT / 2, cz + d[1] * CELL / 2); m.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(d));
      const skirt = new THREE.Mesh(skirtGeometry, skirtMaterial); skirt.position.set(0, -HEIGHT / 2 + 11, 1.5); m.add(skirt);
      scene.add(m);
      wallPieces.push({ mesh: m, hall: hallOfWall(c, d) });
    }
  }
  // The wall chosen at the top of the page is the first hallway's; the rest follow in order from it.
  const finishOfHall = (first, hall) => ORDER[(Math.max(0, ORDER.indexOf(first)) + hall) % ORDER.length];
  let firstWall = 'grey';
  function setWall(name) {
    firstWall = WALLS[name] ? name : 'grey';
    for (const p of wallPieces) p.mesh.material = finish(finishOfHall(firstWall, p.hall));
    ask();
  }

  // ── Floor and ceiling ────────────────────────────────────────────────────
  // The floor is marble tiles, two across each hall, drawn once onto a small canvas and repeated. It is shown
  // dim, like the rest of the room, so the pool of light under each picture shows on it. The ceiling is dark,
  // with a small lamp over each cell.
  const marble = (() => {
    // One polished tile, drawn here and repeated: a pale stone with grey and gold veins, and a fine joint round its edge.
    // The veins are wandering lines. Each is drawn several times, wide and faint then narrow and stronger, so it looks
    // as if it lies inside the stone. The numbers come from a fixed sequence, so the floor is the same on every visit.
    const size = 512, c = document.createElement('canvas'); c.width = c.height = size;
    const g = c.getContext('2d');
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const base = g.createLinearGradient(0, 0, size, size);
    base.addColorStop(0, '#e4dfd6'); base.addColorStop(0.5, '#d6d0c5'); base.addColorStop(1, '#e0dbd1');
    g.fillStyle = base; g.fillRect(0, 0, size, size);
    for (let n = 0; n < 40; n++) {                // soft clouds of tone
      const x = rnd() * size, y = rnd() * size, r = 40 + rnd() * 120, cloud = g.createRadialGradient(x, y, 0, x, y, r);
      cloud.addColorStop(0, `rgba(${n % 2 ? '255,252,244' : '150,144,134'},0.10)`); cloud.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = cloud; g.fillRect(0, 0, size, size);
    }
    for (let v = 0; v < 9; v++) {                 // the veins
      let x = rnd() * size, y = rnd() * size, angle = rnd() * Math.PI * 2;
      const points = [[x, y]];
      for (let s = 0; s < 26; s++) { angle += (rnd() - 0.5) * 0.9; x += Math.cos(angle) * 26; y += Math.sin(angle) * 26; points.push([x, y]); }
      const gold = v % 4 === 0;
      for (const [width, alpha] of [[9, 0.05], [4, 0.10], [1.4, 0.34]]) {
        g.strokeStyle = gold ? `rgba(176,142,84,${alpha})` : `rgba(92,90,88,${alpha})`; g.lineWidth = width; g.lineJoin = 'round';
        g.beginPath(); points.forEach(([px, py], i) => (i ? g.lineTo(px, py) : g.moveTo(px, py))); g.stroke();
      }
    }
    g.strokeStyle = 'rgba(70,66,60,0.55)'; g.lineWidth = 3; g.strokeRect(0, 0, size, size);       // the joint between tiles
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.anisotropy = 8; return t;
  })();
  const slab = new THREE.PlaneGeometry(CELL, CELL), lightGeometry = new THREE.CircleGeometry(34, 20);          // a small recessed lamp, not a bright panel
  const floorMaterial = new THREE.MeshBasicMaterial({ map: marble, color: new THREE.Color('#ffffff').multiplyScalar(0.3) }), ceilingMaterial = new THREE.MeshBasicMaterial({ color: '#0f0d0b' }), lightMaterial = new THREE.MeshBasicMaterial({ color: '#8a7d66' });
  for (const c of cells.values()) {
    const [cx, cz] = centre(c.i, c.j);
    const floor = new THREE.Mesh(slab, floorMaterial); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); scene.add(floor);
    const ceiling = new THREE.Mesh(slab, ceilingMaterial); ceiling.rotation.x = Math.PI / 2; ceiling.position.set(cx, HEIGHT, cz); scene.add(ceiling);
    const light = new THREE.Mesh(lightGeometry, lightMaterial); light.rotation.x = Math.PI / 2; light.position.set(cx, HEIGHT - 1.5, cz); scene.add(light);
  }

  // ── Words drawn onto a flat panel ────────────────────────────────────────
  // three.js draws pictures, not text, so a label or a glass panel is first drawn
  // on a small canvas and then shown as a picture of its own.
  function wordsTexture(lines, { width, pad = 22, paper = null, edge = null }) {
    const scale = 2, c = document.createElement('canvas'), g = c.getContext('2d');
    const fonts = lines.map((l) => `${l.weight || 400} ${l.size * scale}px ${l.serif ? 'Georgia, serif' : 'system-ui, Segoe UI, sans-serif'}`);
    const laid = [];                           // each line broken to fit the width
    lines.forEach((l, i) => {
      g.font = fonts[i];
      let row = '';
      for (const word of l.text.split(' ')) {
        const tryRow = row ? row + ' ' + word : word;
        if (g.measureText(tryRow).width > (width - pad * 2) * scale && row) { laid.push({ text: row, i }); row = word; } else row = tryRow;
      }
      laid.push({ text: row, i, last: true });
    });
    const height = Math.ceil(pad * 2 + laid.reduce((n, r) => n + lines[r.i].size * 1.32 + (r.last ? (lines[r.i].gap || 0) : 0), 0));
    c.width = width * scale; c.height = height * scale;
    if (paper) { g.fillStyle = paper; g.fillRect(0, 0, c.width, c.height); }
    if (edge) { g.strokeStyle = edge; g.lineWidth = 3 * scale; g.strokeRect(1.5 * scale, 1.5 * scale, c.width - 3 * scale, c.height - 3 * scale); }
    let y = pad * scale;
    for (const r of laid) {
      const l = lines[r.i];
      g.font = fonts[r.i]; g.fillStyle = l.colour; g.textBaseline = 'top';
      g.fillText(r.text, pad * scale, y);
      y += l.size * 1.32 * scale + (r.last ? (l.gap || 0) * scale : 0);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return { texture: t, height };
  }

  // ── Hanging the pictures ─────────────────────────────────────────────────
  // Each work is a small group fixed to its wall: a pool of light, a frame, a
  // card mount for digital images, the picture, a brass lamp above and a label below.
  const clickable = [], hung = [], spots = {};
  const glow = (() => {                    // a soft warm pool of light, used behind every picture
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 100, 8, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,232,190,1)'); r.addColorStop(0.4, 'rgba(255,232,190,0.5)'); r.addColorStop(1, 'rgba(255,232,190,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const brass = new THREE.MeshStandardMaterial({ color: '#d6b050', metalness: 0.35, roughness: 0.4 });
  const OFF = 2, BACK = 660;       // a picture's distance off its wall, and how far back you stand to look at it
  works.forEach((work, n) => {
    const p = places[n], [cx, cz] = centre(p.i, p.j), d = p.side;
    const x = cx + d[0] * (CELL / 2 - OFF), z = cz + d[1] * (CELL / 2 - OFF), turn = TURN_OF.get(d);
    const shape = work.w / work.h;
    const w = Math.min(520, 330 * shape), h = w / shape, f = 26, mount = work.mount ? 34 : 0;
    const outerW = w + (f + mount) * 2, outerH = h + (f + mount) * 2;
    const group = new THREE.Group();
    group.position.set(x, EYE + 14, z); group.rotation.y = THREE.MathUtils.degToRad(turn);

    const pool = new THREE.Mesh(new THREE.PlaneGeometry(outerW * 2.0, outerH * 2.5), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
    pool.position.set(0, 40, 1); group.add(pool);
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(outerW * 1.7, 420), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 }));
    wash.rotation.x = -Math.PI / 2; wash.position.set(0, -(EYE + 14) + 2, 200); group.add(wash);
    // The frame: a rectangle with a rectangular hole, given depth and a bevelled edge.
    const outline = new THREE.Shape(); outline.moveTo(-outerW / 2, -outerH / 2); outline.lineTo(outerW / 2, -outerH / 2); outline.lineTo(outerW / 2, outerH / 2); outline.lineTo(-outerW / 2, outerH / 2); outline.closePath();
    const hole = new THREE.Path(), iw = w / 2 + mount, ih = h / 2 + mount;
    hole.moveTo(-iw, -ih); hole.lineTo(-iw, ih); hole.lineTo(iw, ih); hole.lineTo(iw, -ih); hole.closePath(); outline.holes.push(hole);
    const style = FRAMES[work.frame] ? work.frame : 'black';
    const frame = new THREE.Mesh(new THREE.ExtrudeGeometry(outline, { depth: 16, bevelEnabled: true, bevelThickness: 7, bevelSize: 7, bevelSegments: 2 }), frameMaterials[style]);
    frame.position.z = 4; group.add(frame);
    // The liner: a narrow inner strip that steps down from the frame to the picture.
    const strip = new THREE.Shape(); strip.moveTo(-iw, -ih); strip.lineTo(iw, -ih); strip.lineTo(iw, ih); strip.lineTo(-iw, ih); strip.closePath();
    const inner = new THREE.Path(); inner.moveTo(-iw + 7, -ih + 7); inner.lineTo(-iw + 7, ih - 7); inner.lineTo(iw - 7, ih - 7); inner.lineTo(iw - 7, -ih + 7); inner.closePath(); strip.holes.push(inner);
    const liner = new THREE.Mesh(new THREE.ExtrudeGeometry(strip, { depth: 9, bevelEnabled: false }), style === 'black' || style === 'white' ? fillet : linen);
    liner.position.z = 4; group.add(liner);
    if (mount) { const card = new THREE.Mesh(new THREE.PlaneGeometry(w + mount * 2, h + mount * 2), new THREE.MeshBasicMaterial({ color: '#f7f5ef' })); card.position.z = 7; group.add(card); }
    const picture = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: '#2a2724' }));
    picture.position.z = 9; group.add(picture);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(6, 6, Math.max(60, outerW * 0.36), 12), brass);
    lamp.rotation.z = Math.PI / 2; lamp.position.set(0, outerH / 2 + 34, 46); group.add(lamp);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 50, 6), brass); arm.rotation.x = Math.PI / 2.6; arm.position.set(0, outerH / 2 + 22, 24); group.add(arm);
    const labelW = Math.max(190, Math.min(340, outerW));
    const words = wordsTexture([{ text: work.title, size: 21, serif: true, colour: '#1d1c1a', gap: 3 }, { text: work.kindLabel + (work.buy ? '  ·  for sale' : ''), size: 13, colour: '#6b675f' }], { width: labelW, pad: 13, paper: '#f6f2ea' });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(labelW, words.height), new THREE.MeshBasicMaterial({ map: words.texture }));
    label.position.set(-outerW / 2 + labelW / 2, -outerH / 2 - 26 - words.height / 2, 3); group.add(label);

    for (const part of [picture, frame, label]) { part.userData.work = work.id; clickable.push(part); }
    scene.add(group);
    hung.push({ work, picture, x, z, hall: p.hall, loaded: false });
    // To look at it you stand back from its wall, facing it.
    spots[work.id] = { x: x - d[0] * BACK, z: z - d[1] * BACK, yaw: d === N ? 0 : d === E ? 90 : d === S ? 180 : -90 };
  });

  // ── Glass panels: the words of the gallery, hanging in the air ───────────
  // Each shows a few words as you pass, and opens its full text over the gallery when clicked.
  // A panel is hung in a cell, set to one side, facing whoever walks in the direction `walking`.
  const SITE = DATA.site, fullText = {};
  // The side of a hallway away from its pictures, as a distance to the walker's right (negative is to the left).
  const clearSide = (hall) => (rightOf(hall.dir) === hall.hangOn ? -215 : 215);
  function glass(id, cell, walking, across, title, under, full) {
    const width = 300, [cx, cz] = centre(cell[0], cell[1]), r = rightOf(walking);
    const words = wordsTexture([{ text: title, size: 30, serif: true, colour: '#ffffff', gap: 6 }, { text: under, size: 16, colour: 'rgba(255,255,255,0.9)', gap: 12 }, { text: 'Click to read', size: 12, weight: 600, colour: 'rgba(255,255,255,0.75)' }],
      { width, pad: 26, paper: 'rgba(190,225,240,0.20)', edge: 'rgba(255,255,255,0.75)' });
    const group = new THREE.Group();
    group.position.set(cx + r[0] * across, EYE + 36, cz + r[1] * across);
    group.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(walking));        // the same way as the wall you are walking towards: its front meets you
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(width, words.height), new THREE.MeshBasicMaterial({ map: words.texture, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
    pane.userData.panel = id; clickable.push(pane); group.add(pane);
    const up = HEIGHT - (EYE + 36) - words.height / 2;                         // two fine wires up to the ceiling
    for (const side of [-1, 1]) {
      const wire = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, up, 4), new THREE.MeshBasicMaterial({ color: '#cfd6da' }));
      wire.position.set(side * (width / 2 - 18), words.height / 2 + up / 2, 0); group.add(wire);
    }
    scene.add(group);
    fullText[id] = full;
  }
  const shopLink = SITE.shop ? `<p><a class="button" href="${SITE.shop.url}" target="_blank" rel="noopener">Prints on ${SITE.shop.name}</a></p>` : '';
  glass('welcome', [0, 0], N, -215, SITE.name, SITE.tagline,
    `<h2>${SITE.name}</h2><p>${SITE.tagline}.</p><p>This is a gallery you walk through. It is a run of short hallways joined at corners. Each has its own walls and no more than three pictures, hung together along one wall. The paintings come first, then the digital images.</p>`
    + '<h3>Moving</h3><ul><li><b>Walk:</b> the up and down arrow keys, or W and S, or the arrows at the foot of the screen.</li><li><b>Turn:</b> the left and right arrow keys, or A and D, or drag the view sideways.</li><li><b>Look closer:</b> click any picture to see it on its own, with its details.</li><li><b>Find one quickly:</b> open All works for thumbnails, and click one to be taken to it.</li><li><b>Be shown round:</b> press Auto tour and the gallery walks you past every picture. Click anywhere to stop.</li></ul>');
  glass('index', [0, 0], N, 215, 'All works', 'Thumbnails of every picture', '');
  // The first corner you turn carries the note about the artist; the first digital image is announced where it hangs.
  if (halls[1]) glass('about', halls[1].cells[1], halls[1].dir, clearSide(halls[1]), 'About the artist', SITE.name, `<h2>About</h2>${SITE.about.map((p) => `<p>${p}</p>`).join('')}${shopLink}<p><a class="button" href="about.html#contact">Contact</a></p>`);
  const firstDigital = hung.find((h) => h.work.kind === 'digital');
  if (firstDigital) { const hall = halls[firstDigital.hall]; glass('digital', hall.cells[0], hall.dir, clearSide(hall), 'Digital images', 'From here on', '<h2>Digital images</h2><p>From this hallway on, the pictures are digital images. Some of them are the pictures a painting earlier in the gallery was based on.</p>'); }
  const lastHall = halls[halls.length - 1];
  glass('end', lastHall.cells[lastHall.cells.length - 1], lastHall.dir, clearSide(lastHall), 'End of the gallery', 'Thank you for walking through',
    `<h2>That is the gallery</h2><p>Thank you for walking through.</p>${shopLink}<p><button type="button" class="button" data-go="entrance">Back to the entrance</button></p><p><button type="button" class="button quiet" data-open="index">All works</button></p><p class="small">All work &copy; ${SITE.name}. Please ask before reproducing any image.</p>`);

  // ── Where you are ────────────────────────────────────────────────────────
  const START = { x: 0, z: CELL * 0.75, yaw: 0 };              // in the lobby, looking up the first hallway
  function remember() { try { sessionStorage.setItem('gallery-place', [Math.round(me.x), Math.round(me.z), Math.round(me.yaw)].join(',')); } catch (_) { /* it still works for this page */ } }
  function recall() {
    try {
      const want = new URLSearchParams(location.search).get('at');
      if (want && spots[want]) return { ...spots[want] };
      const [x, z, yaw] = (sessionStorage.getItem('gallery-place') || '').split(',').map(Number);
      if (Number.isFinite(x) && Number.isFinite(z) && Number.isFinite(yaw) && canStand(x, z)) return { x, z, yaw };
    } catch (_) { /* start at the entrance */ }
    return { ...START };
  }
  let me = recall();

  // A picture's image is asked for only once you are near it. Pictures round the next corner or two count as near.
  let lastLook = { x: 1e9, z: 1e9 };
  function look() {
    camera.position.set(me.x, EYE, me.z);
    camera.rotation.set(0, -THREE.MathUtils.degToRad(me.yaw), 0);
    camera.updateMatrixWorld();      // so a click is judged from where you now stand, even before the next frame is drawn
    ask();
    if (Math.hypot(me.x - lastLook.x, me.z - lastLook.z) < 160) return;
    lastLook = { x: me.x, z: me.z };
    let nearest = null;
    for (const h of hung) {
      const far = Math.hypot(h.x - me.x, h.z - me.z);
      if (!nearest || far < nearest.far) nearest = { far, h };
      if (far < 2700 && !h.loaded) {
        h.loaded = true;
        loader.load(h.work.small, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); h.picture.material.map = tex; h.picture.material.color.set('#ffffff'); h.picture.material.needsUpdate = true; ask(); });
      }
    }
    $('where').textContent = (tour ? 'Auto tour: ' : '') + (nearest.far < 700 ? nearest.h.work.title : `Hallway ${nearest.h.hall + 1} of ${halls.length}`) + (tour ? '. Click anywhere to stop.' : '');
  }
  function fit() {
    const w = view.clientWidth, h = view.clientHeight;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix(); ask();
  }

  // ── Walking and turning ──────────────────────────────────────────────────
  const WALK = 820, TURN = 95;                 // units a second, and degrees a second
  const held = {};
  const KEYS = { ArrowUp: 'on', w: 'on', W: 'on', ArrowDown: 'back', s: 'back', S: 'back', ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right' };
  let last = performance.now(), wasMoving = false;
  function frame(now) {
    const dt = Math.min(0.12, (now - last) / 1000); last = now;      // on a slow computer you still cover the same ground each second
    let moved = false;
    if (tour && Sheet.closed()) { tourStep(dt); moved = true; }
    else if (Sheet.closed()) {
      if (held.left) { me.yaw -= TURN * dt; moved = true; }
      if (held.right) { me.yaw += TURN * dt; moved = true; }
      const go = (held.on ? 1 : 0) - (held.back ? 1 : 0);
      if (go) {
        const a = THREE.MathUtils.degToRad(me.yaw), dx = Math.sin(a) * WALK * dt * go, dz = -Math.cos(a) * WALK * dt * go;
        // Try the whole step; if a wall is in the way, slide along it.
        if (canStand(me.x + dx, me.z + dz)) { me.x += dx; me.z += dz; } else if (canStand(me.x + dx, me.z)) me.x += dx; else if (canStand(me.x, me.z + dz)) me.z += dz;
        moved = true;
      }
    }
    if (!moved && wasMoving) remember();
    wasMoving = moved;
    if (moved) look();
    if (redraw) { redraw = false; renderer.render(scene, camera); }
    requestAnimationFrame(frame);
  }
  // Take the visitor straight to a spot. The halls wind, so there is no straight line to glide along:
  // the view dims, you are set down in front of the picture, and the view returns.
  let carrying = null;
  function goTo(to) {
    clearTimeout(carrying);
    view.classList.add('carried');
    carrying = setTimeout(() => { me = { ...to }; lastLook = { x: 1e9, z: 1e9 }; look(); remember(); view.classList.remove('carried'); }, 260);
  }

  // ── The automatic tour ───────────────────────────────────────────────────
  // The gallery walks you round: along each hallway, round each corner, stopping
  // in front of every picture for a few seconds before moving on. It begins from
  // wherever you are standing and ends at the last picture. A click anywhere, a
  // click on a picture, or any walking key stops it at once, where you are.
  //
  // HOW IT MOVES
  // The route is one line through the gallery: from where you stand, through the
  // middle of the halls, to the viewing spot in front of each picture in turn.
  // Three things keep the movement smooth:
  //   1. Speed. The tour gathers speed gently on leaving a picture and loses it
  //      gently on reaching the next. It never starts or stops at full speed.
  //   2. Position. The camera does not sit on the line; it follows a point that
  //      runs along the line, as if on a soft spring. That rounds every corner.
  //   3. Facing. The camera looks at the picture it is leaving, turns part of the
  //      way towards where it is going, and turns to the next picture as it
  //      arrives, all in one movement. Between two pictures on the same wall it
  //      only glances along the hall, so it does not swing away and back.
  const order = [...cells.values()];                         // the cells in the order you walk them
  const cellAt = (x, z) => order.findIndex((c) => c.i === Math.round(x / CELL) && c.j === Math.round(z / CELL));
  const TOUR_SPEED = 360;        // the most it travels, in units a second
  const TOUR_GATHER = 210;       // how quickly it gathers and loses speed, in units a second, each second
  const TOUR_LOOK = 4200;        // milliseconds in front of each picture
  const TOUR_SOFT = 0.32;        // seconds the camera trails the point it follows: larger is softer
  const TOUR_HEAD = 0.5;         // the same for the turn of the head
  const shortTurn = (from, to) => ((to - from + 540) % 360) - 180;
  const ease = (n) => { const k = Math.max(0, Math.min(1, n)); return k * k * (3 - 2 * k); };   // 0 to 1, slow at both ends
  const between = (from, to, share) => from + shortTurn(from, to) * share;                       // part of the way from one angle to another
  // Whether the straight line from one point to another keeps to the floor, clear of the walls.
  function clearWay(p, q) {
    const far = Math.hypot(q.x - p.x, q.z - p.z), parts = Math.max(1, Math.ceil(far / 45));
    for (let n = 0; n <= parts; n++) if (!canStand(p.x + (q.x - p.x) * n / parts, p.z + (q.z - p.z) * n / parts)) return false;
    return true;
  }
  let tour = null;
  function startTour() {
    let here = Math.max(0, cellAt(me.x, me.z));
    // Begin with the first picture that is not behind you; if you are at the end, begin again from the entrance.
    let first = hung.findIndex((h) => cellAt(spots[h.work.id].x, spots[h.work.id].z) >= here);
    if (first < 0) { first = 0; me = { ...START }; lastLook = { x: 1e9, z: 1e9 }; here = cellAt(START.x, START.z); }
    // The route, cell by cell, with a stop in front of each picture.
    const rough = [{ x: me.x, z: me.z, stop: { yaw: me.yaw } }];
    for (const h of hung.slice(first)) {
      const spot = spots[h.work.id], there = cellAt(spot.x, spot.z);
      for (let c = here + 1; c <= there; c++) rough.push({ x: order[c].i * CELL, z: order[c].j * CELL });
      rough.push({ x: spot.x, z: spot.z, stop: { yaw: spot.yaw } });
      here = there;
    }
    // Leave out any middle-of-the-hall point the route can pass in a straight line, so it does not zigzag
    // from picture to middle to picture along a wall.
    const points = [rough[0]];
    for (let n = 1; n < rough.length; n++) {
      const next = rough[n + 1];
      if (!rough[n].stop && next && clearWay(points[points.length - 1], next)) continue;
      points.push(rough[n]);
    }
    // How far along the route each point is.
    let along = 0;
    points.forEach((p, n) => { if (n) along += Math.hypot(p.x - points[n - 1].x, p.z - points[n - 1].z); p.at = along; });
    const stops = points.filter((p) => p.stop).map((p) => ({ at: p.at, yaw: p.stop.yaw }));
    tour = { points, stops, next: 1, at: 0, speed: 0, wait: 0, moveX: 0, moveZ: 0, turning: 0 };
    for (const k in held) held[k] = false;
    document.documentElement.classList.add('touring');
    $('btn-tour').textContent = 'Stop the tour';
  }
  function stopTour() {
    if (!tour) return;
    tour = null;
    document.documentElement.classList.remove('touring');
    $('btn-tour').textContent = 'Auto tour';
    lastLook = { x: 1e9, z: 1e9 }; look();          // so the words at the top stop saying a tour is running
    remember();
  }
  // The point a given distance along the route.
  function onRoute(at) {
    const points = tour.points;
    let n = 1;
    while (n < points.length - 1 && points[n].at < at) n++;
    const p = points[n - 1], q = points[n], span = q.at - p.at || 1, share = Math.max(0, Math.min(1, (at - p.at) / span));
    return { x: p.x + (q.x - p.x) * share, z: p.z + (q.z - p.z) * share };
  }
  // Follow a value as if joined to it by a soft spring that never overshoots. Returns the new value and its speed.
  function follow(value, speed, gap, soft, dt) {
    const pull = 1 / (soft * soft), drag = 2 / soft;
    speed += (pull * gap - drag * speed) * dt;
    return [value + speed * dt, speed];
  }
  // One moment of the tour. A long moment is taken as several short ones, so the springs stay steady on a slow computer.
  function tourStep(dt) {
    for (let parts = Math.ceil(dt / 0.02), n = 0; n < parts && tour; n++) tourMoment(dt / parts);
  }
  function tourMoment(dt) {
    // After the last picture there is nowhere further to go: stand in front of it for its time, then end.
    const from = tour.stops[tour.next - 1], to = tour.stops[tour.next] || from;
    if (to === from && tour.wait <= 0) { stopTour(); return; }
    // 1. Speed: stand in front of the picture for a while, then gather speed, and lose it again on the way in.
    if (tour.wait > 0) tour.wait -= dt * 1000;
    else {
      const left = to.at - tour.at;
      tour.speed = Math.min(TOUR_SPEED, tour.speed + TOUR_GATHER * dt, Math.max(14, Math.sqrt(2 * TOUR_GATHER * left)));
      tour.at = Math.min(to.at, tour.at + tour.speed * dt);
      if (to.at - tour.at < 0.5) { tour.at = to.at; tour.speed = 0; tour.wait = TOUR_LOOK; tour.next++; }
    }
    // 2. Position: trail the point on the route.
    const point = onRoute(tour.at);
    [me.x, tour.moveX] = follow(me.x, tour.moveX, point.x - me.x, TOUR_SOFT, dt);
    [me.z, tour.moveZ] = follow(me.z, tour.moveZ, point.z - me.z, TOUR_SOFT, dt);
    // 3. Facing: from the picture left behind, by way of the hall ahead, to the picture coming up.
    const gone = tour.at - from.at, left = Math.max(0, to.at - tour.at), whole = to.at - from.at;
    let facing = between(from.yaw, to.yaw, whole > 0 ? ease(gone / whole) : 1);
    const ahead = onRoute(Math.min(to.at, tour.at + 240)), dx = ahead.x - me.x, dz = ahead.z - me.z;
    if (Math.hypot(dx, dz) > 30) {
      // How far the head turns towards the way ahead: fully on a long walk, only a glance between neighbours on one wall.
      const sameWall = Math.abs(shortTurn(from.yaw, to.yaw)) < 1 && whole < CELL * 1.2;
      const share = ease(Math.min(gone, left) / 700) * (sameWall ? 0.45 : 1);
      facing = between(facing, Math.atan2(dx, -dz) * 180 / Math.PI, share);
    }
    [me.yaw, tour.turning] = follow(me.yaw, tour.turning, shortTurn(me.yaw, facing), TOUR_HEAD, dt);
  }
  $('btn-tour').addEventListener('click', () => (tour ? stopTour() : startTour()));

  document.addEventListener('keydown', (e) => {
    if (!Sheet.closed() || e.target.closest('input, textarea, select')) return;
    if (KEYS[e.key]) { stopTour(); held[KEYS[e.key]] = true; e.preventDefault(); }
  });
  document.addEventListener('keyup', (e) => { if (KEYS[e.key]) held[KEYS[e.key]] = false; });
  window.addEventListener('blur', () => { for (const k in held) held[k] = false; });
  for (const b of document.querySelectorAll('#pad button[data-hold]')) {
    const up = () => { held[b.dataset.hold] = false; };
    b.addEventListener('pointerdown', (e) => { e.preventDefault(); stopTour(); held[b.dataset.hold] = true; });
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  }

  // Drag sideways to look around. A drag is not a click, so letting go over a picture does not open it.
  const canvas = renderer.domElement, ray = new THREE.Raycaster(), point = new THREE.Vector2();
  const under = (e) => {
    const r = canvas.getBoundingClientRect();
    point.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(point, camera);
    const hit = ray.intersectObjects(clickable, false)[0];
    return hit && hit.distance < 2200 ? hit.object.userData : null;
  };
  let drag = null, dragged = false;
  canvas.addEventListener('pointerdown', (e) => { stopTour(); drag = { x: e.clientX, yaw: me.yaw }; dragged = false; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => {
    if (drag) {
      const dx = e.clientX - drag.x;
      if (Math.abs(dx) > 6) dragged = true;
      if (dragged) { me.yaw = drag.yaw - dx * 0.2; look(); }
    } else canvas.style.cursor = under(e) ? 'pointer' : 'grab';
  });
  canvas.addEventListener('pointerup', (e) => {
    const was = drag; drag = null;
    if (was && dragged) { remember(); return; }
    const hit = under(e);
    if (!hit) return;
    remember();
    if (hit.work) Sheet.openWork(hit.work); else if (hit.panel === 'index') Sheet.openIndex(); else Sheet.openText(fullText[hit.panel]);
  });

  // The sheets ask to be taken somewhere: to a picture chosen from the thumbnails, or back to the entrance.
  Sheet.onTake = (id) => { stopTour(); if (spots[id]) goTo(spots[id]); };
  Sheet.onEntrance = () => { stopTour(); goTo(START); };
  $('btn-help').addEventListener('click', () => Sheet.openText(fullText.welcome));
  $('btn-start').addEventListener('click', () => { stopTour(); goTo(START); });

  // The wall follows the choice made at the top of the page, here as on every page.
  new MutationObserver(() => setWall(document.documentElement.getAttribute('data-wall'))).observe(document.documentElement, { attributes: true, attributeFilter: ['data-wall'] });
  setWall(document.documentElement.getAttribute('data-wall'));
  window.addEventListener('resize', fit);
  fit(); look();
  requestAnimationFrame(frame);
  // For checking by hand or by a test: the shape of the building, where you are, and a way to be taken to a work.
  window.GalleryHall = {
    where: () => ({ ...me }), goTo: (id) => goTo(spots[id]), works: hung.length, loaded: () => hung.filter((h) => h.loaded).length,
    touring: () => Boolean(tour), halls: halls.length, cells: cells.size,
    // The tour run ahead at sixty moments a second without drawing, for checking how smoothly it moves.
    tourTrace: (seconds) => { const trace = []; for (let n = 0; n < seconds * 60 && tour; n++) { tourStep(1 / 60); if (tour) trace.push([me.x, me.z, me.yaw]); } look(); return trace; },
    perWall: (() => { const n = {}; places.forEach((p) => { const k = p.hall + ':' + TURN_OF.get(p.side); n[k] = (n[k] || 0) + 1; }); return Object.values(n); })(),
    finishes: () => halls.map((_, n) => finishOfHall(firstWall, n)), perHall: halls.map((_, n) => hung.filter((h) => h.hall === n).length), spot: (id) => spots[id], canStand,
  };
}
