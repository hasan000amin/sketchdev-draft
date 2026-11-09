/* Sketch Dev Studio — shared site behaviour: marquee, language, reveal. */
(function () {
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
