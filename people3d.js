// The people in the gallery: visitors standing in front of the pictures, so the
// rooms are not empty.
//
// They are drawn in the manner of an animated film, not as real people: a large
// round head, big eyes, a small body, plain bright clothes. Each is built here
// from simple solid shapes (balls, rods with rounded ends, cones), so there are
// no model files to download.
//
// WHO IS HERE
//   Two families     children up close to a picture they like (the train, the
//                    three pigs), pointing and bouncing, a mother just behind.
//   The professor    tweed jacket with elbow patches, bow tie, glasses, a hand
//                    to his chin.
//   Two artists      thin, beret and scarf, paint on the smock, one sketching.
//   The curator      dark suit and a name badge, an arm out towards a picture,
//                    with a group of art lovers gathered round listening.
//   Strollers        art lovers who look at one picture for a while, then walk
//                    along the wall to the next.
//   The cynic        arms folded, finding fault with every picture, aloud.
//   The custodian    sweeping slowly along a wall with a broom.
// Every so often a thought floats up over someone's head in a bubble.
//
// WHERE THEY STAND
// Always near the wall and to one side of a picture, never where the visitor
// stands to look at it and never on the line the auto tour walks. Children are
// short enough to stand right in front. So nobody blocks a picture.
//
// hall3d.js calls populate() once, and then update() every moment so that they
// breathe, look about, bounce and walk.

