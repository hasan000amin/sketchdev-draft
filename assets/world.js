/* Sketch Dev Studio · dunia malam Three.js premium.
   Bintang shader berkelip, bulan bercahaya, debu emas, pesawat kertas
   berjejak benang emas mengikuti kursor, dan ikon game melayang 3D
   di panggung hero. Varian: 'home' (penuh) / 'parked' (tenang). */
import * as THREE from 'three';

const GAMES = [
  '/images/letter-rain-icon.png', '/images/letter-snake-icon.png',
  '/images/numerik-crisis-icon.png', '/images/number-rain-icon.png',
  '/images/number-snake-icon.png', '/images/meowdoku-icon.png'
];
const PLANE_COLORS = [0xf8f0dd, 0xe6bd66, 0xfffdf4, 0x8fb8e6, 0xf2a0b5];

function softDotTexture(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 2, 64, 64, 62);
  grad.addColorStop(0, inner); grad.addColorStop(1, outer);
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function cloudTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  for (let i = 0; i < 26; i++) {
    const x = 30 + Math.random() * 196, y = 44 + Math.random() * 40, r = 18 + Math.random() * 30;
    const grad = g.createRadialGradient(x, y, 1, x, y, r);
    grad.addColorStop(0, 'rgba(70,88,150,0.16)'); grad.addColorStop(1, 'rgba(70,88,150,0)');
    g.fillStyle = grad; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function planeGeometry() {
  const v = new Float32Array([
    0, 0, 0.62,   -0.46, 0.07, -0.42,   0, 0.13, -0.12,
    0, 0, 0.62,    0, 0.13, -0.12,      0.46, 0.07, -0.42,
    0, 0, 0.62,    0, -0.16, -0.34,    -0.46, 0.07, -0.42,
    0, 0, 0.62,    0.46, 0.07, -0.42,   0, -0.16, -0.34
  ]);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(v, 3));
  geo.computeVertexNormals();
  return geo;
}

