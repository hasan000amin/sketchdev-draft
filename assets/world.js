/* Sketch Dev Studio — Papercraft World (Three.js)
   Dunia kertas: diorama potongan kertas yang berputar seperti karusel
   mengikuti scroll; maskot kucing kertas meluncur dari cluster ke cluster.
   Varian: 'scroll' (beranda) | 'parked' (halaman lain). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/* ---------- tekstur kertas & glyph ---------- */
function makePaperTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#ffffff'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5200; i++) {
    x.fillStyle = `rgba(90,70,40,${Math.random() * .05})`;
    x.fillRect(Math.random() * 256, Math.random() * 256, 1.4, 1.4);
  }
  for (let i = 0; i < 260; i++) {
    x.fillStyle = `rgba(255,255,255,${Math.random() * .5})`;
    x.fillRect(Math.random() * 256, Math.random() * 256, 6, 1);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
let PAPER_TEX = null;
function paperMat(color, rough = .94) {
  return new THREE.MeshStandardMaterial({
    color, roughness: rough, map: PAPER_TEX, bumpMap: PAPER_TEX, bumpScale: .012
  });
}
function glyphTexture(glyph, fg = '#4a3428') {
  const s = 256, c = document.createElement('canvas'); c.width = c.height = s;
  const x = c.getContext('2d');
  x.fillStyle = '#faf3df'; x.beginPath(); x.roundRect(0, 0, s, s, 34); x.fill();
  x.strokeStyle = 'rgba(74,52,40,.28)'; x.lineWidth = 6;
  x.beginPath(); x.roundRect(11, 11, s - 22, s - 22, 26); x.stroke();
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `${s * .56}px "Archivo Black", sans-serif`;
  x.fillText(glyph, s / 2, s / 2 + s * .03);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

/* ---------- bentuk kertas (shape -> extrude + border putih stiker) ---------- */
function cut(shape, color, depth = .13, sticker = true) {
  const g = new THREE.Group();
  if (sticker) {
    const back = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: depth * .7, bevelEnabled: false }),
      paperMat(0xfffdf4, .9));
    back.scale.set(1.07, 1.07, 1); back.position.z = -.035;
    back.castShadow = true; g.add(back);
  }
  const m = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: .015, bevelSize: .015, bevelSegments: 1 }),
    paperMat(color));
  m.castShadow = true; m.receiveShadow = true; g.add(m);
  return g;
}
function blobShape(w, h, bumps = 5, seed = 1) {
  const s = new THREE.Shape();
  const pts = [];
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI;
    pts.push([Math.cos(a) * w / 2, Math.abs(Math.sin(a)) * h * (0.75 + ((i * seed * 37) % 10) / 40)]);
  }
  s.moveTo(-w / 2, 0);
  for (let i = 1; i < pts.length; i++) {
    const [px, py] = pts[i - 1], [cx, cy] = pts[i];
    s.quadraticCurveTo(px, py + .18, cx, cy);
  }
  s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0);
  return s;
}
function hillShape(w, h) { return blobShape(w, h, 4, 3); }
function cloudShape(w = 1.9) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0);
  s.bezierCurveTo(-w / 2, .34, -w * .28, .3, -w * .24, .44);
  s.bezierCurveTo(-w * .16, .72, w * .14, .74, w * .22, .46);
  s.bezierCurveTo(w * .3, .32, w / 2, .3, w / 2, 0);
  s.lineTo(-w / 2, 0);
  return s;
}
function circleShape(r) {
  const s = new THREE.Shape(); s.absarc(0, 0, r, 0, Math.PI * 2); return s;
}
function starShape(r = .3) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2, rad = i % 2 ? r * .48 : r;
    const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    i ? s.lineTo(px, py) : s.moveTo(px, py);
  }
  s.closePath(); return s;
}
function rectShape(w, h, r = .04) {
  const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
function triShape(w, h) {
  const s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath(); return s;
}

/* ---------- potongan siap pakai ---------- */
function tree(h = 1.15, color = 0x5da271) {
  const g = new THREE.Group();
  const trunk = cut(rectShape(.13, h * .36, .03), 0x8a5a36); trunk.position.y = 0; g.add(trunk);
  const top = cut(blobShape(h * .78, h * .72, 5, 2), color);
  top.position.y = h * .3; g.add(top);
  return g;
}
function flower(color = 0xef8354) {
  const g = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .34, 6), paperMat(0x5da271));
  stem.position.y = .17; g.add(stem);
  const head = cut(circleShape(.09), color, .05); head.position.y = .4; g.add(head);
  const core = cut(circleShape(.04), 0xffd23f, .06); core.position.set(0, .4, .03); g.add(core);
  return g;
}
function house() {
  const g = new THREE.Group();
  const body = cut(rectShape(1.25, 1.0, .03), 0xfdf6e3); body.position.y = .5; g.add(body);
  const roof = cut(triShape(1.6, .78), 0xe2725b); roof.position.y = 1.0; g.add(roof);
  const chim = cut(rectShape(.2, .44, .02), 0xb8a88f); chim.position.set(.42, 1.28, -.02); g.add(chim);
  const door = cut(rectShape(.3, .52, .1), 0x7fb5d5); door.position.set(-.22, .26, .1); g.add(door);
  const win = cut(circleShape(.13), 0xffd23f); win.position.set(.3, .62, .1); g.add(win);
  const sign = cut(rectShape(.62, .2, .06), 0xffc531); sign.position.set(0, 1.06, .12); g.add(sign);
  return g;
}
function paperCat(scale = 1) {
  const g = new THREE.Group();
  const body = cut(blobShape(.62, .5, 4, 5), 0xfdf6e3); g.add(body);
  const head = cut(circleShape(.27), 0xfdf6e3); head.position.set(0, .52, .03); g.add(head);
  [[-.17, .72], [.17, .72]].forEach(([ex, ey]) => {
    const ear = cut(triShape(.2, .24), 0xfdf6e3); ear.position.set(ex - .1, ey - .1, .01); g.add(ear);
    const inner = cut(triShape(.1, .12), 0xf6b8c1); inner.position.set(ex - .05, ey - .04, .05); g.add(inner);
  });
  [[-.11], [.11]].forEach(([ex]) => {
    const eye = new THREE.Mesh(new THREE.CircleGeometry(.028, 12), new THREE.MeshBasicMaterial({ color: 0x38342b }));
    eye.position.set(ex, .55, .21); g.add(eye);
  });
  const nose = cut(triShape(.07, .05), 0xef8354, .04); nose.rotation.z = Math.PI; nose.position.set(-.035, .44, .2); g.add(nose);
  const tail = new THREE.Mesh(new THREE.TorusGeometry(.3, .055, 8, 20, 2.1), paperMat(0xf3e9d2));
  tail.position.set(.36, .12, -.02); tail.rotation.set(0, .5, -.7); tail.scale.z = .5; g.add(tail);
  const seat = cut(cloudShape(1.05), 0xffffff); seat.position.set(-.52, -.32, -.06); g.add(seat);
  g.scale.setScalar(scale);
  return g;
}
function paperSnake() {
  const g = new THREE.Group();
  const pts = [[-1.5, .12], [-.8, .34], [.05, .14], [.8, .38], [1.45, .18]];
  pts.forEach(([px, py], i) => {
    const d = cut(circleShape(.21 - Math.abs(i - 3) * .012), i === 4 ? 0x37b06c : 0x2f9e63, .1);
    d.position.set(px, py, .02); g.add(d);
  });
  const headG = new THREE.Group(); headG.position.set(1.45, .18, .1);
  [[-.08, .1], [.08, .1]].forEach(([ex, ey]) => {
    const eye = new THREE.Mesh(new THREE.CircleGeometry(.032, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    eye.position.set(ex, ey, .1); headG.add(eye);
    const pupil = new THREE.Mesh(new THREE.CircleGeometry(.016, 10), new THREE.MeshBasicMaterial({ color: 0x22271f }));
    pupil.position.set(ex, ey, .115); headG.add(pupil);
    const leaf = cut(triShape(.09, .16), 0x57b25e, .05);
    leaf.position.set(ex - .045, .16, 0); leaf.rotation.z = ex > 0 ? -.45 : .45; headG.add(leaf);
  });
  g.add(headG);
  return g;
}
function cardMesh(faceTex, w = 1.0) {
  const g = new THREE.Group();
  const box = new THREE.Mesh(new RoundedBoxGeometry(w, w, .09, 3, .05), paperMat(0xfffdf4, .85));
  box.castShadow = true; g.add(box);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w * .92, w * .92),
    new THREE.MeshStandardMaterial({ map: faceTex, roughness: .85, transparent: true }));
  f.position.z = .048; g.add(f);
  const b = f.clone(); b.position.z = -.048; b.rotation.y = Math.PI; g.add(b);
  return g;
}

