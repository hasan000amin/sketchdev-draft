/* Sketch Dev Studio — shared site behaviour: starfield, marquee, language, reveal. */
(function () {
  /* ---------- Starfield (night sky, 3 lapisan kedalaman) ---------- */
  var sky = document.getElementById('stars');
  var starLayers = [];
  if (sky) {
    var layerSpecs = [
      { n: 55, depth: .22, min: .6, max: 1.3 },
      { n: 38, depth: .52, min: 1.1, max: 2.0 },
      { n: 20, depth: 1.0, min: 1.7, max: 2.9 }
    ];
    layerSpecs.forEach(function (spec) {
      var layer = document.createElement('div');
      layer.className = 'stars-layer';
      var html = '';
      for (var i = 0; i < spec.n; i++) {
        var s = (Math.random() * (spec.max - spec.min) + spec.min).toFixed(1);
        html += '<span class="star" style="left:' + (Math.random() * 100).toFixed(2) + '%;top:'
          + (Math.random() * 100).toFixed(2) + '%;width:' + s + 'px;height:' + s + 'px;--d:'
          + (Math.random() * 3.4 + 2.2).toFixed(2) + 's;animation-delay:-'
          + (Math.random() * 4).toFixed(2) + 's"></span>';
      }
      layer.innerHTML = html;
      sky.appendChild(layer);
      starLayers.push({ el: layer, depth: spec.depth });
    });
  }

  /* ---------- Langit mengikuti mouse (parallax 3D + cahaya + sparkle) ---------- */
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion && starLayers.length) {
    var glow = document.createElement('div');
    glow.id = 'glow';
    document.body.appendChild(glow);
    var sparkBox = document.createElement('div');
    sparkBox.id = 'sparkles';
    document.body.appendChild(sparkBox);
    var moon = document.querySelector('.moon');

    var tx = 0, ty = 0, cx = 0, cy = 0;           /* target & posisi parallax (-1..1) */
    var gx = -400, gy = -400, gcx = -400, gcy = -400; /* target & posisi cahaya kursor */
    var lastMove = 0, lastSpark = 0, lastX = 0, lastY = 0;

    function spawnSparkle(x, y) {
      if (sparkBox.childNodes.length > 42) return;
      var sp = document.createElement('span');
      sp.className = 'sparkle';
      sp.textContent = '✦';
      var size = (Math.random() * 8 + 8).toFixed(0);
      sp.style.left = x + 'px';
      sp.style.top = y + 'px';
      sp.style.fontSize = size + 'px';
      sp.style.setProperty('--dx', (Math.random() * 44 - 22).toFixed(0) + 'px');
      sp.style.setProperty('--dy', (Math.random() * 26 + 10).toFixed(0) + 'px');
      sp.style.setProperty('--life', (Math.random() * 350 + 750).toFixed(0) + 'ms');
      sp.addEventListener('animationend', function () { sp.remove(); });
      sparkBox.appendChild(sp);
    }

    window.addEventListener('mousemove', function (e) {
      tx = (e.clientX / window.innerWidth - .5) * 2;
      ty = (e.clientY / window.innerHeight - .5) * 2;
      gx = e.clientX; gy = e.clientY;
      lastMove = performance.now();
      var now = performance.now();
      var dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      if (now - lastSpark > 42 && dist > 6) {
        spawnSparkle(e.clientX + (Math.random() * 26 - 13), e.clientY + (Math.random() * 26 - 13));
        lastSpark = now;
      }
      lastX = e.clientX; lastY = e.clientY;
    }, { passive: true });

    (function skyLoop(now) {
      requestAnimationFrame(skyLoop);
      /* Tanpa mouse (layar sentuh / diam lama): langit melayang pelan sendiri */
      if (now - lastMove > 4000) {
        tx = Math.sin(now / 3400) * .45;
        ty = Math.cos(now / 4300) * .3;
      }
      cx += (tx - cx) * .055;
      cy += (ty - cy) * .055;
      for (var i = 0; i < starLayers.length; i++) {
        var L = starLayers[i];
        L.el.style.transform = 'translate3d(' + (-cx * 30 * L.depth).toFixed(2) + 'px,'
          + (-cy * 19 * L.depth).toFixed(2) + 'px,0)';
      }
      if (moon) moon.style.transform = 'translate3d(' + (-cx * 9).toFixed(2) + 'px,' + (-cy * 6).toFixed(2) + 'px,0)';
      gcx += (gx - gcx) * .16;
      gcy += (gy - gcy) * .16;
      glow.style.transform = 'translate3d(' + gcx.toFixed(1) + 'px,' + gcy.toFixed(1) + 'px,0)';
      glow.style.opacity = lastMove ? '1' : '0';
    })(performance.now());
  }

  /* ---------- Marquee (home) ---------- */
  var mq = document.getElementById('mqTrack');
  if (mq) {
    var words = ['Hand-Drawn Games', '100 Levels', 'English × Indonesia', 'Sketch Dev Studio', 'Made in Jakarta'];
    var half = words.map(function (w) { return w + '<i>•</i>'; }).join('');
    mq.innerHTML = half + half;
  }

  /* ---------- Language (EN default; saved choice in localStorage 'studio-lang') ---------- */
  var MANI = {
    en: 'We believe a game does not need <span class="hl">explosions</span> to be unforgettable. Ours begin on <span class="un">paper</span> — one pencil sketch at a time — and grow into worlds you can finish, master, and replay. <span class="hl">Small games, drawn slowly, played everywhere.</span>',
    id: 'Kami percaya game tidak butuh <span class="hl">ledakan</span> untuk tak terlupakan. Game kami berawal di atas <span class="un">kertas</span> — satu sketsa pensil demi satu — lalu tumbuh jadi dunia yang bisa kamu tamatkan, kuasai, dan mainkan lagi. <span class="hl">Game kecil, digambar perlahan, dimainkan di mana saja.</span>'
  };
  var HERO_H1 = {
    en: 'Hand-drawn <span class="amber">games</span>,<br>drawn slowly —<br>played <span class="terra">everywhere</span>.',
    id: 'Game <span class="amber">gambar tangan</span>,<br>digambar perlahan —<br>dimainkan <span class="terra">di mana saja</span>.'
  };
  var lang = localStorage.getItem('studio-lang') || 'en';

  function applyLang(l) {
    lang = l;
    window.currentLang = l; /* dipakai sendMail() halaman kontak */
    document.documentElement.lang = l === 'id' ? 'id' : 'en';
    /* Attribute-driven texts (hero, nav, footer, subheroes) */
    document.querySelectorAll('[data-en]').forEach(function (el) {
      el.textContent = el.getAttribute('data-' + l);
    });
    /* Manifesto keeps its highlight markup */
    var m = document.querySelector('.manifesto');
    if (m && MANI[l]) m.innerHTML = MANI[l];
    /* Hero headline keeps its colour spans */
    var h1 = document.querySelector('.hero h1');
    if (h1 && HERO_H1[l]) h1.innerHTML = HERO_H1[l];
    /* Section-driven pages (contact / privacy / terms) */
    var idS = document.getElementById('lang-id');
    var enS = document.getElementById('lang-en');
    if (idS && enS) {
      idS.classList.toggle('active', l === 'id');
      enS.classList.toggle('active', l === 'en');
    }
    var btn = document.getElementById('langBtn');
    if (btn) btn.textContent = l === 'en' ? 'ID' : 'EN';
    localStorage.setItem('studio-lang', l);
  }

  var btn = document.getElementById('langBtn');
  if (btn) {
    btn.addEventListener('click', function () {
      applyLang(lang === 'en' ? 'id' : 'en');
    });
  }
  applyLang(lang);

  /* ---------- Scroll reveal ---------- */
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
      });
    }, { threshold: .12 });
    document.querySelectorAll('.rv').forEach(function (el) { io.observe(el); });
  } else {
    document.querySelectorAll('.rv').forEach(function (el) { el.classList.add('on'); });
  }
})();
