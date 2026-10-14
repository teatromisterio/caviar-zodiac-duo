/* Caviar · Zodiac Duo — скрипты посадочной страницы */
(function () {
  "use strict";
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $(s, r) { return (r || document).querySelector(s); }
  function el(tag, cls) { var n = document.createElement(tag); if (cls) n.className = cls; return n; }

  /* ---------- появление блоков */
  var rv = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !REDUCED) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } });
    }, { rootMargin: "0px 0px -10% 0px" });
    rv.forEach(function (n) { io.observe(n); });
  } else rv.forEach(function (n) { n.classList.add("is-in"); });

  /* ---------- hero-видео: источник по ширине экрана, запуск после загрузки страницы (постер грузится первым) */
  var hv = $(".lp-hero__video");
  if (hv && !REDUCED) {
    var start = function () {
      hv.src = window.matchMedia("(max-width: 1100px)").matches ? hv.getAttribute("data-src-sm") : hv.getAttribute("data-src-lg");
      hv.preload = "auto";
      hv.addEventListener("canplaythrough", function () { hv.play().catch(function () { }); }, { once: true });
      hv.load();
    };
    if (document.readyState === "complete") start(); else window.addEventListener("load", start);
  }

  /* ---------- видео-инструкция */
  var dlg = $("#lp-video");
  var opener = null;
  document.querySelectorAll("[data-video]").forEach(function (b) {
    b.addEventListener("click", function () {
      if (!dlg) return;
      opener = b;
      if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", "");
      var v = dlg.querySelector("video"); v.currentTime = 0; v.play().catch(function () { });
    });
  });
  if (dlg) {
    var close = function () { dlg.querySelector("video").pause(); if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); };
    dlg.querySelector(".lp-video__x").addEventListener("click", close);
    dlg.addEventListener("click", function (e) { if (e.target === dlg) close(); });
    dlg.addEventListener("close", function () { dlg.querySelector("video").pause(); if (opener) opener.focus(); });
  }

  /* ---------- медальоны: 12 знаков × 4 металла */
  var SIGNS = [["aries", "Овен", "21.03–19.04"], ["taurus", "Телец", "20.04–20.05"], ["gemini", "Близнецы", "21.05–20.06"], ["cancer", "Рак", "21.06–22.07"],
    ["leo", "Лев", "23.07–22.08"], ["virgo", "Дева", "23.08–22.09"], ["libra", "Весы", "23.09–22.10"], ["scorpio", "Скорпион", "23.10–21.11"],
    ["sagittarius", "Стрелец", "22.11–21.12"], ["capricorn", "Козерог", "22.12–19.01"], ["aquarius", "Водолей", "20.01–18.02"], ["pisces", "Рыбы", "19.02–20.03"]];
  var grid = $("#medals"), metal = "silver";
  function src(sign, m) { return "assets/layers/medal_" + sign + "_" + m + ".webp?v=m2"; }
  if (grid) {
    SIGNS.forEach(function (s) {
      var li = el("li"), m = el("div", "m"), img = el("img");
      img.src = src(s[0], metal); img.alt = "Медальон «" + s[1] + "» — рельефный символ знака"; img.loading = "lazy";
      m.appendChild(img);
      var n = el("div", "n"); n.textContent = s[1];
      var d = el("div", "d"); d.textContent = s[2];
      li.appendChild(m); li.appendChild(n); li.appendChild(d);
      grid.appendChild(li);
    });
    document.querySelectorAll(".lp-metals button").forEach(function (b) {
      b.addEventListener("click", function () {
        var nm = b.getAttribute("data-metal");
        if (nm === metal) return;
        metal = nm;
        document.querySelectorAll(".lp-metals button").forEach(function (x) { x.classList.toggle("is-on", x === b); x.setAttribute("aria-selected", x === b ? "true" : "false"); });
        grid.querySelectorAll("li").forEach(function (li, i) {
          var box = li.querySelector(".m"), old = box.querySelector("img"), nw = el("img");
          nw.alt = old.alt; nw.style.opacity = "0"; nw.src = src(SIGNS[i][0], metal);
          nw.onload = function () { box.appendChild(nw); requestAnimationFrame(function () { nw.style.opacity = "1"; old.style.opacity = "0"; setTimeout(function () { old.remove(); }, 520); }); };
        });
      });
    });
  }

  /* ---------- анатомия: слои PSD расходятся по глубине при прокрутке */
  var M = window.ZD_MANIFEST, phone = $("#anat-phone"), sec = $("#anatomy");
  if (M && phone && sec) {
    var CROP = { x: 316, y: 380, w: 1160, h: 1616 };
    // сверху вниз — в порядке списка подписей
    var GROUPS = [
      ["medal_sagittarius_rose"],
      ["frame_rose"],
      ["panel_fill_meteorite", "panel_frame_rose"],
      ["ring_enamel", "ring_rose", "spots_stone_white"],
      ["core_white", "const_sagittarius"],
      ["plate_croc_burgundy"],
      ["base_starwhite"]
    ];
    // Толщина деталей (в условных px при высоте телефона ~450 px): металл толще, кожа тоньше.
    // Толщина строится срезами: копии слоя под лицевой стороной, каждая на 1 единицу глубже и темнее.
    var LITE = window.matchMedia("(max-width: 1100px)").matches; // мобильные: без срезов и фильтров
    if (LITE) sec.classList.add("is-lite");
    var THICK = { medal_sagittarius_rose: 7, frame_rose: 8, panel_frame_rose: 7, ring_rose: 8, plate_croc_burgundy: 3, core_white: 4, const_sagittarius: 3 };
    function place(img, L) {
      img.style.left = ((L.x - CROP.x) / CROP.w * 100) + "%"; img.style.top = ((L.y - CROP.y) / CROP.h * 100) + "%";
      img.style.width = (L.w / CROP.w * 100) + "%"; img.style.height = (L.h / CROP.h * 100) + "%";
    }
    var nodes = GROUPS.map(function (keys, i) {
      var g = el("div", "lp-anat__g");
      g.style.zIndex = String(GROUPS.length - i);
      keys.forEach(function (k) {
        var L = M.layers[k], url = "assets/layers/" + k + "@half.webp?v=m6", n = LITE ? 0 : (THICK[k] || 0);
        for (var d = n; d >= 1; d--) {
          var sl = el("img", "lp-anat__slice"); sl.src = url; sl.alt = ""; sl.decoding = "async"; place(sl, L);
          sl.style.transform = "translateZ(calc(var(--u) * " + (-d) + "))";
          sl.style.setProperty("--b", (0.62 - 0.3 * d / n).toFixed(3)); // торец темнее к низу
          g.appendChild(sl);
        }
        var img = el("img"); img.src = url; img.alt = ""; img.decoding = "async"; place(img, L);
        g.appendChild(img);
      });
      phone.appendChild(g);
      return g;
    });
    var items = document.querySelectorAll("#anat-list li"), foot = $(".lp-anat__foot");
    function sm(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
    var ticking = false;
    function update() {
      ticking = false;
      var r = sec.getBoundingClientRect(), total = sec.offsetHeight - window.innerHeight;
      var p = REDUCED ? 0.75 : Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
      var tilt = sm(0.02, 0.32, p), ex = sm(0.1, 0.62, p);
      phone.style.transform = "rotateX(" + (54 * tilt) + "deg) rotateZ(" + (-30 * tilt) + "deg) scale(" + (1 - 0.2 * tilt) + ")";
      phone.style.setProperty("--u", (phone.offsetHeight / 450).toFixed(3) + "px");
      var gap = phone.offsetHeight * 0.13, active = Math.min(GROUPS.length - 1, Math.floor(sm(0.16, 0.9, p) * GROUPS.length));
      nodes.forEach(function (g, i) {
        var j = GROUPS.length - 1 - i; // 0 = нижний уровень
        var focus = ex > 0.5;
        // выбранная деталь чуть приподнимается, остальные приглушаются (фильтр — на изображениях, иначе 3D сплющится)
        g.style.transform = "translateZ(" + ((j - 3) * gap * ex + (focus && i === active ? gap * 0.18 : 0)) + "px)";
        g.classList.toggle("is-dim", focus && i > active);
        // детали над выбранной (ближе к зрителю) почти прозрачны, чтобы не закрывать обзор
        g.classList.toggle("is-front", focus && i < active);
        g.classList.toggle("is-act", focus && i === active);
      });
      items.forEach(function (li, i) { li.classList.toggle("is-on", ex > 0.35 ? i === active : false); });
      if (foot) foot.classList.toggle("is-on", p > 0.9);
      sec.classList.toggle("is-end", p > 0.9);
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

})();
