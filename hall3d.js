// The gallery in three dimensions: a run of rooms you walk through, each opening into the next through a doorway.
// Drawn with three.js (the copy in the vendor folder; nothing is fetched from another site).
//
// WHEN THIS RUNS
// Only on a screen wide enough to walk around in, and only where the browser
// can draw 3D. On a phone, or anywhere this cannot run, the page stays as it
// is written: a wall of framed pictures. Nothing below changes that page.
//
// THE PLAN OF THE BUILDING
// The floor is a grid of square cells. A ROOM is a block of two cells by two.
// Between one room and the next is a single cell, which is the DOORWAY: a
// wide cased opening with a lower head, as between the rooms of a museum.
// The rooms run in rows of four, back and forth (seen from above; you start
// in room 1):
//
//        +-----+   +-----+   +-----+   +-----+
//        |  1   ===   2   ===   3   ===   4  |        === and || are doorways
//        +-----+   +-----+   +-----+   +--||-+
//        +-----+   +-----+   +-----+   +--||-+
//        |  8   ===   7   ===   6   ===   5  |
//        +--||-+   +-----+   +-----+   +-----+
//           ...
//
// THE CENTREPIECE
// One work can be named as the featured work (in works.js). It does not hang
// with the others. It hangs alone and larger on a wall of its own that stands
// across the middle of the first room, facing the way in, under the artist's
// name, so it is the first thing a visitor sees, straight ahead.
//
// WHAT IS IN A ROOM
// Pictures hang two to a wall, on the two walls that have no doorway in them,
// so a room holds four. (The last room has no way out, so its end wall takes
// what is left over; a wall takes three if that avoids one hanging alone.)
// Two of the statues are mathematical surfaces in polished metal, z = xy and
// z = xy², that turn and are labelled. They are described where they are made.
// Each room has its own wall finish, a spotlight on a ceiling track for every
// picture, and the name of the next room over each doorway. In the middle of
// a room is a bench to sit and look from, or in some rooms a fountain. Beside
// each doorway, in front of the plain half of the wall, a statue stands on a
// plinth. Paintings come first, then the digital images.
//
// MEASURES are in units of the 3D space, about a hundredth of an inch each.
// x runs to the right, y runs up from the floor, and z runs towards you, so
// "north" (straight ahead at the start) is smaller z.
//
// WHERE YOU ARE is three numbers: x, z and the way you face (0 is north, 90 is
// east). They are remembered while the tab is open, so every picture, panel
// and page can bring you back to the same spot.
import * as THREE from './vendor/three.module.js';
import { populate } from './people3d.js';
import { createSound } from './sound3d.js';
import { Reflector } from './vendor/Reflector.js';

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
  const CELL = 900, HEIGHT = 720, EYE = 310;
  const DOOR = 540;            // how high a doorway is. The rooms are higher.
  const KEEP_OFF = 130;        // how close you can get to a wall
  const PER_ROOM = 4, IN_A_ROW = 4;
  const N = [0, -1], E = [1, 0], S = [0, 1], W = [-1, 0];
  const leftOf = (d) => (d === N ? W : d === S ? E : d === E ? N : S);
  const rightOf = (d) => (d === N ? E : d === S ? W : d === E ? S : N);
  const opposite = (d) => (d === N ? S : d === S ? N : d === E ? W : E);
  const yawOf = (d) => (d === N ? 0 : d === E ? 90 : d === S ? 180 : -90);
  const key = (i, j) => i + ',' + j;
  // Paintings first, then any digital images; within each, the order they are listed in (works.js sets it).
  const hangingOrder = [...DATA.works.filter((w) => w.kind === 'painting'), ...DATA.works.filter((w) => w.kind === 'digital')];
  // The centrepiece, if one is named, comes first and has a wall of its own; the rest fill the rooms.
  const star = hangingOrder.find((w) => w.id === DATA.site.featured) || null;
  const works = star ? [star, ...hangingOrder.filter((w) => w !== star)] : hangingOrder;
  const onWalls = works.length - (star ? 1 : 0);                 // how many hang on the walls of the rooms
  // The AI-generated images hang last and have a room to themselves (build.js checks that the paintings fill
  // their rooms exactly). This is that room's number, or -1 when there are none.
  const aiCount = works.filter((w) => w.kind === 'digital').length;
  const aiRoom = aiCount ? Math.floor((onWalls - aiCount) / 4) : -1;

  // The rooms, in the order you walk them. Each is two cells by two; rooms are three cells apart, which leaves
  // one cell between neighbours for the doorway.
  const cells = new Map();     // every cell of floor, by "i,j": { i, j, hall (the room it belongs to), passage }
  const rooms = [];
  const roomCount = Math.max(1, Math.floor(onWalls / PER_ROOM));
  for (let n = 0; n < roomCount; n++) {
    const row = Math.floor(n / IN_A_ROW), k = n % IN_A_ROW, column = row % 2 === 0 ? k : IN_A_ROW - 1 - k;
    const room = { index: n, i: column * 3, j: row * 3, x: (column * 3 + 0.5) * CELL, z: (row * 3 + 0.5) * CELL, door: null };
    for (const a of [0, 1]) for (const b of [0, 1]) cells.set(key(room.i + a, room.j + b), { i: room.i + a, j: room.j + b, hall: n });
    rooms.push(room);
  }
  // Which way you leave each room, and so which way you come into the next. `way` is the way you are walking
  // as you come in (the first room has no way in, so it takes the way out).
  rooms.forEach((room, n) => {
    const next = rooms[n + 1];
    room.out = next ? (next.j > room.j ? S : next.i > room.i ? E : W) : null;
    room.in = n ? rooms[n - 1].out : null;
    room.way = room.in || room.out || E;
    room.turns = Boolean(room.out) && room.out !== room.way;      // you leave by a side wall, not the wall ahead
    if (!next) return;
    // The doorway out: the one cell between this room and the next.
    const d = room.out, i = d === E ? room.i + 2 : d === W ? room.i - 1 : room.i, j = d === S ? room.j + 2 : room.j;
    cells.set(key(i, j), { i, j, hall: n + 1, passage: true });
    room.door = { x: i * CELL, z: j * CELL, dir: d };
  });

  // Where the pictures hang, in walking order. A place is a point on a wall: { x, z, side, room, narrow }.
  // `side` is the wall it is on, and `along` in the working below is a distance along that wall from its middle.
  const places = [];
  const hang = (room, side, axis, along, narrow) => places.push({ x: room.x + side[0] * CELL + axis[0] * along, z: room.z + side[1] * CELL + axis[1] * along, side, room: room.index, narrow: Boolean(narrow) });
  const full = roomCount * PER_ROOM, extra = Math.max(0, onWalls - full);       // what the last room's end wall must take
  // The centrepiece's wall stands across the middle of the first room. It is a little over a picture wide, so
  // there is room to walk round either end, and thin. The picture hangs on the face you see as you come in.
  const FEATURE_WIDE = 760, FEATURE_THICK = 36;
  if (star) { const r = rooms[0]; places.push({ x: r.x - r.way[0] * FEATURE_THICK / 2, z: r.z - r.way[1] * FEATURE_THICK / 2, side: r.way, room: 0, narrow: false, feature: true }); }
  for (const room of rooms) {
    const way = room.way, L = leftOf(way), R = rightOf(way), last = room.index === roomCount - 1;
    if (room.turns) {
      // A corner room. Its free walls are the one facing the way out and the one ahead of you as you come in.
      const back = opposite(room.out);
      hang(room, back, way, -450); hang(room, back, way, 450);
      hang(room, way, room.out, -450); hang(room, way, room.out, 450);
    } else if (last && extra === 1) {
      // One picture over: the left wall takes three, so that none hangs alone.
      hang(room, L, way, -600, true); hang(room, L, way, 0, true); hang(room, L, way, 600, true);
      hang(room, R, way, 450); hang(room, R, way, -450);
    } else {
      // You walk straight through. Left wall and right wall, looked at in pairs: one, turn round, the one opposite.
      hang(room, L, way, -450); hang(room, R, way, -450); hang(room, R, way, 450); hang(room, L, way, 450);
      // The last room has a wall where the way out would be, and it takes what is left over.
      if (last && extra === 2) { hang(room, way, R, -450); hang(room, way, R, 450); }
      if (last && extra === 3) { hang(room, way, R, -600, true); hang(room, way, R, 0, true); hang(room, way, R, 600, true); }
    }
  }
  places.length = Math.min(places.length, works.length);
  const centre = (i, j) => [i * CELL, j * CELL];
  const inPath = (x, z) => cells.has(key(Math.round(x / CELL), Math.round(z / CELL)));
  // Things standing on the floor that you walk round: the benches. Each is { x, z, hx, hz }, a centre and half-sizes.
  const blockers = [];
  const blocked = (x, z) => blockers.some((b) => Math.abs(x - b.x) < b.hx + 50 && Math.abs(z - b.z) < b.hz + 50);
  // You may stand where the floor is, not too near a wall (all four corners of your footprint must be on the floor),
  // and not in a bench.
  const canStand = (x, z) => inPath(x - KEEP_OFF, z - KEEP_OFF) && inPath(x + KEEP_OFF, z - KEEP_OFF) && inPath(x - KEEP_OFF, z + KEEP_OFF) && inPath(x + KEEP_OFF, z + KEEP_OFF) && !blocked(x, z);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#070605');
  scene.fog = new THREE.Fog('#070605', 2400, 7000);        // the rooms beyond fall away into shadow
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

  // SHADOW AND SHADE. Real rooms are darker where surfaces meet and where things stand. Two small pictures do that
  // work here. `soft` is a round dark patch that fades out at its edge: the shadow a frame throws on its wall, and
  // the shadow under a bench, a plinth or a fountain. `creep` is a band that is dark along its bottom and its top
  // and clear between: laid over every wall, it darkens the wall where it meets the floor and the ceiling.
  const soft = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 20, 64, 64, 64);
    r.addColorStop(0, 'rgba(0,0,0,1)'); r.addColorStop(0.55, 'rgba(0,0,0,0.6)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadowOf = (wide, deep, strength) => new THREE.Mesh(new THREE.PlaneGeometry(wide, deep), new THREE.MeshBasicMaterial({ map: soft, transparent: true, opacity: strength, depthWrite: false }));
  const onFloor = (wide, deep, strength) => { const s = shadowOf(wide, deep, strength); s.rotation.x = -Math.PI / 2; s.position.y = 1.2; return s; };
  const creepMaterial = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const g = c.getContext('2d'), v = g.createLinearGradient(0, 0, 0, 256);                 // from the top of the wall down to the floor
    v.addColorStop(0, 'rgba(0,0,0,0.62)'); v.addColorStop(0.2, 'rgba(0,0,0,0.12)'); v.addColorStop(0.4, 'rgba(0,0,0,0)');
    v.addColorStop(0.8, 'rgba(0,0,0,0)'); v.addColorStop(0.93, 'rgba(0,0,0,0.22)'); v.addColorStop(1, 'rgba(0,0,0,0.6)');
    g.fillStyle = v; g.fillRect(0, 0, 4, 256);
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  })();

  // The way a wall on each side of a cell faces (its front looks into the cell), as a turn about the upright.
  const TURN_OF = new Map([[N, 0], [S, 180], [W, 90], [E, -90]]);
  const wallGeometry = new THREE.PlaneGeometry(CELL, HEIGHT), skirtGeometry = new THREE.PlaneGeometry(CELL, 22);
  const skirtMaterial = new THREE.MeshBasicMaterial({ color: '#6f6a5f' });
  // Every room has its own wall finish, so the walls change as you go through a doorway. The finishes follow one
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
  // A wall stands wherever a cell has no floor beside it. It takes the finish of the room its cell belongs to.
  const wallPieces = [];
  for (const c of cells.values()) {
    const [cx, cz] = centre(c.i, c.j);
    for (const d of [N, E, S, W]) {
      if (cells.has(key(c.i + d[0], c.j + d[1]))) continue;                    // the floor carries on that way: no wall
      const m = new THREE.Mesh(wallGeometry, finish('grey'));
      m.position.set(cx + d[0] * CELL / 2, HEIGHT / 2, cz + d[1] * CELL / 2); m.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(d));
      const skirt = new THREE.Mesh(skirtGeometry, skirtMaterial); skirt.position.set(0, -HEIGHT / 2 + 11, 1.5); m.add(skirt);
      scene.add(m);
      const creep = new THREE.Mesh(wallGeometry, creepMaterial); creep.position.z = 0.6; m.add(creep);
      wallPieces.push({ mesh: m, hall: c.hall });
    }
  }
  // Over each doorway the wall carries on, from the head of the opening up to the ceiling, on both of its faces.
  // Each face belongs to the room it looks into. Its share of the wall's pattern is the top share, so it lines up.
  const overDoor = new THREE.PlaneGeometry(CELL, HEIGHT - DOOR);
  for (let n = 0, uv = overDoor.attributes.uv; n < uv.count; n++) uv.setY(n, DOOR / HEIGHT + uv.getY(n) * (1 - DOOR / HEIGHT));
  // A doorway has two mouths, one in each room. `mouths` lists them: where, which way the wall faces, and the room.
  const mouths = [];
  for (const room of rooms) {
    if (!room.door) continue;
    const { x, z, dir } = room.door;
    mouths.push({ x: x - dir[0] * CELL / 2, z: z - dir[1] * CELL / 2, wall: dir, room: room.index, leadsTo: room.index + 1 });
    mouths.push({ x: x + dir[0] * CELL / 2, z: z + dir[1] * CELL / 2, wall: opposite(dir), room: room.index + 1, leadsTo: room.index });
  }
  for (const mouth of mouths) {
    const m = new THREE.Mesh(overDoor, finish('grey'));
    m.position.set(mouth.x, (DOOR + HEIGHT) / 2, mouth.z); m.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(mouth.wall));
    scene.add(m);
    wallPieces.push({ mesh: m, hall: mouth.room });
  }
  // The wall chosen at the top of the page is the first room's; the rest follow in order from it.
  const finishOfHall = (first, hall) => ORDER[(Math.max(0, ORDER.indexOf(first)) + hall) % ORDER.length];
  let firstWall = 'grey';
  function setWall(name) {
    firstWall = WALLS[name] ? name : 'grey';
    for (const p of wallPieces) p.mesh.material = finish(finishOfHall(firstWall, p.hall));
    ask();
  }

  // ── Floor and ceiling ────────────────────────────────────────────────────
  // The floor is marble tiles, two across each cell, drawn once onto a small canvas and repeated. It is shown
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
  const floorMaterial = new THREE.MeshBasicMaterial({ map: marble, color: new THREE.Color('#ffffff').multiplyScalar(0.3), transparent: true, opacity: 0.8 }), ceilingMaterial = new THREE.MeshBasicMaterial({ color: '#0f0d0b' }), lightMaterial = new THREE.MeshBasicMaterial({ color: '#8a7d66' });
  for (const c of cells.values()) {
    const [cx, cz] = centre(c.i, c.j);
    const floor = new THREE.Mesh(slab, floorMaterial); floor.rotation.x = -Math.PI / 2; floor.position.set(cx, 0, cz); scene.add(floor);
    // A doorway's ceiling is the head of the opening; a room's is higher, with a small lamp over each cell.
    const ceiling = new THREE.Mesh(slab, ceilingMaterial); ceiling.rotation.x = Math.PI / 2; ceiling.position.set(cx, c.passage ? DOOR : HEIGHT, cz); scene.add(ceiling);
    if (c.passage) continue;
    const light = new THREE.Mesh(lightGeometry, lightMaterial); light.rotation.x = Math.PI / 2; light.position.set(cx, HEIGHT - 1.5, cz); scene.add(light);
  }

  // THE POLISH ON THE FLOOR. One mirror lies just under the whole floor, and the marble above it is partly
  // see-through, so the room shows in the floor: faintly, and dimmed, as in polished stone. The mirror draws the
  // room a second time each frame. It is switched off while a statue photographs the room for its own reflections.
  let polish = null;
  {
    let lowI = 1e9, highI = -1e9, lowJ = 1e9, highJ = -1e9;
    for (const c of cells.values()) { lowI = Math.min(lowI, c.i); highI = Math.max(highI, c.i); lowJ = Math.min(lowJ, c.j); highJ = Math.max(highJ, c.j); }
    polish = new Reflector(new THREE.PlaneGeometry((highI - lowI + 1) * CELL, (highJ - lowJ + 1) * CELL), { textureWidth: 1024, textureHeight: 1024, color: 0x9a9a9a, clipBias: 0.003 });
    polish.rotation.x = -Math.PI / 2; polish.position.set((lowI + highI) / 2 * CELL, -0.6, (lowJ + highJ) / 2 * CELL);
    scene.add(polish);
  }


  // ── Doorways ─────────────────────────────────────────────────────────────
  // Each mouth of a doorway has a pale surround, as a cased opening has: two uprights and a head. Over it, on the
  // wall, is the name of the room it leads to. (The first room's way out carries the gallery's own name instead,
  // which is put up further down with the glass panels.)
  const trimMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color('#e6dfd0').multiplyScalar(0.3) });
  const upright = new THREE.BoxGeometry(34, DOOR, 40), head = new THREE.BoxGeometry(CELL, 34, 40);
  for (const mouth of mouths) {
    const group = new THREE.Group();
    group.position.set(mouth.x, 0, mouth.z); group.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(mouth.wall));
    for (const side of [-1, 1]) { const post = new THREE.Mesh(upright, trimMaterial); post.position.set(side * (CELL / 2 - 17), DOOR / 2, 0); group.add(post); }
    const top = new THREE.Mesh(head, trimMaterial); top.position.set(0, DOOR - 17, 0); group.add(top);
    // Over the doorway: the room's number, or its name if it is the room of AI-generated images.
    const signWide = mouth.leadsTo === aiRoom ? 620 : 420;
    const name = wordsTexture([{ text: mouth.leadsTo === aiRoom ? 'AI-generated images' : 'Gallery ' + (mouth.leadsTo + 1), size: 40, serif: true, colour: 'rgba(255,255,255,0.82)' }], { width: signWide, pad: 14, centred: true });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(signWide, name.height), new THREE.MeshBasicMaterial({ map: name.texture, transparent: true, depthWrite: false }));
    sign.position.set(0, (DOOR + HEIGHT) / 2 + 4, 3); group.add(sign);
    scene.add(group);
  }

  // ── Benches ──────────────────────────────────────────────────────────────
  // Somewhere to sit and look, in the middle of each room: a long bench where you walk straight through, lying
  // the way you walk, and a square one in a corner room, set clear of the two walls you walk along. The last
  // room has none: the closing glass panel hangs there. You walk round a bench, and so does the tour.
  // Every other room you walk straight through has a fountain in the middle instead (built further down).
  const fountainRooms = new Set(rooms.filter((r) => !r.turns && r.index !== roomCount - 1 && !(star && r.index === 0)).filter((_, n) => n % 2 === 0).map((r) => r.index));
  // THE COFFEE STAND. One room has a coffee and pastry stand in the middle of it in place of a bench: the first
  // room you walk straight through that has neither the centrepiece nor a fountain. It is a wooden cart under a
  // striped awning, with a coffee machine, a stack of cups, a glass case of pastries, a sign along each side and a
  // price list on each front. The people at it (the vendor and two customers) are made in people3d.js, which is
  // told where the stand is. The cart, and the vendor's place behind it, cannot be walked through.
  const coffeeRoom = (rooms.find((r) => !r.turns && r.index !== roomCount - 1 && !fountainRooms.has(r.index) && !(star && r.index === 0)) || {}).index;
  let coffee = null;
  function coffeeStand(room) {
    const way = room.way, left = leftOf(way), alongX = way === E || way === W;        // the cart's length lies along the way you walk
    const cart = new THREE.Group();
    cart.position.set(room.x, 0, room.z); cart.rotation.y = alongX ? Math.PI / 2 : 0;   // built with its length along z, then turned if need be
    const wood = new THREE.MeshStandardMaterial({ color: '#7a4f2c', roughness: 0.7 }), dark = new THREE.MeshStandardMaterial({ color: '#33241a', roughness: 0.6 });
    const chrome = new THREE.MeshStandardMaterial({ color: '#c9ccd0', metalness: 0.85, roughness: 0.25 }), china = new THREE.MeshStandardMaterial({ color: '#f6f3ec', roughness: 0.4 });
    const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); cart.add(mesh); return mesh; };
    add(new THREE.Mesh(new THREE.BoxGeometry(116, 138, 300), wood), 0, 81, 0);                                   // the body of the cart
    add(new THREE.Mesh(new THREE.BoxGeometry(132, 10, 316), dark), 0, 155, 0);                                    // the counter top
    for (const end of [-1, 1]) for (const side of [-1, 1]) {
      const wheel = add(new THREE.Mesh(new THREE.CylinderGeometry(22, 22, 9, 20), dark), side * 62, 22, end * 112); wheel.rotation.z = Math.PI / 2;
      add(new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 255, 10), chrome), side * 60, 287, end * 150);     // a post of the awning
    }
    // The awning: two sloping sides, striped red and cream.
    const stripe = (() => {
      const c = document.createElement('canvas'); c.width = 256; c.height = 16;
      const g = c.getContext('2d');
      for (let n = 0; n < 8; n++) { g.fillStyle = n % 2 ? '#f3ead8' : '#b3312a'; g.fillRect(n * 32, 0, 32, 16); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.center.set(0.5, 0.5); t.rotation = Math.PI / 2; return t;      // turned, so the stripes run down the slope
    })();
    const canvas = new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.85, side: THREE.DoubleSide });
    for (const side of [-1, 1]) { const slope = add(new THREE.Mesh(new THREE.BoxGeometry(88, 2.5, 340), canvas), side * 37, 432, 0); slope.rotation.z = -side * 0.5; }      // each side slopes down from the ridge
    add(new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 340, 10), chrome), 0, 453, 0).rotation.x = Math.PI / 2;                 // the ridge pole
    // The coffee machine, the cups, the tip jar and the case of pastries.
    add(new THREE.Mesh(new THREE.BoxGeometry(70, 62, 78), chrome), 0, 191, -100);
    add(new THREE.Mesh(new THREE.BoxGeometry(74, 9, 82), dark), 0, 226, -100);
    for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 16, 10), dark), side * 36, 186, -86).rotation.z = Math.PI / 2;
    for (let n = 0; n < 5; n++) add(new THREE.Mesh(new THREE.CylinderGeometry(9, 7, 13, 14), china), -28, 167 + n * 9, -30);
    add(new THREE.Mesh(new THREE.CylinderGeometry(10, 9, 22, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#cfe4ea', transparent: true, opacity: 0.45, roughness: 0.1, side: THREE.DoubleSide })), 30, 171, -30);
    const glass = new THREE.MeshStandardMaterial({ color: '#dff1f5', transparent: true, opacity: 0.22, roughness: 0.05, depthWrite: false });
    add(new THREE.Mesh(new THREE.BoxGeometry(108, 62, 124), glass), 0, 191, 78);
    add(new THREE.Mesh(new THREE.BoxGeometry(100, 3, 116), china), 0, 190, 78);                                   // the shelf in the case
    const crust = new THREE.MeshStandardMaterial({ color: '#c98a3c', roughness: 0.8 }), choc = new THREE.MeshStandardMaterial({ color: '#4a2a18', roughness: 0.7 }), icing = new THREE.MeshStandardMaterial({ color: '#f0a6c2', roughness: 0.5 });
    for (const [x, y, z, kind] of [[-30, 168, 40, 0], [0, 168, 44, 1], [30, 168, 40, 2], [-28, 168, 82, 2], [4, 168, 86, 0], [32, 168, 84, 1], [-30, 198, 50, 1], [0, 198, 56, 2], [30, 198, 52, 0], [-22, 198, 100, 0], [18, 198, 104, 2]]) {
      if (kind === 0) { const croissant = add(new THREE.Mesh(new THREE.TorusGeometry(9, 4.6, 8, 14, Math.PI * 1.15), crust), x, y, z); croissant.rotation.x = -Math.PI / 2; }
      if (kind === 1) { add(new THREE.Mesh(new THREE.CylinderGeometry(8, 6.5, 9, 12), china), x, y + 1, z); add(new THREE.Mesh(new THREE.SphereGeometry(9.5, 14, 10), choc), x, y + 8, z).scale.y = 0.75; }
      if (kind === 2) { const ring = add(new THREE.Mesh(new THREE.TorusGeometry(8, 4.4, 8, 16), icing), x, y, z); ring.rotation.x = -Math.PI / 2; }
    }
    // The sign along each side, under the awning, and the price list on each front of the cart.
    const sign = wordsTexture([{ text: 'COFFEE  &  PASTRIES', size: 30, serif: true, colour: '#f6ecd6' }], { width: 300, pad: 12, paper: '#3a2418', edge: '#c9a25a', centred: true });
    const prices = wordsTexture([{ text: 'Coffee  6.50', size: 22, serif: true, colour: '#f6ecd6', gap: 2 }, { text: 'Latte  7.25', size: 22, serif: true, colour: '#f6ecd6', gap: 2 }, { text: 'Muffin  5.00', size: 22, serif: true, colour: '#f6ecd6', gap: 2 }, { text: 'Refills are not free', size: 12, colour: '#d9c9a8' }], { width: 170, pad: 12, paper: '#2c3a32', edge: '#c9a25a', centred: true });
    for (const side of [-1, 1]) {
      const board = add(new THREE.Mesh(new THREE.PlaneGeometry(300, sign.height), new THREE.MeshBasicMaterial({ map: sign.texture })), side * 64, 388, 0); board.rotation.y = side * Math.PI / 2;
      const list = add(new THREE.Mesh(new THREE.PlaneGeometry(150, prices.height * 150 / 170), new THREE.MeshBasicMaterial({ map: prices.texture })), side * 58.6, 84, 0); list.rotation.y = side * Math.PI / 2;
    }
    cart.add(onFloor(330, 520, 0.6));                                                                              // its shadow on the floor
    scene.add(cart);
    // What cannot be walked through: the cart, and the vendor's place on its right-hand side.
    const off = [-left[0] * 38, -left[1] * 38];
    blockers.push({ x: room.x + off[0], z: room.z + off[1], hx: alongX ? 175 : 113, hz: alongX ? 113 : 175 });
    coffee = { x: room.x, z: room.z, way, left };
  }

  const leather = new THREE.MeshStandardMaterial({ color: '#2b1c14', roughness: 0.55 }), steel = new THREE.MeshStandardMaterial({ color: '#17171a', metalness: 0.4, roughness: 0.5 });
  for (const room of rooms) {
    if (room.index === roomCount - 1 && roomCount > 1) continue;
    if (fountainRooms.has(room.index) || (star && room.index === 0)) continue;       // a fountain, or the centrepiece's wall, stands there instead
    if (room.index === coffeeRoom) { coffeeStand(room); continue; }                     // the coffee stand takes this room's middle
    const way = room.way, square = room.turns;
    const x = room.x + (square ? way[0] * -105 + room.out[0] * 105 : 0), z = room.z + (square ? way[1] * -105 + room.out[1] * 105 : 0);
    const across = square ? 260 : 150, length = square ? 260 : 520;            // across the way you walk, and along it
    const bench = new THREE.Group();
    bench.position.set(x, 0, z); bench.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(way));
    const seat = new THREE.Mesh(new THREE.BoxGeometry(across, 30, length), leather); seat.position.y = 148; bench.add(seat);
    for (const end of [-1, 1]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(across - 24, 133, 18), steel); leg.position.set(0, 66.5, end * (length / 2 - 46)); bench.add(leg); }
    bench.add(onFloor(across + 150, length + 150, 0.6));                       // the bench's shadow on the floor
    scene.add(bench);
    const lengthwise = way === E || way === W;                                  // the bench's length lies along x
    blockers.push({ x, z, hx: (lengthwise ? length : across) / 2, hz: (lengthwise ? across : length) / 2 });
  }

  // ── Words drawn onto a flat panel ────────────────────────────────────────
  // three.js draws pictures, not text, so a label or a glass panel is first drawn
  // on a small canvas and then shown as a picture of its own.
  function wordsTexture(lines, { width, pad = 22, paper = null, edge = null, centred = false }) {
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
      g.font = fonts[r.i]; g.fillStyle = l.colour; g.textBaseline = 'top'; g.textAlign = centred ? 'center' : 'left';
      g.fillText(r.text, centred ? c.width / 2 : pad * scale, y);
      y += l.size * 1.32 * scale + (r.last ? (l.gap || 0) * scale : 0);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return { texture: t, height };
  }

  // ── Hanging the pictures ─────────────────────────────────────────────────
  // Each work is a small group fixed to its wall: a pool of light, a frame, a
  // card mount for digital images, the picture, a brass lamp above, a label below, and a
  // spotlight on a track on the ceiling, turned towards it.
  const clickable = [], hung = [], spots = {};
  const glow = (() => {                    // a soft warm pool of light, used behind every picture
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'), r = g.createRadialGradient(128, 100, 8, 128, 128, 128);
    r.addColorStop(0, 'rgba(255,232,190,1)'); r.addColorStop(0.4, 'rgba(255,232,190,0.5)'); r.addColorStop(1, 'rgba(255,232,190,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256);
    return new THREE.CanvasTexture(c);
  })();
  const brass = new THREE.MeshStandardMaterial({ color: '#d6b050', metalness: 0.35, roughness: 0.4 });
  const trackMaterial = new THREE.MeshStandardMaterial({ color: '#141416', metalness: 0.3, roughness: 0.6 }), lensMaterial = new THREE.MeshBasicMaterial({ color: '#ffe6b8' });
  const canGeometry = new THREE.CylinderGeometry(17, 20, 54, 14), lensGeometry = new THREE.SphereGeometry(13, 12, 8);
  const OFF = 2, BACK = 660;       // a picture's distance off its wall, and how far back you stand to look at it
  works.forEach((work, n) => {
    const p = places[n], d = p.side;
    const x = p.x - d[0] * OFF, z = p.z - d[1] * OFF, turn = TURN_OF.get(d);
    const shape = work.w / work.h;
    const w = p.feature ? Math.min(600, 395 * shape) : Math.min(p.narrow ? 400 : 520, 330 * shape), h = w / shape, f = p.feature ? 34 : 26, mount = work.mount ? 34 : 0;       // the centrepiece hangs larger, in a wider frame
    const outerW = w + (f + mount) * 2, outerH = h + (f + mount) * 2;
    const group = new THREE.Group();
    group.position.set(x, EYE + 14, z); group.rotation.y = THREE.MathUtils.degToRad(turn);

    const pool = new THREE.Mesh(new THREE.PlaneGeometry(outerW * 2.0, outerH * 2.5), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6 }));
    // The shadow the frame throws on the wall: a little larger than the frame, and dropped, since the light is above.
    const cast = shadowOf(outerW * 1.3, outerH * 1.32, 0.62); cast.position.set(0, -outerH * 0.07, 2.4); group.add(cast);
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
    const words = wordsTexture([{ text: work.title, size: 21, serif: true, colour: '#1d1c1a', gap: 3 }, { text: (p.feature ? 'Featured work  ·  ' : '') + work.kindLabel + (work.buy ? '  ·  for sale' : ''), size: 13, colour: '#6b675f' }], { width: labelW, pad: 13, paper: '#f6f2ea' });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(labelW, words.height), new THREE.MeshBasicMaterial({ map: words.texture }));
    label.position.set(-outerW / 2 + labelW / 2, -outerH / 2 - 26 - words.height / 2, 3); group.add(label);

    // The track on the ceiling, out from the wall, and the spotlight on it: a small can tilted at the picture, with a warm lens.
    const up = HEIGHT - (EYE + 14), out = 430, tilt = Math.atan2(out, up - 60);
    const track = new THREE.Mesh(new THREE.BoxGeometry(760, 9, 16), trackMaterial); track.position.set(0, up - 6, out); group.add(track);
    const can = new THREE.Mesh(canGeometry, trackMaterial); can.position.set(0, up - 44, out); can.rotation.x = tilt; group.add(can);
    const lens = new THREE.Mesh(lensGeometry, lensMaterial); lens.position.set(0, up - 44 - Math.cos(tilt) * 27, out - Math.sin(tilt) * 27); group.add(lens);

    for (const part of [picture, frame, label]) { part.userData.work = work.id; clickable.push(part); }
    scene.add(group);
    hung.push({ work, picture, x, z, hall: p.room, loaded: false });
    // To look at it you stand back from its wall, facing it.
    spots[work.id] = { x: x - d[0] * BACK, z: z - d[1] * BACK, yaw: yawOf(d) };
  });

  // ── Glass panels: the words of the gallery, hanging in the air ───────────
  // Each shows a few words as you pass, and opens its full text over the gallery when clicked.
  // A panel is hung at a point, facing whoever walks in the direction `walking`.
  const SITE = DATA.site, fullText = {};
  function glass(id, at, walking, title, under, full) {
    const width = 300;
    const words = wordsTexture([{ text: title, size: 30, serif: true, colour: '#ffffff', gap: 6 }, { text: under, size: 16, colour: 'rgba(255,255,255,0.9)', gap: 12 }, { text: 'Click to read', size: 12, weight: 600, colour: 'rgba(255,255,255,0.75)' }],
      { width, pad: 26, paper: 'rgba(190,225,240,0.20)', edge: 'rgba(255,255,255,0.75)' });
    const group = new THREE.Group();
    group.position.set(at.x, EYE + 36, at.z);
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
  // A wall with a doorway has the doorway in one half and is plain in the other. Glass panels hang in front
  // of the plain half of the wall you leave by, where you see them as you walk towards the way out; statues
  // stand in front of the other plain halves. This gives the middle of the plain half of wall `d`, on the
  // wall, and the direction along the wall away from the doorway. `door` is the doorway in that wall.
  function plainHalf(room, d = room.out, door = room.door) {
    const wall = { x: room.x + d[0] * CELL, z: room.z + d[1] * CELL };
    const toDoor = [Math.sign(door.x - d[0] * CELL / 2 - wall.x), Math.sign(door.z - d[1] * CELL / 2 - wall.z)];
    return { x: wall.x - toDoor[0] * CELL / 2, z: wall.z - toDoor[1] * CELL / 2, away: [-toDoor[0], -toDoor[1]], d };
  }
  // A point in front of that half: `off` out from the wall, and `slide` along it.
  const before = (half, off, slide = 0) => ({ x: half.x - half.d[0] * off + half.away[0] * slide, z: half.z - half.d[1] * off + half.away[1] * slide });
  const welcomeText = `<h2>${SITE.name}</h2><p>${SITE.tagline}.</p><p>This is a gallery you walk through: a run of rooms, each opening into the next. Every room has its own walls and four pictures hung in pairs, with a bench or a fountain in the middle and statues beside the doorways.${DATA.works.some((w) => w.kind === 'digital') ? ' The paintings come first, then the digital images.' : ''}</p>`
    + '<h3>Moving</h3><ul><li><b>Walk:</b> the up and down arrow keys, or W and S, or the arrows at the foot of the screen.</li><li><b>Turn:</b> the left and right arrow keys, or A and D, or drag the view sideways.</li><li><b>Look closer:</b> click any picture to see it on its own, with its details.</li><li><b>Find one quickly:</b> open Thumbnails, and click one to be taken to it.</li><li><b>Be shown round:</b> press Auto tour and the gallery walks you past every picture. Click anywhere to stop.</li><li><b>People and sound:</b> the People button takes the other visitors away or brings them back. The Sound button turns on the sounds of the gallery; it starts off.</li></ul>';
  const closingText = `<h2>That is the gallery</h2><p>Thank you for walking through.</p><p><button type="button" class="button" data-go="entrance">Back to the entrance</button></p><p><button type="button" class="button quiet" data-open="index">All works</button></p>${DATA.cinema ? `<p><a class="button quiet" href="${DATA.cinema.href}">Into the cinema</a></p>` : ''}<p class="small">${SITE.rights || ''}</p>${(SITE.use || []).map((p) => `<p class="small">${p}</p>`).join('')}`;
  const firstRoom = rooms[0], lastRoom = rooms[roomCount - 1];
  const panelRooms = new Set();          // rooms whose way-out wall has a glass panel in front of its plain half
  if (star) {
    // The centrepiece's wall: a thin wall the height of the room, across the middle of the first room. The artist's name
    // is on it, above the picture. You walk round it, and so does the tour.
    const r = firstRoom, across = rightOf(r.way);
    const stands = new THREE.Mesh(new THREE.BoxGeometry(FEATURE_WIDE, HEIGHT, FEATURE_THICK), new THREE.MeshBasicMaterial({ color: new THREE.Color('#7b736a').multiplyScalar(ROOM * 1.15) }));
    stands.position.set(r.x, HEIGHT / 2, r.z); stands.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(r.way)); scene.add(stands);
    blockers.push({ x: r.x, z: r.z, hx: (across[0] ? FEATURE_WIDE : FEATURE_THICK) / 2, hz: (across[1] ? FEATURE_WIDE : FEATURE_THICK) / 2 });
    const name = wordsTexture([{ text: SITE.name, size: 50, serif: true, colour: 'rgba(255,255,255,0.92)' }], { width: 700, pad: 10, centred: true });
    const title = new THREE.Mesh(new THREE.PlaneGeometry(700, name.height), new THREE.MeshBasicMaterial({ map: name.texture, transparent: true, depthWrite: false }));
    title.position.set(r.x - r.way[0] * (FEATURE_THICK / 2 + 3), 662, r.z - r.way[1] * (FEATURE_THICK / 2 + 3)); title.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(r.way)); scene.add(title);
    // The welcome and the thumbnails hang one at the middle of each side wall, between its two pictures, where they
    // are in view from the way in to either side of the centrepiece.
    const L = leftOf(r.way), R = rightOf(r.way);
    glass('welcome', { x: r.x + L[0] * (CELL - 80), z: r.z + L[1] * (CELL - 80) }, L, 'Welcome', 'How to walk the gallery', welcomeText);
    glass('index', { x: r.x + R[0] * (CELL - 80), z: r.z + R[1] * (CELL - 80) }, R, 'All works', 'Thumbnails of every picture', '');
  } else if (firstRoom.out) {
    // The first room: the welcome and the thumbnails side by side, and the gallery's name on the wall above them.
    const half = plainHalf(firstRoom); panelRooms.add(0);
    glass('welcome', before(half, 170, -170), half.d, 'Welcome', 'How to walk the gallery', welcomeText);
    glass('index', before(half, 170, 170), half.d, 'All works', 'Thumbnails of every picture', '');
    const name = wordsTexture([{ text: SITE.name, size: 62, serif: true, colour: 'rgba(255,255,255,0.9)', gap: 8 }, { text: SITE.tagline, size: 22, colour: 'rgba(255,255,255,0.7)' }], { width: 760, pad: 16, centred: true });
    const title = new THREE.Mesh(new THREE.PlaneGeometry(760, name.height), new THREE.MeshBasicMaterial({ map: name.texture, transparent: true, depthWrite: false }));
    const on = before(half, 3); title.position.set(on.x, 606, on.z); title.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(half.d)); scene.add(title);
  } else { glass('welcome', { x: firstRoom.x, z: firstRoom.z }, firstRoom.way, SITE.name, SITE.tagline, welcomeText); fullText.index = ''; }
  // The second room carries the note about the artist; the room where the digital images begin says so.
  if (rooms[1] && rooms[1].out) panelRooms.add(1);
  if (rooms[1] && rooms[1].out) glass('about', before(plainHalf(rooms[1]), 170), rooms[1].out, 'About the artist', SITE.name, `<h2>About</h2>${SITE.about.map((p) => `<p>${p}</p>`).join('')}${(SITE.made || []).length ? '<h3>How the work was made</h3>' + SITE.made.map((p) => `<p>${p}</p>`).join('') : ''}<p><a class="button" href="about.html#contact">Contact</a></p>`);
  const firstDigital = hung.find((h) => h.work.kind === 'digital'), digitalRoom = firstDigital ? rooms[firstDigital.hall] : null;
  if (digitalRoom && digitalRoom.out && digitalRoom.index > 1) panelRooms.add(digitalRoom.index);
  if (digitalRoom && digitalRoom.out && digitalRoom.index > 1) glass('digital', before(plainHalf(digitalRoom), 170), digitalRoom.out, 'AI-generated images', 'From here on', `<h2>AI-generated images</h2><p>From here on, the pictures were generated with AI. They are not paintings, and they carry no signature.</p><p>${SITE.digitalNote || ''}</p>`);
  // The last room has the globe in the middle of it (made further down), so the closing panel hangs near the end
  // wall, to the right of the cinema's door, facing you as you come in.
  if (roomCount > 1) { const w = lastRoom.way, r = rightOf(w); glass('end', { x: lastRoom.x + w[0] * 740 + r[0] * 560, z: lastRoom.z + w[1] * 740 + r[1] * 560 }, w, 'End of the gallery', 'Thank you for walking through', closingText); }

  // ── The cinema, just off the last room ────────────────────────────────────
  // Its entrance stands in the middle of the end wall, the one you face as you come in: a dark doorway with a
  // still from the first film glowing inside it, purple posts and head, and a lit sign above. Clicking any part
  // of it takes you into the cinema, which is a page of its own.
  if (DATA.cinema && roomCount > 1 && !lastRoom.out) {
    const way = lastRoom.way, door = new THREE.Group();
    door.position.set(lastRoom.x + way[0] * (CELL - 3), 0, lastRoom.z + way[1] * (CELL - 3));
    door.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(way));          // turned as a picture on that wall is: its front faces the room
    const enter = (mesh) => { mesh.userData.go = DATA.cinema.href; clickable.push(mesh); door.add(mesh); return mesh; };
    const dark = enter(new THREE.Mesh(new THREE.PlaneGeometry(330, 506), new THREE.MeshBasicMaterial({ color: '#05030d' }))); dark.position.set(0, 253, 3);
    // The stills of every film, shown in turn, a few seconds each. Films are different shapes, so each still is
    // fitted inside the same space (262 wide, 200 high) and never stretched.
    const still = enter(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#8a84a8' }))); still.position.set(0, 300, 6); still.scale.set(262, 192, 1);
    const stills = [];
    const showStill = (t) => { const shape = t.image.width / t.image.height, wide = Math.min(262, 200 * shape); still.scale.set(wide, wide / shape, 1); still.material.color.set('#ffffff'); still.material.map = t; still.material.needsUpdate = true; };
    (DATA.cinema.posters || [DATA.cinema.poster]).forEach((src, n) => loader.load(src, (t) => { t.colorSpace = THREE.SRGBColorSpace; stills[n] = t; if (n === 0) showStill(t); }));
    let showing = 0;
    setInterval(() => { const ready = stills.filter(Boolean); if (ready.length < 2) return; showing = (showing + 1) % ready.length; showStill(ready[showing]); }, 4000);
    const trim = new THREE.MeshStandardMaterial({ color: '#3a1870', emissive: '#2a0f5a', emissiveIntensity: 0.7, roughness: 0.6 });
    for (const side of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(36, 524, 44), trim); post.position.set(side * 183, 262, 22); door.add(post); }
    const head = new THREE.Mesh(new THREE.BoxGeometry(402, 36, 44), trim); head.position.set(0, 542, 22); door.add(head);
    const words = wordsTexture([{ text: DATA.cinema.title.toUpperCase(), size: 46, serif: true, colour: '#ffffff', gap: 6 }, { text: DATA.cinema.by, size: 20, colour: '#9dffd4' }], { width: 580, pad: 22, paper: 'rgba(13,10,34,0.97)', edge: '#ffd98a', centred: true });
    const sign = enter(new THREE.Mesh(new THREE.PlaneGeometry(580, words.height), new THREE.MeshBasicMaterial({ map: words.texture }))); sign.position.set(0, Math.min(HEIGHT - words.height / 2 - 12, 572 + words.height / 2), 26);
    const invite = wordsTexture([{ text: 'Cinema', size: 28, serif: true, colour: '#ffffff', gap: 4 }, { text: 'Click to go in', size: 13, weight: 600, colour: '#9dffd4' }], { width: 220, pad: 16, paper: 'rgba(13,10,34,0.9)', edge: 'rgba(176,107,255,0.9)', centred: true });
    const plate = enter(new THREE.Mesh(new THREE.PlaneGeometry(220, invite.height), new THREE.MeshBasicMaterial({ map: invite.texture, transparent: true }))); plate.position.set(0, 120, 8);
    const glow = new THREE.PointLight('#b06bff', 2.6, 1000, 0); glow.position.set(0, 420, 260); door.add(glow);
    scene.add(door);
    // A place to stand in front of it, so the cinema page can bring you back here (walk.html?at=cinema).
    spots.cinema = { x: door.position.x - way[0] * 640, z: door.position.z - way[1] * 640, yaw: yawOf(way) };
  }

  // ── Statues ──────────────────────────────────────────────────────────────
  // A statue stands on a plinth in front of the plain half of each wall that has a doorway in it: one beside
  // the way in to a room and one beside the way out (unless a glass panel hangs there). Like the pictures, each
  // is lit: a pool of light on the wall behind it and on the floor round it. You walk round a plinth.
  //
  // There are no sculpted figures here, because a figure has to be modelled by hand. These are turned and
  // built forms of the kind a gallery shows between its pictures: an urn, a standing form, a bronze knot,
  // an armillary sphere, an obelisk and a broken column. Each is drawn from a few measurements below.
  const marbleStone = new THREE.MeshStandardMaterial({ color: '#cdc7ba', roughness: 0.5, side: THREE.DoubleSide });
  const bronze = new THREE.MeshStandardMaterial({ color: '#7a5330', metalness: 0.55, roughness: 0.42, side: THREE.DoubleSide });
  const plinthStone = new THREE.MeshStandardMaterial({ color: '#8f8a80', roughness: 0.8 });
  // A shape turned on a lathe: a list of [how far out, how high] points, spun round the upright.
  const turned = (points, material) => new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 40), material);
  // TWO SURFACES. The first two statues are not turned forms but mathematical surfaces, made of polished metal:
  //   z = xy       a hyperbolic paraboloid, shown as the twisted square: cut square so that it fills a cube, with
  //                one of its two families of straight lines level. The level line turns a quarter turn from the
  //                bottom of the cube to the top, so the square sheet looks twisted. All four edges are straight.
  //   z = xy²      a right conoid: a ruled cubic surface, straight in one direction and a parabola in the other
  // Each is drawn from its own equation, point by point. Each turns slowly about its z axis, which stands
  // upright, and has a spotlight of its own. The metal mirrors the room round it: the room is photographed
  // from where the statue stands, every few seconds, and that picture is what the metal reflects. A plate on
  // the plinth gives the equation and the name of the shape.
  //
  // A surface is made from a grid of points (x, y), each lifted to the height z its equation gives. In the
  // 3D space here "up" is y, so a point (x, y, z) of the mathematics is placed at (x, z, y).
  // `upright` stands the surface on edge: x runs across, y runs UP and z runs back, each to the same scale, so a
  // surface cut square fills a cube. Without it, z is the height and the surface lies like a table top.
  // A ready-made shape can be given in place of the grid, as `ready`: the half sphere is. `spin` is the way it
  // turns: 1 carries the near side from left to right, -1 from right to left.
  function surface(height, points, across, deep, tint, plate, upright = false, ready = null, spin = 1) {
    const WIDE = 78, TALL = 62;                   // half the width of the surface, and how high its highest point rises
    const corners = [], faces = [];
    for (const [x, y] of points) { if (upright) corners.push(x * WIDE, y * WIDE, height(x, y) * WIDE); else corners.push(x * WIDE, height(x, y) * TALL, y * WIDE); }
    for (let a = 0; a < deep; a++) for (let b = 0; b < across; b++) {
      const p = a * (across + 1) + b;
      faces.push(p, p + across + 1, p + 1, p + 1, p + across + 1, p + across + 2);
    }
    const shape = new THREE.BufferGeometry();
    shape.setAttribute('position', new THREE.Float32BufferAttribute(corners, 3)); shape.setIndex(faces); shape.computeVertexNormals();
    const mirror = new THREE.WebGLCubeRenderTarget(128), eye = new THREE.CubeCamera(20, 6000, mirror);
    const metal = new THREE.MeshStandardMaterial({ color: tint, metalness: 1, roughness: 0.08, envMap: mirror.texture, envMapIntensity: 1.5, side: THREE.DoubleSide });
    const form = new THREE.Group(), stem = new THREE.Mesh(new THREE.CylinderGeometry(5, 11, 58, 16), metal); stem.position.y = 29; form.add(stem);
    const sheet = new THREE.Mesh(ready || shape, metal); sheet.position.y = 58 + (upright ? WIDE : TALL) + 6; form.add(sheet);
    form.userData.surface = { plate, mirror, eye, spin };
    return form;
  }
  // (rings gives points on rings about the middle, for a surface cut round. Neither surface uses it now.)
  const rings = (count, round) => { const p = []; for (let a = 0; a <= count; a++) for (let b = 0; b <= round; b++) { const r = a / count, turn = b / round * Math.PI * 2; p.push([r * Math.cos(turn), r * Math.sin(turn)]); } return p; };
  // The conoid is cut square, so its straight edges and its parabolas both show.
  const square = (count) => { const p = []; for (let a = 0; a <= count; a++) for (let b = 0; b <= count; b++) p.push([b / count * 2 - 1, a / count * 2 - 1]); return p; };
  const turning = [];            // the surfaces that turn
  const FORMS = [
    () => surface((x, y) => x * y, square(44), 44, 44, '#f1d48a', ['z = xy', 'Hyperbolic paraboloid', 'The twisted square: every edge is a straight line, yet the surface curves.'], true),
    () => surface((x, y) => x * y * y, square(44), 44, 44, '#dfe6ee', ['z = xy\u00b2', 'Right conoid', 'A ruled cubic surface: straight lines one way, parabolas the other.'], true),
    // Half a sphere: a sphere cut in two through its upright z axis, leaving a thin shell that is a mirror on both
    // faces, hollow on one and domed on the other. It turns the opposite way to the other two.
    () => surface(null, [], 0, 0, '#e8c9a8', ['x\u00b2 + y\u00b2 + z\u00b2 = r\u00b2', 'Hemisphere', 'Half a sphere, cut through its upright axis: a mirror that curves in on one face and out on the other.'], true, new THREE.SphereGeometry(78, 64, 40, 0, Math.PI), -1),
    // A pyramid of mirrored gold that reflects the room on every face, with a brighter capstone, and a beam of light rising from its point straight to
    // the ceiling. The beam is two see-through cones of light, a bright core inside a faint wide one, with a pool
    // of light where it meets the ceiling. It shimmers a little. The pyramid turns, the near side going from left to right.
    () => {
      const R = 88, TALL = 178, CUT = 0.64;                 // half the diagonal of the base, the height, and how far up the capstone begins
      const mirror = new THREE.WebGLCubeRenderTarget(128), eye = new THREE.CubeCamera(20, 6000, mirror);
      const gold = new THREE.MeshStandardMaterial({ color: '#fff0b8', metalness: 1, roughness: 0.03, envMap: mirror.texture, envMapIntensity: 1.7, flatShading: true });
      // The whole pyramid is mirror metal and reflects the room: a deeper gold below, and a paler, brighter gold for the capstone.
      const stone = new THREE.MeshStandardMaterial({ color: '#c79a4e', metalness: 1, roughness: 0.07, envMap: mirror.texture, envMapIntensity: 1.5, flatShading: true });
      const form = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(R * (1 - CUT), R, TALL * CUT, 4), stone); body.rotation.y = Math.PI / 4; body.position.y = TALL * CUT / 2; form.add(body);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(R * (1 - CUT), TALL * (1 - CUT), 4), gold); cap.rotation.y = Math.PI / 4; cap.position.y = TALL * CUT + TALL * (1 - CUT) / 2; form.add(cap);
      // The beam: from the point of the capstone to the ceiling. Its light is brightest at the point and thins as it rises.
      const fade = (() => {
        const c = document.createElement('canvas'); c.width = 8; c.height = 256;
        const g = c.getContext('2d'), up = g.createLinearGradient(0, 256, 0, 0);
        up.addColorStop(0, 'rgba(255,244,214,1)'); up.addColorStop(0.5, 'rgba(255,240,200,0.55)'); up.addColorStop(1, 'rgba(255,236,190,0.28)');
        g.fillStyle = up; g.fillRect(0, 0, 8, 256);
        return new THREE.CanvasTexture(c);
      })();
      const rise = HEIGHT - (PLINTH + 12) - TALL, beam = [];
      for (const [low, high, strength] of [[2, 9, 0.9], [5, 30, 0.3]]) {
        const light = new THREE.MeshBasicMaterial({ map: fade, color: '#fff2cf', transparent: true, opacity: strength, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
        const cone = new THREE.Mesh(new THREE.CylinderGeometry(high, low, rise, 28, 1, true), light); cone.position.y = TALL + rise / 2; form.add(cone);
        beam.push({ light, strength });
      }
      const pool = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.85 }));
      pool.rotation.x = Math.PI / 2; pool.position.y = TALL + rise - 2; form.add(pool);
      const spark = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 12), new THREE.MeshBasicMaterial({ color: '#fff6dc' })); spark.position.y = TALL + 2; form.add(spark);
      form.userData.surface = { plate: ['Pyramid', 'Square pyramid', 'Mirrored on every face, with a brighter capstone. A beam of light rises from its point to the ceiling.'], mirror, eye, spin: 1, beam, eyeAt: 12 + TALL * 0.55 };
      return form;
    },
    () => turned([[0, 0], [24, 0], [28, 6], [15, 18], [30, 42], [47, 82], [51, 118], [43, 152], [25, 176], [17, 192], [19, 214], [29, 228], [31, 233], [24, 236], [0, 236]], marbleStone),      // an urn
    () => turned([[0, 0], [36, 0], [38, 8], [21, 20], [16, 62], [22, 112], [31, 152], [35, 178], [27, 202], [12, 216], [10, 226], [18, 238], [21, 252], [17, 266], [0, 272]], bronze),          // a standing form
    () => {                                                                                                                                                                                  // a bronze knot on a stem
      const g = new THREE.Group(), stem = new THREE.Mesh(new THREE.CylinderGeometry(7, 12, 60, 16), bronze); stem.position.y = 30; g.add(stem);
      const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(52, 15, 140, 18, 2, 3), bronze); knot.position.y = 132; g.add(knot);
      return g;
    },
    () => {                                                                                                                                                                                  // an armillary sphere
      const g = new THREE.Group(), stem = turned([[0, 0], [26, 0], [28, 6], [10, 18], [7, 70], [12, 78], [0, 80]], bronze); g.add(stem);
      const ball = new THREE.Mesh(new THREE.SphereGeometry(26, 24, 16), marbleStone); ball.position.y = 160; g.add(ball);
      for (const [x, z] of [[0, 0], [Math.PI / 2, 0], [Math.PI / 3, Math.PI / 4], [Math.PI / 2, Math.PI / 2]]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(76, 3.6, 10, 64), bronze); ring.position.y = 160; ring.rotation.set(x, 0, z); g.add(ring); }
      return g;
    },
    () => {                                                                                                                                                                                  // an obelisk
      const g = new THREE.Group(), shaft = new THREE.Mesh(new THREE.CylinderGeometry(15, 36, 232, 4), marbleStone); shaft.position.y = 116; shaft.rotation.y = Math.PI / 4; g.add(shaft);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(15, 30, 4), marbleStone); tip.position.y = 247; tip.rotation.y = Math.PI / 4; g.add(tip);
      return g;
    },
    () => {                                                                                                                                                                                  // a broken column
      const g = new THREE.Group(), base = new THREE.Mesh(new THREE.BoxGeometry(96, 16, 96), marbleStone); base.position.y = 8; g.add(base);
      const foot = turned([[0, 16], [44, 16], [46, 24], [38, 32], [0, 32]], marbleStone); g.add(foot);
      const fluted = new THREE.MeshStandardMaterial({ color: '#cdc7ba', roughness: 0.5, flatShading: true });
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(33, 37, 176, 20), fluted); shaft.position.y = 120; g.add(shaft);
      const broken = new THREE.Mesh(new THREE.CylinderGeometry(22, 33, 26, 7), fluted); broken.position.y = 220; broken.rotation.z = 0.12; g.add(broken);
      return g;
    },
  ];
  const PLINTH = 210;                    // how high a plinth stands
  let statues = 0, ordinary = 0;         // how many statues stand so far, and how many of them took their form in turn

  // THE PHARAOH. A gold funerary mask in the Egyptian manner, for the last room: a face, the striped headcloth
  // with its two lappets, a cobra on the brow, a plaited beard, and a broad collar set with rows of jewels. It
  // is mirror gold and reflects the room; the stripes are lapis blue; the jewels are turquoise, carnelian red
  // and lapis. Like everything else here it is put together from simple shapes. It turns from right to left.
  function pharaoh() {
    const mirror = new THREE.WebGLCubeRenderTarget(128), eye = new THREE.CubeCamera(20, 6000, mirror);
    const shiny = (colour, more = {}) => new THREE.MeshStandardMaterial({ color: colour, metalness: 1, roughness: 0.08, envMap: mirror.texture, envMapIntensity: 1.6, ...more });
    const gold = shiny('#f4cf6a'), lapis = shiny('#1f3fa8', { metalness: 0.75, roughness: 0.16 });
    // The headcloth is striped across, gold and lapis by turns.
    const stripes = (() => {
      const c = document.createElement('canvas'); c.width = 16; c.height = 256;
      const g = c.getContext('2d');
      g.fillStyle = '#ffdf85'; g.fillRect(0, 0, 16, 256);
      g.fillStyle = '#2b55c9'; for (let n = 0; n < 11; n++) g.fillRect(0, n * 24 + 14, 16, 9);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const cloth = shiny('#ffffff', { map: stripes });
    const form = new THREE.Group();
    const put = (mesh, x, y, z, sx = 1, sy = 1, sz = 1) => { mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); form.add(mesh); return mesh; };
    const ballOf = (r, material) => new THREE.Mesh(new THREE.SphereGeometry(r, 36, 26), material);
    // The shoulders, and the broad collar that lies over them: a sloping band of gold with close rows of beads,
    // each row one stone, edged at the bottom with a row of gold drops.
    put(new THREE.Mesh(new THREE.CylinderGeometry(52, 90, 34, 56), gold), 0, 17, 0, 1, 1, 0.64);
    put(new THREE.Mesh(new THREE.CylinderGeometry(21, 25, 30, 24), gold), 0, 44, 2);                                  // the neck
    const JEWELS = ['#18b5ae', '#c8321f', '#2446b0'];                                                               // turquoise, carnelian, lapis
    const jewel = JEWELS.map((colour) => new THREE.MeshStandardMaterial({ color: colour, metalness: 0.55, roughness: 0.08, envMap: mirror.texture, envMapIntensity: 1.4, emissive: colour, emissiveIntensity: 0.3 }));
    const bead = new THREE.CapsuleGeometry(2.2, 5.5, 4, 10), drop = new THREE.SphereGeometry(3, 12, 10);
    [[56, 31, 0], [62, 26, 1], [68, 21, 2], [74, 16, 0], [80, 11, 1], [86, 6, 2]].forEach(([across, high, stone], row) => {
      const count = Math.round(across * 0.74);
      for (let n = 0; n < count; n++) {
        const turn = (n + (row % 2) * 0.5) / count * Math.PI * 2;
        const b = put(new THREE.Mesh(bead, jewel[stone]), Math.sin(turn) * across, high, Math.cos(turn) * across * 0.64);
        b.rotation.set(0.75 * Math.cos(turn), 0, -0.75 * Math.sin(turn));            // each bead lies down the slope of the collar
      }
    });
    for (let n = 0; n < 44; n++) { const turn = n / 44 * Math.PI * 2; put(new THREE.Mesh(drop, gold), Math.sin(turn) * 90, 2, Math.cos(turn) * 90 * 0.64, 1, 1.5, 1); }
    // The headcloth (the nemes). It covers the top and back of the head and stands out wide to either side, leaving
    // the face clear; two lappets hang down in front of the shoulders, and at the back it is gathered into a tail.
    const wings = new THREE.Mesh(new THREE.CylinderGeometry(47, 92, 112, 48, 1, true, Math.PI * 0.4, Math.PI * 1.2), shiny('#ffffff', { map: stripes, side: THREE.DoubleSide }));
    put(wings, 0, 84, -4, 1, 1, 0.5);
    put(new THREE.Mesh(new THREE.SphereGeometry(49, 40, 22, 0, Math.PI * 2, 0, Math.PI * 0.5), cloth), 0, 124, -2, 1.0, 0.82, 0.96);      // the crown of the head
    for (const side of [-1, 1]) { const flap = put(new THREE.Mesh(new THREE.CylinderGeometry(17, 14, 74, 20), cloth), side * 43, 40, 22, 1, 1, 0.34); flap.rotation.z = side * 0.05; }
    put(new THREE.Mesh(new THREE.CylinderGeometry(9, 12, 46, 16), cloth), 0, 40, -40);                                   // the tail at the back
    put(new THREE.Mesh(new THREE.TorusGeometry(44, 4.2, 10, 44, Math.PI), gold), 0, 127, 13, 1, 0.36, 1).rotation.x = -0.1;   // the gold band across the brow
    // The face.
    put(ballOf(42, gold), 0, 100, 8, 0.84, 1.14, 0.9);
    put(ballOf(27, gold), 0, 72, 14, 0.86, 0.8, 0.82);                                                             // the jaw and chin
    put(ballOf(8, gold), 0, 96, 46, 0.9, 1.5, 1);                                                                  // the nose
    put(ballOf(9, gold), 0, 78, 42, 1.5, 0.42, 0.7);                                                               // the lips
    const white = new THREE.MeshStandardMaterial({ color: '#f6f1e2', roughness: 0.25 }), black = new THREE.MeshStandardMaterial({ color: '#0d0c0b', roughness: 0.15 });
    for (const side of [-1, 1]) {
      put(ballOf(12, gold), side * 37, 98, 2, 0.45, 1.3, 0.9);                                                     // an ear
      put(ballOf(9.5, lapis), side * 16, 108, 37, 1.75, 0.82, 0.5);                                                // the dark line round the eye
      put(ballOf(8, white), side * 16, 108, 39.5, 1.5, 0.62, 0.5);
      put(ballOf(4.4, black), side * 16, 108, 42.5, 1, 1, 0.5);
      const tail = put(new THREE.Mesh(new THREE.CapsuleGeometry(1.7, 15, 4, 8), lapis), side * 34, 108, 27); tail.rotation.set(0, side * 0.75, Math.PI / 2);        // the line drawn out towards the temple
      const brow = put(new THREE.Mesh(new THREE.CapsuleGeometry(2.1, 24, 4, 8), lapis), side * 18, 119, 36); brow.rotation.set(0, side * 0.4, Math.PI / 2 - side * 0.08);
    }
    // The plaited beard, and the cobra on the brow with a jewel for its hood.
    put(new THREE.Mesh(new THREE.CylinderGeometry(5.5, 8.5, 54, 16), cloth), 0, 36, 32).rotation.x = 0.12;
    put(ballOf(8.5, gold), 0, 8, 37, 1, 0.6, 1.2);
    put(new THREE.Mesh(new THREE.CapsuleGeometry(3.4, 20, 6, 10), gold), -3, 140, 42).rotation.x = -0.25;
    put(ballOf(7, gold), -3, 152, 46, 1.25, 1.35, 0.5);
    put(ballOf(3.6, jewel[1]), -3, 152, 50);
    // Beside the cobra, the head of the vulture.
    put(ballOf(5.5, gold), 11, 140, 45, 1, 1.1, 1);
    put(new THREE.Mesh(new THREE.ConeGeometry(2.6, 9, 10), black), 11, 137, 51).rotation.x = 2.2;
    form.scale.setScalar(1.12);
    form.userData.surface = { plate: ['Pharaoh', 'Gold funerary mask', 'Mirror gold, striped with lapis and set with turquoise, carnelian and lapis.'], mirror, eye, spin: -1, eyeAt: 110 };
    return form;
  }
  // `pick`, if given, is the maker of the form that must stand here; otherwise the forms are taken in turn.
  function statue(half, pick = null) {
    const at = before(half, 200), group = new THREE.Group();
    group.position.set(at.x, 0, at.z);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(118, PLINTH, 118), plinthStone); plinth.position.y = PLINTH / 2; group.add(plinth);
    group.add(onFloor(300, 300, 0.62));                                          // the plinth's shadow on the floor
    const cap = new THREE.Mesh(new THREE.BoxGeometry(132, 12, 132), plinthStone); cap.position.y = PLINTH + 6; group.add(cap);
    // The first four statues that take their form in turn are the special ones, one of each: three mirror surfaces and
    // the pyramid. After those come the plain forms, in turn.
    const form = (pick || (ordinary < 4 ? FORMS[ordinary] : FORMS[4 + (ordinary - 4) % (FORMS.length - 4)]))(); if (!pick) ordinary++;
    form.position.y = PLINTH + 12; group.add(form);
    if (form.userData.surface) {
      const made = form.userData.surface, out = [-half.d[0], -half.d[1]];          // `out` is the way from the wall into the room
      // Its own spotlight, on the ceiling out in front of it, shining down on the metal.
      const lamp = new THREE.SpotLight('#fff3dc', 5.5, 1400, 0.36, 0.55, 0);
      lamp.position.set(at.x + out[0] * 300, HEIGHT - 30, at.z + out[1] * 300);
      lamp.target.position.set(at.x, PLINTH + 130, at.z); scene.add(lamp); scene.add(lamp.target);
      const can = new THREE.Mesh(new THREE.CylinderGeometry(17, 20, 54, 14), trackMaterial); can.position.copy(lamp.position); can.lookAt(at.x, PLINTH + 130, at.z); can.rotateX(Math.PI / 2); scene.add(can);
      // The plate on the front of the plinth: the equation, the name of the shape, and what to look for.
      const words = wordsTexture([{ text: made.plate[0], size: made.plate[0].length > 9 ? 16 : made.plate[0].includes('=') ? 30 : 22, serif: true, colour: '#1d1a16', gap: 4 }, { text: made.plate[1], size: 15, weight: 600, colour: '#3a332a', gap: 5 }, { text: made.plate[2], size: 11, colour: '#4a4338' }], { width: 108, pad: 8, paper: '#d9c27a', edge: '#8a7434', centred: true });
      const plate = new THREE.Mesh(new THREE.PlaneGeometry(108, words.height), new THREE.MeshBasicMaterial({ map: words.texture }));
      plate.position.set(out[0] * 60, PLINTH - 14 - words.height / 2, out[1] * 60); plate.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(half.d)); group.add(plate);
      made.eye.position.set(at.x, PLINTH + (made.eyeAt || 140), at.z); scene.add(made.eye);
      form.rotation.y = Math.atan2(out[0], out[1]);
      turning.push({ form, x: at.x, z: at.z, out, spin: made.spin, beam: made.beam || null, eye: made.eye, mirror: made.mirror, since: 99, glint: statues * 1.9 });
    }
    // Light round its foot, and on the wall behind it.
    const floorPool = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.22 }));
    floorPool.rotation.x = -Math.PI / 2; floorPool.position.y = 2; group.add(floorPool);
    scene.add(group);
    const on = before(half, 2.5), wallPool = new THREE.Mesh(new THREE.PlaneGeometry(620, 640), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.42 }));
    wallPool.position.set(on.x, 350, on.z); wallPool.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(half.d)); scene.add(wallPool);
    blockers.push({ x: at.x, z: at.z, hx: 66, hz: 66 });
    statues++;
  }
  for (const room of rooms) {
    // Beside the way in: the doorway there is the one the room before you leaves by.
    // The statue beside the way in to the last room is the pharaoh.
    if (room.index > 0) statue(plainHalf(room, opposite(room.way), rooms[room.index - 1].door), room.index === roomCount - 1 ? pharaoh : null);
    // Beside the way out, where no glass panel hangs.
    if (room.out && !panelRooms.has(room.index)) statue(plainHalf(room));
  }

  // ── Fountains ────────────────────────────────────────────────────────────
  // A fountain stands in the middle of every other room you walk straight through, in place of the bench: a
  // round stone basin of water, a turned stem, a smaller bowl on top, and water falling from the bowl into the
  // basin. The falling water is a picture of streaks that slides downwards, so it moves. It only moves (and
  // the view is only redrawn for it) while you are near enough to see it.
  const streaks = (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    let seed = 11;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let n = 0; n < 90; n++) {
      const x = rnd() * 128, y = rnd() * 256, long = 40 + rnd() * 120, streak = g.createLinearGradient(0, y, 0, y + long);
      streak.addColorStop(0, 'rgba(255,255,255,0)'); streak.addColorStop(0.5, `rgba(255,255,255,${0.25 + rnd() * 0.5})`); streak.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = streak;
      for (const shift of [0, -256]) g.fillRect(x, y + shift, 1 + rnd() * 2.5, long);      // drawn twice so the picture joins top to bottom
    }
    const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 1); return tex;
  })();
  const fallingWater = new THREE.MeshBasicMaterial({ map: streaks, color: '#d9edf5', transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
  const stillWater = new THREE.MeshBasicMaterial({ color: new THREE.Color('#5b8ea3').multiplyScalar(0.55), transparent: true, opacity: 0.9 });
  const fountains = [];
  for (const room of rooms) {
    if (!fountainRooms.has(room.index)) continue;
    const group = new THREE.Group();
    group.position.set(room.x, 0, room.z);
    // The basin: a low stone ring with a moulded lip, turned like the urn, and the water in it.
    group.add(turned([[104, 0], [150, 0], [154, 8], [146, 16], [150, 44], [156, 50], [156, 58], [136, 58], [132, 30], [104, 26]], marbleStone));
    const pond = new THREE.Mesh(new THREE.CircleGeometry(136, 48), stillWater); pond.rotation.x = -Math.PI / 2; pond.position.y = 46; group.add(pond);
    const floorOfBasin = new THREE.Mesh(new THREE.CircleGeometry(136, 32), plinthStone); floorOfBasin.rotation.x = -Math.PI / 2; floorOfBasin.position.y = 26; group.add(floorOfBasin);
    // The stem and the upper bowl.
    group.add(turned([[0, 26], [34, 26], [36, 40], [20, 54], [14, 96], [20, 132], [26, 150], [14, 160], [16, 176], [58, 196], [72, 204], [72, 212], [60, 212], [0, 200]], marbleStone));
    const bowlWater = new THREE.Mesh(new THREE.CircleGeometry(62, 32), stillWater); bowlWater.rotation.x = -Math.PI / 2; bowlWater.position.y = 209; group.add(bowlWater);
    group.add(turned([[0, 200], [9, 200], [7, 236], [12, 246], [0, 258]], bronze));          // the spout in the middle of the bowl
    // The water: a jet up from the spout, and a curtain falling from the lip of the bowl to the basin.
    const jet = new THREE.Mesh(new THREE.CylinderGeometry(3, 9, 46, 10, 1, true), fallingWater); jet.position.y = 280; group.add(jet);
    const curtain = new THREE.Mesh(new THREE.CylinderGeometry(72, 80, 164, 40, 1, true), fallingWater); curtain.position.y = 128; group.add(curtain);
    const floorPool = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 }));
    floorPool.rotation.x = -Math.PI / 2; floorPool.position.y = 2; group.add(floorPool);
    scene.add(group);
    blockers.push({ x: room.x, z: room.z, hx: 150, hz: 150 });
    group.add(onFloor(470, 470, 0.5));                                            // the fountain's shadow on the floor
    fountains.push({ x: room.x, z: room.z, way: room.way });
  }
  // Called every moment: lets the water fall, if a fountain is near enough to be seen.
  // Called every moment: turns the two surfaces, if one is near enough to be seen, and now and then takes a
  // fresh picture of the room for its metal to reflect (pictures on the walls arrive as you walk, so the
  // reflection has to catch up with them). The surface is hidden while its own picture is taken.
  function turn(dt) {
    for (const g of spinners) { if (Math.hypot(g.x - me.x, g.z - me.z) > 3400) continue; g.ball.rotation.y += dt * g.speed; for (const p of g.pulse) p.material.opacity = 0.55 + 0.45 * Math.sin((g.clock += dt * 0.25) + p.userData.beat); ask(); }      // the globe turns and its lights breathe
    for (const s of turning) {
      if (Math.hypot(s.x - me.x, s.z - me.z) > 3000) continue;
      if (!s.pause) s.form.rotation.y += dt * 0.42 * s.spin;
      if (s.beam) { s.glint += dt; for (const b of s.beam) b.light.opacity = b.strength * (0.82 + 0.18 * Math.sin(s.glint * 2.3) * Math.sin(s.glint * 0.7)); }      // the beam shimmers
      s.since += dt;
      if (s.since > 3) { s.since = 0; s.form.visible = false; polish.visible = false; s.eye.update(renderer, scene); polish.visible = true; s.form.visible = true; s.mirror.texture.needsPMREMUpdate = true; }
      ask();
    }
  }
  function flow(dt) {
    if (!fountains.some((f) => Math.hypot(f.x - me.x, f.z - me.z) < 3400)) return;
    streaks.offset.y += dt * 0.7;
    ask();
  }

  // ── People ───────────────────────────────────────────────────────────────
  // The visitors are made in people3d.js. It asks here where a picture hangs: the point on the wall, the way
  // out from the wall into the room, the way along the wall to the picture's neighbour and how far that is,
  // and a name for the wall, so each group of people can be given a wall of its own.
  function slotFor(id) {
    const n = works.findIndex((w) => w.id === id), p = places[n];
    if (!p) return null;
    const mate = places.find((q) => q !== p && q.room === p.room && q.side === p.side && Math.hypot(q.x - p.x, q.z - p.z) < CELL * 1.2);
    const far = mate ? Math.hypot(mate.x - p.x, mate.z - p.z) : 0, r = rightOf(p.side);
    return { x: p.x, z: p.z, out: [-p.side[0], -p.side[1]], along: mate ? [(mate.x - p.x) / far, (mate.z - p.z) / far] : r, mate: far, wall: p.room + ':' + TURN_OF.get(p.side) };
  }
  if (coffee) {       // the pool of light on the floor round the coffee stand
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(760, 760), new THREE.MeshBasicMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.2 }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(coffee.x, 2.2, coffee.z); scene.add(pool);
  }

  // ── The globe ────────────────────────────────────────────────────────────
  // In the middle of the last room stands a large globe, taller than a person, turning slowly on a tilted axis in
  // a brass stand. It is not a map. It is a world drawn as points of light and the lines that join them: a few
  // hundred points spread evenly over the sphere, each joined to its nearest neighbours, over a dark blue ball
  // with rings of latitude and longitude in brass. The points are placed by the same rule a sunflower uses for
  // its seeds (each one turned on from the last by the golden angle), which spreads them evenly with no rows.
  const spinners = [];
  if (roomCount > 1) {
    const room = lastRoom, R = 168, HIGH = 352;                    // the globe's radius, and how high its middle is
    const stand = new THREE.Group(); stand.position.set(room.x, 0, room.z);
    stand.rotation.y = THREE.MathUtils.degToRad(TURN_OF.get(room.way));       // turned to face the way in, so its lean and its cradle are seen from the side
    const brassy = new THREE.MeshStandardMaterial({ color: '#c9a24e', metalness: 0.75, roughness: 0.3 }), darkWood = new THREE.MeshStandardMaterial({ color: '#2a1c14', roughness: 0.6 });
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(118, 132, 26, 48), darkWood); foot.position.y = 13; stand.add(foot);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(13, 22, HIGH - R - 60, 20), brassy); stem.position.y = 26 + (HIGH - R - 60) / 2; stand.add(stem);
    // Everything that leans is in `lean`, tilted like the Earth. The ball inside it is what turns.
    const lean = new THREE.Group(); lean.position.y = HIGH; lean.rotation.z = THREE.MathUtils.degToRad(23.4); stand.add(lean);
    const cradle = new THREE.Mesh(new THREE.TorusGeometry(R + 20, 5.5, 12, 72, Math.PI), brassy); cradle.rotation.z = -Math.PI / 2; lean.add(cradle);       // the half ring that holds it by its poles
    for (const pole of [-1, 1]) { const pin = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 30, 10), brassy); pin.position.y = pole * (R + 10); lean.add(pin); }
    const ball = new THREE.Group(); lean.add(ball);
    ball.add(new THREE.Mesh(new THREE.SphereGeometry(R - 3, 56, 40), new THREE.MeshStandardMaterial({ color: '#0d1f3c', roughness: 0.35, metalness: 0.3, emissive: '#081226', emissiveIntensity: 0.9 })));
    const line = new THREE.MeshBasicMaterial({ color: '#b9933f' });
    for (let n = 1; n < 6; n++) { const lat = (n / 6 - 0.5) * Math.PI, ring = new THREE.Mesh(new THREE.TorusGeometry(Math.cos(lat) * R, 0.9, 6, 72), line); ring.rotation.x = Math.PI / 2; ring.position.y = Math.sin(lat) * R; ball.add(ring); }
    for (let n = 0; n < 6; n++) { const ring = new THREE.Mesh(new THREE.TorusGeometry(R, 0.9, 6, 72), line); ring.rotation.y = n / 6 * Math.PI; ball.add(ring); }
    // The points, and the lines between neighbours.
    const COUNT = 260, GOLDEN = Math.PI * (3 - Math.sqrt(5)), at3 = [];
    for (let n = 0; n < COUNT; n++) { const y = 1 - (n + 0.5) / COUNT * 2, r = Math.sqrt(1 - y * y), turn = n * GOLDEN; at3.push(new THREE.Vector3(Math.cos(turn) * r, y, Math.sin(turn) * r).multiplyScalar(R + 1.5)); }
    const lights = [['#7fe3ff', 0], ['#ffd27a', 2.1], ['#c79bff', 4.2]].map(([colour, beat]) => { const m = new THREE.MeshBasicMaterial({ color: colour, transparent: true }); const group = new THREE.Group(); group.material = m; group.userData.beat = beat; ball.add(group); return group; });
    const dot = new THREE.SphereGeometry(2.6, 8, 6);
    at3.forEach((p, n) => { const g = lights[n % 3], m = new THREE.Mesh(dot, g.material); m.position.copy(p); if (n % 11 === 0) m.scale.setScalar(2.1); g.add(m); });
    const ends = [];
    at3.forEach((p, n) => { const near = at3.map((q, k) => [p.distanceTo(q), k]).filter(([, k]) => k !== n).sort((a, b) => a[0] - b[0]).slice(0, 3); for (const [, k] of near) if (k > n) ends.push(p.x, p.y, p.z, at3[k].x, at3[k].y, at3[k].z); });
    const web = new THREE.BufferGeometry(); web.setAttribute('position', new THREE.Float32BufferAttribute(ends, 3));
    ball.add(new THREE.LineSegments(web, new THREE.LineBasicMaterial({ color: '#8fd6ff', transparent: true, opacity: 0.55 })));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(R + 16, 40, 28), new THREE.MeshBasicMaterial({ color: '#4aa8ff', transparent: true, opacity: 0.07, depthWrite: false, side: THREE.BackSide })); lean.add(halo);
    const lamp = new THREE.PointLight('#7fc4ff', 1.6, 900, 0); lamp.position.y = HIGH; stand.add(lamp);
    // The plate on the foot, facing the way in.
    const words = wordsTexture([{ text: 'A world of points', size: 20, serif: true, colour: '#1d1a16', gap: 3 }, { text: '260 points, spread as a sunflower spreads its seeds, each joined to its nearest neighbours.', size: 10, colour: '#3a332a' }], { width: 190, pad: 8, paper: '#d9c27a', edge: '#8a7434', centred: true });
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(190, words.height), new THREE.MeshBasicMaterial({ map: words.texture }));
    plate.position.set(0, 46, 134); stand.add(plate);
    stand.add(onFloor(520, 520, 0.6));
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), new THREE.MeshBasicMaterial({ map: glow, color: '#9fd2ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.22 })); pool.rotation.x = -Math.PI / 2; pool.position.y = 2.4; stand.add(pool);
    scene.add(stand);
    blockers.push({ x: room.x, z: room.z, hx: 150, hz: 150 });
    spinners.push({ ball, x: room.x, z: room.z, speed: 0.16, pulse: lights, clock: 0 });
  }


  // ── Waste bins ───────────────────────────────────────────────────────────
  // A brushed-steel bin stands in a corner of every room, out of the way of the pictures: the corner behind you
  // and to your left as you come in. One more stands at the end of the coffee stand, where the cups end up.
  {
    const steelBin = new THREE.MeshStandardMaterial({ color: '#9aa0a6', metalness: 0.75, roughness: 0.38 }), rim = new THREE.MeshStandardMaterial({ color: '#1b1b1d', roughness: 0.5 });
    const bin = (x, z) => {
      const g = new THREE.Group(); g.position.set(x, 0, z);
      const body = new THREE.Mesh(new THREE.CylinderGeometry(27, 24, 86, 28), steelBin); body.position.y = 45; g.add(body);
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(25, 25, 4, 28), rim); foot.position.y = 2; g.add(foot);
      const lip = new THREE.Mesh(new THREE.TorusGeometry(26.5, 3, 8, 28), rim); lip.rotation.x = Math.PI / 2; lip.position.y = 88; g.add(lip);
      const mouth = new THREE.Mesh(new THREE.CircleGeometry(24, 24), new THREE.MeshBasicMaterial({ color: '#050505' })); mouth.rotation.x = -Math.PI / 2; mouth.position.y = 87; g.add(mouth);
      g.add(onFloor(130, 130, 0.55));
      scene.add(g);
      return g;
    };
    for (const room of rooms) { const w = room.way, l = leftOf(w); bin(room.x - w[0] * 822 + l[0] * 822, room.z - w[1] * 822 + l[1] * 822); }
    if (coffee) {
      const x = coffee.x + coffee.way[0] * 232 - coffee.left[0] * 20, z = coffee.z + coffee.way[1] * 232 - coffee.left[1] * 20;
      bin(x, z); blockers.push({ x, z, hx: 28, hz: 28 });
    }
  }


  const crowd = populate({ THREE, scene, slotFor, fountains, coffee });
  // People are there unless the visitor has asked for the rooms empty. The choice is remembered on their device.
  function setPeople(want) {
    crowd.show(want);
    $('btn-people').textContent = want ? 'People: on' : 'People: off'; $('btn-people').setAttribute('aria-pressed', String(want));
    try { localStorage.setItem('gallery-people', want ? 'on' : 'off'); } catch (_) { /* it still works for this visit */ }
    ask();
  }
  let wantPeople = true;
  try { wantPeople = localStorage.getItem('gallery-people') !== 'off'; } catch (_) { /* people by default */ }
  setPeople(wantPeople);
  $('btn-people').addEventListener('click', () => setPeople(!crowd.shown));

  // ── Sound ────────────────────────────────────────────────────────────────
  // Made in sound3d.js, and off until the visitor presses Sound. Here it is told what is going on: how near the
  // crowd, the children and the fountains are, when you take a step, and what the cynic and the broom are doing.
  const sound = createSound();
  const hearing = (p, reach) => Math.max(0, 1 - Math.hypot(p.x - me.x, p.z - me.z) / reach) ** 2;       // 1 beside you, 0 out of hearing
  $('btn-sound').addEventListener('click', () => { const on = sound.set(!sound.on); $('btn-sound').textContent = on ? 'Sound: on' : 'Sound: off'; $('btn-sound').setAttribute('aria-pressed', String(on)); });
  crowd.heard.say = (text, at) => sound.say(text, hearing(at, 1700));
  crowd.heard.sweep = (at) => sound.sweep(hearing(at, 1900));
  crowd.heard.coin = (at) => sound.coin(hearing(at, 1600));
  let walked = 0, was = null;                 // how far you have gone since your last footstep, and where you were a moment ago
  function listen(dt) {
    if (!sound.on) { was = null; return; }
    if (was) { walked += Math.hypot(me.x - was.x, me.z - was.z); if (walked > 600) walked = 0; }      // being carried to a far picture is not walking
    was = { x: me.x, z: me.z };
    if (walked > 150) { walked = 0; sound.step(); }
    const near = crowd.near(me);
    sound.level({ crowd: near.crowd, kids: near.kids, fountain: Math.max(0, ...fountains.map((f) => hearing(f, 1700))), dt });
  }

  // ── Where you are ────────────────────────────────────────────────────────
  const startBack = star ? 730 : 560;        // with a centrepiece you begin further back, so the whole of its wall is in view
  const START = { x: firstRoom.x - firstRoom.way[0] * startBack, z: firstRoom.z - firstRoom.way[1] * startBack, yaw: yawOf(firstRoom.way) };   // just inside the first room, looking down it
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

  // A picture's image is asked for only once you are near it. Near means this room and the next, so the pictures
  // seen through a doorway are already there.
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
      if (far < 3900 && !h.loaded) {
        h.loaded = true;
        loader.load(h.work.small, (tex) => { tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = renderer.capabilities.getMaxAnisotropy(); h.picture.material.map = tex; h.picture.material.color.set('#ffffff'); h.picture.material.needsUpdate = true; ask(); });
      }
    }
    $('where').textContent = (tour ? 'Auto tour: ' : '') + (nearest.far < 700 ? nearest.h.work.title : `Gallery ${nearest.h.hall + 1} of ${roomCount}`) + (tour ? '. Click anywhere to stop.' : '');
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
    flow(dt);
    turn(dt);
    listen(dt);
    if (crowd.update(dt, me)) ask();                 // the people breathe, look about and walk, while any are near
    if (!moved && wasMoving) remember();
    wasMoving = moved;
    if (moved) look();
    if (redraw) { redraw = false; renderer.render(scene, camera); }
    requestAnimationFrame(frame);
  }
  // Take the visitor straight to a spot. It may be rooms away, so there is no straight line to glide along:
  // the view dims, you are set down in front of the picture, and the view returns.
  let carrying = null;
  function goTo(to) {
    clearTimeout(carrying);
    view.classList.add('carried');
    carrying = setTimeout(() => { me = { ...to }; lastLook = { x: 1e9, z: 1e9 }; look(); remember(); view.classList.remove('carried'); }, 260);
  }

  // ── The automatic tour ───────────────────────────────────────────────────
  // The gallery walks you round: through each room and each doorway, stopping
  // in front of every picture for a few seconds before moving on. It begins from
  // wherever you are standing and ends at the last picture. A click anywhere, a
  // click on a picture, or any walking key stops it at once, where you are.
  //
  // HOW IT MOVES
  // The route is one line through the gallery: from where you stand to the
  // viewing spot in front of each picture in turn, and through the middle of
  // each doorway on the way from one room to the next.
  // Three things keep the movement smooth:
  //   1. Speed. The tour gathers speed gently on leaving a picture and loses it
  //      gently on reaching the next. It never starts or stops at full speed.
  //   2. Position. The camera does not sit on the line; it follows a point that
  //      runs along the line, as if on a soft spring. That rounds every corner.
  //   3. Facing. The camera looks at the picture it is leaving, turns part of the
  //      way towards where it is going, and turns to the next picture as it
  //      arrives, all in one movement. Between two pictures on the same wall it
  //      only glances along the hall, so it does not swing away and back.
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
  const cellUnder = (x, z) => cells.get(key(Math.round(x / CELL), Math.round(z / CELL)));
  // The way out of a room, as three points: the middle of the cell before the doorway, the doorway, and the cell beyond.
  const through = (room) => { const { x, z, dir } = room.door; return [{ x: x - dir[0] * CELL, z: z - dir[1] * CELL }, { x, z }, { x: x + dir[0] * CELL, z: z + dir[1] * CELL }]; };
  // The middles of the four cells of the room a point is in: safe places to go round a bench by.
  const quarters = (p) => { const c = cellUnder(p.x, p.z), room = c && rooms[c.hall]; return room ? [[0, 0], [1, 0], [0, 1], [1, 1]].map(([a, b]) => ({ x: (room.i + a) * CELL, z: (room.j + b) * CELL })) : []; };
  function startTour() {
    const under = cellUnder(me.x, me.z);
    let room = under ? under.hall : 0;
    // Begin with the first picture of the room you are in; if you are past the last picture, begin again from the entrance.
    let first = hung.findIndex((h) => h.hall >= room);
    if (first < 0) { first = 0; room = 0; me = { ...START }; lastLook = { x: 1e9, z: 1e9 }; }
    // The route in the rough: each picture's viewing spot, with the doorways between rooms.
    const rough = [{ x: me.x, z: me.z, stop: { yaw: me.yaw } }];
    if (under && under.passage && rooms[room - 1]) rough.push(through(rooms[room - 1])[2]);        // begun in a doorway: step out of it first
    for (const h of hung.slice(first)) {
      for (; room < h.hall; room++) rough.push(...through(rooms[room]));
      const spot = spots[h.work.id];
      rough.push({ x: spot.x, z: spot.z, stop: { yaw: spot.yaw } });
    }
    // Where a straight line would run through a bench, go round by the middle of one quarter of the room.
    const way = [rough[0]];
    for (let n = 1; n < rough.length; n++) {
      const a = way[way.length - 1], b = rough[n];
      if (!clearWay(a, b)) {
        // Round by one quarter of the room if that does it; if not (the centrepiece's wall is wide), by two.
        const corners = [...quarters(b), ...quarters(a)], one = corners.find((q) => clearWay(a, q) && clearWay(q, b));
        if (one) way.push(one);
        else { let two = null; for (const q1 of corners) { for (const q2 of corners) if (!two && clearWay(a, q1) && clearWay(q1, q2) && clearWay(q2, b)) two = [q1, q2]; } if (two) way.push(...two); }
      }
      way.push(b);
    }
    // Leave out any point that is not a picture and that the route can pass in a straight line, so it does not
    // dog-leg through the middle of a cell for no reason.
    const points = [way[0]];
    for (let n = 1; n < way.length; n++) {
      const next = way[n + 1];
      if (!way[n].stop && next && clearWay(points[points.length - 1], next)) continue;
      points.push(way[n]);
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
    if (hit.go) { location.href = hit.go; return; }                   // the cinema's entrance leads to its own page
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
    featured: star ? star.id : '',
    touring: () => Boolean(tour), halls: roomCount, cells: cells.size, benches: blockers.length - statues - fountains.length - (star ? 1 : 0), pose: (n, by) => { const s = turning[n]; s.form.rotation.y = Math.atan2(s.out[0], s.out[1]) + by; s.pause = true; ask(); },
    surfaces: () => turning.map((s) => ({ x: s.x, z: s.z, out: s.out, turned: s.form.rotation.y })), people: () => crowd.places(),
    // Lets the people live for some seconds without waiting for them, for checking what they do.
    mingle: (seconds) => { for (let n = 0; n < seconds * 30; n++) crowd.update(1 / 30, { x: 1e9, z: 1e9, all: true }); look(); },
    stand: (x, z, yaw) => { me = { x, z, yaw }; lastLook = { x: 1e9, z: 1e9 }; look(); }, statues: () => statues, fountains: fountains.length,
    // The tour run ahead at sixty moments a second without drawing, for checking how smoothly it moves.
    tourTrace: (seconds) => { const trace = []; for (let n = 0; n < seconds * 60 && tour; n++) { tourStep(1 / 60); if (tour) trace.push([me.x, me.z, me.yaw]); } look(); return trace; },
    perWall: (() => { const n = {}; places.filter((p) => !p.feature).forEach((p) => { const k = p.room + ':' + TURN_OF.get(p.side); n[k] = (n[k] || 0) + 1; }); return Object.values(n); })(),
    finishes: () => rooms.map((_, n) => finishOfHall(firstWall, n)), perHall: rooms.map((_, n) => hung.filter((h) => h.hall === n).length), spot: (id) => spots[id], canStand,
  };
}
