/* OTOTO — behaviour: gallery, films, navigation, reveals */
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var doc = document;

  /* ---------- 1. The wall: stills gallery + filters + lightbox -------- */
  var FRAMES = [
    { n: "01", cat: "people", alt: "A smiling host with a drink at the counter" },
    { n: "02", cat: "people", alt: "Hands sharing a plate at the OTOTO table" },
    { n: "03", cat: "food",   alt: "Coffee and bread served on the counter" },
    { n: "04", cat: "place",  alt: "A sunlit corner of the heritage room" },
    { n: "05", cat: "people", alt: "Guests seated and talking inside OTOTO" },
    { n: "06", cat: "place",  alt: "Warm light falling across the interior" },
    { n: "07", cat: "food",   alt: "Plates of food arranged for sharing" },
    { n: "08", cat: "people", alt: "A familiar face at the OTOTO table" },
    { n: "09", cat: "food",   alt: "A poured drink beside fresh bread" },
    { n: "10", cat: "place",  alt: "Detail of the room: glass, wood and shadow" },
    { n: "11", cat: "place",  alt: "The interior lit by evening lamps" },
    { n: "12", cat: "people", alt: "People arriving at the door of the house" },
    { n: "13", cat: "people", alt: "A quiet moment between two guests" },
    { n: "15", cat: "place",  alt: "A window seat looking onto the room" },
    { n: "16", cat: "food",   alt: "Coffee and ceramic on a woven cloth" },
    { n: "17", cat: "people", alt: "Guests with their orders, mid-conversation" },
    { n: "18", cat: "people", alt: "Friends laughing over bread" },
    { n: "19", cat: "place",  alt: "The house interior, set for the day" },
    { n: "20", cat: "food",   alt: "Pastry and drink caught in afternoon light" }
  ];

  var LABEL = { people: "People & moments", place: "The house", food: "Bread & coffee" };
  var wall = doc.getElementById("masonry");
  var lightbox = doc.getElementById("lightbox");
  var lbImg = doc.getElementById("lbImg");
  var lbCap = doc.getElementById("lbCap");
  var visible = [];
  var lastFocus = null;

  function src(n) {
    return "assets/stills/ototo-still-" + n + ".jpg";
  }

  if (wall) {
    var frag = doc.createDocumentFragment();
    FRAMES.forEach(function (f, i) {
      var fig = doc.createElement("figure");
      fig.dataset.cat = f.cat;
      fig.dataset.index = String(i);
      fig.dataset.label = LABEL[f.cat] + " · frame " + f.n;
      fig.setAttribute("role", "button");
      fig.setAttribute("tabindex", "0");
      fig.setAttribute("aria-label", "Open " + LABEL[f.cat] + " frame " + f.n + " full size");
      fig.innerHTML = '<img src="' + src(f.n) + '" alt="' + f.alt + '" width="720" height="1280" loading="lazy">';
      frag.appendChild(fig);
    });
    wall.appendChild(frag);
    visible = [].slice.call(wall.children);

    wall.addEventListener("click", function (e) {
      var fig = e.target.closest("figure");
      if (fig) openLB(Number(fig.dataset.index));
    });
    wall.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        var fig = e.target.closest("figure");
        if (fig) { e.preventDefault(); openLB(Number(fig.dataset.index)); }
      }
    });
  }

  doc.querySelectorAll(".chip").forEach(function (chip) {
    chip.addEventListener("click", function () {
      var want = chip.dataset.filter;
      doc.querySelectorAll(".chip").forEach(function (c) {
        c.setAttribute("aria-pressed", String(c === chip));
      });
      visible = [];
      [].slice.call(wall.children).forEach(function (fig) {
        var show = want === "all" || fig.dataset.cat === want;
        fig.classList.toggle("is-hidden", !show);
        if (show) visible.push(Number(fig.dataset.index));
      });
    });
  });

  function openLB(index) {
    lastFocus = doc.activeElement;
    renderLB(index);
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    doc.body.classList.add("is-locked");
    doc.querySelector(".lb-next").focus();
  }

  function renderLB(index) {
    var pool = visible.length ? visible : FRAMES.map(function (_, i) { return i; });
    var pos = pool.indexOf(index);
    if (pos < 0) pos = 0;
    var f = FRAMES[pool[pos]];
    lbImg.src = src(f.n);
    lbImg.alt = f.alt;
    lbCap.textContent = LABEL[f.cat] + " · frame " + f.n + " of 19 · OTOTO, Magelang";
    lbImg.dataset.n = f.n;
    lbImg._pool = pool;
    lbImg._pos = pos;
  }

  function step(dir) {
    var pool = lbImg._pool || [];
    var pos = (lbImg._pos || 0) + dir;
    if (pos < 0) pos = pool.length - 1;
    if (pos >= pool.length) pos = 0;
    renderLB(pool[pos]);
  }

  function closeLB() {
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    doc.body.classList.remove("is-locked");
    if (lastFocus) lastFocus.focus();
  }

  if (lightbox) {
    lightbox.addEventListener("click", function (e) {
      var b = e.target.closest("[data-lb]");
      if (b) {
        if (b.dataset.lb === "close") closeLB();
        if (b.dataset.lb === "prev") step(-1);
        if (b.dataset.lb === "next") step(1);
      } else if (e.target === lightbox || e.target.tagName === "FIGURE") closeLB();
    });
    doc.addEventListener("keydown", function (e) {
      if (!lightbox.classList.contains("is-open")) return;
      if (e.key === "Escape") closeLB();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    });
  }

  /* ---------- 2. Films: one playing at a time ------------------------ */
  var live = null;

  doc.querySelectorAll(".film").forEach(function (film) {
    var screen = film.querySelector(".film__screen");
    var video = film.querySelector("video");
    var bar = film.querySelector(".film__bar > i");

    screen.addEventListener("click", function () {
      if (film.classList.contains("is-live") && !video.paused) { video.pause(); return; }
      if (live && live !== video) { live.pause(); }

      if (!video.querySelector("source")) {
        var s = doc.createElement("source");
        s.src = film.dataset.src;
        s.type = "video/mp4";
        video.appendChild(s);
        video.load();
      }
      film.classList.add("is-live");
      live = video;
      video.currentTime = 0;
      var p = video.play();
      if (p && p.catch) p.catch(function () { film.classList.remove("is-live"); });
    });

    video.addEventListener("timeupdate", function () {
      if (video.duration) bar.style.width = (video.currentTime / video.duration * 100) + "%";
    });
    video.addEventListener("ended", function () {
      film.classList.remove("is-live");
      bar.style.width = "0";
      if (live === video) live = null;
    });
    video.addEventListener("pause", function () {
      if (!video.ended) film.classList.remove("is-live");
    });
  });

  /* hero loop: pause offscreen to keep the page light */
  var hero = doc.querySelector(".hero__media video");
  if (hero && "IntersectionObserver" in window) {
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { e.isIntersecting ? hero.play() : hero.pause(); });
    }, { threshold: .1 }).observe(hero);
  }

  /* ---------- 3. Reveals ------------------------------------------- */
  var targets = doc.querySelectorAll(".reveal");
  if (reduce.matches || !("IntersectionObserver" in window)) {
    targets.forEach(function (t) { t.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: .08 });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------- 4. Header, drawer, scroll spy ------------------------- */
  var top = doc.getElementById("top");
  var bar = doc.querySelector(".progress > i");
  var burger = doc.querySelector(".burger");
  var drawer = doc.getElementById("drawer");

  function onScroll() {
    var y = window.scrollY || doc.documentElement.scrollTop;
    top.classList.toggle("is-stuck", y > 16);
    var h = doc.documentElement.scrollHeight - window.innerHeight;
    if (bar) bar.style.width = (h > 0 ? Math.min(100, y / h * 100) : 0) + "%";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  function setDrawer(open) {
    drawer.classList.toggle("is-open", open);
    drawer.setAttribute("aria-hidden", String(!open));
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
    doc.body.classList.toggle("is-locked", open);
  }
  if (burger) {
    setDrawer(false);
    burger.addEventListener("click", function () {
      setDrawer(burger.getAttribute("aria-expanded") !== "true");
    });
    drawer.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setDrawer(false); });
    });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && drawer.classList.contains("is-open")) { setDrawer(false); burger.focus(); }
    });
  }

  var links = [].slice.call(doc.querySelectorAll(".nav a[href^='#']"));
  var sections = links.map(function (a) { return doc.querySelector(a.getAttribute("href")); }).filter(Boolean);
  if ("IntersectionObserver" in window && sections.length) {
    var spy = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          a.classList.toggle("is-active", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 5. Footer year + back to top -------------------------- */
  var year = doc.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());

  var toTop = doc.getElementById("toTop");
  if (toTop) toTop.addEventListener("click", function () {
    window.scrollTo({ top: 0, behavior: reduce.matches ? "auto" : "smooth" });
  });
})();
