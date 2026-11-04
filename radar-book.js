/*!
 * Radar Book — rétrospective des radars RSSI
 * Module autonome, sans dépendance. Initialise chaque [data-radar-book] de la page.
 */
(function () {
  'use strict';

  var RM = window.matchMedia('(prefers-reduced-motion: reduce)');
  var EASE = 'cubic-bezier(.62,.04,.28,1)';
  var SVG_PREV = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var SVG_NEXT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>';
  var SVG_ZOOM = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>';
  var SVG_CLOSE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }
  function el(tag, cls, html) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function storage(key, val) {
    try {
      if (val === undefined) return window.sessionStorage.getItem(key);
      window.sessionStorage.setItem(key, val);
    } catch (e) { return null; }
  }

  function RadarBook(root) {
    var cfg = JSON.parse(root.querySelector('script.wrb-data').textContent);
    this.root = root;
    this.items = cfg.items;
    this.n = this.items.length;
    this.o = Object.assign({
      autoplayPages: 4,          // nombre de pages tournées automatiquement à l'arrivée
      autoplayOncePerSession: true,
      label: 'Radar RSSI',
      coverKicker: 'Rétrospective',
      coverTitle: '15 ans',
      hint: 'Faites défiler pour remonter le temps',
      pageRatio: 'auto'          // 'auto' = déduit de la 1re image
    }, cfg.options || {});
    this.current = 0;            // page affichée (état du livre)
    this.target = 0;             // page visée
    this.zc = 0;
    this.lockUntil = 0; this.lastWheel = 0; this.lastAbs = 0;
    this.autoplaying = false;
    this.ratio = typeof this.o.pageRatio === 'number' ? this.o.pageRatio : 0.93;
    this.build();
    root.classList.add('is-ready');
    this.layout();
    var start = this.scrollIndex();     // rechargement en milieu de séquence : on reprend où l'on est
    this.jump(start);
    this.load(start);
    this.bind();
    this.idlePreload();
  }

  RadarBook.prototype.build = function () {
    var self = this, it = this.items, n = this.n;
    var root = this.root;
    root.style.setProperty('--wrb-n', n);
    var sticky = root.querySelector('.wrb-sticky');
    var head = sticky.querySelector('.wrb-head');

    this.hint = el('p', 'wrb-hint', '<span>' + esc(this.o.hint) + '</span><span class="wrb-hint__line" aria-hidden="true"></span>');
    this.hint.setAttribute('aria-hidden', 'true');
    head.appendChild(this.hint);

    // --- Livre ---
    var stage = el('div', 'wrb-stage');
    var vp = el('div', 'wrb-viewport');
    vp.setAttribute('role', 'img');
    vp.tabIndex = 0;
    var book = el('div', 'wrb-book');
    book.setAttribute('aria-hidden', 'true');

    var base = el('div', 'wrb-base');
    var cover = el('div', 'wrb-face wrb-cover');
    cover.innerHTML = this.yearCard(0, true);
    base.appendChild(cover);
    book.appendChild(base);

    this.castL = el('div', 'wrb-cast wrb-cast--l');
    this.castR = el('div', 'wrb-cast wrb-cast--r');
    book.appendChild(this.castL);
    book.appendChild(this.castR);

    this.leaves = [];
    this.imgs = [];
    for (var k = 0; k < n; k++) {
      var leaf = el('div', 'wrb-leaf');
      var front = el('div', 'wrb-face wrb-face--front');
      var fig = el('figure', 'wrb-radar');
      var box = el('div', 'wrb-radar__img');
      var img = new Image();
      img.alt = '';
      img.decoding = 'async';
      if (it[k].width) img.width = it[k].width;
      if (it[k].height) img.height = it[k].height;
      img.dataset.src = it[k].src;
      if (it[k].srcset) { img.dataset.srcset = it[k].srcset; img.sizes = '(max-width: 760px) 92vw, 70vw'; }
      (function (img, box, k) {
        img.addEventListener('load', function () {
          img.classList.add('is-loaded'); box.classList.add('is-loaded');
          if (k === 0 && self.o.pageRatio === 'auto' && img.naturalWidth) {
            var r = img.naturalWidth / img.naturalHeight;
            // la page réserve 5 % de marge latérale et 7 % de hauteur pour le folio
            self.ratio = clamp(0.93 * r / (0.9 + 0.1 * r), 0.6, 1.8);
            self.layout();
          }
        });
      })(img, box, k);
      box.appendChild(img);
      fig.appendChild(box);
      fig.appendChild(el('figcaption', 'wrb-folio',
        '<span>' + esc(this.o.label) + ' <b>' + esc(it[k].year) + '</b></span><b>' + pad(k + 1) + ' / ' + pad(n) + '</b>'));
      front.appendChild(fig);
      front.appendChild(el('div', 'wrb-shade'));

      var back = el('div', 'wrb-face wrb-face--back');
      back.innerHTML = k + 1 < n ? this.yearCard(k + 1, false) : '';
      back.appendChild(el('div', 'wrb-shade'));

      leaf.appendChild(front);
      leaf.appendChild(back);
      leaf._fs = front.lastChild; leaf._bs = back.lastChild;
      book.appendChild(leaf);
      this.leaves.push(leaf);
      this.imgs.push(img);
    }
    vp.appendChild(book);
    stage.appendChild(vp);
    this.vp = vp; this.book = book; this.stage = stage;

    // --- Barre de pilotage ---
    var hud = el('div', 'wrb-hud');
    var year = el('div', 'wrb-year');
    year.setAttribute('aria-hidden', 'true');
    year.innerHTML = '<span class="wrb-year__label">' + esc(this.o.label) + '</span><span class="wrb-year__val"><span>' + esc(it[0].year) + '</span></span>';
    this.yearVal = year.querySelector('.wrb-year__val');

    var ticks = el('ol', 'wrb-ticks');
    ticks.setAttribute('aria-label', 'Chronologie des radars');
    this.ticks = [];
    it.forEach(function (d, i) {
      var li = el('li');
      var b = el('button', 'wrb-tick', '<span class="wrb-tick__y" aria-hidden="true">' + esc(d.year) + '</span>');
      b.type = 'button';
      b.setAttribute('aria-label', esc(self.o.label) + ' ' + d.year + ' (' + (i + 1) + ' sur ' + n + ')');
      b.addEventListener('click', function () { self.go(i); });
      li.appendChild(b); ticks.appendChild(li);
      self.ticks.push(b);
    });

    var ctrl = el('div', 'wrb-ctrl');
    this.count = el('span', 'wrb-count');
    this.count.setAttribute('aria-hidden', 'true');
    this.prevBtn = el('button', 'wrb-btn', SVG_PREV);
    this.nextBtn = el('button', 'wrb-btn', SVG_NEXT);
    this.zoomBtn = el('button', 'wrb-btn', SVG_ZOOM);
    [this.prevBtn, this.nextBtn, this.zoomBtn].forEach(function (b) { b.type = 'button'; });
    this.prevBtn.addEventListener('click', function () { self.go(self.target - 1); });
    this.nextBtn.addEventListener('click', function () { self.go(self.target + 1); });
    this.zoomBtn.addEventListener('click', function () { self.zoom(); });
    ctrl.appendChild(this.count);
    ctrl.appendChild(this.prevBtn);
    ctrl.appendChild(this.nextBtn);
    ctrl.appendChild(this.zoomBtn);

    hud.appendChild(year); hud.appendChild(ticks); hud.appendChild(ctrl);

    this.live = el('p', 'wrb-sr');
    this.live.setAttribute('aria-live', 'polite');
    this.live.setAttribute('aria-atomic', 'true');
    var help = el('p', 'wrb-sr', 'Utilisez les flèches du clavier ou les boutons précédent et suivant pour parcourir les ' + n + ' radars. Entrée pour agrandir.');
    help.id = 'wrb-help-' + Math.random().toString(36).slice(2, 8);
    vp.setAttribute('aria-describedby', help.id);

    sticky.appendChild(stage);
    sticky.appendChild(hud);
    sticky.appendChild(this.live);
    sticky.appendChild(help);
    this.sticky = sticky;

    // --- Fenêtre d'agrandissement ---
    var dlg = el('dialog', 'wrb-dialog');
    dlg.innerHTML = '<div class="wrb-dialog__bar"><strong></strong><button type="button" class="wrb-btn" aria-label="Fermer">' + SVG_CLOSE + '</button></div><div class="wrb-dialog__body"><img alt=""></div>';
    dlg.querySelector('button').addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    root.appendChild(dlg);
    this.dlg = dlg;
  };

  RadarBook.prototype.yearCard = function (i, isCover) {
    var d = this.items[i], n = this.n, y = String(d.year);
    var track = '';
    for (var j = 0; j < n; j++) track += '<i' + (j <= i ? ' class="on"' : '') + '></i>';
    var big = '<p class="wrb-yearcard__year">' + esc(y.slice(0, 2)) + '<span>' + esc(y.slice(2)) + '</span></p>';
    if (isCover) {
      return '<div class="wrb-yearcard">' +
        '<div class="wrb-yearcard__top"><span>' + esc(this.o.coverKicker) + '</span><span>' + esc(this.items[0].year) + ' → ' + esc(this.items[n - 1].year) + '</span></div>' +
        '<div><p class="wrb-yearcard__year">' + esc(this.o.coverTitle) + '<span class="wrb-cover__range">de priorités RSSI, radar après radar</span></p>' +
        '<div class="wrb-yearcard__track">' + track + '</div></div>' +
        '<div class="wrb-yearcard__bottom"><span>Point de départ</span><b>' + esc(y) + '</b></div></div>';
    }
    return '<div class="wrb-yearcard">' +
      '<div class="wrb-yearcard__top"><span>' + esc(this.o.label) + '</span><span>' + pad(i + 1) + ' / ' + pad(n) + '</span></div>' +
      '<div>' + big + (d.caption ? '<p class="wrb-yearcard__caption">' + esc(d.caption) + '</p>' : '') +
      '<div class="wrb-yearcard__track">' + track + '</div></div>' +
      '<div class="wrb-yearcard__bottom"><span>' + (i === n - 1 ? 'Édition la plus récente' : 'Année') + '</span><span>' + esc(y) + '</span></div></div>';
  };

  /* ---------------------------------------------------------------- Mise en page */
  RadarBook.prototype.layout = function () {
    var s = this.stage.getBoundingClientRect();
    if (!s.width || !s.height) return;
    var r = this.ratio;
    // double page pour les radars « portrait / carré », page unique pour les radars paysage
    var spread = s.width >= 820 && r < 1.2;
    var ph = Math.min(s.height, s.width / ((spread ? 2 : 1) * r));
    if (spread && ph * r < 340) { spread = false; ph = Math.min(s.height, s.width / r); }
    var pw = Math.floor(ph * r); ph = Math.floor(ph);
    this.root.style.setProperty('--wrb-pw', pw + 'px');
    this.root.style.setProperty('--wrb-ph', ph + 'px');
    this.root.classList.toggle('is-single', !spread);
    this.stepPx = (this.root.offsetHeight - this.sticky.offsetHeight) / Math.max(1, this.n - 1);
  };

  /* ---------------------------------------------------------------- Scroll */
  RadarBook.prototype.scrollIndex = function () {
    if (!this.stepPx) return 0;
    var top = this.root.getBoundingClientRect().top;
    return clamp(Math.round(-top / this.stepPx), 0, this.n - 1);
  };
  RadarBook.prototype.scrollToIndex = function (i) {
    var y = window.pageYOffset + this.root.getBoundingClientRect().top + i * this.stepPx;
    this.ignoreScrollUntil = performance.now() + 80;
    try { window.scrollTo({ top: Math.round(y), behavior: 'instant' }); }
    catch (e) { window.scrollTo(0, Math.round(y)); }
  };
  RadarBook.prototype.isPinned = function () {
    var r = this.root.getBoundingClientRect();
    return r.top <= 1 && r.bottom >= window.innerHeight - 1;
  };
  RadarBook.prototype.syncScroll = function (silent) {
    if (this.autoplaying) return;
    var i = this.scrollIndex();
    if (i !== this.target) this.setTarget(i, !silent);
  };

  /* ---------------------------------------------------------------- Navigation */
  // Navigation explicite (boutons, clavier, molette) : on aligne le scroll puis on tourne.
  RadarBook.prototype.go = function (i) {
    i = clamp(i, 0, this.n - 1);
    this.engage();
    this.scrollToIndex(i);
    this.setTarget(i, true);
  };

  RadarBook.prototype.setTarget = function (i, announce) {
    i = clamp(i, 0, this.n - 1);
    this.target = i;
    this.announce = announce;
    this.load(i);
    if (this._kick) { this._kick(); this._kick = null; }
    if (!this.running) this.run();
  };

  RadarBook.prototype.run = function () {
    var self = this;
    this.running = true;
    (function step() {
      if (self.current === self.target) {
        self.running = false;
        if (self.announce) self.say();
        return;
      }
      var dir = self.target > self.current ? 1 : -1;
      var dist = Math.abs(self.target - self.current);
      var k = dir > 0 ? self.current : self.current - 1;
      self.current += dir;
      self.hud(dir);
      var rm = RM.matches;
      var dur = rm ? 0 : (self.autoplaying ? 1050 : dist > 1 ? (dist > 4 ? 520 : 640) : 920);
      var p = self.turn(k, dir, dur);
      var gap = rm ? 0 : dist > 1 ? (dist > 4 ? 90 : 150) : null;
      var next = gap !== null ? wait(gap)
        : Promise.race([p, new Promise(function (r) { self._kick = r; }).then(function () { return wait(140); })]);
      next.then(step);
    })();
  };

  // Tourne le feuillet k (dir=1 : vers la gauche / année suivante ; -1 : retour)
  RadarBook.prototype.turn = function (k, dir, dur) {
    var self = this, leaf = this.leaves[k];
    leaf._p = (leaf._p || Promise.resolve()).then(function () { return self.animateLeaf(leaf, k, dir, dur); });
    return leaf._p;
  };

  RadarBook.prototype.animateLeaf = function (leaf, k, dir, dur) {
    var self = this;
    var end = dir > 0 ? -180 : 0;
    function rest() {
      leaf.style.transform = 'rotateY(' + end + 'deg)';
      leaf.style.zIndex = end ? k + 1 : self.n - k + self.n;
      leaf.classList.toggle('is-flipped', !!end);
    }
    if (!dur) {
      rest();
      if (this.book.animate) this.book.animate([{ opacity: 0.55 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
      return Promise.resolve();
    }
    leaf.style.zIndex = 1000 + (++this.zc);
    leaf.classList.remove('is-flipped');
    var o = { duration: dur, easing: EASE, fill: 'forwards', direction: dir > 0 ? 'normal' : 'reverse' };
    var oLin = { duration: dur, easing: 'linear', fill: 'forwards', direction: o.direction };
    var anims = [
      leaf.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(-180deg)' }], o),
      leaf._fs.animate([{ opacity: 0 }, { opacity: 0.45, offset: 0.5 }, { opacity: 0.45 }], o),
      leaf._bs.animate([{ opacity: 0.45 }, { opacity: 0.45, offset: 0.5 }, { opacity: 0 }], o),
      this.castR.animate([{ opacity: 0 }, { opacity: 0.85, offset: 0.12 }, { opacity: 0, offset: 0.55 }, { opacity: 0 }], oLin),
      this.castL.animate([{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 0.7, offset: 0.86 }, { opacity: 0 }], oLin)
    ];
    // page unique : le verso (année suivante) apparaît pendant la rotation puis s'efface
    if (this.root.classList.contains('is-single')) {
      anims.push(leaf.lastChild.animate([{ opacity: 1 }, { opacity: 1, offset: 0.55 }, { opacity: 0 }], oLin));
    }
    return anims[0].finished.then(function () {
      rest();
      anims.forEach(function (a) { a.cancel(); });
    }, function () { rest(); });
  };

  // Positionne le livre sans animation
  RadarBook.prototype.jump = function (i) {
    for (var k = 0; k < this.n; k++) {
      var f = k < i;
      this.leaves[k].style.transform = 'rotateY(' + (f ? -180 : 0) + 'deg)';
      this.leaves[k].style.zIndex = f ? k + 1 : this.n - k + this.n;
      this.leaves[k].classList.toggle('is-flipped', f);
    }
    this.current = this.target = i;
    this.hud(0);
  };

  RadarBook.prototype.hud = function (dir) {
    var i = this.current, d = this.items[i], n = this.n;
    this.count.innerHTML = '<b>' + pad(i + 1) + '</b> / ' + pad(n);
    this.prevBtn.disabled = i === 0;
    this.nextBtn.disabled = i === n - 1;
    this.prevBtn.setAttribute('aria-label', i > 0 ? 'Radar précédent (' + this.items[i - 1].year + ')' : 'Radar précédent');
    this.nextBtn.setAttribute('aria-label', i < n - 1 ? 'Radar suivant (' + this.items[i + 1].year + ')' : 'Radar suivant');
    this.zoomBtn.setAttribute('aria-label', 'Agrandir le radar ' + d.year);
    this.vp.setAttribute('aria-label', d.alt || (this.o.label + ' ' + d.year));
    this.ticks.forEach(function (t, j) {
      if (j === i) t.setAttribute('aria-current', 'step'); else t.removeAttribute('aria-current');
      t.classList.toggle('is-past', j < i);
    });
    var span = this.yearVal.firstChild;
    if (span.textContent !== String(d.year)) {
      span.textContent = d.year;
      if (dir && !RM.matches && span.animate) {
        span.animate([{ transform: 'translateY(' + (dir * 60) + '%)', opacity: 0 }, { transform: 'none', opacity: 1 }],
          { duration: 520, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
    }
  };

  RadarBook.prototype.say = function () {
    var d = this.items[this.current];
    this.live.textContent = this.o.label + ' ' + d.year + ', ' + (this.current + 1) + ' sur ' + this.n + '.';
  };

  RadarBook.prototype.zoom = function () {
    var d = this.items[this.current];
    this.dlg.querySelector('strong').textContent = this.o.label + ' ' + d.year;
    var img = this.dlg.querySelector('img');
    img.src = d.zoomSrc || d.src;
    img.alt = d.alt || (this.o.label + ' ' + d.year);
    this.engage();
    if (this.dlg.showModal) this.dlg.showModal(); else window.open(img.src, '_blank', 'noopener');
  };

  /* ---------------------------------------------------------------- Images */
  RadarBook.prototype.loadOne = function (k) {
    var img = this.imgs[k];
    if (!img || img.src) return;
    if (img.dataset.srcset) img.srcset = img.dataset.srcset;
    img.src = img.dataset.src;
  };
  RadarBook.prototype.load = function (i) {
    this.imgs[i] && (this.imgs[i].fetchPriority = 'high');
    for (var k = i - 1; k <= i + 3; k++) if (k >= 0 && k < this.n) this.loadOne(k);
  };
  RadarBook.prototype.idlePreload = function () {
    var self = this, k = 0;
    var idle = window.requestIdleCallback || function (cb) { return setTimeout(cb, 300); };
    function next() {
      while (k < self.n && self.imgs[k].src) k++;
      if (k >= self.n) return;
      self.loadOne(k);
      idle(next, { timeout: 2000 });
    }
    // on laisse passer le rendu initial avant de précharger le reste
    window.addEventListener('load', function () { setTimeout(function () { idle(next, { timeout: 2000 }); }, 1200); });
    if (document.readyState === 'complete') setTimeout(function () { idle(next, { timeout: 2000 }); }, 1200);
  };

  /* ---------------------------------------------------------------- Autoplay */
  RadarBook.prototype.autoplay = function () {
    var self = this;
    var key = 'wrb-played:' + location.pathname;
    if (this.played || RM.matches || (this.o.autoplayOncePerSession && storage(key)) || this.engaged || this.current !== 0) return;
    this.played = true;
    storage(key, '1');
    this.autoplaying = true;
    var pages = clamp(this.o.autoplayPages, 1, this.n - 1);

    function idle() {
      return new Promise(function (r) {
        (function chk() { if (!self.running) r(); else setTimeout(chk, 50); })();
      });
    }
    var chain = wait(450), i;
    for (i = 1; i <= pages; i++) {
      (function (i) {
        chain = chain.then(function () {
          if (!self.autoplaying) return;
          self.setTarget(i, false);
          return idle().then(function () { return wait(180); });
        });
      })(i);
    }
    chain.then(function () { return self.autoplaying && wait(900); })
      .then(function () {
        if (!self.autoplaying) return;
        self.setTarget(0, false);       // feuilletage retour : on revient au point de départ
        return idle();
      })
      .then(function () { self.autoplaying = false; });
  };
  RadarBook.prototype.stopAutoplay = function () {
    if (!this.autoplaying) return;
    this.autoplaying = false;
    this.syncScroll(false);
  };
  RadarBook.prototype.engage = function () {
    this.engaged = true;
    this.root.classList.add('is-engaged');
    this.stopAutoplay();
  };

  /* ---------------------------------------------------------------- Événements */
  RadarBook.prototype.bind = function () {
    var self = this, raf = 0;

    window.addEventListener('scroll', function () {
      if (raf) return;
      raf = requestAnimationFrame(function () {
        raf = 0;
        if (self.autoplaying && self.scrollIndex() !== 0) self.engage();
        self.syncScroll(false);
        if (self.isPinned() && self.scrollIndex() > 0) self.engage();
      });
    }, { passive: true });

    var resizeT;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () {
        self.layout();
        // garde l'alignement scroll ↔ page affichée
        if (self.isPinned()) self.scrollToIndex(self.target);
      }, 120);
    });

    // Molette : un cran = une page, tant que le module est ancré
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || (self.dlg && self.dlg.open)) return;
      var dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (Math.abs(dy) < Math.abs(e.deltaX)) return;
      if (!self.isPinned() || !dy) return;
      var dir = dy > 0 ? 1 : -1;
      var base = self.target;
      if ((dir > 0 && base >= self.n - 1) || (dir < 0 && base <= 0)) return; // sortie naturelle
      e.preventDefault();
      self.engage();
      var now = performance.now(), abs = Math.abs(dy);
      var gap = now - self.lastWheel;
      var inertia = gap < 110 && abs < self.lastAbs; // traîne d'inertie des pavés tactiles
      self.lastWheel = now; self.lastAbs = abs;
      if (now < self.lockUntil || inertia || abs < 4) return;
      self.lockUntil = now + (RM.matches ? 280 : 620);
      self.go(base + dir);
    }, { passive: false });

    // Prise de contrôle manuelle
    ['touchstart', 'pointerdown'].forEach(function (t) {
      self.root.addEventListener(t, function () { self.engage(); }, { passive: true });
    });

    // Clavier (quand le focus est dans le module)
    this.sticky.addEventListener('keydown', function (e) {
      var k = e.key, i = null;
      if (k === 'ArrowRight' || k === 'ArrowDown') i = self.target + 1;
      else if (k === 'ArrowLeft' || k === 'ArrowUp') i = self.target - 1;
      else if (k === 'Home') i = 0;
      else if (k === 'End') i = self.n - 1;
      else if ((k === 'Enter' || k === ' ') && e.target === self.vp) { e.preventDefault(); self.zoom(); return; }
      if (i === null) return;
      e.preventDefault();
      self.go(i);
    });

    this.vp.addEventListener('click', function () { self.zoom(); });

    // Démarrage automatique à l'arrivée dans le viewport
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting && en.intersectionRatio >= 0.55) { self.autoplay(); io.disconnect(); }
        });
      }, { threshold: [0, 0.55, 1] });
      io.observe(this.sticky);
    }

    var onRM = function () { self.layout(); };
    RM.addEventListener ? RM.addEventListener('change', onRM) : RM.addListener(onRM);
  };

  function init() {
    var nodes = document.querySelectorAll('[data-radar-book]:not([data-wrb-init])');
    Array.prototype.forEach.call(nodes, function (n) {
      n.setAttribute('data-wrb-init', '');
      try { n._radarBook = new RadarBook(n); } catch (err) { console.error('[radar-book]', err); }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  window.RadarBook = { init: init };
})();