/* ================= DUNIA ================= */
export function initWorld(opts = {}) {
  const variant = opts.variant || 'scroll';
  const container = document.getElementById('scene');
  if (!container) return;
  init(container, variant).catch(err => {
    console.warn('Paper world unavailable:', err);
    window.__sceneReady = 'failed';
  });
}

async function init(container, variant) {
  try { await document.fonts.load('90px "Archivo Black"'); } catch (e) {}
  PAPER_TEX = makePaperTexture();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .55;

  const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, .1, 100);
  let camZ = 13.8, camY = 3.6, worldY = .1, worldScale = 1;
  function frame() {
    const a = container.clientWidth / container.clientHeight;
    const portrait = a < .85;
    camZ = portrait ? 19.5 : 13.8;
    camY = portrait ? 4.6 : 3.6;
    worldScale = portrait ? .74 : 1;
    world.position.y = portrait ? 2.0 : .1;
    camera.aspect = a; camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  scene.add(new THREE.HemisphereLight(0xfff6e0, 0xd8c9a3, .95));
  const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.35);
  sunLight.position.set(6, 11, 8); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -13; sunLight.shadow.camera.right = 13;
  sunLight.shadow.camera.top = 13; sunLight.shadow.camera.bottom = -13;
  sunLight.shadow.radius = 5; sunLight.shadow.bias = -.0004;
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0xbcd8ff, .35); fill.position.set(-7, 4, -5); scene.add(fill);

  /* matahari kertas (tetap di langit) */
  const sun = new THREE.Group();
  for (let i = 0; i < 8; i++) {
    const ray = cut(triShape(.3, .62), 0xffc531, .08);
    const holder = new THREE.Group(); holder.rotation.z = (i / 8) * Math.PI * 2;
    ray.position.y = .78; holder.add(ray); sun.add(holder);
  }
  const sunCore = cut(circleShape(.52), 0xffd23f); sun.add(sunCore);
  sun.position.set(-8.6, 5.6, -7); scene.add(sun);

  const world = new THREE.Group(); scene.add(world);
  const R = 8.6;

  function shadowPlane(w = 7) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, w * .42), new THREE.ShadowMaterial({ opacity: .16 }));
    p.rotation.x = -Math.PI / 2; p.position.y = -1.62; p.receiveShadow = true; return p;
  }
  function cluster(angleDeg, build) {
    const a = THREE.MathUtils.degToRad(angleDeg);
    const g = new THREE.Group();
    g.position.set(Math.sin(a) * R, 0, Math.cos(a) * R);
    g.rotation.y = a;
    g.add(shadowPlane());
    build(g);
    world.add(g);
    return g;
  }
  function hill(w, h, color, y = -1.6) {
    const m = cut(hillShape(w, h), color); m.position.y = y; return m;
  }

  /* --- tengah: bukit studio --- */
  const center = new THREE.Group(); world.add(center);
  center.add(shadowPlane(9));
  const bigHill = hill(7.6, 3.1, 0x8fce7e, -1.6); center.add(bigHill);
  const backHill = hill(9.5, 2.2, 0xa8dba8, -1.6); backHill.position.z = -1.4; center.add(backHill);
  const studio = house(); studio.position.set(-.4, .95, .3); studio.scale.setScalar(1.25); center.add(studio);
  const t1 = tree(1.5, 0x4e9a5f); t1.position.set(2.2, .55, .2); center.add(t1);
  const t2 = tree(1.1, 0x7fb069); t2.position.set(-2.6, .35, .1); center.add(t2);
  [[-1.8, -.2], [1.2, -.5], [2.9, -.1]].forEach(([fx, fy], i) => {
    const f = flower([0xef8354, 0xf6b8c1, 0xffd23f][i]); f.position.set(fx, fy + .55, .55); center.add(f);
  });

  /* --- cluster 0: BERANDA (ular kertas + huruf jatuh) --- */
  const fallers = [];
  cluster(0, g => {
    g.add(hill(6.8, 1.9, 0x7fb069, -1.6));
    const sn = paperSnake(); sn.position.set(-.4, -.95, .7); sn.scale.setScalar(1.15); g.add(sn);
    const tr = tree(1.3, 0x5da271); tr.position.set(-2.7, -.75, .1); g.add(tr);
    ['L', 'R', '7'].forEach((ch, i) => {
      const tile = cardMesh(glyphTexture(ch), .62);
      tile.position.set(-1.5 + i * 1.5, 2.6, .6);
      tile.userData = { ph: i * 2.1, x: tile.position.x };
      g.add(tile); fallers.push(tile);
    });
    const st = cut(starShape(.24), 0xffc531); st.position.set(2.95, 2.4, .3); g.add(st);
  });

  /* --- cluster 1: GAME (6 kartu ikon berdiri) --- */
  const loader = new THREE.TextureLoader();
  const icons = ['letter-rain-icon.png', 'letter-snake-icon.png', 'numerik-crisis-icon.png',
                 'number-rain-icon.png', 'number-snake-icon.png', 'meowdoku-icon.png'];
  cluster(-70, g => {
    g.add(hill(7.2, 1.8, 0xf2c4ce, -1.6));
    icons.forEach((name, i) => {
      const tex = loader.load('images/' + name);
      tex.colorSpace = THREE.SRGBColorSpace;
      const card = cardMesh(tex, 1.06);
      const col = i % 3, row = Math.floor(i / 3);
      card.position.set((col - 1) * 1.55, .15 - row * 1.28, .5 - row * .25);
      card.rotation.z = (col - 1) * .05;
      card.userData = { ph: i * .9, y: card.position.y };
      g.add(card); fallers.push(card);
    });
    const tr = tree(1.2, 0xe58bb1); tr.position.set(-3.1, -.8, 0); g.add(tr);
    const tr2 = tree(1.0, 0xe58bb1); tr2.position.set(3.1, -.85, 0); g.add(tr2);
  });

  /* --- cluster 2: TENTANG (pensil raksasa + buku + bintang) --- */
  cluster(-140, g => {
    g.add(hill(6.8, 1.8, 0xa8cbe0, -1.6));
    const pencil = new THREE.Group();
    const pBody = cut(rectShape(.52, 2.6, .06), 0xffc531); pBody.position.y = 1.3; pencil.add(pBody);
    const pTip = cut(triShape(.52, .62), 0xf7ead1); pTip.position.y = 2.6; pTip.rotation.z = Math.PI; pencil.add(pTip);
    const pLead = cut(triShape(.16, .24), 0x38342b); pLead.position.y = 2.78; pLead.rotation.z = Math.PI; pencil.add(pLead);
    const pEraser = cut(rectShape(.52, .3, .05), 0xf6b8c1); pEraser.position.y = -.05; pencil.add(pEraser);
    pencil.position.set(-1.9, -.9, .4); pencil.rotation.z = .38; g.add(pencil);
    const book = new THREE.Group();
    [-1, 1].forEach(side => {
      const page = cut(rectShape(1.15, 1.5, .04), 0xfffdf4);
      page.position.set(side * .55, .75, 0); page.rotation.y = side * -.32; book.add(page);
      const cover = cut(rectShape(1.22, 1.58, .04), 0xe2725b);
      cover.position.set(side * .56, .72, -.05); cover.rotation.y = side * -.32; book.add(cover);
    });
    book.position.set(1.1, -.95, .5); g.add(book);
    [[-.2, 2.2], [1.9, 2.7], [2.9, 1.6]].forEach(([sx, sy], i) => {
      const st = cut(starShape(.26), [0xffc531, 0xffd23f, 0xef8354][i]);
      st.position.set(sx, sy, .3); st.userData = { ph: i * 1.7 };
      g.add(st); fallers.push(st);
    });
  });

  /* --- cluster 3: KONTAK (kotak pos + amplop + pesawat kertas) --- */
  cluster(-210, g => {
    g.add(hill(6.8, 1.8, 0xf6d9a8, -1.6));
    const box = new THREE.Group();
    const bBody = cut(rectShape(1.3, .8, .05), 0xe2725b); bBody.position.y = .4; box.add(bBody);
    const bTop = cut(blobShape(1.3, .5, 3, 4), 0xe2725b); bTop.position.y = .78; box.add(bTop);
    const bDoor = cut(rectShape(.9, .55, .1), 0xc7533f); bDoor.position.set(0, .38, .1); box.add(bDoor);
    const bLeg = cut(rectShape(.16, .8, .03), 0x8a5a36); bLeg.position.y = -.4; box.add(bLeg);
    const flag = cut(rectShape(.12, .5, .03), 0xffc531); flag.position.set(.72, .85, 0); flag.rotation.z = -.5; box.add(flag);
    box.position.set(-1.3, -.55, .4); g.add(box);
    const env = cardMesh(glyphTexture('✉', '#c7533f'), 1.0);
    env.position.set(1.2, .5, .5); env.rotation.z = -.14; env.userData = { ph: .8, y: .5 };
    g.add(env); fallers.push(env);
    const plane = new THREE.Group();
    const w1 = cut(triShape(1.1, .34), 0xfffdf4); w1.rotation.set(0, 0, 0); plane.add(w1);
    const w2 = cut(triShape(.8, .26), 0xdfe9f5); w2.rotation.y = .7; w2.position.z = -.1; plane.add(w2);
    plane.position.set(2.4, 1.9, .2); plane.rotation.z = -.3; plane.userData = { ph: 2.2, y: 1.9 };
    g.add(plane); fallers.push(plane);
    const heart = cut(starShape(.22), 0xef8354); heart.position.set(.2, 2.3, .3); g.add(heart);
  });

  /* awan melayang (ikut dunia) */
  const clouds = [];
  [[-4.5, 4.6, -3], [5, 5.2, -2], [0, 5.8, -6.5], [-6.5, 3.8, 2.5], [6.8, 4.2, 3]].forEach(([cx, cy, cz], i) => {
    const cl = cut(cloudShape(1.7 + (i % 3) * .4), 0xffffff);
    cl.position.set(cx, cy, cz); cl.userData = { ph: i * 1.3, x: cx };
    world.add(cl); clouds.push(cl);
  });

  /* maskot kucing di atas awan kecil */
  const cat = paperCat(1.05);
  world.add(cat);

  /* ---------- interaksi & animasi ---------- */
  const ANGLES = [0, -70, -140, -210].map(THREE.MathUtils.degToRad);
  const MAXROT = -ANGLES[ANGLES.length - 1];
  let targetRot = variant === 'parked' ? .55 : 0;
  let catAngle = .38, mx = 0, tx = 0;
  addEventListener('pointermove', e => { tx = (e.clientX / innerWidth - .5) * 2; });
  function updateScroll() {
    if (variant !== 'scroll') return;
    const max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? Math.min(scrollY / max, 1) : 0;
    targetRot = p * MAXROT;
  }
  addEventListener('scroll', updateScroll, { passive: true }); updateScroll();

  let running = true;
  new IntersectionObserver(e => { running = e[0].isIntersecting; }).observe(container);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  frame();
  camera.position.set(0, camY, camZ); // mulai sudah terbingkai — tanpa dolly dari titik nol
  const clock = new THREE.Clock();
  let readyFlag = false;
  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    const t = clock.getElapsedTime();
    mx += (tx - mx) * .04;
    world.rotation.y += (targetRot - world.rotation.y) * .055;
    world.rotation.x = Math.sin(t * .3) * .012 + mx * .01;
    world.scale.setScalar(worldScale);
    sun.rotation.z = t * .05;
    clouds.forEach(cl => {
      cl.position.x = cl.userData.x + Math.sin(t * .14 + cl.userData.ph) * .5;
      cl.position.y += Math.sin(t * .5 + cl.userData.ph) * .0009;
    });
    fallers.forEach(f => {
      if (f.userData.x !== undefined) {           // huruf jatuh cluster beranda
        const fall = ((t * .34 + f.userData.ph) % 3.4);
        f.position.y = 2.7 - fall;
        f.rotation.z = Math.sin(t * 1.4 + f.userData.ph) * .16;
        f.rotation.y = Math.sin(t * .9 + f.userData.ph) * .3;
      } else {                                     // elemen melayang lembut
        f.position.y = f.userData.y + Math.sin(t * .8 + f.userData.ph) * .13;
        f.rotation.y = Math.sin(t * .6 + f.userData.ph) * .1;
      }
    });
    /* kucing meluncur mengikuti putaran dunia */
    const active = variant === 'parked' ? .38 : (-world.rotation.y) + .38;
    catAngle += (active - catAngle) * .06;
    cat.position.set(Math.sin(catAngle) * R, .62 + Math.sin(t * 1.3) * .07, Math.cos(catAngle) * R);
    cat.rotation.y = catAngle;
    cat.rotation.z = Math.sin(t * 1.3) * .03;
    camera.position.x += ((mx * .8) - camera.position.x) * .04;
    camera.position.y += (camY - camera.position.y) * .05;
    camera.position.z += (camZ - camera.position.z) * .06;
    camera.lookAt(0, .9, 0);
    renderer.render(scene, camera);
    if (!readyFlag) { readyFlag = true; window.__sceneReady = true; }
  }
  animate();
  addEventListener('resize', frame);
}
