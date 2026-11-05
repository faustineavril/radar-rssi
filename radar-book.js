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
  var SVG_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="7" y="6" width="3.2" height="12" rx="1"/><rect x="13.8" y="6" width="3.2" height="12" rx="1"/></svg>';
  var SVG_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8.5 6.2v11.6a.8.8 0 0 0 1.2.7l9.2-5.8a.8.8 0 0 0 0-1.4L9.7 5.5a.8.8 0 0 0-1.2.7z"/></svg>';
  var SVG_RING = '<svg class="wrb-play__ring" viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="22.5"/></svg>';
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
      interval: 5000,            // délai entre deux pages en lecture automatique (ms)
      label: 'Radar RSSI',
      focusLabel: 'Focus de l’année',
      pageRatio: 'auto'          // 'auto' = déduit de la 1re image
    }, cfg.options || {});
    this.current = 0;            // page affichée (état du livre)
    this.target = 0;             // page visée
    this.zc = 0;
    this.playing = !RM.matches;  // lecture automatique (désactivée si l'utilisateur réduit les animations)
    this.visible = false;
    this.ratio = typeof this.o.pageRatio === 'number' ? this.o.pageRatio : 0.93;
    this.build();
    root.classList.add('is-ready');
    this.layout();
    this.jump(0);
    this.load(0);
    this.bind();
    this.setPlaying(this.playing);
    this.idlePreload();
  }

  RadarBook.prototype.build = function () {
    var self = this, it = this.items, n = this.n;
    var root = this.root;
    root.style.setProperty('--wrb-n', n);
    var sticky = root.querySelector('.wrb-sticky');
    var head = sticky.querySelector('.wrb-head');

    // --- Livre ---
    var stage = el('div', 'wrb-stage');
    var vp = el('div', 'wrb-viewport');
    vp.setAttribute('role', 'img');
    vp.tabIndex = 0;
    var book = el('div', 'wrb-book');
    book.setAttribute('aria-hidden', 'true');

    var base = el('div', 'wrb-base');
    var cover = el('div', 'wrb-face');
    cover.innerHTML = this.yearCard(0);
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
      if (it[k].srcset) { img.dataset.srcset = it[k].srcset; img.sizes = '(max-width: 760px) 92vw, 48vw'; }
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
      front.appendChild(fig);
      front.appendChild(el('div', 'wrb-shade'));

      var back = el('div', 'wrb-face wrb-face--back');
      back.innerHTML = k + 1 < n ? this.yearCard(k + 1) : '';
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
    this.playBtn = el('button', 'wrb-btn wrb-play');
    this.playBtn.type = 'button';
    this.playBtn.addEventListener('click', function () { self.setPlaying(!self.playing); });
    ctrl.appendChild(this.count);
    ctrl.appendChild(this.playBtn);
    ctrl.appendChild(this.prevBtn);
    ctrl.appendChild(this.nextBtn);
    ctrl.appendChild(this.zoomBtn);

    hud.appendChild(year); hud.appendChild(ticks); hud.appendChild(ctrl);

    this.live = el('p', 'wrb-sr');
    this.live.setAttribute('aria-live', 'polite');
    this.live.setAttribute('aria-atomic', 'true');
    var help = el('p', 'wrb-sr', 'Les ' + n + ' radars défilent automatiquement toutes les ' + Math.round(this.o.interval / 1000) + ' secondes ; le bouton pause arrête le défilement. Utilisez les flèches du clavier ou les boutons précédent et suivant pour naviguer, Entrée pour agrandir.');
    help.id = 'wrb-help-' + Math.random().toString(36).slice(2, 8);

    this.note = el('div', 'wrb-note');
    this.note.id = help.id + '-note';
    vp.setAttribute('aria-describedby', help.id + ' ' + this.note.id);
    sticky.appendChild(stage);
    sticky.appendChild(this.note);
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

  // Page de gauche : l'année en grand, le focus de l'année et le résumé de l'édition
  RadarBook.prototype.yearCard = function (i) {
    var d = this.items[i], n = this.n, y = String(d.year);
    var track = '';
    for (var j = 0; j < n; j++) track += '<i' + (j <= i ? ' class="on"' : '') + '></i>';
    return '<div class="wrb-yearcard">' +
      '<div class="wrb-yearcard__top"><span>' + esc(this.o.label) + '</span><span>' + pad(i + 1) + ' / ' + pad(n) + '</span></div>' +
      '<div class="wrb-yearcard__main">' +
        '<p class="wrb-yearcard__year">' + esc(y.slice(0, 2)) + '<span>' + esc(y.slice(2)) + '</span></p>' +
        (d.focus ? '<p class="wrb-yearcard__label">' + esc(this.o.focusLabel) + '</p><p class="wrb-yearcard__focus">' + esc(d.focus) + '</p>' : '') +
        (d.summary ? '<p class="wrb-yearcard__summary">' + esc(d.summary) + '</p>' : '') +
      '</div>' +
      '<div class="wrb-yearcard__bottom"><div class="wrb-yearcard__track">' + track + '</div>' +
      '<span>' + esc(this.items[0].year) + '</span><span>' + esc(this.items[n - 1].year) + '</span></div></div>';
  };

  /* ---------------------------------------------------------------- Mise en page */
  RadarBook.prototype.layout = function () {
    var s = this.stage.getBoundingClientRect();
    if (!s.width || !s.height) return;
    var r = this.ratio, pw, ph;
    // Double page (année + texte à gauche, radar à droite) dès que la largeur le permet ;
    // les pages occupent toute la hauteur disponible (format entre 0,72 et 1,6).
    var spread = s.width >= 900 && s.height >= 380;
    if (spread) {
      pw = Math.min(s.width / 2, s.height * 1.6);
      ph = Math.min(s.height, pw / 0.72);
    } else {
      ph = Math.min(s.height, s.width / r);
      pw = ph * r;
    }
    pw = Math.floor(pw); ph = Math.floor(ph);
    this.root.style.setProperty('--wrb-pw', pw + 'px');
    this.root.style.setProperty('--wrb-ph', ph + 'px');
    this.root.classList.toggle('is-single', !spread);
  };

  /* ---------------------------------------------------------------- Navigation */
  // Navigation explicite (flèches, frise, clavier) : on tourne la page et on relance le décompte
  RadarBook.prototype.go = function (i) {
    this.setTarget(clamp(i, 0, this.n - 1), true);
    this.schedule();
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
        self.schedule();
        return;
      }
      var dir = self.target > self.current ? 1 : -1;
      var dist = Math.abs(self.target - self.current);
      var k = dir > 0 ? self.current : self.current - 1;
      self.current += dir;
      self.hud(dir);
      var rm = RM.matches;
      var dur = rm ? 0 : dist > 1 ? (dist > 4 ? 420 : 640) : 1000;
      var p = self.turn(k, dir, dur);
      var gap = rm ? 0 : dist > 1 ? (dist > 4 ? 70 : 150) : null;
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
    if (this.note && this.note._i !== i) {
      this.note._i = i;
      this.note.innerHTML = (d.focus ? '<p class="wrb-note__focus"><span>' + esc(this.o.focusLabel) + ' ' + esc(d.year) + '</span>' + esc(d.focus) + '</p>' : '') +
        (d.summary ? '<p class="wrb-note__summary">' + esc(d.summary) + '</p>' : '');
      if (dir && !RM.matches && this.note.animate) this.note.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 420, easing: 'ease-out' });
    }
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
    this.schedule();
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

  /* ---------------------------------------------------------------- Lecture automatique */
  RadarBook.prototype.canPlay = function () {
    return this.playing && this.visible && !document.hidden && !(this.dlg && this.dlg.open);
  };
  // Programme la page suivante <interval> ms après la fin de la page en cours ; boucle sur la 1re
  RadarBook.prototype.schedule = function () {
    var self = this;
    clearTimeout(this.timer);
    this.root.classList.remove('is-counting');
    if (!this.canPlay() || this.running) return;
    void this.playBtn.offsetWidth;          // relance l'animation de la jauge
    this.root.classList.add('is-counting');
    this.timer = setTimeout(function () {
      self.root.classList.remove('is-counting');
      if (!self.canPlay()) return;
      self.setTarget(self.target >= self.n - 1 ? 0 : self.target + 1, false);
    }, this.o.interval);
  };
  RadarBook.prototype.setPlaying = function (on) {
    this.playing = !!on;
    this.root.classList.toggle('is-playing', this.playing);
    this.playBtn.innerHTML = SVG_RING + (this.playing ? SVG_PAUSE : SVG_PLAY);
    this.playBtn.setAttribute('aria-label', this.playing ? 'Mettre en pause le défilement automatique' : 'Reprendre le défilement automatique');
    this.playBtn.setAttribute('aria-pressed', this.playing ? 'false' : 'true');
    this.schedule();
  };
  RadarBook.prototype.engage = function () {};

  /* ---------------------------------------------------------------- Événements */
  RadarBook.prototype.bind = function () {
    var self = this, raf = 0;

    var resizeT;
    window.addEventListener('resize', function () {
      clearTimeout(resizeT);
      resizeT = setTimeout(function () { self.layout(); }, 120);
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

    this.vp.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.wrb-face--front')) self.zoom();
    });

    // La lecture automatique ne tourne que lorsque le livre est visible
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          self.visible = en.isIntersecting && en.intersectionRatio >= 0.3;
          self.schedule();
        });
      }, { threshold: [0, 0.3, 0.6, 1] }).observe(this.sticky);
    } else { this.visible = true; }
    document.addEventListener('visibilitychange', function () { self.schedule(); });
    this.dlg.addEventListener('close', function () { self.schedule(); });

    var onRM = function () { self.layout(); if (RM.matches) self.setPlaying(false); };
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
