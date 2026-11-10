/* Sketch Dev Studio — Paper Plane Room (Three.js)
   Di dalam ruangan kertas yang hangat: pesawat-pesawat kertas beterbangan
   ke sana kemari mengikuti kursor pengunjung (atau berkelana sendiri saat
   kursor diam), meninggalkan jejak garis putus-putus ala sketsa.
   Varian: 'scroll' (beranda) | 'parked' (halaman lain, lebih tenang). */
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
function paperMatTiled(color, rx, ry, rough = .96) {
  const tex = PAPER_TEX.clone();
  tex.needsUpdate = true; tex.repeat.set(rx, ry);
  return new THREE.MeshStandardMaterial({
    color, roughness: rough, map: tex, bumpMap: tex, bumpScale: .012
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

/* ---------- pesawat kertas (dart lipatan klasik, hidung ke +Z) ---------- */
function paperPlaneMesh(color) {
  const A = [0, 0, .58], B = [-.58, .14, -.46], C = [.58, .14, -.46],
        D = [0, .07, -.46], E = [0, -.24, -.38];
  const tris = [
    A, B, D,   // sayap kiri atas
    A, D, C,   // sayap kanan atas
    A, E, B,   // sisi bawah kiri
    A, C, E,   // sisi bawah kanan
    B, E, D,   // ekor kiri
    C, D, E,   // ekor kanan
  ];
  const pos = new Float32Array(tris.flat());
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    color, roughness: .85, map: PAPER_TEX, flatShading: true, side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, 12),
    new THREE.LineBasicMaterial({ color: 0x4a3428, transparent: true, opacity: .32 }));
  mesh.add(edges);
  const g = new THREE.Group();
  g.add(mesh);
  return g;
}

/* ================= DUNIA ================= */
export function initWorld(opts = {}) {
  const variant = opts.variant || 'scroll';
  const container = document.getElementById('scene');
  if (!container) return;
  init(container, variant).catch(err => {
    console.warn('Paper plane room unavailable:', err);
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
  renderer.toneMappingExposure = 1.04;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = .62;

  const camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, .1, 100);
  const bounds = { x: 8.4, yMin: -.6, yMax: 6.2, zMin: -3.2, zMax: 2.4 };
  let camZ = 13.8, camY = 2.9;
  function frame() {
    const a = container.clientWidth / container.clientHeight;
    const portrait = a < .85;
    camZ = portrait ? 20.5 : 13.8;
    camY = portrait ? 3.4 : 2.9;
    camera.aspect = a; camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    const halfH = Math.tan(THREE.MathUtils.degToRad(21)) * camZ;
    bounds.x = Math.max(2.8, halfH * a * .88);
    bounds.yMax = 1.5 + halfH * .88;
    bounds.yMin = Math.max(-1.5, 1.5 - halfH * .8);
  }

  scene.add(new THREE.HemisphereLight(0xfff6e0, 0xd8c9a3, .9));
  const sunLight = new THREE.DirectionalLight(0xfff1d6, 1.25);
  sunLight.position.set(-5, 9, 7); sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = -14; sunLight.shadow.camera.right = 14;
  sunLight.shadow.camera.top = 14; sunLight.shadow.camera.bottom = -14;
  sunLight.shadow.radius = 5; sunLight.shadow.bias = -.0004;
  scene.add(sunLight);
  const fill = new THREE.DirectionalLight(0xbcd8ff, .3); fill.position.set(7, 4, 6); scene.add(fill);

  /* ============ RUANGAN ============ */
  const room = new THREE.Group(); scene.add(room);
  const WALL_Z = -5.2, FLOOR_Y = -2.1;

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(52, 24), paperMatTiled(0xf7ecd2, 7, 3));
  wall.position.set(0, 5, WALL_Z); wall.receiveShadow = true; room.add(wall);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(52, 15), paperMatTiled(0xe6c48c, 8, 2));
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, FLOOR_Y, WALL_Z + 7.4);
  floor.receiveShadow = true; room.add(floor);

  const baseboard = new THREE.Mesh(new THREE.BoxGeometry(52, .55, .16), paperMat(0xfffdf4));
  baseboard.position.set(0, FLOOR_Y + .27, WALL_Z + .06); room.add(baseboard);

  const rug = new THREE.Mesh(new THREE.CircleGeometry(3.1, 40), paperMat(0xe8927c, .98));
  rug.rotation.x = -Math.PI / 2; rug.scale.set(1.25, .62, 1);
  rug.position.set(.4, FLOOR_Y + .012, -.6); rug.receiveShadow = true; room.add(rug);

  /* jendela (kiri) — langit kertas + matahari + awan + tirai */
  const win = new THREE.Group(); win.position.set(-5.6, 3.1, WALL_Z + .12); room.add(win);
  const winFrame = cut(rectShape(3.5, 4.3, .09), 0xfffdf4, .16); win.add(winFrame);
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 3.8),
    new THREE.MeshStandardMaterial({ color: 0xaedcf2, roughness: .95, map: PAPER_TEX }));
  sky.position.z = .05; win.add(sky);
  const winSun = cut(circleShape(.42), 0xffd23f, .06); winSun.position.set(-.85, 1.15, .1); win.add(winSun);
  const winCloud = cut(cloudShape(1.15), 0xffffff, .06); winCloud.position.set(.35, .55, .1); win.add(winCloud);
  const winCloud2 = cut(cloudShape(.8), 0xffffff, .06); winCloud2.position.set(-.95, -.5, .1); win.add(winCloud2);
  [[0, 0, .1, 3.8], [0, 0, 3.0, .1]].forEach(([bx, by, bw, bh]) => {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(bw || .1, bh || .1, .07), paperMat(0xfffdf4));
    bar.position.set(bx, by, .12); win.add(bar);
  });
  [-1, 1].forEach(side => {
    const curtain = cut(blobShape(.85, 3.9, 4, side > 0 ? 7 : 3), 0xe2725b, .1);
    curtain.position.set(side * 1.95, .1, .16); curtain.rotation.z = side * .05; win.add(curtain);
  });
  const sill = cut(rectShape(3.9, .2, .05), 0xfffdf4, .14); sill.position.set(0, -2.25, .06); win.add(sill);

  /* rak buku (kanan) */
  const shelf = new THREE.Group(); shelf.position.set(5.9, 3.3, WALL_Z + .12); room.add(shelf);
  const board = cut(rectShape(3.9, .18, .04), 0x8a5a36, .3); board.position.y = -.6; shelf.add(board);
  const bookCols = [0xe2725b, 0x2f9e63, 0xffc531, 0x7fb5d5, 0xf6b8c1];
  bookCols.forEach((col, i) => {
    const h = .95 + (i % 3) * .16;
    const book = new THREE.Mesh(new RoundedBoxGeometry(.34, h, .42, 2, .03), paperMat(col, .9));
    book.position.set(-1.55 + i * .44, -.51 + h / 2, .12);
    if (i === 4) { book.rotation.z = .17; book.position.x += .08; book.position.y -= .03; }
    book.castShadow = true; shelf.add(book);
  });
  const potS = new THREE.Mesh(new THREE.CylinderGeometry(.2, .15, .3, 10), paperMat(0xc7533f));
  potS.position.set(1.55, -.36, .12); shelf.add(potS);
  const leafS = cut(blobShape(.55, .5, 5, 4), 0x5da271, .07); leafS.position.set(1.28, -.05, .12); shelf.add(leafS);
  const board2 = cut(rectShape(3.9, .18, .04), 0x8a5a36, .3); board2.position.y = -2.1; shelf.add(board2);
  const envStack = cut(rectShape(.95, .7, .06), 0xfffdf4, .1); envStack.position.set(-1.2, -1.72, .1); envStack.rotation.z = -.06; shelf.add(envStack);
  const clockFace = cut(circleShape(.42), 0xfffdf4, .09); clockFace.position.set(.9, -1.68, .1); shelf.add(clockFace);
  const hand1 = new THREE.Mesh(new THREE.BoxGeometry(.05, .3, .03), new THREE.MeshBasicMaterial({ color: 0x38342b }));
  hand1.position.set(.9, -1.6, .22); shelf.add(hand1);
  const hand2 = hand1.clone(); hand2.rotation.z = -1.1; hand2.position.set(.97, -1.72, .22); shelf.add(hand2);

  /* ubin huruf di dinding (kanan atas) */
  [['L', 3.1, 6.3, '#2f9e63'], ['7', 4.45, 6.55, '#c7533f']].forEach(([glyph, fx, fy, fg]) => {
    const fr = new THREE.Group(); fr.position.set(fx, fy, WALL_Z + .1); room.add(fr);
    fr.add(cut(rectShape(1.05, 1.05, .18), 0xfffdf4, .12));
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(.92, .92),
      new THREE.MeshStandardMaterial({ map: glyphTexture(glyph, fg), roughness: .9 }));
    inner.position.z = .145; fr.add(inner);
  });

  /* lampu gantung */
  const lamp = new THREE.Group(); lamp.position.set(-1.7, 0, -2.2); room.add(lamp);
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, 3.4, 6),
    new THREE.MeshBasicMaterial({ color: 0x4a3428 }));
  cord.position.y = 8.3; lamp.add(cord);
  const shade = new THREE.Mesh(new THREE.ConeGeometry(.95, .95, 26, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xffc531, roughness: .8, map: PAPER_TEX, side: THREE.DoubleSide }));
  shade.position.y = 6.45; shade.castShadow = true; lamp.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(.17, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  bulb.position.y = 6.12; lamp.add(bulb);
  const glow = new THREE.PointLight(0xffd9a0, 12, 13, 1.8); glow.position.y = 6.0; lamp.add(glow);

  /* tanaman sudut (kiri bawah) */
  const plant = new THREE.Group(); plant.position.set(8.5, FLOOR_Y, -3.0); room.add(plant);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.46, .34, .68, 12), paperMat(0xc7533f));
  pot.position.y = .34; pot.castShadow = true; plant.add(pot);
  [[-.3, .72, .35], [.05, .92, -.2], [.35, .68, .25]].forEach(([lx, ly, rz], i) => {
    const leaf = cut(blobShape(.8, .95, 5, i + 2), i === 1 ? 0x4e9a5f : 0x5da271, .07);
    leaf.position.set(lx, ly, 0); leaf.rotation.z = rz; plant.add(leaf);
  });

  /* bintang kecil di dinding */
  [[-2.3, 6.6, .26, 0xffc531], [7.9, 5.6, .2, 0xef8354], [-8.3, 5.9, .18, 0xffd23f]].forEach(([sx, sy, sr, col]) => {
    const st = cut(starShape(sr), col, .07); st.position.set(sx, sy, WALL_Z + .08); room.add(st);
  });

  /* ============ PESAWAT KERTAS ============ */
  const calm = variant === 'parked' || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SPEED = calm ? .55 : 1;
  const planeCols = [0xffffff, 0xffe9a8, 0xffd3dc, 0xcfe6ff, 0xd8f3dc];
  const planes = [];
  const N = 5;
  for (let i = 0; i < N; i++) {
    const mesh = paperPlaneMesh(planeCols[i % planeCols.length]);
    mesh.scale.setScalar(1.05);
    scene.add(mesh);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3 * 70), 3));
    const trail = new THREE.Line(trailGeo, new THREE.LineDashedMaterial({
      color: 0x8a6d4f, dashSize: .22, gapSize: .15, transparent: true, opacity: .45,
    }));
    trail.frustumCulled = false;
    scene.add(trail);
    const a = (i / N) * Math.PI * 2;
    planes.push({
      mesh, trail, pts: [],
      pos: new THREE.Vector3(Math.cos(a) * 4.5, 2.6 + Math.sin(a * 2) * 1.2, Math.sin(a) * 1.4),
      vel: new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(3),
      speed: (3.1 + (i % 3) * .55) * SPEED,
      turn: 2.4 + (i % 3) * .4,
      orbitR: .8 + i * .35,
      orbitSpd: (.55 + (i % 4) * .16) * (i % 2 ? -1 : 1),
      phase: i * 1.7,
      wp: new THREE.Vector3(),
      wpAt: 0,
      roll: 0,
    });
  }
  window.__planes = planes;

  /* ---------- kursor -> titik dunia ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const zPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const cursorPoint = new THREE.Vector3(0, 2.8, 0);
  let cursorAt = -1e4, parX = 0, parY = 0;
  addEventListener('pointermove', e => {
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(zPlane, hit)) {
      hit.x = THREE.MathUtils.clamp(hit.x, -bounds.x, bounds.x);
      hit.y = THREE.MathUtils.clamp(hit.y, bounds.yMin + .4, bounds.yMax);
      hit.z = 0;
      cursorPoint.copy(hit);
      cursorAt = performance.now();
    }
    parX = (e.clientX / innerWidth - .5) * 2;
    parY = (e.clientY / innerHeight - .5) * 2;
  }, { passive: true });

  const _aim = new THREE.Vector3(), _des = new THREE.Vector3(), _sep = new THREE.Vector3(), _away = new THREE.Vector3();
  const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _qr = new THREE.Quaternion();
  const _up = new THREE.Vector3(0, 1, 0), _zero = new THREE.Vector3(), _axisZ = new THREE.Vector3(0, 0, 1);
  const _prevDir = new THREE.Vector3();
  function pickWaypoint(p, t) {
    p.wp.set(
      (Math.random() * 2 - 1) * bounds.x * .85,
      bounds.yMin + .6 + Math.random() * (bounds.yMax - bounds.yMin - 1),
      bounds.zMin + Math.random() * (bounds.zMax - bounds.zMin));
    p.wpAt = t;
  }
  planes.forEach(p => pickWaypoint(p, 0));

  function updatePlane(p, dt, t, now) {
    if (now - cursorAt < 3600) {
      const oa = t * p.orbitSpd + p.phase;
      _aim.set(
        cursorPoint.x + Math.cos(oa) * p.orbitR,
        cursorPoint.y + Math.sin(oa * 1.3) * p.orbitR * .55,
        cursorPoint.z + Math.sin(oa) * .8);
    } else {
      if (p.pos.distanceTo(p.wp) < 1.3 || t - p.wpAt > 9) pickWaypoint(p, t);
      _aim.copy(p.wp);
    }
    _des.subVectors(_aim, p.pos);
    const dist = _des.length();
    _des.normalize().multiplyScalar(p.speed * (dist < 1 ? .55 + .45 * dist : 1));
    /* separasi antar pesawat */
    _sep.set(0, 0, 0);
    for (const o of planes) {
      if (o === p) continue;
      const d = p.pos.distanceTo(o.pos);
      if (d < 1.15 && d > 1e-4) {
        _away.subVectors(p.pos, o.pos).normalize();
        _sep.addScaledVector(_away, (1.15 - d) * 2.2);
      }
    }
    _des.add(_sep);
    /* dinding ruangan: dorong kembali dengan lembut */
    if (p.pos.x > bounds.x) _des.x -= (p.pos.x - bounds.x) * 3;
    if (p.pos.x < -bounds.x) _des.x -= (p.pos.x + bounds.x) * 3;
    if (p.pos.y > bounds.yMax) _des.y -= (p.pos.y - bounds.yMax) * 3;
    if (p.pos.y < bounds.yMin) _des.y -= (p.pos.y - bounds.yMin) * 3;
    if (p.pos.z > bounds.zMax) _des.z -= (p.pos.z - bounds.zMax) * 3;
    if (p.pos.z < bounds.zMin) _des.z -= (p.pos.z + bounds.zMin) * 3;

    _prevDir.copy(p.vel).normalize();
    p.vel.lerp(_des, 1 - Math.exp(-p.turn * dt));
    p.vel.setLength(p.speed);
    p.pos.addScaledVector(p.vel, dt);

    const newDir = _des.copy(p.vel).normalize();
    const turnY = (_prevDir.x * newDir.z - _prevDir.z * newDir.x);
    const targetRoll = THREE.MathUtils.clamp(turnY * 5.5, -1.05, 1.05);
    p.roll += (targetRoll - p.roll) * Math.min(1, dt * 7);
    _m4.lookAt(_zero, newDir, _up);
    _q.setFromRotationMatrix(_m4);
    _qr.setFromAxisAngle(_axisZ, p.roll);
    p.mesh.quaternion.copy(_q).multiply(_qr);
    p.mesh.position.copy(p.pos);

    /* jejak putus-putus */
    const last = p.pts[p.pts.length - 1];
    if (!last || last.distanceToSquared(p.pos) > .055) {
      p.pts.push(p.pos.clone());
      if (p.pts.length > 70) p.pts.shift();
      const attr = p.trail.geometry.getAttribute('position');
      p.pts.forEach((v, i) => attr.setXYZ(i, v.x, v.y, v.z));
      for (let i = p.pts.length; i < 70; i++) {
        const v = p.pts[p.pts.length - 1] || p.pos;
        attr.setXYZ(i, v.x, v.y, v.z);
      }
      attr.needsUpdate = true;
      p.trail.geometry.setDrawRange(0, Math.max(2, p.pts.length));
      p.trail.computeLineDistances();
    }
  }

  /* ---------- loop ---------- */
  let running = true;
  new IntersectionObserver(e => { running = e[0].isIntersecting; }).observe(container);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  frame();
  camera.position.set(0, camY, camZ);
  const clock = new THREE.Clock();
  let readyFlag = false, smoothX = 0, smoothY = 0;
  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), .1);
    const t = clock.elapsedTime;
    const now = performance.now();
    for (const p of planes) updatePlane(p, dt, t, now);
    smoothX += (parX - smoothX) * .03;
    smoothY += (parY - smoothY) * .03;
    camera.position.x = smoothX * .85;
    camera.position.y = camY - smoothY * .45;
    camera.position.z = camZ;
    camera.lookAt(0, 1.6, 0);
    renderer.render(scene, camera);
    if (!readyFlag) { readyFlag = true; window.__sceneReady = true; }
  }
  animate();
  addEventListener('resize', frame);
}
