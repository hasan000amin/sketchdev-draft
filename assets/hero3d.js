import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const container = document.getElementById('scene');
let ready = false;

function glyphTexture(glyph, opts = {}) {
  const { bg = '#f1e8d2', fg = '#4a3428', size = 256, transparent = false } = opts;
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d');
  if (!transparent) {
    x.fillStyle = bg;
    x.beginPath(); x.roundRect(0, 0, size, size, size * .14); x.fill();
    x.strokeStyle = 'rgba(74,52,40,.25)'; x.lineWidth = 5;
    x.beginPath(); x.roundRect(10, 10, size - 20, size - 20, size * .11); x.stroke();
  }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = `${size * .58}px "Archivo Black", sans-serif`;
  x.fillText(glyph, size / 2, size / 2 + size * .03);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function dotTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
  g.addColorStop(0, 'rgba(255,244,214,1)'); g.addColorStop(1, 'rgba(255,244,214,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

const VARIANTS = {
  home: {
    dust: 380, speed: 1, boardScale: 1,
    faces: [
      { g: 'L' }, { g: '7' }, { g: '★' }, { g: '+' },
      { g: '3' }, { g: '×' }, { g: 'R' }, { g: '5' },
      { img: 'images/number-snake-icon.png' }, { img: 'images/meowdoku-icon.png' }
    ]
  },
  contact: {
    dust: 300, speed: .8, boardScale: .94,
    faces: [
      { g: '@' }, { g: '✉' }, { g: 'H' }, { g: 'I' },
      { g: '?' }, { g: '★' }, { g: '7' }, { g: 'L' },
      { img: 'images/letter-rain-icon.png' }, { img: 'images/meowdoku-icon.png' }
    ]
  },
  legal: {
    dust: 190, speed: .45, boardScale: .9,
    faces: [
      { g: '✓' }, { g: '!' }, { g: '?' }, { g: '★' },
      { g: '7' }, { g: 'L' }, { g: 'R' }, { g: '3' },
      { img: 'images/letter-snake-icon.png' }, { img: 'images/number-rain-icon.png' }
    ]
  }
};

async function init(opts = {}) {
  const V = VARIANTS[opts.variant || 'home'];
  try { await document.fonts.load('90px "Archivo Black"'); } catch (e) {}
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;

  const camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, .1, 100);
  let camZ = 9.6, camY = 3.2;
  function frame() {
    const a = container.clientWidth / container.clientHeight;
    const portrait = a < 0.85;
    camZ = portrait ? 14.8 : 9.6;
    camY = portrait ? 4.6 : 3.2;
    world.position.y = portrait ? 1.35 : 0.3;
    world.scale.setScalar(portrait ? .78 : 1);
    camera.aspect = a; camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }
  camera.position.set(0, 3.2, 9.6);

  /* Lights */
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x1a1408, .5));
  const key = new THREE.DirectionalLight(0xfff1d6, 1.7);
  key.position.set(5, 9, 6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -7; key.shadow.camera.right = 7;
  key.shadow.camera.top = 7; key.shadow.camera.bottom = -7;
  key.shadow.radius = 6; key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7dd3fc, .55); rim.position.set(-6, 3, -6); scene.add(rim);
  const glow = new THREE.PointLight(0xffc531, 30, 26, 1.8); glow.position.set(-4, 2.5, 3.5); scene.add(glow);

  const world = new THREE.Group(); scene.add(world);
  const std = (color, rough = .8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: rough, ...extra });

  /* ----- Floating board island ----- */
  const board = new THREE.Group(); board.scale.setScalar(V.boardScale); world.add(board);
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.75, 2.95, .34, 56), std(0xe9e2d0, .9));
  disc.receiveShadow = true; disc.castShadow = true; board.add(disc);
  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(2.78, .045, 14, 90),
    std(0xffc531, .32, { metalness: .65 }));
  rimRing.rotation.x = Math.PI / 2; rimRing.position.y = .17; board.add(rimRing);
  const rock = new THREE.Mesh(new THREE.CylinderGeometry(.55, 2.15, .95, 7), std(0x232833, 1));
  rock.position.y = -.62; rock.castShadow = true; board.add(rock);

  /* Board tiles 4x4 */
  const tileGeo = new RoundedBoxGeometry(.54, .1, .54, 3, .045);
  const glyphs = { '0,0': '7', '1,2': '3', '3,1': '+', '2,3': 'L', '3,3': '★' };
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const t = new THREE.Mesh(tileGeo, std(i + j & 1 ? 0xded3ba : 0xe6dcc4, .85));
    t.position.set((i - 1.5) * .63, .22, (j - 1.5) * .63);
    t.castShadow = true; t.receiveShadow = true; board.add(t);
    const g = glyphs[i + ',' + j];
    if (g) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(.46, .46),
        new THREE.MeshStandardMaterial({ map: glyphTexture(g, { transparent: true }), transparent: true, roughness: .9 }));
      p.rotation.x = -Math.PI / 2; p.position.set(t.position.x, .276, t.position.z); board.add(p);
    }
  }

  /* Kenxia the snake: emerald tube in an S + head */
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.35, .36, -1.05), new THREE.Vector3(-.45, .36, -1.4),
    new THREE.Vector3(.55, .36, -.95), new THREE.Vector3(1.05, .36, -.05),
    new THREE.Vector3(.35, .36, .8), new THREE.Vector3(-.7, .36, 1.15),
    new THREE.Vector3(-1.5, .36, .8)
  ]);
  const snake = new THREE.Mesh(new THREE.TubeGeometry(curve, 72, .135, 12), std(0x2f9e63, .42));
  snake.castShadow = true; board.add(snake);
  const headPos = curve.getPoint(1), headTan = curve.getTangent(1);
  const head = new THREE.Group(); head.position.copy(headPos).y += .06;
  head.lookAt(headPos.clone().add(headTan).setY(headPos.y + .06));
  const skull = new THREE.Mesh(new THREE.SphereGeometry(.215, 28, 22), std(0x37b06c, .4));
  skull.castShadow = true; head.add(skull);
  [[-.09, .07], [.09, .07]].forEach(([ex, ey]) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(.052, 14, 12), std(0xffffff, .3));
    eye.position.set(ex, ey, .185); head.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(.026, 10, 8), std(0x10131a, .4));
    pupil.position.set(ex, ey, .228); head.add(pupil);
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(.07, .2, 8), std(0x57b25e, .55));
    leaf.position.set(ex * 1.15, .24, -.02); leaf.rotation.z = ex > 0 ? -.5 : .5; head.add(leaf);
  });
  board.add(head);

  /* Little trees on the rim */
  [[-2.15, -1.35], [2.3, .9], [1.15, -2.2]].forEach(([tx, tz], k) => {
    const tree = new THREE.Group(); tree.position.set(tx, .17, tz);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.05, .065, .24, 8), std(0x6b4a2f, .9));
    trunk.position.y = .1; tree.add(trunk);
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(.34, .55, 10), std(0x24513a, .8));
    c1.position.y = .48; c1.castShadow = true; tree.add(c1);
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(.24, .42, 10), std(0x2c5f45, .8));
    c2.position.y = .78; c2.castShadow = true; tree.add(c2);
    tree.scale.setScalar(.9 + k * .12); board.add(tree);
  });

  /* ----- Orbiting game tiles ----- */
  const orbit = new THREE.Group(); world.add(orbit);
  const loader = new THREE.TextureLoader();
  const faces = V.faces;
  const floaters = [];
  faces.forEach((f, i) => {
    const grp = new THREE.Group();
    const box = new THREE.Mesh(new RoundedBoxGeometry(.94, .94, .2, 4, .07), std(0xe9e2d0, .55));
    box.castShadow = true; grp.add(box);
    const faceMat = f.img
      ? new THREE.MeshStandardMaterial({ map: loader.load(f.img), roughness: .6 })
      : new THREE.MeshStandardMaterial({ map: glyphTexture(f.g), roughness: .6 });
    [0.104, -0.104].forEach(z => {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(.86, .86), faceMat);
      p.position.z = z; if (z < 0) p.rotation.y = Math.PI; grp.add(p);
    });
    const a = (i / faces.length) * Math.PI * 2;
    grp.position.set(Math.cos(a) * 4.7, Math.sin(i * 2.3) * .9 + .3, Math.sin(a) * 4.7);
    grp.userData = { a, r: 4.7, yBase: grp.position.y, ph: i * 1.37, spin: .12 + (i % 3) * .05 };
    orbit.add(grp); floaters.push(grp);
  });

  /* ----- Dust / snow particles ----- */
  const pGeo = new THREE.BufferGeometry();
  const N = V.dust, pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - .5) * 26;
    pos[i * 3 + 1] = (Math.random() - .5) * 13;
    pos[i * 3 + 2] = (Math.random() - .5) * 16;
  }
  pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const dust = new THREE.Points(pGeo, new THREE.PointsMaterial({
    size: .09, map: dotTexture(), transparent: true, opacity: .5,
    depthWrite: false, color: 0xfff0c8
  }));
  scene.add(dust);

  /* Shadow catcher */
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: .26 }));
  catcher.rotation.x = -Math.PI / 2; catcher.position.y = -2.35; catcher.receiveShadow = true;
  scene.add(catcher);

  /* ----- Interaction: mouse parallax + scroll drift ----- */
  let mx = 0, my = 0, tx = 0, ty = 0, scrollP = 0;
  addEventListener('pointermove', e => {
    tx = (e.clientX / innerWidth - .5) * 2;
    ty = (e.clientY / innerHeight - .5) * 2;
  });
  const heroUi = document.querySelector('.hero-ui');
  addEventListener('scroll', () => {
    scrollP = Math.min(scrollY / innerHeight, 1);
    heroUi.style.opacity = Math.max(0, 1 - scrollP * 1.5);
  }, { passive: true });

  let running = true;
  new IntersectionObserver(e => { running = e[0].isIntersecting; }).observe(container);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    const t = clock.getElapsedTime();
    mx += (tx - mx) * .045; my += (ty - my) * .045;
    board.position.y = Math.sin(t * .7) * .13 + scrollP * 1.1;
    board.rotation.z = Math.sin(t * .4) * .014;
    board.rotation.x = scrollP * .1;
    orbit.rotation.y = t * .045 * V.speed;
    floaters.forEach(f => {
      f.position.y = f.userData.yBase + Math.sin(t * .8 + f.userData.ph) * .22;
      f.rotation.y = t * f.userData.spin + f.userData.ph;
      f.rotation.x = Math.sin(t * .5 + f.userData.ph) * .18;
    });
    dust.rotation.y = t * .012;
    dust.position.y = Math.sin(t * .22) * .3;
    world.rotation.y = mx * .16;
    world.rotation.x = my * .07;
    camera.position.x += ((mx * .7) - camera.position.x) * .04;
    camera.position.y += ((camY - my * .5 + scrollP * .8) - camera.position.y) * .05;
    camera.position.z += (camZ - camera.position.z) * .06;
    camera.lookAt(0, .15, 0);
    renderer.render(scene, camera);
    if (!ready) { ready = true; window.__sceneReady = true; }
  }
  animate();

  frame();
  addEventListener('resize', frame);
}

export function initHero3D(opts = {}) {
  init(opts).catch(err => {
    console.warn('3D hero unavailable:', err);
    window.__sceneReady = 'failed';
  });
}
