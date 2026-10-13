// The cinema as a room: dark walls in purple, indigo and green, a lit screen, rows of
// seats and people watching. The film on the screen is the page's own <video>, so the
// buttons under the room (which film, play, sound) work on it exactly as they would
// without this file.
//
// Everything is drawn from simple shapes, as in the gallery: no model files.
// If the browser cannot draw 3D, this file does nothing and the page shows the plain player.
import * as THREE from './vendor/three.module.js';

const holder = document.getElementById('theatre');
const video = document.getElementById('film');

function start() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-label', 'A cinema room with people watching the film');
  holder.prepend(canvas);
  holder.classList.add('is-room');           // the plain player is tucked away; the film now shows on the room's screen

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#05040b');
  scene.fog = new THREE.Fog('#05040b', 26, 60);
  const camera = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 100);
  const EYE = new THREE.Vector3(0, 4.7, 9.4), LOOK = new THREE.Vector3(0, 4.5, -14);

  // ── The room: 24 wide, 30 deep, 9.5 high. The screen wall is at z = -15. ──
  const W = 24, D = 30, H = 10.6;
  const flat = (colour, more = {}) => new THREE.MeshStandardMaterial({ color: colour, roughness: 0.95, metalness: 0, ...more });
  const add = (mesh, x, y, z) => { mesh.position.set(x, y, z); scene.add(mesh); return mesh; };
  const PURPLE = '#2b1250', INDIGO = '#1c2170', GREEN = '#0f4a3a', GLOW_GREEN = '#35ffa6', GLOW_PURPLE = '#b06bff';

  const floor = add(new THREE.Mesh(new THREE.PlaneGeometry(W, D), flat('#0b2a22')), 0, 0, 0); floor.rotation.x = -Math.PI / 2;          // dark green carpet
  const ceiling = add(new THREE.Mesh(new THREE.PlaneGeometry(W, D), flat('#06050d')), 0, H, 0); ceiling.rotation.x = Math.PI / 2;
  add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), flat('#0a0816')), 0, H / 2, -D / 2);                                              // the screen wall, nearly black
  const back = add(new THREE.Mesh(new THREE.PlaneGeometry(W, H), flat(INDIGO)), 0, H / 2, D / 2); back.rotation.y = Math.PI;
  for (const side of [-1, 1]) {
    const wall = add(new THREE.Mesh(new THREE.PlaneGeometry(D, H), flat(PURPLE)), side * W / 2, H / 2, 0); wall.rotation.y = -side * Math.PI / 2;
    // Tall sound panels down each side wall, indigo then green, with a line of green light along the foot of the wall.
    for (let i = 0; i < 6; i++) {
      add(new THREE.Mesh(new THREE.BoxGeometry(0.18, 5.6, 3.4), flat(i % 2 ? GREEN : INDIGO)), side * (W / 2 - 0.1), 4.1, -12 + i * 4.7);
      // A wall light between the panels: a small shade and the pool of purple it throws up the wall.
      const lamp = add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: GLOW_PURPLE })), side * (W / 2 - 0.3), 6.6, -9.65 + i * 4.7);
      if (i % 2 === 0) { const wash = new THREE.PointLight(GLOW_PURPLE, 26, 13, 1.6); wash.position.set(side * (W / 2 - 1.2), 6.6, -9.65 + i * 4.7); scene.add(wash); }
      // And a green light at the foot of every green panel, washing up it.
      if (i % 2 === 1) { const up = new THREE.PointLight(GLOW_GREEN, 8, 7, 1.6); up.position.set(side * (W / 2 - 1.0), 0.9, -12 + i * 4.7); scene.add(up); }
    }
    add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, D - 1), new THREE.MeshBasicMaterial({ color: GLOW_GREEN })), side * (W / 2 - 0.12), 0.12, 0);
  }
  // The aisle: two lines of green floor lights leading down to the screen.
  for (const side of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 20), new THREE.MeshBasicMaterial({ color: GLOW_GREEN })), side * 0.75, 0.03, -1);
  const aisleGlow = new THREE.PointLight(GLOW_GREEN, 6, 12, 1.5); aisleGlow.position.set(0, 0.5, 1); scene.add(aisleGlow);
  // HOUSE LIGHTING, as a real cinema has it while a film runs. The house lights are down, so the room is lit by:
  //   the screen       by far the brightest thing, and its light takes the colour of the picture
  //   the projector    a beam from the booth at the back, and a little spill around the booth window
  //   the wall lights  dimmed to a glow, washing the walls and not the seats
  //   the step lights  small dots on the edge of each step and down the aisle, so people can find their way
  //   the exit signs   green, either side of the screen, always on
  const houseLights = new THREE.AmbientLight('#2a2050', 1.0); scene.add(houseLights);          // up before the film, down while it runs
  scene.add(new THREE.HemisphereLight('#4a3fb0', '#082018', 0.3));
  // The spill from the booth: faint, cool, from behind and above. It is what edges the heads and shoulders.
  const house = new THREE.DirectionalLight('#aab4ff', 0.62); house.position.set(0, 9.4, 15.5); house.target.position.set(0, 1.5, -4); scene.add(house, house.target);
  // The booth window, high on the back wall, and the beam that leaves it. The beam is a pale cone that widens to the screen.
  add(new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.6), new THREE.MeshBasicMaterial({ color: '#dfe6ff' })), 0, H - 1.5, D / 2 - 0.05).rotation.y = Math.PI;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 4.6, D - 0.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#cfd8ff', transparent: true, opacity: 0.055, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.position.set(0, (H - 1.5 + 5.2) / 2, 0); beam.rotation.x = Math.PI / 2 - Math.atan2(H - 1.5 - 5.2, D); scene.add(beam);
  // Exit signs either side of the screen: green boxes that glow and throw a little green on the wall beside them.
  for (const side of [-1, 1]) {
    add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.12), new THREE.MeshBasicMaterial({ color: '#22e08a' })), side * (W / 2 - 1.4), 7.4, -D / 2 + 0.2);
    const exit = new THREE.PointLight('#22e08a', 5, 6, 1.6); exit.position.set(side * (W / 2 - 1.4), 7.2, -D / 2 + 0.8); scene.add(exit);
  }

  // ── The screen, with a dark surround and a purple curtain drawn back at each side ──
  const SCREEN_W = 17, SCREEN_H = 8.8, SCREEN_Y = 5.2, SCREEN_Z = -D / 2 + 0.12;
  add(new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W + 0.5, SCREEN_H + 0.5), new THREE.MeshBasicMaterial({ color: '#000000' })), 0, SCREEN_Y, SCREEN_Z - 0.02);
  const film = new THREE.VideoTexture(video);
  film.colorSpace = THREE.SRGBColorSpace;
  const picture = add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false })), 0, SCREEN_Y, SCREEN_Z);
  // Before Play is pressed the screen shows the film's still. Once the film is running the screen shows the film.
  const stills = new THREE.TextureLoader();
  function showStill() {
    const src = video.poster;
    stills.load(src, (t) => { t.colorSpace = THREE.SRGBColorSpace; if (video.poster === src && video.paused && video.currentTime < 0.05) { picture.material.map = t; picture.material.needsUpdate = true; } });
  }
  video.addEventListener('playing', () => { picture.material.map = film; picture.material.needsUpdate = true; });
  video.addEventListener('emptied', showStill); showStill();
  // Films are different shapes. Each is shown as large as fits the screen, never stretched.
  function fitPicture() {
    const shape = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 4 / 3;
    const wide = Math.min(SCREEN_W, SCREEN_H * shape);
    picture.scale.set(wide, wide / shape, 1);
  }
  video.addEventListener('loadedmetadata', fitPicture); fitPicture();
  for (const side of [-1, 1]) {
    for (let fold = 0; fold < 5; fold++) {
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, H - 0.4, 10), flat(fold % 2 ? '#3a1466' : '#2a0f4f', { roughness: 0.8 })), side * (SCREEN_W / 2 + 0.75 + fold * 0.52), H / 2, SCREEN_Z + 0.25);
    }
  }
  // The light the film throws back over the room. It breathes a little, as a moving picture does.
  const throwLight = new THREE.SpotLight('#cfd6ff', 260, 46, 0.95, 0.7, 1.3);
  throwLight.position.set(0, SCREEN_Y, SCREEN_Z + 0.5); throwLight.target.position.set(0, 1.4, 5);
  scene.add(throwLight, throwLight.target);

  // ── Seats: three rows of eight, each row a step higher, with an aisle down the middle ──
  const seatCloth = flat('#231a5c', { roughness: 0.85 }), seatArm = flat('#0d0b1d');
  const ROWS = [{ z: -2.6, y: 0 }, { z: 0.6, y: 0.45 }, { z: 3.8, y: 0.9 }];
  const ACROSS = [-8.1, -6.0, -3.9, -1.8, 1.8, 3.9, 6.0, 8.1];
  for (const row of ROWS) {
    if (row.y) add(new THREE.Mesh(new THREE.BoxGeometry(W, row.y, 3.2), flat('#0a231d')), 0, row.y / 2, row.z + 0.4);          // the step this row stands on
    // Step lights: a row of small warm dots along the front edge of the step, as cinemas fit so nobody trips in the dark.
    for (let x = -11; x <= 11; x += 1.1) add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffd9a0' })), x, row.y + 0.03, row.z - 1.18);
    for (const x of ACROSS) {
      add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.22, 1.3), seatCloth), x, row.y + 0.72, row.z);                             // the seat
      add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.18), seatCloth), x, row.y + 1.15, row.z + 0.62);                       // its back, low enough to see who is sitting in it
      for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 1.2), seatArm), x + s * 0.8, row.y + 0.95, row.z);
    }
  }

  // ── The people watching. Sixteen of the twenty-four seats are taken. ──
  const SHIRTS = ['#6b4fb0', '#2f8f6f', '#3b47a8', '#8a5fc9', '#27705a', '#4a54c4', '#55407f', '#3f9c80'];
  const HAIR = ['#1b1410', '#3a2a1c', '#0e0d12', '#6b5a48', '#a9a39a', '#2a1b12'];
  const SKIN = ['#c99a7a', '#8d5f43', '#e0b598', '#6f4a35', '#b98562'];
  const TAKEN = [[0, 1], [0, 2], [0, 4], [0, 5], [0, 7], [1, 0], [1, 2], [1, 3], [1, 5], [1, 6], [2, 1], [2, 2], [2, 3], [2, 4], [2, 6], [2, 7]];
  const people = [];
  TAKEN.forEach(([r, c], n) => {
    const row = ROWS[r], child = n === 3 || n === 12;                       // two children among them
    const size = child ? 0.72 : 0.94 + (n % 4) * 0.035;
    const person = new THREE.Group();
    const shirt = flat(SHIRTS[n % SHIRTS.length], { roughness: 0.9 }), skin = flat(SKIN[n % SKIN.length], { roughness: 0.75 }), hair = flat(HAIR[(n * 5) % HAIR.length]);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.86, 12), shirt); body.position.y = 0.43;
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 10), shirt); shoulders.scale.set(1.25, 0.5, 0.8); shoulders.position.y = 0.86;
    const head = new THREE.Group(); head.position.y = 1.22;
    head.add(new THREE.Mesh(new THREE.SphereGeometry(0.21, 16, 12), skin));
    const top = new THREE.Mesh(new THREE.SphereGeometry(0.225, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.62), hair); top.rotation.x = 0.35; head.add(top);   // hair, seen from behind
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.16, 8), skin); neck.position.y = 1.03;
    person.add(body, shoulders, neck, head);
    person.scale.setScalar(size);
    person.position.set(ACROSS[c], row.y + 0.83, row.z + 0.12);
    scene.add(person);
    people.push({ person, head, phase: n * 1.7, lean: (n % 3 - 1) * 0.05, restless: 0.25 + (n % 5) * 0.09 });
  });

  // ── Looking round: the view drifts a little, and follows the pointer a little ──
  let lookX = 0, lookY = 0;
  holder.addEventListener('pointermove', (e) => {
    const box = holder.getBoundingClientRect();
    lookX = ((e.clientX - box.left) / box.width - 0.5) * 2; lookY = ((e.clientY - box.top) / box.height - 0.5) * 2;
  });
  holder.addEventListener('pointerleave', () => { lookX = 0; lookY = 0; });

  function size() {
    const wide = holder.clientWidth, tall = Math.round(wide * 9 / 16);
    renderer.setSize(wide, tall, false);
    canvas.style.width = '100%'; canvas.style.height = 'auto';
    camera.aspect = wide / Math.max(1, tall); camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', size); size();

  // The colour of the screen's light is read from the film itself, a few times a second: the whole picture is
  // shrunk to a few dots and their average taken. A desert scene warms the room and a night scene cools it.
  const sampler = document.createElement('canvas'); sampler.width = 8; sampler.height = 8;
  const dots = sampler.getContext('2d', { willReadFrequently: true });
  const tint = new THREE.Color('#cfd6ff'), aim = new THREE.Color('#cfd6ff');
  let level = 1;
  function readFilm() {
    if (!video.videoWidth) return;
    try {
      dots.drawImage(video, 0, 0, 8, 8);
      const d = dots.getImageData(0, 0, 8, 8).data; let r = 0, g = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      aim.setRGB(r / n / 255, g / n / 255, b / n / 255, THREE.SRGBColorSpace);
      level = 0.45 + 1.1 * (r + g + b) / (n * 765);                 // a bright scene lights the room more than a dark one
    } catch (e) { /* the film could not be read; the light keeps its last colour */ }
  }
  setInterval(readFilm, 180);

  const still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();
  let easedX = 0, easedY = 0;
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime();
    easedX += (lookX - easedX) * 0.04; easedY += (lookY - easedY) * 0.04;
    camera.position.set(EYE.x + easedX * 1.6 + (still ? 0 : Math.sin(t * 0.11) * 0.25), EYE.y - easedY * 0.5, EYE.z);
    camera.lookAt(LOOK.x + easedX * 2.2, LOOK.y - easedY * 1.2, LOOK.z);
    if (!still) {
      for (const p of people) {
        p.head.rotation.y = Math.sin(t * p.restless + p.phase) * 0.16;                 // a glance to one side
        p.head.rotation.x = Math.sin(t * 0.21 + p.phase) * 0.04 - 0.06;                 // chin up a little, toward the screen
        p.person.rotation.z = p.lean + Math.sin(t * 0.17 + p.phase) * 0.018;            // shifting in the seat
      }
      throwLight.intensity = (video.paused ? 150 : 250) * level + Math.sin(t * 2.3) * 14 + Math.sin(t * 7.1) * 6;
    }
    tint.lerp(aim, 0.08); throwLight.color.copy(tint).lerp(new THREE.Color('#ffffff'), 0.35);     // eased, and kept a little toward white
    beam.material.opacity = video.paused ? 0.0 : 0.045 + level * 0.02;                           // no beam until the film runs
    houseLights.intensity += ((video.paused ? 1.0 : 0.42) - houseLights.intensity) * 0.04;       // the house lights go down as it starts
    renderer.render(scene, camera);
  });
}

if (holder && video) start();