export function initWorld({ variant = 'home' } = {}) {
  const holder = document.getElementById('scene');
  if (!holder) return null;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  const isCoarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isCoarse ? 1.6 : 1.8));
  renderer.setSize(window.innerWidth, window.innerHeight);
  holder.appendChild(renderer.domElement);
  document.documentElement.classList.add('gl-on');

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x141a33, 0.016);
  const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 220);
  camera.position.set(0, 0.4, 14);

  scene.add(new THREE.AmbientLight(0x8fa3d9, 0.85));
  const sun = new THREE.DirectionalLight(0xffe0b0, 1.5); sun.position.set(6, 9, 8); scene.add(sun);
  const moonLight = new THREE.PointLight(0xe6bd66, 60, 60); moonLight.position.set(9, 5, 2); scene.add(moonLight);

  /* ---------- Bintang shader ---------- */
  const starCount = isCoarse ? 1500 : 2600;
  const sPos = new Float32Array(starCount * 3), sCol = new Float32Array(starCount * 3),
        sScale = new Float32Array(starCount), sPhase = new Float32Array(starCount);
  const palette = [[1, 1, 1], [1, 0.9, 0.68], [0.62, 0.74, 0.95], [0.98, 0.85, 0.6]];
  for (let i = 0; i < starCount; i++) {
    const r = 46 + Math.random() * 55, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    sPos[i * 3] = r * Math.sin(ph) * Math.cos(th);
    sPos[i * 3 + 1] = Math.abs(r * Math.cos(ph)) * (Math.random() < 0.88 ? 1 : -0.25) - 6;
    sPos[i * 3 + 2] = -Math.abs(r * Math.sin(ph) * Math.sin(th)) - 4;
    const c = palette[Math.floor(Math.random() * palette.length)];
    sCol.set(c, i * 3);
    sScale[i] = 0.5 + Math.random() * 1.9;
    sPhase[i] = Math.random() * Math.PI * 2;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(sCol, 3));
  starGeo.setAttribute('aScale', new THREE.BufferAttribute(sScale, 1));
  starGeo.setAttribute('aPhase', new THREE.BufferAttribute(sPhase, 1));
  const starMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uTex: { value: softDotTexture('rgba(255,255,255,1)', 'rgba(255,255,255,0)') } },
    vertexShader: `
      attribute float aScale; attribute float aPhase;
      uniform float uTime; varying vec3 vC; varying float vA;
      void main(){
        vC = color;
        vA = 0.55 + 0.45 * sin(uTime * (0.6 + aScale * 0.35) + aPhase);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aScale * (140.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D uTex; varying vec3 vC; varying float vA;
      void main(){
        vec4 t = texture2D(uTex, gl_PointCoord);
        gl_FragColor = vec4(vC, t.a * vA);
      }`,
    vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ---------- Bulan + awan ---------- */
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDotTexture('rgba(255,244,205,1)', 'rgba(255,220,150,0)'), transparent: true, depthWrite: false }));
  moon.position.set(9.4, 5.2, -9); moon.scale.setScalar(11); scene.add(moon);
  const moonCore = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softDotTexture('rgba(255,250,225,1)', 'rgba(255,244,205,0)'), transparent: true, depthWrite: false }));
  moonCore.position.copy(moon.position); moonCore.scale.setScalar(4.6); scene.add(moonCore);
  const cloudTex = cloudTexture();
  const clouds = [];
  for (let i = 0; i < 4; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, opacity: 0.75, depthWrite: false }));
    sp.position.set(-16 + i * 10 + Math.random() * 4, 2.5 - i * 1.6, -7 - i * 1.5);
    sp.scale.set(24 + Math.random() * 10, 9 + Math.random() * 3, 1);
    scene.add(sp); clouds.push({ sp, speed: 0.05 + Math.random() * 0.07 });
  }

  /* ---------- Debu emas beterbangan ---------- */
  const dustCount = isCoarse ? 70 : 130;
  const dPos = new Float32Array(dustCount * 3), dSeed = new Float32Array(dustCount);
  for (let i = 0; i < dustCount; i++) {
    dPos[i * 3] = (Math.random() - 0.5) * 26;
    dPos[i * 3 + 1] = (Math.random() - 0.5) * 14;
    dPos[i * 3 + 2] = -2 + Math.random() * 7;
    dSeed[i] = Math.random() * 100;
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
  const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({
    map: softDotTexture('rgba(255,220,150,1)', 'rgba(255,220,150,0)'),
    color: 0xe6bd66, size: 0.14, transparent: true, opacity: 0.65,
    depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  scene.add(dust);

  /* ---------- Ikon game melayang (panggung hero) ---------- */
  const iconGroup = new THREE.Group(); scene.add(iconGroup);
  const iconMeshes = [];
  const texLoader = new THREE.TextureLoader();
  /* Ikon panggung WebGL dimatikan: digantikan carousel coverflow DOM di hero. */
  const SHOW_ICONS = false;
  if (SHOW_ICONS) GAMES.forEach((src, i) => {
    const g = new THREE.Group();
    const back = new THREE.Mesh(
      new THREE.PlaneGeometry(2.78, 2.78),
      new THREE.MeshStandardMaterial({ color: 0xd9a45c, metalness: 0.65, roughness: 0.32 }));
    back.position.z = -0.035;
    const tex = texLoader.load(src);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(2.62, 2.62),
      new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 0.55, metalness: 0.05,
        emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.22 }));
    g.add(back, face);
    g.userData = { i, phase: Math.random() * Math.PI * 2, bobSpeed: 0.5 + Math.random() * 0.4 };
    iconGroup.add(g); iconMeshes.push(g);
  });
  function layoutIcons() {
    const stage = document.querySelector('.stage3d');
    const viewH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const viewW = viewH * camera.aspect;
    if (!stage || variant !== 'home') { iconGroup.visible = false; return; }
    const rect = stage.getBoundingClientRect();
    if (rect.bottom < -80 || rect.top > window.innerHeight + 80) { iconGroup.visible = false; return; }
    iconGroup.visible = true;
    const cy = (0.5 - (rect.top + rect.height / 2) / window.innerHeight) * viewH;
    const span = Math.min(viewW * 0.86, 16.4);
    const n = iconMeshes.length;
    const step = n > 1 ? span / (n - 1) : 0;
    /* Skala ikon mengikuti lebar layar: di layar sempit ikon mengecil
       mengikuti jarak antar ikon agar tidak saling tumpang tindih. */
    const fit = n > 1 ? Math.min(1, (step * 0.94) / 2.78) : 1;
    const narrow = camera.aspect < 0.85;
    iconMeshes.forEach((g, i) => {
      const t = n === 1 ? 0.5 : i / (n - 1);
      g.scale.setScalar(fit);
      g.userData.baseX = -span / 2 + span * t;
      g.userData.baseY = cy + Math.sin(t * Math.PI) * 0.55 * fit - 0.28 +
        (narrow ? (i % 2 === 0 ? 0.55 : -0.55) * fit * 1.9 : 0);
      g.userData.baseZ = -0.6 - Math.abs(t - 0.5) * 1.6;
    });
    iconGroup.position.y = 0;
  }

  /* ---------- Pesawat kertas + jejak emas ---------- */
  const planeGeo = planeGeometry();
  const planes = [];
  const planeTotal = variant === 'home' ? 5 : 2;
  for (let i = 0; i < planeTotal; i++) {
    const mat = new THREE.MeshStandardMaterial({
      color: PLANE_COLORS[i % PLANE_COLORS.length], flatShading: true,
      side: THREE.DoubleSide, roughness: 0.6, metalness: 0.08 });
    const mesh = new THREE.Mesh(planeGeo, mat);
    mesh.scale.setScalar(0.85);
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(planeGeo),
      new THREE.LineBasicMaterial({ color: 0x43230a, transparent: true, opacity: 0.32 }));
    mesh.add(edges);
    mesh.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 6, -1 - Math.random() * 2);
    scene.add(mesh);
    const trailLen = 64;
    const tPos = new Float32Array(trailLen * 3), tCol = new Float32Array(trailLen * 3);
    for (let k = 0; k < trailLen; k++) {
      const f = Math.pow(1 - k / trailLen, 1.6);
      tCol[k * 3] = 0.9 * f; tCol[k * 3 + 1] = 0.74 * f; tCol[k * 3 + 2] = 0.4 * f;
      tPos[k * 3] = mesh.position.x; tPos[k * 3 + 1] = mesh.position.y; tPos[k * 3 + 2] = mesh.position.z;
    }
    const tGeo = new THREE.BufferGeometry();
    tGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3));
    tGeo.setAttribute('color', new THREE.BufferAttribute(tCol, 3));
    const trail = new THREE.Line(tGeo, new THREE.LineBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.85,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(trail);
    planes.push({
      mesh, trail, tPos, trailLen,
      vel: new THREE.Vector3(1, 0, 0),
      orbitR: 1.1 + i * 0.55, phase: (i / planeTotal) * Math.PI * 2,
      speed: 0.55 + Math.random() * 0.3, hue: i
    });
  }

  /* ---------- Interaksi ---------- */
  const pointer = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const targetPoint = new THREE.Vector3(2.5, 1.2, 0);
  const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  let lastPointerMove = -10000, camTX = 0, camTY = 0;
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    raycaster.ray.intersectPlane(planeZ, targetPoint);
    lastPointerMove = performance.now();
    camTX = pointer.x; camTY = pointer.y;
  }, { passive: true });

  let waypoint = new THREE.Vector3(3, 1, 0), waypointAt = 0;
  const tmpV = new THREE.Vector3(), desired = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const clock = new THREE.Clock();
  let raf = 0, running = true;

  function step() {
    raf = requestAnimationFrame(step);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    starMat.uniforms.uTime.value = t;

    /* Kamera: parallax mouse + tarikan napas scroll */
    const scrollP = Math.min(window.scrollY / Math.max(document.body.scrollHeight - window.innerHeight, 1), 1);
    camera.position.x += (camTX * 1.0 - camera.position.x) * 0.04;
    camera.position.y += (0.4 + camTY * 0.55 - scrollP * 1.4 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.1 - scrollP * 0.8, 0);
    iconGroup.rotation.y = scrollP * 0.85 + camTX * 0.1;
    iconGroup.rotation.x = camTY * -0.05;

    clouds.forEach((c) => {
      c.sp.position.x += c.speed * dt;
      if (c.sp.position.x > 24) c.sp.position.x = -24;
    });
    const dp = dust.geometry.attributes.position;
    for (let i = 0; i < dustCount; i++) {
      dp.array[i * 3 + 1] += Math.sin(t * 0.4 + dSeed[i]) * 0.0016;
      dp.array[i * 3] += Math.cos(t * 0.3 + dSeed[i] * 1.7) * 0.0012;
    }
    dp.needsUpdate = true;

    layoutIcons();
    iconMeshes.forEach((g) => {
      if (!iconGroup.visible) return;
      const u = g.userData;
      g.position.set(u.baseX || 0, (u.baseY || 0) + Math.sin(t * u.bobSpeed + u.phase) * 0.16, u.baseZ || 0);
      g.rotation.y = Math.sin(t * 0.35 + u.phase) * 0.22 + camTX * 0.18;
      g.rotation.x = Math.cos(t * 0.3 + u.phase) * 0.08 - camTY * 0.1;
    });

    /* Target pesawat: kursor, atau waypoint kelana saat diam */
    let anchor = targetPoint;
    if (performance.now() - lastPointerMove > 3500) {
      if (performance.now() - waypointAt > 4200) {
        waypointAt = performance.now();
        waypoint.set((Math.random() - 0.5) * 13, (Math.random() - 0.5) * 6.4 + 0.4, -1);
      }
      anchor = waypoint;
    }
    planes.forEach((p, idx) => {
      p.phase += dt * p.speed;
      desired.set(
        anchor.x + Math.cos(p.phase) * p.orbitR,
        anchor.y + Math.sin(p.phase * 1.3) * p.orbitR * 0.55,
        -1 - idx * 0.35);
      tmpV.copy(desired).sub(p.mesh.position);
      const dist = tmpV.length();
      tmpV.normalize().multiplyScalar(Math.min(3.4, 1.2 + dist * 0.9));
      const prevVx = p.vel.x, prevVy = p.vel.y;
      p.vel.lerp(tmpV, 1 - Math.pow(0.0015, dt));
      /* separasi antar pesawat */
      planes.forEach((q) => {
        if (q === p) return;
        const d = p.mesh.position.distanceTo(q.mesh.position);
        if (d < 0.9 && d > 0.0001) {
          tmpV.copy(p.mesh.position).sub(q.mesh.position).normalize().multiplyScalar((0.9 - d) * 2.2 * dt);
          p.vel.add(tmpV);
        }
      });
      p.mesh.position.addScaledVector(p.vel, dt);
      /* batas lembut area pandang */
      const bx = 9.6, by = 5.4;
      if (Math.abs(p.mesh.position.x) > bx) p.vel.x -= Math.sign(p.mesh.position.x) * dt * 4;
      if (Math.abs(p.mesh.position.y) > by) p.vel.y -= Math.sign(p.mesh.position.y) * dt * 4;
      if (p.vel.lengthSq() > 0.001) {
        tmpV.copy(p.mesh.position).add(p.vel);
        p.mesh.up.copy(up);
        p.mesh.lookAt(tmpV);
        const turn = (p.vel.x * prevVy - p.vel.y * prevVx);
        p.mesh.rotateZ(THREE.MathUtils.clamp(turn * 2.4, -0.95, 0.95));
      }
      /* jejak: geser riwayat posisi */
      const arr = p.tPos;
      for (let k = p.trailLen - 1; k > 0; k--) {
        arr[k * 3] = arr[(k - 1) * 3];
        arr[k * 3 + 1] = arr[(k - 1) * 3 + 1];
        arr[k * 3 + 2] = arr[(k - 1) * 3 + 2];
      }
      arr[0] = p.mesh.position.x; arr[1] = p.mesh.position.y; arr[2] = p.mesh.position.z;
      p.trail.geometry.attributes.position.needsUpdate = true;
    });

    renderer.render(scene, camera);
  }
  step();

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { cancelAnimationFrame(raf); running = false; }
    else if (!running) { running = true; clock.getDelta(); step(); }
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  return {
    setVariant(v) {
      variant = v;
      planes.forEach((p, i) => {
        const on = v === 'home' ? true : i < 2;
        p.mesh.visible = on; p.trail.visible = on;
      });
      layoutIcons();
    }
  };
}
