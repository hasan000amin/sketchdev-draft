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
    if (window.__cfCaption) window.__cfCaption();
    if (window.__gdRefresh) window.__gdRefresh();
  }

  var btn = document.getElementById('langBtn');
  if (btn) {
    btn.addEventListener('click', function () {
      applyLang(lang === 'en' ? 'id' : 'en');
    });
  }

  /* ---------- Navigasi bawah mobile (markup statis di HTML) ---------- */
  var bnav = document.querySelector('.bottom-nav');
  function markTabs() {
    if (!bnav) return;
    var p = location.pathname, key = '';
    if (p.indexOf('/about') === 0) key = 'about';
    else if (p.indexOf('/contact') === 0) key = 'contact';
    else if (p.indexOf('/games') === 0) key = 'games';
    else if (p.indexOf('/privacy') === 0 || p.indexOf('/terms') === 0) key = 'menu';
    else if (p === '/' || p === '/index.html') key = 'home';
    bnav.querySelectorAll('.tab[data-key]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-key') === key);
    });
  }
  if (bnav) {
    markTabs();
    window.addEventListener('hashchange', markTabs);
    var sheet = document.getElementById('moreSheet');
    var backdrop = document.getElementById('sheetBackdrop');
    var menuBtn = document.getElementById('menuBtn');
    function markLangPills() {
      if (!sheet) return;
      sheet.querySelectorAll('.lpill').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-l') === lang);
      });
    }
    function setSheet(open) {
      if (!sheet) return;
      sheet.classList.toggle('open', open);
      sheet.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (backdrop) backdrop.classList.toggle('open', open);
      if (open) markLangPills();
    }
    window.__closeSheet = function () { setSheet(false); };
    if (menuBtn) {
      menuBtn.addEventListener('click', function () {
        setSheet(!sheet.classList.contains('open'));
      });
    }
    if (backdrop) backdrop.addEventListener('click', function () { setSheet(false); });
    if (sheet) {
      sheet.querySelectorAll('a').forEach(function (a) {
        a.addEventListener('click', function () { setSheet(false); });
      });
      sheet.querySelectorAll('.lpill').forEach(function (b) {
        b.addEventListener('click', function () {
          applyLang(b.getAttribute('data-l'));
          markLangPills();
        });
      });
    }
  }

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
      document.body.classList.remove('gd-open');
      document.body.style.overflow = '';
      if (window.__gdReset) window.__gdReset();
      if (window.__initCoverflow) window.__initCoverflow();
      if (window.__closeSheet) window.__closeSheet();
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

  /* ---------- Coverflow hero (album geser) ---------- */
  function initCoverflow() {
    var root = document.getElementById('coverflow');
    if (!root || root.__cfInit) return;
    root.__cfInit = true;
    var track = document.getElementById('cfTrack');
    var slides = Array.prototype.slice.call(track.querySelectorAll('.cf-slide'));
    var nameEl = document.getElementById('cfName');
    var subEl = document.getElementById('cfSub');
    var dotsWrap = document.getElementById('cfDots');
    var n = slides.length;
    var pos = 0, target = 0, lastTouch = 0, lastAuto = 0, dir = 1;
    var dots = slides.map(function (s, i) {
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'cf-dot' + (i === 0 ? ' on' : '');
      d.setAttribute('aria-label', s.getAttribute('data-name'));
      d.addEventListener('click', function () { goTo(i); poke(); });
      dotsWrap.appendChild(d);
      return d;
    });
    function curLang() { return document.documentElement.lang === 'id' ? 'id' : 'en'; }
    function caption() {
      var i = Math.max(0, Math.min(n - 1, Math.round(target)));
      var s = slides[i];
      if (nameEl) nameEl.textContent = s.getAttribute('data-name');
      if (subEl) subEl.textContent = s.getAttribute(curLang() === 'id' ? 'data-sub-id' : 'data-sub-en');
      dots.forEach(function (d, j) { d.classList.toggle('on', j === i); });
    }
    window.__cfCaption = caption;
    function goTo(i) { target = Math.max(0, Math.min(n - 1, i)); caption(); }
    function poke() { lastTouch = performance.now(); }
    function render() {
      var size = slides[0].offsetWidth || 200;
      var spacing = size * 0.62;
      slides.forEach(function (s, i) {
        var off = i - pos;
        var ao = Math.abs(off);
        var sc = Math.max(0.6, 1 - ao * 0.17);
        s.style.transform = 'translate(-50%,-50%) translateX(' + (off * spacing).toFixed(1) + 'px) translateZ(' + (-ao * size * 0.7).toFixed(1) + 'px) rotateY(' + (off * -40).toFixed(1) + 'deg) scale(' + sc.toFixed(3) + ')';
        s.style.zIndex = String(100 - Math.round(ao * 10));
        s.style.filter = 'brightness(' + Math.max(0.45, 1 - ao * 0.22).toFixed(2) + ')';
        s.classList.toggle('on', ao < 0.5);
      });
    }
    function frame(now) {
      if (!document.contains(root)) return;
      if (now - lastTouch > 5200 && now - lastAuto > 3400) {
        var nxt = Math.round(target) + dir;
        if (nxt >= n - 1) { nxt = n - 1; dir = -1; }
        if (nxt <= 0) { nxt = 0; dir = 1; }
        goTo(nxt);
        lastAuto = now;
      }
      pos += (target - pos) * 0.085;
      if (Math.abs(target - pos) < 0.001) pos = target;
      render();
      requestAnimationFrame(frame);
    }
    var drag = null;
    track.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, start: target, moved: 0 };
      root.classList.add('dragging');
      poke();
    });
    window.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      var size = slides[0].offsetWidth || 200;
      target = Math.max(-0.35, Math.min(n - 0.65, drag.start - dx / (size * 0.62)));
      caption();
    });
    window.addEventListener('pointerup', function () {
      if (!drag) return;
      root.classList.remove('dragging');
      goTo(Math.round(target));
      setTimeout(function () { drag = null; }, 0);
      poke();
    });
    track.addEventListener('click', function (e) {
      if (drag && drag.moved > 7) { e.preventDefault(); return; }
      var a = e.target.closest('.cf-slide');
      if (!a) return;
      var i = slides.indexOf(a);
      if (i !== Math.round(target)) { e.preventDefault(); goTo(i); poke(); }
      else { e.preventDefault(); openDetail(a); }
    });
    var wheelLock = 0;
    root.addEventListener('wheel', function (e) {
      var now = performance.now();
      if (now - wheelLock < 380) return;
      var d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      if (Math.abs(d) < 4) return;
      wheelLock = now;
      goTo(Math.round(target) + (d > 0 ? 1 : -1));
      poke();
      e.preventDefault();
    }, { passive: false });
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { goTo(Math.round(target) + 1); poke(); }
      if (e.key === 'ArrowLeft') { goTo(Math.round(target) - 1); poke(); }
      if (e.key === 'Enter') { openDetail(slides[Math.round(target)]); }
    });
    root.addEventListener('mouseenter', poke);

    /* ---------- Detail game (panel mewah) ---------- */
    var gdAll = document.querySelectorAll('.gdetail');
    var gd = null;
    gdAll.forEach(function (el) { if (!gd && el.closest('#app')) gd = el; });
    if (!gd) gd = gdAll[0] || null;
    gdAll.forEach(function (el) { if (el !== gd) el.remove(); });
    if (gd && gd.parentElement !== document.body) document.body.appendChild(gd);
    var gdImg = document.getElementById('gdImg');
    var gdBadge = document.getElementById('gdBadge');
    var gdName = document.getElementById('gdName');
    var gdDesc = document.getElementById('gdDesc');
    var gdMeta = document.getElementById('gdMeta');
    var gdActions = document.getElementById('gdActions');
    var gdCurrent = null;
    var gdTimer = null;
    var TXT = {
      play: { en: 'Get it on Google Play', id: 'Dapatkan di Google Play' },
      tester: { en: 'Become a playtester', id: 'Jadi playtester' },
      games: { en: 'See it on the Games page', id: 'Lihat di halaman Games' },
      levels: { en: '100 levels', id: '100 level' }
    };
    function fillDetail(slide) {
      var l = curLang();
      var play = slide.getAttribute('data-play');
      gdImg.src = slide.querySelector('img').getAttribute('src');
      gdImg.alt = slide.getAttribute('data-name');
      gdName.textContent = slide.getAttribute('data-name');
      gdDesc.textContent = slide.getAttribute(l === 'id' ? 'data-desc-id' : 'data-desc-en');
      gdBadge.textContent = slide.getAttribute(l === 'id' ? 'data-sub-id' : 'data-sub-en');
      gdBadge.className = 'gd-badge gd-rise' + (play ? ' live' : ' test');
      gdMeta.innerHTML = '';
      [TXT.levels[l], 'EN × ID', 'Android'].forEach(function (t) {
        var chip = document.createElement('span');
        chip.className = 'gd-chip';
        chip.textContent = t;
        gdMeta.appendChild(chip);
      });
      gdActions.innerHTML = '';
      var primary = document.createElement('a');
      primary.className = 'btn';
      if (play) {
        primary.href = play;
        primary.target = '_blank';
        primary.rel = 'noopener';
        primary.textContent = '▶ ' + TXT.play[l];
      } else {
        primary.href = 'https://gametester.my.id';
        primary.target = '_blank';
        primary.rel = 'noopener';
        primary.textContent = TXT.tester[l];
      }
      var secondary = document.createElement('a');
      secondary.className = 'btn ghost';
      secondary.href = '/games';
      secondary.textContent = TXT.games[l];
      gdActions.appendChild(primary);
      gdActions.appendChild(secondary);
    }
    function openDetail(slide) {
      if (!gd || !slide) return;
      gdCurrent = slide;
      fillDetail(slide);
      clearTimeout(gdTimer);
      gd.classList.remove('bye');
      gd.classList.add('show');
      gd.setAttribute('aria-hidden', 'false');
      document.body.classList.add('gd-open');
      document.body.style.overflow = 'hidden';
      poke();
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { gd.classList.add('in'); });
      });
    }
    function closeDetail() {
      if (!gd || !gd.classList.contains('show')) return;
      gd.classList.remove('in');
      gd.classList.add('bye');
      document.body.classList.remove('gd-open');
      document.body.style.overflow = '';
      gdTimer = setTimeout(function () {
        gd.classList.remove('show', 'bye');
        gd.setAttribute('aria-hidden', 'true');
        gdCurrent = null;
      }, 420);
    }
    window.__gdReset = function () {
      if (!gd) return;
      clearTimeout(gdTimer);
      gd.classList.remove('show', 'in', 'bye');
      gd.setAttribute('aria-hidden', 'true');
      gdCurrent = null;
      document.body.classList.remove('gd-open');
      document.body.style.overflow = '';
    };
    window.__gdRefresh = function () {
      if (gdCurrent && gd && gd.classList.contains('show')) fillDetail(gdCurrent);
    };
    if (gd) {
      document.getElementById('gdBackdrop').addEventListener('click', closeDetail);
      document.getElementById('gdClose').addEventListener('click', closeDetail);
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeDetail();
      });
    }

    caption();
    render();
    requestAnimationFrame(frame);
  }
  window.__initCoverflow = initCoverflow;
  initCoverflow();
})();
