/* Sketch Dev Studio · shared site behaviour: starfield, marquee, language, reveal. */
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

  /* ---------- Preloader (tampil singkat; dilewati pada kunjungan ulang satu sesi) ---------- */
  var loader = document.getElementById('loader');
  if (loader) {
    var hideLoader = function () { loader.classList.add('done'); };
    if (sessionStorage.getItem('sds-seen')) {
      hideLoader();
    } else {
      sessionStorage.setItem('sds-seen', '1');
      var ldStart = performance.now();
      window.addEventListener('load', function () {
        var wait = Math.max(0, 620 - (performance.now() - ldStart));
        setTimeout(hideLoader, wait);
      });
      setTimeout(hideLoader, 1500);
    }
  }

  /* ---------- Kursor kustom emas (hanya pointer halus) ---------- */
  var finePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches;
  if (finePointer && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    document.documentElement.classList.add('has-cursor');
    var cDot = document.getElementById('cursorDot');
    var cRing = document.getElementById('cursorRing');
    if (cDot && cRing) {
      var mx = -100, my = -100, rx = -100, ry = -100;
      window.addEventListener('pointermove', function (e) {
        mx = e.clientX; my = e.clientY;
        cDot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      }, { passive: true });
      (function cursorLoop() {
        requestAnimationFrame(cursorLoop);
        rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
        cRing.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';
      })();
      document.addEventListener('mouseover', function (e) {
        if (e.target.closest && e.target.closest('a, button')) cRing.classList.add('grow');
      });
      document.addEventListener('mouseout', function (e) {
        if (e.target.closest && e.target.closest('a, button')) cRing.classList.remove('grow');
      });
    }
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
  function fillMarquee() {
    var mq = document.getElementById('mqTrack');
    if (mq) {
      var words = ['Mobile Games', '100 Levels', 'English × Indonesia', 'Sketch Dev Studio', 'Indie Studio'];
      var half = words.map(function (w) { return w + '<i>•</i>'; }).join('');
      mq.innerHTML = half + half;
    }
  }
  fillMarquee();

  /* ---------- Language (EN default; saved choice in localStorage 'studio-lang') ---------- */
  var MANI = {
    en: 'We make <span class="hl">small, focused</span> games: games you can finish, master, and replay.',
    id: 'Kami membuat game yang <span class="hl">kecil dan fokus</span>: game yang bisa ditamatkan, dikuasai, dan dimainkan lagi.'
  };
  var HERO_H1 = {
    en: 'We make <span class="amber">mobile games</span>.',
    id: 'Kami membuat <span class="amber">game mobile</span>.'
  };
  var lang = localStorage.getItem('studio-lang') || 'en';

  function applyLang(l) {
    lang = l;
    window.currentLang = l;
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

  /* ---------- Navigasi bawah mobile (gaya aplikasi native) ---------- */
  var TAB_ICONS = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 9.5 12 3l9 6.5"/><path d="M5 10v10h14V10"/><path d="M9.5 20v-6h5v6"/></svg>',
    games: '<svg viewBox="0 0 24 24"><rect x="2.5" y="7" width="19" height="11" rx="5.5"/><path d="M7.5 10.8v3.4M5.8 12.5h3.4"/><circle cx="15.8" cy="11.6" r=".7" fill="currentColor" stroke="none"/><circle cx="17.9" cy="13.9" r=".7" fill="currentColor" stroke="none"/></svg>',
    about: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.6"/><path d="M5 20c1.2-3.4 3.8-5 7-5s5.8 1.6 7 5"/></svg>',
    contact: '<svg viewBox="0 0 24 24"><rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7.2 8.5 6 8.5-6"/></svg>',
    lang: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17"/><path d="M12 3.5c2.4 2.3 3.6 5.2 3.6 8.5s-1.2 6.2-3.6 8.5c-2.4-2.3-3.6-5.2-3.6-8.5S9.6 5.8 12 3.5Z"/></svg>'
  };
  var TABS = [
    { key: 'home', href: '/', icon: 'home', en: 'Home', id: 'Beranda' },
    { key: 'games', href: '/#games', icon: 'games', en: 'Games', id: 'Game' },
    { key: 'about', href: '/about', icon: 'about', en: 'About', id: 'Tentang' },
    { key: 'contact', href: '/contact', icon: 'contact', en: 'Contact', id: 'Kontak' }
  ];
  var bnav = document.createElement('nav');
  bnav.className = 'bottom-nav';
  bnav.setAttribute('aria-label', 'Mobile');
  var bhtml = '';
  TABS.forEach(function (t) {
    bhtml += '<a class="tab" data-key="' + t.key + '" href="' + t.href + '">' + TAB_ICONS[t.icon] +
      '<span data-en="' + t.en + '" data-id="' + t.id + '">' + t.en + '</span></a>';
  });
  bhtml += '<button type="button" class="tab" id="tabLang">' + TAB_ICONS.lang +
    '<span data-en="ID" data-id="EN">ID</span></button>';
  bnav.innerHTML = bhtml;
  document.body.appendChild(bnav);
  document.getElementById('tabLang').addEventListener('click', function () {
    applyLang(lang === 'en' ? 'id' : 'en');
  });
  function markTabs() {
    var p = location.pathname, key = '';
    if (p.indexOf('/about') === 0) key = 'about';
    else if (p.indexOf('/contact') === 0) key = 'contact';
    else if (p === '/' || p === '/index.html') key = location.hash === '#games' ? 'games' : 'home';
    bnav.querySelectorAll('.tab[data-key]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-key') === key);
    });
  }
  markTabs();
  window.addEventListener('hashchange', markTabs);

  applyLang(lang);

  /* ---------- Scroll reveal ---------- */
  var io = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('on'); io.unobserve(e.target); }
      });
    }, { threshold: .12 });
  }
  function bindReveals() {
    document.querySelectorAll('.rv:not(.on)').forEach(function (el) {
      if (io) io.observe(el); else el.classList.add('on');
    });
  }
  bindReveals();

  /* ---------- Router SPA (URL bersih, transisi tanpa reload) ---------- */
  var app = document.getElementById('app');
  if (app && window.history && window.fetch) {
    var cache = {};
    cache[location.pathname] = { html: app.innerHTML, title: document.title };
    var navigating = false;

    function markActive() {
      document.querySelectorAll('nav .links a').forEach(function (a) {
        var u = new URL(a.href, location.href);
        a.classList.toggle('active', u.pathname === location.pathname && !u.hash);
      });
    }

    function afterSwap(hash) {
      applyLang(lang);
      fillMarquee();
      bindReveals();
      markActive();
      markTabs();
      if (window.__worldSetVariant) {
        window.__worldSetVariant(location.pathname === '/' ? 'home' : 'parked');
      }
      if (hash) {
        var target = document.querySelector(hash);
        if (target) { target.scrollIntoView(); return; }
      }
      window.scrollTo(0, 0);
    }

    function navigate(path, hash, push) {
      if (navigating) return;
      navigating = true;
      app.classList.add('page-out');
      var swap = function (page) {
        setTimeout(function () {
          app.innerHTML = page.html;
          document.title = page.title;
          if (push) history.pushState(null, '', path + (hash || ''));
          app.classList.remove('page-out');
          navigating = false;
          afterSwap(hash);
        }, 240);
      };
      if (cache[path]) { swap(cache[path]); return; }
      fetch(path, { credentials: 'same-origin' })
        .then(function (r) { return r.text(); })
        .then(function (text) {
          var doc = new DOMParser().parseFromString(text, 'text/html');
          var newApp = doc.getElementById('app');
          if (!newApp) throw new Error('no app');
          cache[path] = { html: newApp.innerHTML, title: doc.title };
          swap(cache[path]);
        })
        .catch(function () { location.href = path + (hash || ''); });
    }

    document.addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      var a = e.target.closest ? e.target.closest('a') : null;
      if (!a || a.target === '_blank') return;
      var href = a.getAttribute('href');
      if (!href) return;
      var u = new URL(a.href, location.href);
      if (u.origin !== location.origin) return;
      if (u.pathname === location.pathname) {
        if (!u.hash) { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
        return; /* jangkar di halaman yang sama: perilaku bawaan */
      }
      e.preventDefault();
      navigate(u.pathname, u.hash, true);
    });

    window.addEventListener('popstate', function () {
      navigate(location.pathname, location.hash, false);
    });

    markActive();
  }
})();