export function populate({ THREE, scene, slotFor, fountains = [], coffee = null }) {
  const people = [];
  const mat = (color, more = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...more });
  const SKIN = ['#e8b998', '#c98d6a', '#8a5a3c', '#f1c9a8', '#a8714d'];
  const white = mat('#fbfaf6'), dark = mat('#1d1a18'), blush = mat('#b5483f');

  // Tweed: a small woven pattern drawn once and wrapped round the professor's jacket.
  const tweed = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#8b6b47'; g.fillRect(0, 0, 64, 64);
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 8) {
      g.strokeStyle = (x / 8 + y / 8) % 2 ? '#6f5233' : '#a5855c'; g.lineWidth = 1.6;
      g.beginPath(); if ((y / 8) % 2) { g.moveTo(x, y); g.lineTo(x + 8, y + 8); } else { g.moveTo(x + 8, y); g.lineTo(x, y + 8); } g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 4); return t;
  })();

  const ball = (r, material, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 30, 22), material); m.scale.set(sx, sy, sz); return m; };
  const rod = (r, length, material) => new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(1, length - r * 2), 10, 20), material);    // a rod with rounded ends, `length` from tip to tip
  // A shape turned on a lathe, for bodies: a list of [how far out, how high] points spun round the upright.
  const turned = (points, material) => new THREE.Mesh(new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), 32), material);
  // The soft shadow each person stands on: a dark round patch that fades out at its edge.
  const shade = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 6, 64, 64, 64);
    r.addColorStop(0, 'rgba(0,0,0,0.55)'); r.addColorStop(0.6, 'rgba(0,0,0,0.22)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    return new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  })();
  const EYES = ['#5a3a22', '#3f6f8f', '#4a6b3a', '#6b4a2a', '#2f2a26'];       // iris colours, dealt out in turn

  // ── Building one person ──────────────────────────────────────────────────
  // `o` says who: height, child or adult, colours, hair, and what they carry or wear.
  // Returns the figure and its moving parts. The figure faces along its own +z.
  let made = 0;          // how many people have been built, so eye colours can be dealt out in turn
  function person(o) {
    const H = o.height, child = Boolean(o.child), thin = o.thin ? 0.82 : 1;
    const headR = H * (child ? 0.185 : 0.142);
    const legs = H * (child ? 0.33 : 0.44);
    const shoulders = H - headR * 2.02;                       // how high the shoulders are
    const body = shoulders - legs;                            // hip to shoulder
    const half = H * (child ? 0.125 : 0.112) * thin;          // half the width of the shoulders
    const skin = mat(o.skin), top = o.tweed ? mat('#ffffff', { map: tweed }) : mat(o.top), bottom = mat(o.bottom || '#2f3440'), hair = mat(o.hair || '#3a2a1c');
    const figure = new THREE.Group(), frame = new THREE.Group();      // `frame` is everything above the floor, so the whole figure can bob
    figure.add(frame);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(half * 2.5, 24), shade); shadow.rotation.x = -Math.PI / 2; shadow.position.y = 1.5; figure.add(shadow);

    // Legs. Each hangs from a hinge at the hip and has a second hinge at the knee, so it can swing and bend.
    // A skirt or dress shows bare legs. `knee` holds the knee hinges.
    const knee = [], shoeMat = mat(o.shoes || '#3b2b22', { roughness: 0.45 }), sole = mat('#1c1917');
    const leg = [-1, 1].map((side) => {
      const hip = new THREE.Group(); hip.position.set(side * half * 0.45, legs, 0);
      const legMat = o.skirt ? skin : bottom, thigh = rod(half * 0.33, legs * 0.54, legMat); thigh.position.y = -legs * 0.25; hip.add(thigh);
      const hinge = new THREE.Group(); hinge.position.y = -legs * 0.5; hip.add(hinge);
      const shin = rod(half * 0.27, legs * 0.52, legMat); shin.position.y = -legs * 0.24; hinge.add(shin);
      const shoe = ball(half * 0.36, shoeMat, 1, 0.62, 1.75); shoe.position.set(0, -legs * 0.5 + half * 0.24, half * 0.24); hinge.add(shoe);
      const under = ball(half * 0.37, sole, 1, 0.16, 1.78); under.position.set(0, -legs * 0.5 + half * 0.07, half * 0.24); hinge.add(under);
      knee.push(hinge); frame.add(hip); return hip;
    });
    // The body, turned like a pot and flattened front to back: hips, a waist, a chest, and shoulders rounding in to
    // the neck. A skirt flares out below it; trousers get a belt.
    const R = half, trunk = turned([[0, 0], [R * 0.8, 0], [R * 0.84, body * 0.1], [R * 0.76, body * 0.36], [R * 0.9, body * 0.66], [R * 0.99, body * 0.86], [R * 0.9, body * 0.96], [R * 0.6, body * 1.03], [R * 0.34, body * 1.06], [0, body * 1.06]], top);
    trunk.scale.z = 0.66; trunk.position.y = legs; frame.add(trunk);
    if (o.skirt) { const skirt = turned([[R * 0.8, legs * 0.06], [R * 0.95, -legs * 0.12], [R * 1.3, -legs * 0.36], [R * 1.52, -legs * 0.46], [R * 1.46, -legs * 0.47]], mat(o.skirt, { side: THREE.DoubleSide })); skirt.scale.z = 0.82; skirt.position.y = legs; frame.add(skirt); }
    else {
      const seat = ball(R * 0.83, bottom, 1, 0.52, 0.68); seat.position.y = legs; frame.add(seat);
      const belt = new THREE.Mesh(new THREE.TorusGeometry(R * 0.8, R * 0.07, 8, 28), mat('#2a211a')); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.67; belt.position.y = legs + body * 0.06; frame.add(belt);
    }
    if (!o.scarf && !child) { const collar = new THREE.Mesh(new THREE.TorusGeometry(R * 0.4, R * 0.09, 8, 24), mat(o.collar || '#f3efe6')); collar.rotation.x = Math.PI / 2; collar.position.y = legs + body * 1.04; frame.add(collar); }
    // Arms. Each hangs from a hinge at the shoulder and has a second hinge at the elbow. Turning a hinge forwards
    // (a negative turn about x) raises the hand in front. `elbow` holds the elbow hinges; the hand, and anything
    // carried, is fixed to the forearm.
    const reach = body * 0.98, upper = reach * 0.5, elbow = [], fore = [];
    const arm = [-1, 1].map((side) => {
      const joint = new THREE.Group(); joint.position.set(side * (half * 1.0), shoulders - half * 0.2, 0);
      const cap = ball(half * 0.3, top); joint.add(cap);                                         // the round of the shoulder
      const limb = rod(half * 0.27, upper * 1.08, top); limb.position.y = -upper / 2; joint.add(limb);
      const hinge = new THREE.Group(); hinge.position.y = -upper; joint.add(hinge);
      const lower = rod(half * 0.24, upper * 1.04, top); lower.position.y = -upper / 2; hinge.add(lower);
      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(half * 0.255, half * 0.255, half * 0.16, 16), top); cuff.position.y = -upper * 0.92; hinge.add(cuff);
      const hand = ball(half * 0.29, skin, 0.86, 1.08, 0.7); hand.position.y = -upper - half * 0.12; hinge.add(hand);
      const thumb = ball(half * 0.12, skin, 0.8, 1.5, 0.8); thumb.position.set(-side * half * 0.2, -upper - half * 0.06, half * 0.12); thumb.rotation.z = -side * 0.6; hinge.add(thumb);
      if (o.patches) { const patch = ball(half * 0.27, mat('#5a3c22'), 1, 1.3, 0.5); patch.position.set(0, 0, -half * 0.2); hinge.add(patch); }
      joint.rotation.z = side * 0.09;
      elbow.push(hinge); fore.push(hinge); frame.add(joint); return joint;
    });
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(half * 0.3, half * 0.34, headR * 0.5, 16), skin); neck.position.y = shoulders + headR * 0.12; frame.add(neck);

    // The head: big, with big eyes. It turns on its own.
    const head = new THREE.Group(); head.position.y = shoulders + headR * 1.02; frame.add(head);
    head.add(ball(headR, skin, 1, 1.04, 0.97));
    // The eyes: a white, a coloured iris, a dark pupil and a bright fleck of light, with a lid that closes to blink
    // and an eyebrow above. `lids` holds the lids.
    const lids = [], iris = mat(EYES[made % EYES.length], { roughness: 0.3 }), fleck = new THREE.MeshBasicMaterial({ color: '#ffffff' }), browMat = mat(o.hair || '#3a2a1c');
    for (const side of [-1, 1]) {
      const ex = side * headR * 0.37, ey = headR * 0.1;
      const eye = ball(headR * 0.25, mat('#fbfaf6', { roughness: 0.25 }), 1, 1.14, 0.6); eye.position.set(ex, ey, headR * 0.82); head.add(eye);
      const ring = ball(headR * 0.15, iris, 1, 1.08, 0.5); ring.position.set(ex, ey, headR * 0.925); head.add(ring);
      const pupil = ball(headR * 0.08, dark, 1, 1.08, 0.5); pupil.position.set(ex, ey, headR * 0.975); head.add(pupil);
      const light = ball(headR * 0.028, fleck); light.position.set(ex + headR * 0.05, ey + headR * 0.07, headR * 1.0); head.add(light);
      const lid = ball(headR * 0.265, skin, 1, 1.14, 0.62); lid.position.set(ex, ey, headR * 0.83); lid.visible = false; head.add(lid); lids.push(lid);
      const brow = rod(headR * 0.045, headR * 0.4, browMat); brow.rotation.z = Math.PI / 2 + side * (o.frown ? 0.42 : -0.12); brow.position.set(ex, headR * (o.frown ? 0.43 : 0.5), headR * 0.88); head.add(brow);
      const ear = ball(headR * 0.2, skin, 0.5, 1, 0.8); ear.position.set(side * headR * 0.98, 0, 0); head.add(ear);
      if (o.rosy) { const cheek = ball(headR * 0.16, mat('#e59a8f'), 1, 0.7, 0.3); cheek.position.set(side * headR * 0.56, -headR * 0.24, headR * 0.76); head.add(cheek); }
    }
    made++;
    const chin = ball(headR * 0.62, skin, 1, 0.7, 0.86); chin.position.set(0, -headR * 0.5, headR * 0.12); head.add(chin);       // a little jaw, so the head is not a plain ball
    const nose = ball(headR * 0.13, skin, 1, 0.9, 1.1); nose.position.set(0, -headR * 0.12, headR * 0.99); head.add(nose);
    // The mouth is half a ring: turned one way up it is a smile, the other way a frown.
    const smile = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.26, headR * 0.035, 8, 20, Math.PI), blush); smile.rotation.z = o.frown ? 0 : Math.PI; smile.position.set(0, -headR * (o.frown ? 0.52 : 0.34), headR * 0.86); smile.rotation.x = -0.25; head.add(smile);
    if (o.moustache) { const tache = ball(headR * 0.24, mat(o.moustache), 1.6, 0.42, 0.5); tache.position.set(0, -headR * 0.3, headR * 0.95); head.add(tache); }

    // Hair. Each style is a cap over the top and back of the head, with something added.
    const cap = (cover = 0.56) => { const c = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 22, 14, 0, Math.PI * 2, 0, Math.PI * cover), hair); c.rotation.x = -0.62; c.scale.set(1, 1.04, 1); return c; };
    if (o.style === 'short') head.add(cap(0.5));
    if (o.style === 'long') { head.add(cap(0.56)); const fall = ball(headR * 0.86, hair, 1.08, 1.5, 0.55); fall.position.set(0, -headR * 0.62, -headR * 0.5); head.add(fall); }
    if (o.style === 'bun') { head.add(cap(0.54)); const bun = ball(headR * 0.4, hair); bun.position.set(0, headR * 0.86, -headR * 0.5); head.add(bun); }
    if (o.style === 'pony') { head.add(cap(0.54)); const tail = rod(headR * 0.2, headR * 1.2, hair); tail.position.set(0, -headR * 0.1, -headR * 1.1); tail.rotation.x = 0.5; head.add(tail); }
    if (o.style === 'pigtails') { head.add(cap(0.52)); for (const side of [-1, 1]) { const tuft = ball(headR * 0.36, hair, 0.8, 1.2, 0.8); tuft.position.set(side * headR * 1.08, -headR * 0.1, -headR * 0.15); head.add(tuft); } }
    if (o.style === 'sides') { const ring = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.92, headR * 0.2, 8, 22, Math.PI * 1.25), hair); ring.rotation.set(Math.PI / 2, 0, Math.PI * 0.875); ring.position.y = headR * 0.05; head.add(ring); }     // bald on top
    if (o.style === 'ballcap') { head.add(cap(0.46)); const crown = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.09, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.42), mat(o.hat || '#c8402f')); crown.rotation.x = -0.12; head.add(crown); const brim = ball(headR * 0.62, mat(o.hat || '#c8402f'), 1, 0.12, 1); brim.position.set(0, headR * 0.5, headR * 0.95); head.add(brim); }
    if (o.beret) { const beret = ball(headR * 0.92, mat(o.beret), 1.12, 0.36, 1.12); beret.position.set(headR * 0.16, headR * 0.92, -headR * 0.05); beret.rotation.z = -0.28; head.add(beret); const stalk = ball(headR * 0.08, mat(o.beret)); stalk.position.set(headR * 0.3, headR * 1.2, -headR * 0.05); head.add(stalk); }
    if (o.beard) { const beard = ball(headR * 0.62, mat(o.beard), 1.05, 0.8, 0.7); beard.position.set(0, -headR * 0.62, headR * 0.42); head.add(beard); }
    if (o.glasses) {
      const wire = mat('#2a2622', { metalness: 0.4, roughness: 0.4 });
      for (const side of [-1, 1]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(headR * 0.27, headR * 0.03, 6, 20), wire); rim.position.set(side * headR * 0.36, headR * 0.1, headR * 0.98); head.add(rim); }
      const bridge = rod(headR * 0.03, headR * 0.26, wire); bridge.rotation.z = Math.PI / 2; bridge.position.set(0, headR * 0.12, headR * 1.0); head.add(bridge);
    }

    // Things worn and carried.
    const chest = half * 0.66;                                 // how far forward the front of the body is
    if (o.bowtie) for (const side of [-1, 1]) { const wing = new THREE.Mesh(new THREE.ConeGeometry(half * 0.2, half * 0.34, 10), mat(o.bowtie)); wing.rotation.z = side * Math.PI / 2; wing.position.set(side * half * 0.17, shoulders - half * 0.08, chest); frame.add(wing); }
    if (o.scarf) { const wrap = new THREE.Mesh(new THREE.TorusGeometry(half * 0.42, half * 0.17, 8, 18), mat(o.scarf)); wrap.rotation.x = Math.PI / 2; wrap.position.y = shoulders + half * 0.1; frame.add(wrap); const end = rod(half * 0.15, body * 0.6, mat(o.scarf)); end.position.set(half * 0.3, shoulders - body * 0.26, chest); frame.add(end); }
    if (o.badge) { const badge = new THREE.Mesh(new THREE.BoxGeometry(half * 0.5, half * 0.32, 1.5), white); badge.position.set(-half * 0.42, shoulders - body * 0.3, chest + 1); frame.add(badge); }
    if (o.paint) for (const [x, y, c] of [[-0.4, 0.3, '#d8452f'], [0.35, 0.42, '#2f6fd8'], [0.05, 0.6, '#e6b422'], [-0.2, 0.74, '#3d9a52'], [0.42, 0.72, '#d8452f']]) { const spot = ball(half * 0.13, mat(c), 1, 1, 0.3); spot.position.set(x * half, legs + body * (1 - y), chest * (0.92 + y * 0.1)); frame.add(spot); }
    if (o.pad) { const pad = new THREE.Mesh(new THREE.BoxGeometry(half * 1.3, half * 1.7, 2.5), mat('#f4efe2')); pad.position.set(half * 0.5, -upper * 0.9, half * 0.35); pad.rotation.x = -0.5; fore[0].add(pad); }
    if (o.bag) { const bag = new THREE.Mesh(new THREE.BoxGeometry(half * 1.2, half * 1.3, half * 0.4), mat(o.bag)); bag.position.set(0, -upper - half * 0.8, 0); fore[1].add(bag); const strap = new THREE.Mesh(new THREE.TorusGeometry(half * 0.3, half * 0.035, 6, 16, Math.PI), mat(o.bag)); strap.position.set(0, -upper - half * 0.15, 0); fore[1].add(strap); }
    if (o.camera) { const cam = new THREE.Mesh(new THREE.BoxGeometry(half * 0.7, half * 0.5, half * 0.4), dark); cam.position.set(0, shoulders - body * 0.42, chest + half * 0.2); frame.add(cam); const lens = new THREE.Mesh(new THREE.CylinderGeometry(half * 0.17, half * 0.17, half * 0.3, 12), dark); lens.rotation.x = Math.PI / 2; lens.position.set(0, shoulders - body * 0.42, chest + half * 0.5); frame.add(lens); }
    if (o.apron) { const apron = new THREE.Mesh(new THREE.BoxGeometry(half * 1.35, body * 0.78, 2), mat(o.apron)); apron.position.set(0, legs + body * 0.42, chest + 1.5); frame.add(apron); const bib = new THREE.Mesh(new THREE.BoxGeometry(half * 0.8, body * 0.3, 2), mat(o.apron)); bib.position.set(0, legs + body * 0.88, chest * 0.96); frame.add(bib); }
    if (o.cup) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(half * 0.24, half * 0.19, half * 0.5, 14), mat('#f6f3ec')); cup.position.set(0, -upper - half * 0.3, half * 0.3); fore[1].add(cup); const lid = new THREE.Mesh(new THREE.CylinderGeometry(half * 0.26, half * 0.26, half * 0.06, 14), mat('#5a3a22')); lid.position.set(0, -upper - half * 0.02, half * 0.3); fore[1].add(lid); }
    if (o.phone) { const phone = new THREE.Mesh(new THREE.BoxGeometry(half * 0.5, half * 0.95, 1.6), dark); phone.position.set(0, -upper - half * 0.45, half * 0.2); fore[1].add(phone); const screen = new THREE.Mesh(new THREE.PlaneGeometry(half * 0.42, half * 0.82), new THREE.MeshBasicMaterial({ color: '#bfe6ff' })); screen.position.set(0, -upper - half * 0.45, half * 0.2 - 1); screen.rotation.y = Math.PI; fore[1].add(screen); }
    // An open Bible, held in front of the chest in both hands: a dark cover, two cream pages lying open, and a red ribbon.
    if (o.bible) { const book = new THREE.Group(); book.position.set(0, shoulders - body * 0.5, chest + half * 0.72); book.rotation.x = 0.55; const cover = new THREE.Mesh(new THREE.BoxGeometry(half * 1.5, 2.4, half * 1.05), mat('#2a1a14')); book.add(cover); for (const side of [-1, 1]) { const page = new THREE.Mesh(new THREE.BoxGeometry(half * 0.7, 2.2, half * 0.95), mat('#f3ecd8')); page.position.set(side * half * 0.36, 2, 0); page.rotation.z = -side * 0.1; book.add(page); } const ribbon = new THREE.Mesh(new THREE.BoxGeometry(half * 0.06, 0.6, half * 1.2), mat('#a3262a')); ribbon.position.set(half * 0.05, 3.4, half * 0.1); book.add(ribbon); frame.add(book); }
    // A robot is built as a person is, in grey metal, with an aerial, a lamp on its chest and lit eyes.
    if (o.robot) { const lit = new THREE.MeshBasicMaterial({ color: '#7fe3ff' }); const aerial = rod(headR * 0.035, headR * 0.7, dark); aerial.position.y = headR * 1.3; head.add(aerial); const tip = ball(headR * 0.11, new THREE.MeshBasicMaterial({ color: '#ff5a4a' })); tip.position.y = headR * 1.68; head.add(tip); for (const side of [-1, 1]) { const glowEye = ball(headR * 0.17, lit, 1, 1, 0.4); glowEye.position.set(side * headR * 0.37, headR * 0.1, headR * 0.99); head.add(glowEye); } const lamp = ball(half * 0.22, lit, 1, 1, 0.4); lamp.position.set(0, shoulders - body * 0.35, chest + 1); frame.add(lamp); const grille = new THREE.Mesh(new THREE.BoxGeometry(half * 0.9, half * 0.34, 1.5), dark); grille.position.set(0, shoulders - body * 0.62, chest + 0.5); frame.add(grille); }

    // A broom, held out in front with its head on the floor. It hangs from its own hinge so it can sweep from side to side.
    let broom = null;
    if (o.broom) {
      broom = new THREE.Group(); broom.position.set(0, shoulders - body * 0.5, chest + half * 0.5);
      // The pole runs in a straight line from just above the hands down to the floor a step ahead, where the head of the broom is.
      const drop = shoulders - body * 0.5, ahead = drop * 0.72, long = Math.hypot(drop, ahead);
      const pole = rod(half * 0.07, long * 1.25, mat('#b98d55')); pole.rotation.x = -Math.atan2(ahead, drop); pole.position.set(0, -drop * 0.4, ahead * 0.4); broom.add(pole);
      const bristles = new THREE.Mesh(new THREE.BoxGeometry(half * 2.4, half * 0.6, half * 0.5), mat('#c9a13a')); bristles.position.set(0, -drop + half * 0.3, ahead); broom.add(bristles);
      frame.add(broom);
    }

    scene.add(figure);
    return { figure, frame, head, arm, leg, elbow, knee, lids, broom, height: H, child };
  }

  // ── Bubbles ──────────────────────────────────────────────────────────────
  // Words in a white bubble that floats over someone's head and always faces the visitor. Something said aloud
  // has a tail pointing down at the speaker. Something only thought is in slanting letters, with a trail of
  // small circles in place of the tail. The picture of each line is drawn once and kept.
  const bubbles = {};
  function bubbleFor(text, thought) {
    const name = (thought ? 't:' : 's:') + text;
    if (bubbles[name]) return bubbles[name];
    const c = document.createElement('canvas'), g = c.getContext('2d'), size = 30, pad = 22, letters = `${thought ? 'italic ' : ''}${size}px Georgia, serif`;
    g.font = letters;
    const words = text.split(' '), lines = [''];
    for (const w of words) { const tryLine = lines[lines.length - 1] ? lines[lines.length - 1] + ' ' + w : w; if (g.measureText(tryLine).width > 380 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = tryLine; }
    c.width = Math.ceil(Math.max(...lines.map((l) => g.measureText(l).width)) + pad * 2); c.height = Math.ceil(lines.length * size * 1.25 + pad * 2 + (thought ? 40 : 18));
    g.font = letters;
    g.fillStyle = 'rgba(255,255,255,0.96)'; g.strokeStyle = 'rgba(30,26,22,0.85)'; g.lineWidth = 3;
    const w = c.width - 4, h = c.height - (thought ? 44 : 22), r = thought ? 26 : 18;
    g.beginPath(); g.moveTo(2 + r, 2); g.arcTo(2 + w, 2, 2 + w, 2 + h, r); g.arcTo(2 + w, 2 + h, 2, 2 + h, r);
    if (!thought) { g.lineTo(c.width / 2 + 14, 2 + h); g.lineTo(c.width / 2, c.height - 2); g.lineTo(c.width / 2 - 10, 2 + h); }       // the little tail pointing down at the speaker
    g.arcTo(2, 2 + h, 2, 2, r); g.arcTo(2, 2, 2 + w, 2, r); g.closePath(); g.fill(); g.stroke();
    if (thought) for (const [dx, dy, size2] of [[10, 14, 9], [2, 30, 5.5]]) { g.beginPath(); g.arc(c.width / 2 + dx, 2 + h + dy, size2, 0, Math.PI * 2); g.fill(); g.stroke(); }      // the trail of circles down to the thinker
    g.fillStyle = '#1d1a18'; g.textBaseline = 'top';
    lines.forEach((l, n) => g.fillText(l, pad, pad + n * size * 1.25));
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
    return (bubbles[name] = { texture, wide: c.width * 0.8, tall: c.height * 0.8 });
  }
  function say(p, text, thought = false) {
    if (!p.bubble) { p.bubble = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })); p.figure.add(p.bubble); }
    p.bubble.visible = Boolean(text);
    if (!text || p.saying === text) return;
    const b = bubbleFor(text, thought);
    p.bubble.material.map = b.texture; p.bubble.material.needsUpdate = true;
    p.bubble.scale.set(b.wide, b.tall, 1); p.bubble.position.set(0, p.height + b.tall / 2 + 26, 0);
    p.saying = text;
  }

  // ── Where someone stands ─────────────────────────────────────────────────
  // A slot is a picture on its wall. `aside` is a distance along the wall from the middle of the picture (towards
  // its neighbour on the same wall), `off` is how far out from the wall.
  const place = (slot, aside, off) => ({ x: slot.x + slot.along[0] * aside + slot.out[0] * off, z: slot.z + slot.along[1] * aside + slot.out[1] * off });
  const face = (p, x, z) => { p.figure.rotation.y = Math.atan2(x - p.figure.position.x, z - p.figure.position.z); };
  // Puts someone at a slot, looking at the picture, and gives them something to do.
  function stand(slot, aside, off, who, doing, more = {}) {
    const p = person(who), at = place(slot, aside, off);
    p.figure.position.set(at.x, 0, at.z);
    face(p, slot.x, slot.z);
    Object.assign(p, { doing, beat: people.length * 1.7, ...more });      // `beat` puts each person out of step with the others
    people.push(p);
    return p;
  }

  // ── The cast ─────────────────────────────────────────────────────────────
  // The first of these pictures that is hanging on a wall nobody has been given yet. Each group gets a wall
  // to itself, so two groups never stand in the same place.
  const taken = new Set();
  const first = (...ids) => { const s = ids.map(slotFor).find((c) => c && !taken.has(c.wall)); if (s) taken.add(s.wall); return s; };

  // Children at the train, a mother just behind.
  let slot = first('train', 'steam-train');
  if (slot) {
    stand(slot, -45, 215, { height: 188, child: true, skin: SKIN[0], top: '#e04f3a', bottom: '#2f4a7a', hair: '#5a3a1e', style: 'ballcap', hat: '#2f6fd8', rosy: true, shoes: '#f4f1ea' }, 'point');
    stand(slot, 70, 190, { height: 158, child: true, skin: SKIN[0], top: '#f2c230', skirt: '#f2c230', hair: '#6b4423', style: 'pigtails', rosy: true, shoes: '#d8452f' }, 'bounce');
    stand(slot, -235, 300, { height: 322, skin: SKIN[0], top: '#3f8f8a', bottom: '#2f3440', hair: '#5a3a1e', style: 'pony', bag: '#b9853f' }, 'mind');
  }
  // Children at the three pigs, with their mother.
  slot = first('three-pigs', 'puppy', 'parrot');
  if (slot) {
    stand(slot, 40, 200, { height: 172, child: true, skin: SKIN[2], top: '#58a55c', bottom: '#3b3f4a', hair: '#1c1512', style: 'short', rosy: true, shoes: '#f4f1ea' }, 'bounce');
    stand(slot, -60, 225, { height: 196, child: true, skin: SKIN[2], top: '#b05cc4', skirt: '#7a3f8f', hair: '#1c1512', style: 'bun', rosy: true }, 'point');
    stand(slot, 240, 305, { height: 328, skin: SKIN[2], top: '#d9663a', skirt: '#3b3f4a', hair: '#1c1512', style: 'long' }, 'mind');
  }
  // The professor, considering the chess players.
  slot = first('chess', 'at-the-bar', 'cinedome', 'gethsemane', 'castle');
  if (slot) stand(slot, 225, 300, { height: 334, skin: SKIN[3], tweed: true, patches: true, bottom: '#4a4238', hair: '#b9b4aa', style: 'sides', beard: '#c9c4ba', glasses: true, bowtie: '#8f2f2a', shoes: '#4a2f1c' }, 'think');
  // Two artists, thin, one sketching.
  slot = first('lighthouse', 'voyage', 'the-bridge');
  if (slot) {
    stand(slot, -230, 275, { height: 330, thin: true, skin: SKIN[1], top: '#e9e2d0', bottom: '#33302c', hair: '#2a1f18', style: 'long', beret: '#1f1f24', scarf: '#b5343a', paint: true, pad: true }, 'sketch');
    stand(slot, 228, 310, { height: 342, thin: true, skin: SKIN[4], top: '#5d6b4e', bottom: '#2c2a28', hair: '#3a2a1c', style: 'short', beard: '#3a2a1c', scarf: '#d9a52f', paint: true }, 'admire');
  }
  // The curator and the group being shown round. The curator stands by the picture with an arm out to it,
  // facing the group; they stand in a loose half ring, between this picture and the next.
  slot = first('cabin', 'delicate-arch', 'moose', 'farm');
  if (slot) {
    const curator = stand(slot, 205, 165, { height: 336, skin: SKIN[1], top: '#23262d', bottom: '#23262d', hair: '#2a1f18', style: 'bun', glasses: true, badge: true, scarf: '#7a2e1d', shoes: '#1d1a18' }, 'show');
    const group = place(slot, 430, 430);
    face(curator, group.x, group.z);
    const listeners = [
      [330, 345, { height: 326, skin: SKIN[3], top: '#7d8fb5', bottom: '#3a3f4c', hair: '#d8d2c4', style: 'short', glasses: true, camera: true }],
      [435, 300, { height: 310, skin: SKIN[0], top: '#c95f7a', skirt: '#4a3340', hair: '#a8552c', style: 'long', bag: '#2f6f6a' }],
      [525, 385, { height: 344, skin: SKIN[2], top: '#d9b23a', bottom: '#2f3440', hair: '#1c1512', style: 'short', beard: '#1c1512' }],
      [410, 465, { height: 318, skin: SKIN[4], top: '#4f8f6a', bottom: '#53443a', hair: '#1c1512', style: 'bun', scarf: '#e6e0d2' }],
    ];
    for (const [aside, off, who] of listeners) { const p = stand(slot, aside, off, who, 'listen'); const to = place(slot, 110, 60); face(p, to.x, to.z); }
  }
  // Strollers: they look at one picture, walk along the wall to its neighbour, look at that, and walk back.
  const strollers = [
    [first('farm', 'fruit', 'moose', 'the-bridge'), { height: 324, skin: SKIN[0], top: '#2f2f38', skirt: '#2f2f38', hair: '#e2c06a', style: 'bun', bag: '#c8402f', scarf: '#e9e2d0' }],
    [first('peaches', 'cherries'), { height: 340, skin: SKIN[2], top: '#b8c4d6', bottom: '#3d4a36', hair: '#1c1512', style: 'short', camera: true }],
    [first('rainy-day', 'the-well', 'bear'), { height: 316, skin: SKIN[3], top: '#8a4f9a', bottom: '#2f3440', hair: '#7a7a80', style: 'long', glasses: true }],
  ];
  for (const [at, who] of strollers) {
    if (!at || !at.mate) continue;
    const here = place(at, 215, 300), there = place(at, at.mate - 215, 300);
    stand(at, 215, 300, who, 'stroll', { walk: { here, there, eyes: [{ x: at.x, z: at.z }, { x: at.x + at.along[0] * at.mate, z: at.z + at.along[1] * at.mate }], clock: people.length * 3.1 } });
  }

  // The cynic. He walks from one picture to the next, like the strollers, and finds fault with every one of
  // them, out loud. Nothing pleases him. (His remarks are a joke at his expense, not the gallery's.)
  const GRUMBLES = [
    'Hmph. My nephew could paint that.', 'Derivative.', 'The frame is doing all the work.', 'I have seen better. I cannot say where.',
    'Too many colours. Or too few.', 'Is it finished?', 'I preferred his earlier work. I have not seen it.', 'I suppose it is... fine.',
    'In MY day, paint was paint.', 'It does not speak to me. Nothing does.',
  ];
  const cynicAt = first('dutch-harbor', 'voyage', 'the-edmund-fitzgerald', 'bear', 'castle');
  if (cynicAt && cynicAt.mate) {
    const here = place(cynicAt, 205, 310), there = place(cynicAt, cynicAt.mate - 205, 310);
    stand(cynicAt, 205, 310, { height: 338, thin: true, skin: SKIN[3], top: '#1b1b20', bottom: '#1b1b20', hair: '#8a8580', style: 'sides', glasses: true, frown: true, scarf: '#4a4f5c', shoes: '#111' }, 'scoff',
      { walk: { here, there, eyes: [{ x: cynicAt.x, z: cynicAt.z }, { x: cynicAt.x + cynicAt.along[0] * cynicAt.mate, z: cynicAt.z + cynicAt.along[1] * cynicAt.mate }], clock: 2, look: 9, pace: 50 }, line: 0 });
  }
  // The custodian, sweeping along a wall in a room of his own: up the wall, a pause, and back again.
  const sweepAt = first('union-station', 'cinedome', 'ogden', 'dees-hamburgers', 'astronaut', 'flowers');
  if (sweepAt && sweepAt.mate) {
    const here = place(sweepAt, -250, 175), there = place(sweepAt, sweepAt.mate + 250, 175);
    stand(sweepAt, -250, 175, { height: 330, skin: SKIN[4], top: '#5f7d95', bottom: '#5f7d95', hair: '#3a3a3a', style: 'ballcap', hat: '#3f566a', moustache: '#3a3a3a', broom: true, shoes: '#2b2622', badge: true }, 'sweep',
      { walk: { here, there, eyes: null, clock: 0, look: 2.5, pace: 26 } });
  }

  // In front of "Atonement": a woman reading her Bible, standing a little to one side of the picture so that it stays in view.
  { const at = slotFor('atonement'); if (at) stand(at, -165, 300, { height: 316, skin: SKIN[3], top: '#5b6f9a', skirt: '#3a3f55', hair: '#6b4a2e', style: 'bun', glasses: true, bible: true, scarf: '#e9e2d0', shoes: '#33291f' }, 'read'); }

  // In the room of AI-generated images: two people who do not agree about them, a girl photographing her
  // favourite, and a small robot that has come to look at the work of its relations.
  slot = first('pyramid-of-light', 'phoenix-rising', 'together');
  if (slot) {
    stand(slot, -215, 300, { height: 336, skin: SKIN[3], top: '#5a4632', bottom: '#33302c', hair: '#8a8580', style: 'short', beard: '#8a8580', frown: true, collar: '#e9e2d0' }, 'doubt');
    stand(slot, 220, 290, { height: 322, skin: SKIN[1], top: '#3f7fb5', skirt: '#2f3440', hair: '#2a1f18', style: 'pony', glasses: true }, 'keen');
  }
  slot = first('together', 'the-shepherd', 'atonement', 'phoenix-rising');
  if (slot) {
    stand(slot, -205, 290, { height: 286, skin: SKIN[0], top: '#e6b422', bottom: '#3d4a66', hair: '#a8552c', style: 'long', phone: true, rosy: true, shoes: '#f4f1ea' }, 'snap');
    stand(slot, 150, 215, { height: 214, child: true, robot: true, skin: '#b9c2ca', top: '#8b96a1', bottom: '#6d7883', hair: '#8b96a1', style: 'none', shoes: '#4a525a' }, 'beep');
  }


  // At the coffee stand: the vendor behind the cart with a cup held out, a man at the counter who cannot believe
  // the price, and a woman behind him waiting her turn and running out of patience. The customers stand on the
  // left of the cart, the side the tour does not walk along.
  if (coffee) {
    const c = coffee, w = c.way, l = c.left;
    const here = (side, along, who, doing, look) => {
      const p = person(who);
      p.figure.position.set(c.x + l[0] * side + w[0] * along, 0, c.z + l[1] * side + w[1] * along);
      face(p, c.x + l[0] * look[0] + w[0] * look[1], c.z + l[1] * look[0] + w[1] * look[1]);
      Object.assign(p, { doing, beat: people.length * 1.7 });
      people.push(p);
      return p;
    };
    here(-112, 0, { height: 332, skin: SKIN[4], top: '#f1ede2', bottom: '#2f3440', hair: '#2a1f18', style: 'ballcap', hat: '#3a2418', moustache: '#2a1f18', apron: '#3a2418', cup: true, shoes: '#2b2622' }, 'serve', [200, 0]);
    here(150, 12, { height: 338, skin: SKIN[0], top: '#7b8794', bottom: '#4a4238', hair: '#9a948a', style: 'sides', glasses: true, frown: true, collar: '#ffffff', shoes: '#3b2b22' }, 'gripe', [0, 0]);
    here(292, -44, { height: 318, skin: SKIN[2], top: '#c2553f', skirt: '#33303a', hair: '#1c1512', style: 'bun', bag: '#d9b23a', frown: true, shoes: '#1d1a18' }, 'wait', [0, 20]);
  }


  // At the first fountain: a boy throwing coins in, and a little girl beside him with her eyes shut, making a wish.
  // They stand on the side you come in by, a step back from the basin, facing the water.
  if (fountains[0]) {
    const f = fountains[0], w = f.way, r = [-w[1], w[0]];                       // `r` is to the right of the way you walk in
    const by = (back, across, who, doing, more = {}) => {
      const p = person(who);
      p.figure.position.set(f.x - w[0] * back + r[0] * across, 0, f.z - w[1] * back + r[1] * across);
      face(p, f.x, f.z);
      Object.assign(p, { doing, beat: people.length * 1.7, ...more });
      people.push(p);
      return p;
    };
    const boy = by(262, 78, { height: 196, child: true, skin: SKIN[1], top: '#2f8f5b', bottom: '#5b4a3a', hair: '#2a1f18', style: 'short', rosy: true, shoes: '#c8402f' }, 'toss');
    // His coin. It is fixed to him and flies along his own forward direction, from his hand to the water.
    boy.coin = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.2, 1.1, 14), mat('#f2c84b', { metalness: 0.9, roughness: 0.25 }));
    boy.coin.visible = false; boy.figure.add(boy.coin);
    boy.far = Math.hypot(f.x - boy.figure.position.x, f.z - boy.figure.position.z);
    by(250, -92, { height: 164, child: true, skin: SKIN[3], top: '#e58fb0', skirt: '#c9577f', hair: '#c9963a', style: 'pigtails', rosy: true, shoes: '#f4f1ea' }, 'wish');
  }

  // ── What they are thinking ───────────────────────────────────────────────
  // Everyone has a few thoughts, and one of them floats up every so often and fades. (The curator's are said
  // aloud, to her group.) They are listed by what the person is doing, in the order the people were made
  // above: so the first 'point' is the boy at the train and the second is the girl at the three pigs.
  const THOUGHTS = {
    point: [['A REAL steam train!', 'Choo choo!', 'I want to drive one.'], ['That one built the brick house!', 'Where is the wolf?', 'The little one is the clever one.']],
    bounce: [['Where is it going?', 'I can hear it puffing!', 'Can we go on a train?'], ['They have overalls like mine!', 'Piggies!', 'Again! Look again!']],
    mind: [['Five more minutes, then lunch.', 'They have never been this quiet.', 'I should paint again.'], ['No touching. No touching.', 'That is rather good, actually.', 'We are getting the postcard.']],
    think: [['Note the tension in the composition.', 'Whose move is it, I wonder?', 'Reminiscent of... no. Entirely its own.', 'I must bring my students.']],
    sketch: [['How did he get that light?', 'I need more orange.', 'Rent is due Friday.']],
    admire: [['One day, a wall of my own.', 'Was that a palette knife?', 'I have not eaten since Tuesday.']],
    show: [['Notice the warm windows against the cold snow.', 'The artist paints places he knows.', 'Any questions so far?', 'This way, when you are ready.']],
    listen: [['I should have worn other shoes.', 'Fascinating.'], ['I would hang that at home.', 'What did she say?'], ['Is there a cafe?', 'Now THAT is a mountain.'], ['I came for the cabin.', 'She knows her stuff.']],
    stroll: [['This one. This is my favourite.', 'No. THIS one.', 'I wonder if there are prints.'], ['No flash. No flash.', 'Look at that colour.', 'One more, then the next room.'], ['It reminds me of home.', 'I could look at this all day.', 'Who is Ken Bingham?']],
    sweep: [['Thirty years. Still my favourite room.', 'They always miss the corners.', 'That cynic is back again.']],
    serve: [['That will be six fifty.', 'It is the same price as yesterday, sir.', 'Oat milk is extra.', 'Would you like a pastry with that?']],
    gripe: [['SIX FIFTY? For a coffee?', 'I remember when it was a dollar.', 'Does it come with the cup?', 'And FIVE for a muffin?!', 'Is there gold in it?']],
    doubt: [['But did a person make it?', 'Where is the brushwork?', 'I like his paintings better.', 'Hm. The light is good. I admit that.']],
    keen: [['The idea was his. The machine drew it.', 'It says so over the door.', 'Look at the light, though.', 'That is why they are in a room of their own.']],
    read: [['"Not my will, but thine, be done."', 'He did that for me.', 'I could stay here a while.', '"Surely he hath borne our griefs."']],
    snap: [['This is my new wallpaper.', 'No flash. I know.', 'Sending this to everyone.']],
    beep: [['My cousin made that one.', 'I feel seen.', 'Beep. I mean: lovely.', 'Do they have one of me?']],
    wait: [['Any day now.', 'It is only coffee.', 'I just want a muffin.', 'Eleven minutes. I counted.']],
    toss: [['Right in the middle!', 'Three more coins.', 'Did you see that one?']],
    wish: [['I wish for a pony.', 'Please, please, please.', 'I wish we could stay all day.']],
  };
  const dealt = {};
  for (const p of people) {
    const sets = THOUGHTS[p.doing];
    if (!sets) continue;
    dealt[p.doing] = (dealt[p.doing] || 0) + 1;
    p.thoughts = sets[(dealt[p.doing] - 1) % sets.length];
    p.aloud = ['show', 'serve', 'gripe', 'doubt', 'keen'].includes(p.doing);          // these speak; everyone else only thinks
    p.every = 13 + (people.indexOf(p) * 3.7) % 9;         // seconds from one thought to the next, different for each person
    p.mind = (people.indexOf(p) * 5.3) % p.every;         // and each starts at a different point, so they do not all think at once
  }
  // Brings a thought up for a few seconds, then lets it go until the next.
  function ponder(p, dt) {
    p.mind += dt;
    const turn = Math.floor(p.mind / p.every), into = p.mind - turn * p.every;
    say(p, into < 5.5 ? p.thoughts[turn % p.thoughts.length] : '', !p.aloud);
  }

  // What the people call out to, so the sound can follow what they do. hall3d.js fills these in.
  const heard = { say: null, sweep: null, coin: null };

  // ── Movement ─────────────────────────────────────────────────────────────
  // A round trip between two points: wait at one, walk to the other, wait, walk back. Moves the figure, swings
  // its legs while it walks, and reports where in the trip it is.
  function trip(p, dt, look, pace) {
    const w = p.walk, far = Math.hypot(w.there.x - w.here.x, w.there.z - w.here.z), going = far / pace, round = (look + going) * 2;
    w.clock = (w.clock + dt) % round;
    const c = w.clock, walking = (c > look && c < look + going) || c > look * 2 + going;
    const share = c < look ? 0 : c < look + going ? (c - look) / going : c < look * 2 + going ? 1 : 1 - (c - look * 2 - going) / going;
    p.figure.position.set(w.here.x + (w.there.x - w.here.x) * share, 0, w.here.z + (w.there.z - w.here.z) * share);
    if (walking) {
      const forward = c < look * 2 + going ? 1 : -1, swing = Math.sin(c * pace / 10);
      p.figure.rotation.y = Math.atan2((w.there.x - w.here.x) * forward, (w.there.z - w.here.z) * forward);
      p.leg[0].rotation.x = swing * 0.5; p.leg[1].rotation.x = -swing * 0.5;
      // The knee of the leg that is behind bends, as it does when a foot is lifted to come forward.
      p.knee[0].rotation.x = 0.12 + Math.max(0, swing) * 0.85; p.knee[1].rotation.x = 0.12 + Math.max(0, -swing) * 0.85;
      p.frame.position.y = Math.abs(swing) * 2.2; p.head.rotation.y = 0;
    }
    return { walking, share, c, stop: share < 0.5 ? 0 : 1 };
  }
  // Everyone breathes and looks about a little. What else they do depends on `doing`.
  let time = 0, shown = true;
  const LOOK = 7, PACE = 62;        // seconds a stroller looks at a picture, and how fast they walk
  function move(p, dt) {
    const t = time + p.beat, s = Math.sin, a = p.arm, l = p.leg;
    p.frame.position.y = s(t * 1.6) * 0.6;                                   // breathing
    p.head.rotation.set(s(t * 0.5) * 0.05, s(t * 0.37) * 0.16, 0);           // a slow look from side to side
    a[0].rotation.x = s(t * 0.9) * 0.04; a[1].rotation.x = -s(t * 0.9) * 0.04;
    l[0].rotation.x = l[1].rotation.x = 0;
    const e = p.elbow;
    for (const i of [0, 1]) { e[i].rotation.set(-0.2, 0, 0); p.knee[i].rotation.x = 0; }      // arms hang with a slight bend; legs straight
    const bend = (i, by, inward = 0) => { e[i].rotation.set(-by, 0, (i === 0 ? 1 : -1) * inward); };      // bends an elbow, and can swing the forearm across the body
    // Blinking: the lids close for a moment every few seconds, at each person's own time.
    const shut = (t * 0.31 + p.beat) % 1 < 0.035; p.lids[0].visible = p.lids[1].visible = shut;
    if (p.doing === 'point') { a[1].rotation.x = -1.35 + s(t * 2.2) * 0.1; bend(1, 0.08); bend(0, 0.5); p.head.rotation.x = -0.18; p.frame.position.y = Math.abs(s(t * 2.2)) * 2.5; }
    if (p.doing === 'bounce') { const up = Math.abs(s(t * 3.4)); p.frame.position.y = up * 7; a[0].rotation.x = a[1].rotation.x = -0.35 - up * 0.5; bend(0, 1.2 + up * 0.5); bend(1, 1.2 + up * 0.5); p.knee[0].rotation.x = p.knee[1].rotation.x = (1 - up) * 0.3; l[0].rotation.x = l[1].rotation.x = -(1 - up) * 0.15; p.head.rotation.x = -0.22; }
    if (p.doing === 'mind') { a[0].rotation.x = -0.15; bend(0, 1.3, 0.5); bend(1, 0.25); p.head.rotation.y = s(t * 0.3) * 0.5; p.head.rotation.x = 0.12; }            // a hand at her waist, an eye on the children
    if (p.doing === 'think') { a[1].rotation.x = -0.75; a[1].rotation.z = -0.1; bend(1, 2.25, 0.35); a[0].rotation.x = -0.2; a[0].rotation.z = 0.1; bend(0, 1.45, 0.95); p.head.rotation.z = s(t * 0.4) * 0.07; p.head.rotation.x = 0.04 + s(t * 0.25) * 0.06; }      // one hand to the chin, the other arm across to hold its elbow
    if (p.doing === 'sketch') { a[0].rotation.x = -0.35; bend(0, 1.25, 0.35); a[1].rotation.x = -0.5 + s(t * 6) * 0.04; bend(1, 1.35 + s(t * 6) * 0.06, 0.5); p.head.rotation.x = s(t * 0.45) > 0.2 ? 0.3 : -0.12; }   // looks up, looks down
    if (p.doing === 'admire') { a[0].rotation.x = a[1].rotation.x = 0.34; bend(0, 0.1, 0.5); bend(1, 0.1, 0.5); p.head.rotation.x = -0.14; p.head.rotation.z = s(t * 0.33) * 0.1; }                                     // hands behind the back
    if (p.doing === 'show') { a[0].rotation.x = -1.2 + s(t * 1.3) * 0.1; a[0].rotation.z = -0.7; bend(0, 0.25 + s(t * 1.3) * 0.1); a[1].rotation.x = -0.25; bend(1, 1.2 + s(t * 2.1) * 0.25, 0.2); p.head.rotation.y = s(t * 0.6) * 0.3; }
    if (p.doing === 'listen') { p.head.rotation.x = -0.06 + s(t * 0.9) * 0.05; a[0].rotation.x = 0.05; a[1].rotation.x = 0.05; bend(0, 0.9, 0.75); bend(1, 0.9, 0.75); }      // hands clasped in front
    if (p.doing === 'stroll') {
      // Look at one picture, walk to the next, look at that, walk back.
      const at = trip(p, dt, LOOK, PACE);
      if (at.walking) { a[0].rotation.x = -l[0].rotation.x * 0.8; a[1].rotation.x = -l[1].rotation.x * 0.8; bend(0, 0.45); bend(1, 0.45); }
      else { const eye = p.walk.eyes[at.stop]; face(p, eye.x, eye.z); a[0].rotation.x = a[1].rotation.x = 0.28; }
    }
    if (p.doing === 'scoff') {
      // The cynic: arms folded, nose in the air. At each picture he delivers a verdict, then moves on.
      const at = trip(p, dt, p.walk.look, p.walk.pace);
      a[0].rotation.x = a[1].rotation.x = -0.5; a[0].rotation.z = 0.12; a[1].rotation.z = -0.12; bend(0, 1.55, 1.05); bend(1, 1.7, 1.05);      // arms folded
      if (at.walking) { say(p, ''); p.spoke = false; }
      else {
        const eye = p.walk.eyes[at.stop]; face(p, eye.x, eye.z);
        p.head.rotation.x = -0.2; p.head.rotation.z = s(t * 0.5) * 0.08;
        if (!p.spoke) { p.spoke = true; p.line = (p.line + 1) % GRUMBLES.length; p.since = 0; if (heard.say) heard.say(GRUMBLES[p.line], p.figure.position); }
        p.since += dt;
        say(p, p.since > 1 && p.since < p.walk.look - 1.5 ? GRUMBLES[p.line] : '');
      }
    }
    if (p.doing === 'sweep') {
      // The custodian: he walks slowly, and the broom goes from side to side in front of him.
      const at = trip(p, dt, p.walk.look, p.walk.pace), stroke = s(t * 3.1);
      a[0].rotation.x = -0.45; a[1].rotation.x = -0.3; a[0].rotation.z = 0.2; a[1].rotation.z = -0.2; bend(0, 0.75, 0.3); bend(1, 0.95, 0.3);      // both hands on the broom
      p.head.rotation.set(0.28, stroke * 0.12, 0);
      if (at.walking) {
        p.broom.rotation.y = stroke * 0.5;
        if (p.lastStroke !== undefined && Math.sign(stroke) !== Math.sign(p.lastStroke) && heard.sweep) heard.sweep(p.figure.position);
        p.lastStroke = stroke;
      } else { p.broom.rotation.y = 0; p.head.rotation.set(-0.05, s(t * 0.4) * 0.5, 0); }      // a rest, and a look round the room
    }
    if (p.doing === 'toss') {
      // The boy: he winds his arm back, throws, and watches the coin go. A throw every four seconds or so.
      const round = 4.2, c = (t % round + round) % round, H = p.height;
      const wind = c < 0.7 ? c / 0.7 : c < 0.95 ? 1 - (c - 0.7) / 0.25 * 2.4 : c < 1.6 ? -1.4 + (c - 0.95) / 0.65 * 1.4 : 0;      // back, then sharply forward, then down again
      a[1].rotation.x = wind * 0.9; bend(1, c < 0.7 ? 1.3 : c < 1.6 ? 0.3 : 0.5); bend(0, 0.6);
      p.head.rotation.set(c > 0.9 && c < 2.2 ? -0.05 : 0.1, 0, 0);
      p.frame.position.y = c > 0.85 && c < 1.2 ? 3 : p.frame.position.y;
      // The coin leaves his hand as the arm comes forward and takes most of a second to reach the water.
      const flight = (c - 0.92) / 0.85;
      if (flight > 0 && flight < 1) {
        p.coin.visible = true;
        p.coin.position.set(H * 0.1 * (1 - flight), H * 0.78 + (56 - H * 0.78) * flight + Math.sin(flight * Math.PI) * 95, 22 + (p.far - 22 - 40) * flight);
        p.coin.rotation.set(flight * 19, 0, flight * 7);
      } else {
        if (p.coin.visible && heard.coin) heard.coin(p.figure.position);          // it has just landed
        p.coin.visible = false;
      }
    }
    if (p.doing === 'serve') {
      // The vendor: a cup held out across the counter, the other hand resting on it. A small shrug now and then.
      a[1].rotation.x = -0.95 + s(t * 0.7) * 0.04; bend(1, 0.55); a[0].rotation.x = -0.35; bend(0, 0.95, 0.2);
      const shrug = (t * 0.13) % 1 > 0.8;
      p.frame.position.y += shrug ? 1.5 : 0; p.head.rotation.set(0.04, s(t * 0.3) * 0.12, shrug ? 0.12 : 0);
    }
    if (p.doing === 'gripe') {
      // The patron: both hands out, palms up, going up and down as he makes his point, and a shake of the head.
      const beatOf = s(t * 4.2), on = (t * 0.17) % 1 < 0.7;                      // he pauses for breath
      a[0].rotation.x = a[1].rotation.x = -0.55 - (on ? Math.max(0, beatOf) * 0.3 : 0);
      a[0].rotation.z = -0.32; a[1].rotation.z = 0.32;
      bend(0, 1.15 + (on ? beatOf * 0.25 : 0)); bend(1, 1.15 + (on ? beatOf * 0.25 : 0));
      p.head.rotation.set(-0.06, on ? s(t * 6.5) * 0.2 : 0, 0);
      p.frame.position.y = on ? Math.abs(beatOf) * 1.4 : 0;
    }
    if (p.doing === 'doubt') { a[0].rotation.x = a[1].rotation.x = -0.5; a[0].rotation.z = 0.12; a[1].rotation.z = -0.12; bend(0, 1.55, 1.05); bend(1, 1.7, 1.05); p.head.rotation.set(0.02, s(t * 0.45) * 0.22, s(t * 0.3) * 0.1); }      // arms folded, head on one side
    if (p.doing === 'keen') { a[1].rotation.x = -1.1 + s(t * 1.6) * 0.12; a[1].rotation.z = 0.5; bend(1, 0.35 + s(t * 1.6) * 0.15); a[0].rotation.x = -0.3; bend(0, 0.9, 0.2); p.head.rotation.y = s(t * 0.5) * 0.4; p.frame.position.y += Math.abs(s(t * 1.6)) * 1.2; }      // a hand out towards the picture as she explains
    if (p.doing === 'read') {
      // Reading: the book held open in both hands, head bowed over it. Every so often she looks up at the picture, then returns to the page.
      const up = (t * 0.07) % 1 > 0.72;
      a[0].rotation.x = a[1].rotation.x = -0.5; a[0].rotation.z = 0.1; a[1].rotation.z = -0.1; bend(0, 1.35, 0.42); bend(1, 1.35, 0.42);
      p.head.rotation.set(up ? -0.2 : 0.42, 0, 0); p.frame.position.y = s(t * 1.2) * 0.4;
    }
    if (p.doing === 'snap') { a[0].rotation.x = a[1].rotation.x = -1.25; a[0].rotation.z = 0.28; a[1].rotation.z = -0.28; bend(0, 1.05, 0.4); bend(1, 1.05, 0.1); p.head.rotation.set(-0.1, 0, 0); p.frame.position.y = 0; }      // the phone held up in both hands
    if (p.doing === 'beep') { const tick = Math.round(s(t * 0.9)) * 0.28; p.head.rotation.set(-0.16, tick, 0); a[0].rotation.x = -0.2; a[1].rotation.x = -0.2; bend(0, 1.5); bend(1, 1.5); p.frame.position.y = 0; p.lids[0].visible = p.lids[1].visible = false; }      // a robot does not sway or blink: its head clicks from side to side
    if (p.doing === 'wait') {
      // The woman waiting: arms folded, one foot tapping, a look at the ceiling. Every so often she checks her watch.
      const watch = (t * 0.09) % 1 > 0.82;
      a[0].rotation.x = a[1].rotation.x = -0.5; a[0].rotation.z = 0.12; a[1].rotation.z = -0.12; bend(0, 1.55, 1.05); bend(1, 1.7, 1.05);
      if (watch) { a[0].rotation.x = -0.95; bend(0, 1.75, 0.75); }
      l[1].rotation.x = -0.16 - Math.max(0, s(t * 9)) * 0.1; p.knee[1].rotation.x = 0.1;      // the tapping foot
      p.head.rotation.set(watch ? 0.34 : -0.16 + s(t * 0.5) * 0.06, watch ? -0.3 : s(t * 0.33) * 0.35, 0);
    }
    if (p.doing === 'wish') {
      // The girl: hands clasped under her chin, eyes shut tight, face turned up. Now and then she peeps.
      a[0].rotation.x = a[1].rotation.x = -0.72; bend(0, 1.75, 0.6); bend(1, 1.75, 0.6);
      const peep = (t * 0.11) % 1 > 0.86;
      p.lids[0].visible = p.lids[1].visible = !peep;
      p.head.rotation.set(peep ? 0.05 : -0.2, 0, s(t * 0.8) * 0.05);
      p.frame.position.y = Math.abs(s(t * 1.1)) * 1.2;
    }
    if (p.thoughts) ponder(p, dt);
  }

  return {
    count: people.length,
    heard,
    // Shows everyone, or takes them all away for a visitor who would sooner have the rooms to themselves.
    show(want) { shown = Boolean(want); for (const p of people) p.figure.visible = shown; },
    get shown() { return shown; },
    // How near the crowd and the children are to someone standing at `me`, each from 0 (out of hearing) to 1.
    near(me) {
      if (!shown) return { crowd: 0, kids: 0 };
      const loud = (p) => Math.max(0, 1 - Math.hypot(p.figure.position.x - me.x, p.figure.position.z - me.z) / 2200) ** 2;
      let crowd = 0, kids = 0;
      for (const p of people) { if (p.child) kids = Math.max(kids, loud(p)); else crowd += loud(p); }
      return { crowd: Math.min(1, 0.1 + crowd / 4), kids };          // a little din carries from the other rooms wherever you are
    },
    places: () => people.map((p) => ({ x: p.figure.position.x, z: p.figure.position.z, doing: p.doing, child: p.child, bubble: p.bubble && p.bubble.visible ? p.saying : '' })),
    // Moves everyone who is near enough to be seen. Says whether anyone was, so the view is redrawn only then.
    update(dt, me) {
      time += dt;
      if (!shown) return false;
      let seen = false;
      for (const p of people) {
        if (!me.all && Math.hypot(p.figure.position.x - me.x, p.figure.position.z - me.z) > 3600) continue;
        move(p, dt); seen = true;
      }
      return seen;
    },
  };
}
