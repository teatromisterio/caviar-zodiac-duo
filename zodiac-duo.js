/*!
 * Caviar · Zodiac Duo configurator
 * Автономный виджет: <div data-zodiac-duo></div> + zodiac-duo.css + assets/manifest.js + этот файл.
 * Настройки — window.ZodiacDuoConfig (см. README.md).
 */
(function () {
  "use strict";

  /* ------------------------------------------------------------------ config */
  var CFG = Object.assign({
    assets: null,            // путь к папке assets; по умолчанию — рядом со скриптом
    lang: null,              // "ru" | "en"; по умолчанию — <html lang>
    leadEndpoint: "",        // TODO: URL обработчика заявок (email) на стороне сайта
    bitrixWebhook: "",       // TODO: входящий вебхук Битрикс24 (лучше проксировать через сервер)
    policyUrl: "#",          // TODO: ссылка на политику конфиденциальности
    ymId: null,              // TODO: ID счётчика Яндекс Метрики
    storageKey: "zodiac-duo:v1"
  }, window.ZodiacDuoConfig || {});

  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
  var ASSETS = CFG.assets || SCRIPT_SRC.replace(/[^/]*$/, "") + "assets";
  var M = window.ZD_MANIFEST;
  var CANVAS_W = 1792, CANVAS_H = 2400;
  // Видимая область сцены: телефон без пустых полей холста PSD (телефон занимает 346–1445 × 408–1966)
  var CROP = { x: 316, y: 380, w: 1160, h: 1616 };
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ i18n */
  var LANG = (CFG.lang || document.documentElement.lang || "ru").slice(0, 2).toLowerCase() === "en" ? "en" : "ru";
  function t(o) { return typeof o === "string" ? o : (o[LANG] || o.ru); }

  var UI = {
    title: { ru: "Zodiac Duo", en: "Zodiac Duo" },
    lead: { ru: "Ваш знак. Ваши материалы. Единственный экземпляр.", en: "Your sign. Your materials. A single piece." },
    steps: {
      sign: { ru: "Знак зодиака", en: "Zodiac sign" },
      frame: { ru: "Рама", en: "Frame" },
      plate: { ru: "Плато", en: "Back plate" },
      ring: { ru: "Зодиакальный круг", en: "Zodiac circle" },
      medal: { ru: "Медальон", en: "Medallion" },
      panel: { ru: "Декоративная панель", en: "Decorative panel" },
      base: { ru: "Корпус iPhone", en: "iPhone body" },
      summary: { ru: "Итог", en: "Summary" }
    },
    g: {
      sign: { ru: "Знак", en: "Sign" },
      presets: { ru: "Выбор Caviar", en: "Caviar selection" },
      metal: { ru: "Металл", en: "Metal" },
      base: { ru: "Основа", en: "Base" },
      color: { ru: "Цвет", en: "Colour" },
      decor: { ru: "Декор окружности", en: "Outer ring decor" },
      enamel: { ru: "Эмаль окружности", en: "Outer ring enamel" },
      core: { ru: "Камень в центре", en: "Centre stone" },
      medal: { ru: "Медальон", en: "Medallion" },
      panel: { ru: "Панель", en: "Panel" },
      fill: { ru: "Наполнение", en: "Inlay" },
      pframe: { ru: "Рамка", en: "Frame" },
      penamel: { ru: "Цвет эмали", en: "Enamel colour" },
      texture: { ru: "Фактура", en: "Texture" },
      body: { ru: "Цвет корпуса", en: "Body colour" }
    },
    sub: { radial: { ru: "лучевой гильош", en: "radial guilloché" } },
    on: { ru: "Есть", en: "On" },
    off: { ru: "Без медальона", en: "No medallion" },
    noPanel: { ru: "Без панели", en: "No panel" },
    clear: { ru: "Прозрачная", en: "Open-work" },
    solid: { ru: "Цельная", en: "Solid" },
    noStones: { ru: "Без камней", en: "No stones" },
    blackRule: { ru: "Камни недоступны для круга из чёрного титана: их невозможно закрепить в этом металле. Декор заменён на «Без камней».",
                 en: "Stones are not available for a black titanium circle: they cannot be set in this metal. Decor switched to “No stones”." },
    blackHint: { ru: "Недоступно для круга из чёрного титана", en: "Not available for a black titanium circle" },
    tools: {
      undo: { ru: "Отменить", en: "Undo" }, reset: { ru: "Сбросить", en: "Reset" },
      random: { ru: "Случайный дизайн", en: "Random design" }, share: { ru: "Поделиться", en: "Share" },
      download: { ru: "Скачать изображение", en: "Download image" }, zoom: { ru: "Увеличить", en: "Zoom" },
      oneMetal: { ru: "Всё в металле рамы", en: "Match all to frame metal" }
    },
    noDownload: { ru: "Скачивание изображения работает на сайте; при открытии файла с диска браузер его блокирует.",
                  en: "Image download works on the website; browsers block it for files opened from disk." },
    copied: { ru: "Ссылка на вашу сборку скопирована", en: "Link to your design copied" },
    oneMetalDone: { ru: "Металл рамы применён к кругу, медальону и рамке панели", en: "Frame metal applied to circle, medallion and panel frame" },
    next: { ru: "Далее", en: "Next" },
    price: { ru: "Цена по запросу", en: "Price on request" },
    code: { ru: "Код сборки", en: "Design code" },
    order: { ru: "Оформить заявку", en: "Request this design" },
    disclaimer: { ru: "Изображение носит иллюстративный характер. Финальный вид изделия согласуется с менеджером.",
                  en: "The image is for illustration only. The final appearance is agreed with your manager." },
    enamelDefault: { ru: "Как в эскизе", en: "As designed" },
    hue: { ru: "Оттенок", en: "Hue" }, sat: { ru: "Насыщенность", en: "Saturation" }, light: { ru: "Яркость", en: "Lightness" },
    form: {
      title: { ru: "Заявка на Zodiac Duo", en: "Zodiac Duo request" },
      lead: { ru: "Менеджер Caviar свяжется с вами, уточнит детали и назовёт стоимость вашей сборки.",
              en: "A Caviar manager will contact you to discuss the details and the price of your design." },
      name: { ru: "Имя", en: "Name" }, phone: { ru: "Телефон", en: "Phone" }, email: { ru: "Email", en: "Email" },
      messenger: { ru: "Мессенджер", en: "Messenger" }, comment: { ru: "Комментарий", en: "Comment" },
      none: { ru: "Не важно", en: "Any" },
      consent: { ru: "Я согласен на обработку персональных данных и принимаю ", en: "I agree to the processing of personal data and accept the " },
      policy: { ru: "политику конфиденциальности", en: "privacy policy" },
      submit: { ru: "Отправить заявку", en: "Send request" },
      sending: { ru: "Отправляем…", en: "Sending…" },
      required: { ru: "Укажите имя и телефон или email и подтвердите согласие", en: "Please enter your name, phone or email and confirm consent" },
      error: { ru: "Не удалось отправить. Попробуйте ещё раз или свяжитесь с нами напрямую.", en: "Could not send. Please try again or contact us directly." },
      close: { ru: "Закрыть", en: "Close" }
    },
    thanks: {
      title: { ru: "Заявка принята", en: "Request received" },
      text: { ru: "Ваш Zodiac Duo уже обрёл форму. Менеджер Caviar свяжется с вами, чтобы обсудить детали и сроки изготовления.",
              en: "Your Zodiac Duo has taken shape. A Caviar manager will contact you to discuss the details and production time." },
      back: { ru: "Вернуться к конфигуратору", en: "Back to configurator" }
    }
  };

  /* ------------------------------------------------------------------ data */
  var SIGNS = [
    ["aries", "Овен", "Aries", "♈", "21.03–19.04"], ["taurus", "Телец", "Taurus", "♉", "20.04–20.05"],
    ["gemini", "Близнецы", "Gemini", "♊", "21.05–20.06"], ["cancer", "Рак", "Cancer", "♋", "21.06–22.07"],
    ["leo", "Лев", "Leo", "♌", "23.07–22.08"], ["virgo", "Дева", "Virgo", "♍", "23.08–22.09"],
    ["libra", "Весы", "Libra", "♎", "23.09–22.10"], ["scorpio", "Скорпион", "Scorpio", "♏", "23.10–21.11"],
    ["sagittarius", "Стрелец", "Sagittarius", "♐", "22.11–21.12"], ["capricorn", "Козерог", "Capricorn", "♑", "22.12–19.01"],
    ["aquarius", "Водолей", "Aquarius", "♒", "20.01–18.02"], ["pisces", "Рыбы", "Pisces", "♓", "19.02–20.03"]
  ].map(function (s) { return { id: s[0], name: { ru: s[1], en: s[2] }, sym: s[3], dates: s[4] }; });

  var METALS = [
    { id: "silver", name: { ru: "Серебро", en: "Silver" }, full: { ru: "Серебро", en: "Silver" } },
    { id: "gold", name: { ru: "Жёлтое золото", en: "Yellow gold" }, full: { ru: "Жёлтое золото", en: "Yellow gold" } },
    { id: "rose", name: { ru: "Розовое золото", en: "Rose gold" }, full: { ru: "Розовое золото", en: "Rose gold" } },
    { id: "black", name: { ru: "Чёрный титан", en: "Black titanium" }, full: { ru: "Титан с чёрным PVD-покрытием", en: "Titanium with black PVD coating" } }
  ];
  var METAL_INFO = {
    silver: { ru: "Холодный блеск благородного металла. Гильош нанесён вручную и играет светом под любым углом.",
              en: "The cool lustre of a noble metal. Hand-cut guilloché plays with light at every angle." },
    gold: { ru: "Тёплое сияние жёлтого золота — классика ювелирного дома Caviar.", en: "The warm glow of yellow gold — a Caviar classic." },
    rose: { ru: "Розовое золото: мягкий, глубокий оттенок, который раскрывается при дневном свете.",
            en: "Rose gold: a soft, deep shade that comes alive in daylight." },
    black: { ru: "Титан с чёрным PVD-покрытием: прочный, лёгкий, глубокого графитового цвета.",
             en: "Titanium with black PVD coating: strong, light, in a deep graphite tone." }
  };

  var LEATHERS = [
    { id: "croc", name: { ru: "Кожа крокодила", en: "Crocodile leather" },
      info: { ru: "Рисунок чешуи неповторим: двух одинаковых панелей не существует.", en: "The scale pattern is unrepeatable: no two panels are alike." },
      colors: [["burgundy", "Burgundy"], ["white", "White"], ["black", "Black"]] },
    { id: "python", name: { ru: "Кожа питона", en: "Python leather" },
      info: { ru: "Выразительная чешуя питона с живым переливом цвета.", en: "Expressive python scales with a living shimmer of colour." },
      colors: [["violet", "Violet"], ["paleblue", "Pale Blue"]] },
    { id: "calf", name: { ru: "Кожа телёнка", en: "Calf leather" },
      info: { ru: "Мягкая зернистая кожа телёнка — тактильная и благородная.", en: "Soft grained calf leather — tactile and refined." },
      colors: [["cherry", "Cherry"], ["navy", "Navy"], ["rosepink", "Rose Pink"], ["beigecream", "Beige Cream"], ["snowwhite", "Snow White"], ["black", "Black"]] }
  ];

  var STONES = [
    { id: "white", name: { ru: "Белые бриллианты", en: "White diamonds" } },
    { id: "black", name: { ru: "Чёрные бриллианты", en: "Black diamonds" } },
    { id: "ruby", name: { ru: "Рубины", en: "Rubies" } }
  ];
  var CORES = [
    { id: "red", name: { ru: "Красный", en: "Red" } },
    { id: "white", name: { ru: "Белый", en: "White" } },
    { id: "blacksky", name: { ru: "Чёрное небо", en: "Black sky" } },
    { id: "bluesky", name: { ru: "Синее небо", en: "Blue sky" } }
  ];
  var TEXTURES = [
    { id: 1, name: { ru: "Клу-де-Пари", en: "Clous de Paris" } },
    { id: 2, name: { ru: "Шеврон", en: "Chevron" } }
  ];
  var BASES = [
    { id: "starwhite", name: { ru: "Star White", en: "Star White" }, color: "#E7E5E1" },
    { id: "nightsky", name: { ru: "Night Sky", en: "Night Sky" }, color: "#1D2433" }
  ];
  var ENAMEL_PRESETS = [
    { id: "burgundy", name: { ru: "Бургундия", en: "Burgundy" }, hex: "#641616" },
    { id: "ruby", name: { ru: "Рубин", en: "Ruby" }, hex: "#A3121F" },
    { id: "sapphire", name: { ru: "Сапфир", en: "Sapphire" }, hex: "#123E8C" },
    { id: "emerald", name: { ru: "Изумруд", en: "Emerald" }, hex: "#0D5E3C" },
    { id: "amethyst", name: { ru: "Аметист", en: "Amethyst" }, hex: "#5B2A86" },
    { id: "turquoise", name: { ru: "Бирюза", en: "Turquoise" }, hex: "#14808C" },
    { id: "onyx", name: { ru: "Оникс", en: "Onyx" }, hex: "#141414" },
    { id: "ivory", name: { ru: "Слоновая кость", en: "Ivory" }, hex: "#EAE2CF" }
  ];

  var DEFAULT = {
    sign: "aries", frame: "silver", medal: "silver", medalOn: 1,
    plate: "metal", plateColor: "black",
    ring: "silver", decor: "black", enamel: null, core: "blacksky",
    panel: "clear", panelFrame: "silver", panelFill: "meteorite", panelEnamel: null, panelTex: 1, panelMetal: "silver",
    base: "starwhite"
  };

  var PRESETS = [
    { id: "midnight", name: { ru: "Полночь", en: "Midnight" },
      s: { frame: "black", medal: "black", medalOn: 1, plate: "calf", plateColor: "black", ring: "black", decor: "metal", enamel: null, core: "blacksky", panel: "solid", panelTex: 1, panelMetal: "black", base: "nightsky" } },
    { id: "imperial", name: { ru: "Имперское золото", en: "Imperial gold" },
      s: { frame: "gold", medal: "gold", medalOn: 1, plate: "croc", plateColor: "burgundy", ring: "gold", decor: "white", enamel: null, core: "red", panel: "clear", panelFrame: "gold", panelFill: "enamel", panelEnamel: null, base: "starwhite" } },
    { id: "moon", name: { ru: "Лунное серебро", en: "Moon silver" },
      s: { frame: "silver", medal: "silver", medalOn: 1, plate: "python", plateColor: "paleblue", ring: "silver", decor: "white", enamel: "#123E8C", core: "bluesky", panel: "clear", panelFrame: "silver", panelFill: "meteorite", base: "nightsky" } },
    { id: "dawn", name: { ru: "Розовый рассвет", en: "Rose dawn" },
      s: { frame: "rose", medal: "rose", medalOn: 1, plate: "calf", plateColor: "rosepink", ring: "rose", decor: "ruby", enamel: "#A3121F", core: "white", panel: "solid", panelTex: 2, panelMetal: "rose", base: "starwhite" } }
  ];

  var STEP_IDS = ["sign", "frame", "plate", "ring", "medal", "panel", "base", "summary"];

  /* ------------------------------------------------------------------ utils */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === "class") n.className = v;
      else if (k === "text") n.textContent = v;
      else if (k === "html") n.innerHTML = v;
      else if (k.slice(0, 2) === "on") n.addEventListener(k.slice(2), v);
      else if (k === "style") n.setAttribute("style", v);
      else n.setAttribute(k, v === true ? "" : v);
    }
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === "string" ? document.createTextNode(c) : c); });
    return n;
  }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return list[0]; }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function sw(name) { return ASSETS + "/swatches/" + name + ".webp"; }

  function hexToHsl(hex) {
    var r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2, d = max - min;
    if (d) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return [Math.round(h), Math.round(s * 100), Math.round(l * 100)];
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360 / 360;
    if (!s) return [l * 255, l * 255, l * 255];
    var q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
    function f(t) { if (t < 0) t += 1; if (t > 1) t -= 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 0.5 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; }
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function hslToHex(h, s, l) {
    var c = hslToRgb(h, s / 100, l / 100);
    return "#" + c.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join("").toUpperCase();
  }
  function nearestPreset(hex) {
    var a = hslToRgb.apply(null, (function (x) { return [x[0], x[1] / 100, x[2] / 100]; })(hexToHsl(hex))), best = null, bd = 1e9;
    ENAMEL_PRESETS.forEach(function (p) {
      var x = hexToHsl(p.hex), b = hslToRgb(x[0], x[1] / 100, x[2] / 100);
      var d = Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }
  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return h.toString(36).toUpperCase(); }

  function track(name, params) {
    try {
      if (window.ym && CFG.ymId) window.ym(CFG.ymId, "reachGoal", name, params || {});
      if (window.gtag) window.gtag("event", name, params || {});
    } catch (e) { /* аналитика не должна ломать виджет */ }
  }

  var ICONS = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    random: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.2" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.2" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.2" fill="currentColor"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    chev: '<path d="m6 9 6 6 6-6"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><circle cx="12" cy="7.8" r="0.6" fill="currentColor"/>'
  };
  function icon(name) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
  }

  /* ------------------------------------------------------------------ enamel recolour */
  // Перекраска эмали: сохраняем светотень исходного слоя, меняем цвет на выбранный (H, S, L).
  function Recolor(img) {
    var c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    var ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0);
    this.canvas = c; this.ctx = ctx;
    this.src = ctx.getImageData(0, 0, c.width, c.height);
    this.out = ctx.createImageData(c.width, c.height);
    var d = this.src.data, n = d.length / 4, lum = new Uint8Array(n), sum = 0, cnt = 0;
    for (var i = 0; i < n; i++) {
      var r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2], a = d[i * 4 + 3];
      var L = (Math.max(r, g, b) + Math.min(r, g, b)) >> 1;
      lum[i] = L;
      if (a > 128) { sum += L; cnt++; }
    }
    this.lum = lum; this.L0 = cnt ? sum / cnt / 255 : 0.3;
  }
  Recolor.prototype.apply = function (hex) {
    var hsl = hexToHsl(hex), lut = new Uint8ClampedArray(256 * 3);
    for (var v = 0; v < 256; v++) {
      var L = Math.min(1, Math.max(0, hsl[2] / 100 + (v / 255 - this.L0) * 1.15));
      var rgb = hslToRgb(hsl[0], hsl[1] / 100, L);
      lut[v * 3] = rgb[0]; lut[v * 3 + 1] = rgb[1]; lut[v * 3 + 2] = rgb[2];
    }
    var s = this.src.data, o = this.out.data, lum = this.lum;
    for (var i = 0, n = lum.length; i < n; i++) {
      var k = lum[i] * 3, j = i * 4;
      o[j] = lut[k]; o[j + 1] = lut[k + 1]; o[j + 2] = lut[k + 2]; o[j + 3] = s[j + 3];
    }
    this.ctx.putImageData(this.out, 0, 0);
  };

  /* ------------------------------------------------------------------ widget */
  function Widget(root) {
    this.root = root;
    this.state = this.loadState();
    this.history = [];
    this.step = "sign";
    this.subgroup = {};
    this.slots = {};
    this.recolors = {};
    this.imgCache = {};
    this.half = true;
    this.build();
    this.render();
    track("zd_open", { sign: this.state.sign });
  }

  Widget.prototype.loadState = function () {
    var s = clone(DEFAULT), fromHash = parseHash();
    if (fromHash) return Object.assign(s, fromHash);
    try { var saved = JSON.parse(localStorage.getItem(CFG.storageKey)); if (saved) Object.assign(s, saved); } catch (e) { }
    return s;
  };
  Widget.prototype.saveState = function () {
    try { localStorage.setItem(CFG.storageKey, JSON.stringify(this.state)); } catch (e) { }
  };

  // Порядок слоёв снизу вверх — как в PSD.
  Widget.prototype.layers = function () {
    var s = this.state, L = [];
    L.push(["plate", s.plate === "metal" ? "plate_metal_" + s.plateColor : "plate_" + s.plate + "_" + s.plateColor]);
    L.push(["core", "core_" + s.core]);
    L.push(["const", "const_" + s.sign]);
    L.push(["ringEnamel", "ring_enamel", s.enamel]);
    L.push(["ring", "ring_" + s.ring]);
    L.push(["spots", s.decor === "metal" ? "spots_metal_" + s.ring : "spots_stone_" + s.decor]);
    if (s.panel === "clear") {
      L.push(["panelFill", "panel_fill_" + s.panelFill, s.panelFill === "enamel" ? s.panelEnamel : null]);
      L.push(["panelFrame", "panel_frame_" + s.panelFrame]);
    } else { L.push(["panelFill", null]); L.push(["panelFrame", null]); }
    L.push(["panelMono", s.panel === "solid" ? "panel_mono" + s.panelTex + "_" + s.panelMetal : null]);
    L.push(["frame", "frame_" + s.frame]);
    L.push(["medal", s.medalOn ? "medal_" + s.sign + "_" + s.medal : null]);
    L.push(["base", "base_" + s.base]);
    return L;
  };

  Widget.prototype.url = function (key) {
    var k = key + (this.half ? "@half" : "");
    return (M.inline && M.inline[k]) || ASSETS + "/layers/" + k + ".webp";
  };

  Widget.prototype.loadImg = function (key) {
    var u = this.url(key);
    if (!this.imgCache[u]) {
      this.imgCache[u] = new Promise(function (res, rej) {
        var i = new Image();
        i.decoding = "async";
        i.onload = function () { res(i); };
        i.onerror = rej;
        i.src = u;
      });
    }
    return this.imgCache[u];
  };

  /* ---------------- DOM skeleton */
  Widget.prototype.build = function () {
    var self = this, r = this.root;
    r.classList.add("zd");
    r.innerHTML = "";
    this.stage = el("div", { class: "zd-stage" });
    this.phone = el("div", { class: "zd-phone", role: "img", "aria-label": "Zodiac Duo" });
    this.zoomBox = el("div", { class: "zd-zoom" }, [this.phone]);
    this.stage.appendChild(el("div", { class: "zd-stage__head" }, [
      el("div", { class: "zd-brand" }, [el("span", { class: "zd-brand__t", text: t(UI.title) }), el("span", { class: "zd-brand__l", text: t(UI.lead) })])
    ]));
    this.stage.appendChild(this.zoomBox);
    var tools = el("div", { class: "zd-tools" });
    ["undo", "reset", "random", "share", "download"].forEach(function (k) {
      var b = el("button", { class: "zd-tool", type: "button", title: t(UI.tools[k]), "aria-label": t(UI.tools[k]), html: icon(k), onclick: function () { self["tool_" + k](); } });
      if (k === "undo") self.undoBtn = b;
      tools.appendChild(b);
    });
    this.stage.appendChild(tools);
    this.toastEl = el("div", { class: "zd-toast", role: "status", "aria-live": "polite" });
    this.stage.appendChild(this.toastEl);

    this.panel = el("div", { class: "zd-panel" });
    this.tabs = el("div", { class: "zd-tabs", role: "tablist" });
    this.body = el("div", { class: "zd-body" });
    this.panel.appendChild(this.tabs);
    this.panel.appendChild(this.body);
    r.appendChild(this.stage);
    r.appendChild(this.panel);
    this.modal = el("div", { class: "zd-modal", hidden: true });
    r.appendChild(this.modal);

    this.mq = window.matchMedia("(max-width: 860px)");
    var onMq = function () { self.renderPanel(); self.pickResolution(); };
    if (this.mq.addEventListener) this.mq.addEventListener("change", onMq); else this.mq.addListener(onMq);
    window.addEventListener("resize", function () { self.pickResolution(); });
    window.addEventListener("hashchange", function () {
      var h = parseHash(); if (h) { self.commit(Object.assign(clone(DEFAULT), h), true); }
    });
    this.setupZoom();
    this.fit();
    if (window.ResizeObserver) new ResizeObserver(function () { self.fit(); }).observe(this.zoomBox);
    else window.addEventListener("resize", function () { self.fit(); });
    this.pickResolution(true);
  };

  // Телефон вписывается в сцену с сохранением пропорций
  Widget.prototype.fit = function () {
    var r = this.zoomBox.getBoundingClientRect(), k = this.isMobile() ? 0.94 : 0.9;
    var sc = Math.min(r.width * k / CROP.w, r.height * k / CROP.h);
    if (!(sc > 0)) return;
    this.phone.style.width = Math.round(CROP.w * sc) + "px";
    this.phone.style.height = Math.round(CROP.h * sc) + "px";
  };

  Widget.prototype.pickResolution = function (initial) {
    var w = this.phone.getBoundingClientRect().width || 600;
    var needFull = w * (CANVAS_W / CROP.w) * (window.devicePixelRatio || 1) > 1000;
    if (initial) { this.half = !needFull; return; }
    if (needFull && this.half) { this.half = false; this.slots = {}; this.recolors = {}; this.phone.innerHTML = ""; this.renderPhone(); }
  };

  /* ---------------- phone layers */
  Widget.prototype.renderPhone = function () {
    var self = this;
    this.layers().forEach(function (spec, idx) {
      var slot = spec[0], key = spec[1], color = spec[2] || null;
      var cur = self.slots[slot] || (self.slots[slot] = { key: undefined, color: undefined, node: null, z: idx });
      if (cur.key === key && cur.color === color) return;
      if (cur.key === key && key && cur.node && cur.node.tagName === "CANVAS" && color) {
        self.recolors[key].apply(color); cur.color = color; return;
      }
      cur.key = key; cur.color = color;
      var token = (cur.token = (cur.token || 0) + 1);
      if (!key) { self.swapNode(cur, null); return; }
      self.loadImg(key).then(function (img) {
        if (cur.token !== token) return;
        var node;
        if (color) {
          var rc = self.recolors[key] || (self.recolors[key] = new Recolor(img));
          rc.apply(color);
          node = rc.canvas;
        } else {
          node = img.cloneNode();
          node.alt = "";
        }
        self.swapNode(cur, node, key, idx);
      }).catch(function () { /* нет ассета — слой пропускаем */ });
    });
  };

  Widget.prototype.swapNode = function (slot, node, key, z) {
    var old = slot.node;
    if (node) {
      var L = M.layers[key];
      node.className = "zd-layer";
      node.style.left = ((L.x - CROP.x) / CROP.w * 100) + "%";
      node.style.top = ((L.y - CROP.y) / CROP.h * 100) + "%";
      node.style.width = (L.w / CROP.w * 100) + "%";
      node.style.height = (L.h / CROP.h * 100) + "%";
      node.style.zIndex = z + 1;
      if (old && old === node) return;
      if (!REDUCED && old) {
        node.style.opacity = "0";
        this.phone.appendChild(node);
        requestAnimationFrame(function () { requestAnimationFrame(function () { node.style.opacity = "1"; }); });
      } else this.phone.appendChild(node);
    }
    slot.node = node;
    if (old && old !== node) {
      if (REDUCED || !node) {
        if (!REDUCED && !node) { old.style.opacity = "0"; setTimeout(function () { if (old.parentNode && old.style.opacity === "0") old.remove(); }, 320); }
        else old.remove();
      } else setTimeout(function () { if (old.parentNode && old !== slot.node) old.remove(); }, 320);
    }
  };

  /* ---------------- state changes */
  Widget.prototype.set = function (patch, opt) {
    var next = Object.assign(clone(this.state), patch);
    this.commit(next, false, opt);
  };
  Widget.prototype.commit = function (next, fromHash, opt) {
    opt = opt || {};
    // Правило: камни нельзя закрепить в чёрном титане
    if (next.ring === "black" && next.decor !== "metal") {
      next.decor = "metal";
      if (!opt.silent) this.toast(t(UI.blackRule));
    }
    if (JSON.stringify(next) === JSON.stringify(this.state)) return;
    if (!opt.noHistory) { this.history.push(this.state); if (this.history.length > 50) this.history.shift(); }
    var prevSign = this.state.sign;
    this.state = next;
    this.saveState();
    if (!fromHash && location.hash.indexOf("zd=") > -1) history.replaceState(null, "", location.pathname + location.search);
    if (next.sign !== prevSign) track("zd_sign_select", { sign: next.sign });
    else if (!opt.live) track("zd_option_change", { step: this.step });
    this.render(opt.live);
  };

  Widget.prototype.render = function (live) {
    this.renderPhone();
    if (!live) this.renderPanel();
    this.undoBtn.disabled = !this.history.length;
  };

  /* ---------------- steps & options */
  Widget.prototype.groups = function (step) {
    var s = this.state, self = this, G = [];
    function metalOpts(field, swPrefix, extra) {
      return METALS.map(function (m) {
        return Object.assign({ id: m.id, label: t(m.name), sw: sw(swPrefix + m.id), sel: s[field] === m.id, info: METAL_INFO[m.id],
          pick: function () { var p = {}; p[field] = m.id; self.set(p); } }, extra ? extra(m) : {});
      });
    }
    switch (step) {
      case "sign":
        G.push({ id: "sign", title: t(UI.g.sign), kind: "sign", opts: SIGNS.map(function (z) {
          return { id: z.id, label: t(z.name), sub: z.dates, sym: z.sym, sw: sw("const_" + z.id), sel: s.sign === z.id, pick: function () { self.set({ sign: z.id }); } };
        }) });
        G.push({ id: "presets", title: t(UI.g.presets), opts: PRESETS.map(function (p) {
          return { id: p.id, label: t(p.name), sw: sw("frame_" + p.s.frame), sel: false,
            pick: function () { self.set(Object.assign({}, p.s, { sign: s.sign })); track("zd_preset", { preset: p.id }); } };
        }) });
        break;
      case "frame":
        G.push({ id: "metal", title: t(UI.g.metal), opts: metalOpts("frame", "frame_") });
        G.push({ id: "one", kind: "action", label: t(UI.tools.oneMetal), act: function () { self.tool_oneMetal(); } });
        break;
      case "plate":
        var bases = [{ id: "metal", label: t(UI.g.metal), sw: sw("plate_metal_" + (s.plate === "metal" ? s.plateColor : "silver")), info0: { ru: "Металлическое плато с лучевым гильошем: линии расходятся от центра круга.", en: "Metal plate with radial guilloché: lines radiate from the centre of the circle." } }]
          .concat(LEATHERS.map(function (l) { return { id: l.id, label: t(l.name), sw: sw("plate_" + l.id + "_" + (s.plate === l.id ? s.plateColor : l.colors[0][0])) }; }));
        G.push({ id: "base", kind: "segment", title: t(UI.g.base), opts: bases.map(function (b) {
          return Object.assign(b, { sel: s.plate === b.id, pick: function () {
            if (s.plate === b.id) return;
            self.set({ plate: b.id, plateColor: b.id === "metal" ? "black" : find(LEATHERS, b.id).colors[0][0] });
          } });
        }) });
        if (s.plate === "metal") G.push({ id: "color", child: true, title: t(UI.g.metal) + " · " + t(UI.sub.radial), desc: t(bases[0].info0), opts: metalOpts("plateColor", "plate_metal_") });
        else {
          var lt = find(LEATHERS, s.plate);
          G.push({ id: "color", child: true, title: t(UI.g.color) + " · " + t(lt.name), desc: t(lt.info), opts: lt.colors.map(function (c) {
            return { id: c[0], label: c[1], sw: sw("plate_" + lt.id + "_" + c[0]), sel: s.plateColor === c[0], pick: function () { self.set({ plateColor: c[0] }); } };
          }) });
        }
        break;
      case "ring":
        G.push({ id: "metal", title: t(UI.g.metal), opts: metalOpts("ring", "ring_") });
        var black = s.ring === "black";
        G.push({ id: "decor", title: t(UI.g.decor), opts: [{ id: "metal", label: t(UI.noStones), sw: sw("spots_metal_" + s.ring), sel: s.decor === "metal", pick: function () { self.set({ decor: "metal" }); } }]
          .concat(STONES.map(function (st) {
            return { id: st.id, label: t(st.name), sw: sw("spots_stone_" + st.id), sel: s.decor === st.id, disabled: black, hint: black ? t(UI.blackHint) : null,
              pick: function () { if (black) { self.toast(t(UI.blackHint)); return; } self.set({ decor: st.id }); } };
          })) });
        G.push({ id: "enamel", title: t(UI.g.enamel), kind: "color", field: "enamel", base: M.enamel_base.ring_enamel });
        G.push({ id: "core", title: t(UI.g.core), opts: CORES.map(function (c) {
          return { id: c.id, label: t(c.name), sw: sw("core_" + c.id), sel: s.core === c.id, pick: function () { self.set({ core: c.id }); } };
        }) });
        break;
      case "medal":
        G.push({ id: "medal", kind: "segment", title: t(UI.g.medal), opts: [
          { id: "on", label: t(UI.on), sw: sw("medal_" + s.sign + "_" + s.medal), sel: !!s.medalOn, pick: function () { self.set({ medalOn: 1 }); } },
          { id: "off", label: t(UI.off), sw: sw("frame_" + s.frame), sel: !s.medalOn, pick: function () { self.set({ medalOn: 0 }); } }
        ] });
        if (s.medalOn) G.push({ id: "metal", child: true, title: t(UI.g.metal) + " · " + t(UI.g.medal).toLowerCase(), desc: { ru: "Медальон с барельефом знака.", en: "Medallion with a bas-relief of your sign." }[LANG], opts: METALS.map(function (m) {
          return { id: m.id, label: t(m.name), sw: sw("medal_" + s.sign + "_" + m.id), sel: s.medal === m.id, info: METAL_INFO[m.id], pick: function () { self.set({ medal: m.id }); } };
        }) });
        break;
      case "panel":
        G.push({ id: "panel", kind: "segment", title: t(UI.g.panel), opts: [
          { id: "clear", label: t(UI.clear), sw: sw("panel_fill_meteorite"), sel: s.panel === "clear", pick: function () { self.set({ panel: "clear" }); } },
          { id: "solid", label: t(UI.solid), sw: sw("panel_mono1_" + s.panelMetal), sel: s.panel === "solid", pick: function () { self.set({ panel: "solid" }); } },
          { id: "none", label: t(UI.noPanel), sw: sw("plate_metal_" + (s.plate === "metal" ? s.plateColor : "black")), sel: s.panel === "none", pick: function () { self.set({ panel: "none" }); } }
        ] });
        if (s.panel === "clear") {
          G.push({ id: "fill", child: true, title: t(UI.g.fill), opts: [
            { id: "meteorite", label: { ru: "Метеорит", en: "Meteorite" }[LANG], sw: sw("panel_fill_meteorite"), sel: s.panelFill === "meteorite",
              info: { ru: "Пластины метеорита: рисунок кристаллов формировался миллионы лет, и каждый срез уникален.", en: "Meteorite plates: the crystal pattern formed over millions of years, and every slice is unique." },
              pick: function () { self.set({ panelFill: "meteorite" }); } },
            { id: "enamel", label: { ru: "Ювелирная эмаль", en: "Jewellery enamel" }[LANG], sw: sw("panel_fill_enamel"), sel: s.panelFill === "enamel",
              info: { ru: "Ювелирная эмаль: глубокий цвет, который вы выбираете сами.", en: "Jewellery enamel in a deep colour of your choice." },
              pick: function () { self.set({ panelFill: "enamel" }); } }
          ] });
          if (s.panelFill === "enamel") G.push({ id: "penamel", child: true, title: t(UI.g.penamel), kind: "color", field: "panelEnamel", base: M.enamel_base.panel_fill_enamel });
          G.push({ id: "pframe", child: true, title: t(UI.g.pframe), opts: metalOpts("panelFrame", "panel_frame_") });
        } else if (s.panel === "solid") {
          G.push({ id: "texture", child: true, title: t(UI.g.texture), opts: TEXTURES.map(function (x) {
            return { id: String(x.id), label: t(x.name), sw: sw("panel_mono" + x.id + "_" + s.panelMetal), sel: s.panelTex === x.id, pick: function () { self.set({ panelTex: x.id }); } };
          }) });
          G.push({ id: "metal", child: true, title: t(UI.g.metal), opts: METALS.map(function (m) {
            return { id: m.id, label: t(m.name), sw: sw("panel_mono" + s.panelTex + "_" + m.id), sel: s.panelMetal === m.id, info: METAL_INFO[m.id], pick: function () { self.set({ panelMetal: m.id }); } };
          }) });
        }
        break;
      case "base":
        G.push({ id: "body", title: t(UI.g.body), opts: BASES.map(function (b) {
          return { id: b.id, label: t(b.name), color: b.color, sel: s.base === b.id, pick: function () { self.set({ base: b.id }); } };
        }) });
        break;
      case "summary":
        G.push({ id: "summary", kind: "summary" });
        break;
    }
    return G;
  };

  Widget.prototype.stepValue = function (step) {
    var s = this.state;
    switch (step) {
      case "sign": return t(find(SIGNS, s.sign).name);
      case "frame": return t(find(METALS, s.frame).name);
      case "plate": return s.plate === "metal" ? t(find(METALS, s.plateColor).name) : t(find(LEATHERS, s.plate).name) + " · " + colorName(s.plate, s.plateColor);
      case "ring": return t(find(METALS, s.ring).name) + " · " + (s.decor === "metal" ? t(UI.noStones) : t(find(STONES, s.decor).name));
      case "medal": return s.medalOn ? t(find(METALS, s.medal).name) : t(UI.off);
      case "panel": return s.panel === "none" ? t(UI.noPanel) : s.panel === "clear" ? t(UI.clear) + " · " + (s.panelFill === "meteorite" ? { ru: "метеорит", en: "meteorite" }[LANG] : { ru: "эмаль", en: "enamel" }[LANG]) : t(UI.solid) + " · " + t(find(TEXTURES, s.panelTex).name);
      case "base": return t(find(BASES, s.base).name);
      case "summary": return t(UI.price);
    }
  };
  function colorName(type, id) { var l = find(LEATHERS, type); for (var i = 0; i < l.colors.length; i++) if (l.colors[i][0] === id) return l.colors[i][1]; return id; }

  /* ---------------- panel rendering */
  Widget.prototype.isMobile = function () { return this.mq.matches; };

  Widget.prototype.renderPanel = function () {
    var self = this, mobile = this.isMobile();
    this.root.classList.toggle("zd--mobile", mobile);
    var scrollTop = this.body.scrollTop;
    this.tabs.innerHTML = ""; this.body.innerHTML = "";
    STEP_IDS.forEach(function (id, i) {
      var active = self.step === id;
      if (mobile) {
        self.tabs.appendChild(el("button", { class: "zd-tab" + (active ? " is-active" : ""), type: "button", role: "tab", "aria-selected": active ? "true" : "false",
          onclick: function () { self.go(id); } }, [el("span", { class: "zd-tab__n", text: String(i + 1) }), el("span", { text: t(UI.steps[id]) })]));
      } else {
        var head = el("button", { class: "zd-acc__head", type: "button", "aria-expanded": active ? "true" : "false", onclick: function () { self.go(active ? null : id); } }, [
          el("span", { class: "zd-acc__n", text: String(i + 1) }),
          el("span", { class: "zd-acc__t" }, [el("span", { class: "zd-acc__name", text: t(UI.steps[id]) }), el("span", { class: "zd-acc__val", text: self.stepValue(id) })]),
          el("span", { class: "zd-acc__chev", html: icon("chev") })
        ]);
        var item = el("section", { class: "zd-acc" + (active ? " is-open" : "") }, [head]);
        if (active) item.appendChild(self.renderStep(id, false));
        self.body.appendChild(item);
      }
    });
    if (mobile) {
      this.body.appendChild(this.renderStep(this.step || "sign", true));
      var at = this.tabs.querySelector(".is-active");
      if (at) this.tabs.scrollLeft = at.offsetLeft - (this.tabs.clientWidth - at.offsetWidth) / 2;
    } else this.body.scrollTop = scrollTop;
  };

  Widget.prototype.go = function (id) {
    this.step = id;
    this.renderPanel();
    if (id === "summary") track("zd_summary", {});
    if (!this.isMobile() && id) {
      var open = this.body.querySelector(".zd-acc.is-open");
      if (open) this.body.scrollTop = open.offsetTop - 8;
    }
  };

  Widget.prototype.renderStep = function (step, mobile) {
    var self = this, groups = this.groups(step), wrap = el("div", { class: "zd-step" });
    var visible = groups;
    var hasSeg = groups.some(function (g) { return g.kind === "segment"; });
    if (mobile) {
      // Родительский выбор (segment) всегда на виду; чипами переключаются только дочерние/независимые группы
      var choosable = groups.filter(function (g) { return g.kind !== "action" && g.kind !== "segment"; });
      if (choosable.length > 1) {
        var cur = this.subgroup[step];
        if (!choosable.some(function (g) { return g.id === cur; })) cur = choosable[0].id;
        this.subgroup[step] = cur;
        var chips = el("div", { class: "zd-chips" });
        choosable.forEach(function (g) {
          var v = self.groupValue(g);
          chips.appendChild(el("button", { class: "zd-chip" + (g.id === cur ? " is-active" : ""), type: "button",
            onclick: function () { self.subgroup[step] = g.id; self.renderPanel(); } },
            [el("span", { class: "zd-chip__t", text: g.title.split(" · ")[0] }), v ? el("span", { class: "zd-chip__v", text: v }) : null]));
        });
        visible = groups.filter(function (g) { return g.id === cur || g.kind === "action" || g.kind === "segment"; });
        // чипы — после родительского выбора, чтобы связь читалась сверху вниз
        var segs = visible.filter(function (g) { return g.kind === "segment"; });
        visible = visible.filter(function (g) { return g.kind !== "segment"; });
        segs.forEach(function (g) { wrap.appendChild(self.renderSegment(g, mobile)); });
        wrap.appendChild(el("div", { class: "zd-chips-wrap" + (segs.length ? " is-child" : "") }, [chips]));
      }
    }
    visible.forEach(function (g) {
      if (g.kind === "summary") { wrap.appendChild(self.renderSummary(mobile)); return; }
      if (g.kind === "segment") { wrap.appendChild(self.renderSegment(g, mobile)); return; }
      if (g.kind === "action") {
        wrap.appendChild(el("button", { class: "zd-link", type: "button", onclick: g.act, html: icon("link") + "<span>" + g.label + "</span>" }));
        return;
      }
      var child = g.child && hasSeg;
      var box = el("div", { class: "zd-group" + (child ? " zd-group--child" : "") });
      var chipped = mobile && !!wrap.querySelector(".zd-chips");
      if (!mobile || groups.length === 1 || (child && !chipped)) box.appendChild(el("div", { class: "zd-group__t", text: g.title }));
      if (g.desc && !mobile) box.appendChild(el("p", { class: "zd-group__d", text: g.desc }));
      if (g.kind === "color") box.appendChild(self.renderColor(g));
      else {
        var row = el("div", { class: "zd-opts" + (g.kind === "sign" ? " zd-opts--sign" : "") });
        g.opts.forEach(function (o) { row.appendChild(self.renderOpt(o, g.kind)); });
        box.appendChild(row);
      }
      wrap.appendChild(box);
    });
    if (step !== "summary") {
      var idx = STEP_IDS.indexOf(step);
      wrap.appendChild(el("button", { class: "zd-next", type: "button", onclick: function () { self.go(STEP_IDS[idx + 1]); } },
        [el("span", { text: t(UI.next) + " · " + t(UI.steps[STEP_IDS[idx + 1]]) })]));
    }
    return wrap;
  };

  // Родительский выбор: компактный переключатель «тип», визуально отличается от вариантов-свотчей
  Widget.prototype.renderSegment = function (g, mobile) {
    var box = el("div", { class: "zd-group zd-group--seg" });
    if (!mobile) box.appendChild(el("div", { class: "zd-group__t", text: g.title }));
    var row = el("div", { class: "zd-seg", role: "radiogroup", "aria-label": g.title });
    g.opts.forEach(function (o) {
      var dot = el("span", { class: "zd-seg__dot" });
      if (o.sw) dot.style.backgroundImage = "url('" + o.sw + "')";
      row.appendChild(el("button", { class: "zd-seg__b" + (o.sel ? " is-sel" : ""), type: "button", role: "radio", "aria-checked": o.sel ? "true" : "false",
        onclick: function () { o.pick(); } }, [dot, el("span", { text: o.label })]));
    });
    box.appendChild(row);
    return box;
  };

  Widget.prototype.groupValue = function (g) {
    if (g.kind === "color") { var v = this.state[g.field]; return v ? t(nearestPreset(v).name) : t(UI.enamelDefault); }
    if (!g.opts) return "";
    for (var i = 0; i < g.opts.length; i++) if (g.opts[i].sel) return g.opts[i].label;
    return "";
  };

  Widget.prototype.renderOpt = function (o, kind) {
    var self = this;
    var swatch = el("span", { class: "zd-opt__sw" });
    if (o.sw) swatch.style.backgroundImage = "url('" + o.sw + "')";
    if (o.color) swatch.style.background = o.color;
    if (o.sym) swatch.appendChild(el("span", { class: "zd-opt__sym", text: o.sym + "︎" }));
    var kids = [swatch, el("span", { class: "zd-opt__lb", text: o.label })];
    if (o.sub) kids.push(el("span", { class: "zd-opt__sub", text: o.sub }));
    var b = el("button", { class: "zd-opt" + (o.sel ? " is-sel" : "") + (o.disabled ? " is-off" : ""), type: "button", "aria-pressed": o.sel ? "true" : "false",
      title: o.hint || o.label, "aria-disabled": o.disabled ? "true" : null, onclick: function () { o.pick(); } }, kids);
    if (o.info) {
      b.appendChild(el("span", { class: "zd-opt__i", role: "button", tabindex: "0", "aria-label": "i", html: icon("info"),
        onclick: function (e) { e.stopPropagation(); self.toast(t(o.info), 6000); },
        onkeydown: function (e) { if (e.key === "Enter") { e.stopPropagation(); e.preventDefault(); self.toast(t(o.info), 6000); } } }));
    }
    return b;
  };

  Widget.prototype.renderColor = function (g) {
    var self = this, field = g.field, cur = this.state[field], hex = cur || g.base, hsl = hexToHsl(hex);
    var box = el("div", { class: "zd-color" });
    var row = el("div", { class: "zd-opts zd-opts--dots" });
    row.appendChild(this.renderOpt({ id: "default", label: t(UI.enamelDefault), color: g.base, sel: !cur, pick: function () { var p = {}; p[field] = null; self.set(p); } }));
    ENAMEL_PRESETS.forEach(function (p) {
      row.appendChild(self.renderOpt({ id: p.id, label: t(p.name), color: p.hex, sel: cur === p.hex, pick: function () { var x = {}; x[field] = p.hex; self.set(x); } }));
    });
    box.appendChild(row);
    var sliders = el("div", { class: "zd-sliders" });
    var vals = hsl.slice();
    var readout = el("span", { class: "zd-hex", text: hex });
    function grad(i) {
      if (i === 0) return "linear-gradient(90deg," + [0, 60, 120, 180, 240, 300, 360].map(function (h) { return hslToHex(h, Math.max(40, vals[1]), 45); }).join(",") + ")";
      if (i === 1) return "linear-gradient(90deg," + hslToHex(vals[0], 0, vals[2]) + "," + hslToHex(vals[0], 100, vals[2]) + ")";
      return "linear-gradient(90deg,#000," + hslToHex(vals[0], vals[1], 50) + ",#fff)";
    }
    var inputs = [];
    [[UI.hue, 360], [UI.sat, 100], [UI.light, 100]].forEach(function (d, i) {
      var inp = el("input", { type: "range", min: "0", max: String(d[1]), value: String(vals[i]), "aria-label": t(d[0]) });
      inp.style.background = grad(i);
      var commitTimer;
      inp.addEventListener("input", function () {
        vals[i] = +inp.value;
        var hx = hslToHex(vals[0], vals[1], vals[2]);
        readout.textContent = hx;
        inputs.forEach(function (x, j) { x.style.background = grad(j); });
        var p = {}; p[field] = hx;
        // живое обновление без перерисовки панели и без лишних записей в историю
        self.state = Object.assign(clone(self.state), p);
        self.renderPhone();
        clearTimeout(commitTimer);
      });
      inp.addEventListener("change", function () {
        var hx = hslToHex(vals[0], vals[1], vals[2]);
        var before = clone(self.state); before[field] = cur;
        self.history.push(before);
        self.saveState();
        self.undoBtn.disabled = false;
        track("zd_option_change", { step: self.step, enamel: hx });
        cur = hx;
        row.querySelectorAll(".zd-opt").forEach(function (b) { b.classList.remove("is-sel"); b.setAttribute("aria-pressed", "false"); });
      });
      inputs.push(inp);
      sliders.appendChild(el("label", { class: "zd-slider" }, [el("span", { text: t(d[0]) }), inp]));
    });
    sliders.appendChild(readout);
    box.appendChild(sliders);
    return box;
  };

  /* ---------------- summary & lead */
  Widget.prototype.spec = function () {
    var s = this.state, out = [];
    function metal(id) { return t(find(METALS, id).full); }
    function enamel(hex) { return hex ? hex + " (" + t(nearestPreset(hex).name) + ")" : t(UI.enamelDefault) + " (" + t(ENAMEL_PRESETS[0].name) + ")"; }
    var sign = find(SIGNS, s.sign);
    out.push([t(UI.steps.sign), t(sign.name) + " " + sign.sym + "︎"]);
    out.push([t(UI.steps.frame), metal(s.frame)]);
    out.push([t(UI.steps.plate), s.plate === "metal" ? { ru: "Металл, лучевой гильош · ", en: "Metal, radial guilloché · " }[LANG] + metal(s.plateColor) : t(find(LEATHERS, s.plate).name) + " · " + colorName(s.plate, s.plateColor)]);
    out.push([{ ru: "Круг · металл", en: "Circle · metal" }[LANG], metal(s.ring)]);
    out.push([{ ru: "Круг · декор", en: "Circle · decor" }[LANG], s.decor === "metal" ? t(UI.noStones) : t(find(STONES, s.decor).name)]);
    out.push([{ ru: "Круг · эмаль", en: "Circle · enamel" }[LANG], enamel(s.enamel)]);
    out.push([t(UI.g.core), t(find(CORES, s.core).name)]);
    out.push([t(UI.steps.medal), s.medalOn ? { ru: "С барельефом знака · ", en: "Sign bas-relief · " }[LANG] + metal(s.medal) : t(UI.off)]);
    var panel = s.panel === "none" ? t(UI.noPanel)
      : s.panel === "clear" ? t(UI.clear) + " · " + (s.panelFill === "meteorite" ? { ru: "метеорит", en: "meteorite" }[LANG] : { ru: "эмаль ", en: "enamel " }[LANG] + enamel(s.panelEnamel)) + " · " + { ru: "рамка: ", en: "frame: " }[LANG] + metal(s.panelFrame)
      : t(UI.solid) + " · " + t(find(TEXTURES, s.panelTex).name) + " · " + metal(s.panelMetal);
    out.push([t(UI.steps.panel), panel]);
    out.push([t(UI.steps.base), t(find(BASES, s.base).name)]);
    return out;
  };
  Widget.prototype.code = function () {
    return "ZD-" + this.state.sign.slice(0, 3).toUpperCase() + "-" + ("0000" + hash(serialize(this.state))).slice(-4);
  };
  Widget.prototype.shareUrl = function () {
    return location.href.split("#")[0] + "#zd=" + serialize(this.state);
  };

  Widget.prototype.renderSummary = function (mobile) {
    var self = this, box = el("div", { class: "zd-summary" });
    var list = el("dl", { class: "zd-spec" });
    this.spec().forEach(function (r) { list.appendChild(el("div", {}, [el("dt", { text: r[0] }), el("dd", { text: r[1] })])); });
    box.appendChild(el("div", { class: "zd-sum__top" }, [
      el("div", { class: "zd-sum__price", text: t(UI.price) }),
      el("div", { class: "zd-sum__code" }, [el("span", { text: t(UI.code) + " " }), el("b", { text: this.code() })])
    ]));
    box.appendChild(list);
    box.appendChild(el("button", { class: "zd-cta", type: "button", text: t(UI.order), onclick: function () { self.openForm(); } }));
    box.appendChild(el("p", { class: "zd-disc", text: t(UI.disclaimer) }));
    return box;
  };

  Widget.prototype.openForm = function () {
    var self = this, F = UI.form, m = this.modal;
    track("zd_lead_open", { code: this.code() });
    m.innerHTML = "";
    var err = el("p", { class: "zd-form__err", role: "alert" });
    var form = el("form", { class: "zd-form", novalidate: true });
    function field(name, label, type, attrs) {
      return el("label", { class: "zd-field" }, [el("span", { text: t(label) }), el("input", Object.assign({ name: name, type: type || "text" }, attrs || {}))]);
    }
    form.appendChild(field("name", F.name, "text", { autocomplete: "name", required: true }));
    form.appendChild(field("phone", F.phone, "tel", { autocomplete: "tel", inputmode: "tel" }));
    form.appendChild(field("email", F.email, "email", { autocomplete: "email" }));
    var sel = el("select", { name: "messenger" }, [
      el("option", { value: "", text: t(F.none) }), el("option", { value: "Telegram", text: "Telegram" }), el("option", { value: "WhatsApp", text: "WhatsApp" })
    ]);
    form.appendChild(el("label", { class: "zd-field" }, [el("span", { text: t(F.messenger) }), sel]));
    form.appendChild(el("label", { class: "zd-field" }, [el("span", { text: t(F.comment) }), el("textarea", { name: "comment", rows: "3" })]));
    var consent = el("input", { type: "checkbox", name: "consent" });
    form.appendChild(el("label", { class: "zd-consent" }, [consent, el("span", {}, [t(F.consent), el("a", { href: CFG.policyUrl, target: "_blank", rel: "noopener", text: t(F.policy) })])]));
    form.appendChild(err);
    var submit = el("button", { class: "zd-cta", type: "submit", text: t(F.submit) });
    form.appendChild(submit);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = {}; new FormData(form).forEach(function (v, k) { d[k] = String(v).trim(); });
      if (!d.name || !(d.phone || d.email) || !consent.checked) { err.textContent = t(F.required); return; }
      err.textContent = ""; submit.disabled = true; submit.textContent = t(F.sending);
      self.sendLead(d).then(function () {
        track("zd_lead_submit", { code: self.code() });
        self.showThanks();
      }).catch(function () {
        err.textContent = t(F.error); submit.disabled = false; submit.textContent = t(F.submit);
      });
    });
    var dialog = el("div", { class: "zd-dialog", role: "dialog", "aria-modal": "true", "aria-label": t(F.title) }, [
      el("button", { class: "zd-dialog__x", type: "button", "aria-label": t(F.close), html: icon("close"), onclick: function () { self.closeForm(); } }),
      el("h3", { text: t(F.title) }),
      el("p", { class: "zd-dialog__lead", text: t(F.lead) }),
      el("div", { class: "zd-dialog__code" }, [el("span", { text: t(UI.code) + " " }), el("b", { text: this.code() })]),
      form
    ]);
    m.appendChild(dialog);
    m.hidden = false;
    m.onclick = function (e) { if (e.target === m) self.closeForm(); };
    this._esc = function (e) { if (e.key === "Escape") self.closeForm(); };
    document.addEventListener("keydown", this._esc);
    setTimeout(function () { var f = form.querySelector("input"); if (f) f.focus(); }, 30);
  };
  Widget.prototype.closeForm = function () {
    this.modal.hidden = true; this.modal.innerHTML = "";
    document.removeEventListener("keydown", this._esc);
  };
  Widget.prototype.showThanks = function () {
    var self = this, T = UI.thanks;
    this.modal.innerHTML = "";
    this.modal.appendChild(el("div", { class: "zd-dialog zd-dialog--thanks", role: "dialog", "aria-modal": "true" }, [
      el("h3", { text: t(T.title) }),
      el("p", { text: t(T.text) }),
      el("div", { class: "zd-dialog__code" }, [el("span", { text: t(UI.code) + " " }), el("b", { text: this.code() })]),
      el("button", { class: "zd-cta", type: "button", text: t(T.back), onclick: function () { self.closeForm(); } })
    ]));
  };

  Widget.prototype.sendLead = function (d) {
    var self = this;
    var spec = this.spec().map(function (r) { return r[0] + ": " + r[1]; }).join("\n");
    var payload = {
      code: this.code(), link: this.shareUrl(), spec: spec, state: this.state, lang: LANG,
      name: d.name, phone: d.phone, email: d.email, messenger: d.messenger, comment: d.comment, page: location.href
    };
    var jobs = [];
    if (CFG.leadEndpoint) {
      jobs.push(this.renderImage(0.5, "image/jpeg", 0.85).catch(function () { return null; }).then(function (img) {
        payload.image = img;
        return fetch(CFG.leadEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
          .then(function (r) { if (!r.ok) throw new Error(r.status); });
      }));
    }
    if (CFG.bitrixWebhook) {
      var comments = spec + "\n\n" + payload.link + (d.messenger ? "\nМессенджер: " + d.messenger : "") + (d.comment ? "\n\n" + d.comment : "");
      jobs.push(fetch(CFG.bitrixWebhook.replace(/\/$/, "") + "/crm.lead.add.json", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: {
          TITLE: "Zodiac Duo · " + payload.code, NAME: d.name, SOURCE_ID: "WEB", COMMENTS: comments.replace(/\n/g, "<br>"),
          PHONE: d.phone ? [{ VALUE: d.phone, VALUE_TYPE: "WORK" }] : undefined,
          EMAIL: d.email ? [{ VALUE: d.email, VALUE_TYPE: "WORK" }] : undefined
        } })
      }).then(function (r) { if (!r.ok) throw new Error(r.status); }));
    }
    if (!jobs.length) {
      // TODO: подключить leadEndpoint (email) и bitrixWebhook — до этого заявка только выводится в консоль
      console.warn("[Zodiac Duo] Отправка заявок не настроена. Данные заявки:", payload);
      return new Promise(function (res) { setTimeout(res, 600); });
    }
    return Promise.all(jobs);
  };

  /* ---------------- image export */
  Widget.prototype.renderImage = function (scale, type, quality) {
    var self = this;
    var W = Math.round(CANVAS_W * scale), H = Math.round(CANVAS_H * scale);
    var c = document.createElement("canvas"); c.width = W; c.height = H;
    var ctx = c.getContext("2d");
    ctx.fillStyle = "#0D1117"; ctx.fillRect(0, 0, W, H);
    var specs = this.layers();
    return Promise.all(specs.map(function (sp) {
      if (!sp[1]) return null;
      if (sp[2]) return Promise.resolve(self.recolors[sp[1]] && self.recolors[sp[1]].canvas);
      return self.loadImg(sp[1]);
    })).then(function (imgs) {
      imgs.forEach(function (img, i) {
        if (!img) return;
        var L = M.layers[specs[i][1]];
        ctx.drawImage(img, L.x * scale, L.y * scale, L.w * scale, L.h * scale);
      });
      return c.toDataURL(type || "image/jpeg", quality || 0.9);
    });
  };

  /* ---------------- tools */
  Widget.prototype.tool_undo = function () {
    if (!this.history.length) return;
    this.commit(this.history.pop(), false, { noHistory: true, silent: true });
  };
  Widget.prototype.tool_reset = function () { this.set(clone(DEFAULT)); this.go("sign"); };
  Widget.prototype.tool_random = function () {
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    var m = METALS.map(function (x) { return x.id; });
    var plate = pick(["metal", "croc", "python", "calf"]);
    var ring = pick(m);
    var panel = pick(["clear", "clear", "solid", "none"]);
    var s = {
      frame: pick(m), medal: pick(m), medalOn: Math.random() < 0.8 ? 1 : 0,
      plate: plate, plateColor: plate === "metal" ? pick(m) : pick(find(LEATHERS, plate).colors)[0],
      ring: ring, decor: ring === "black" ? "metal" : pick(["metal", "white", "black", "ruby"]),
      enamel: Math.random() < 0.3 ? null : pick(ENAMEL_PRESETS).hex, core: pick(CORES).id,
      panel: panel, panelFrame: pick(m), panelFill: pick(["meteorite", "enamel"]), panelEnamel: pick(ENAMEL_PRESETS).hex,
      panelTex: pick([1, 2]), panelMetal: pick(m), base: pick(BASES).id
    };
    this.set(s, { silent: true });
    track("zd_random", {});
  };
  Widget.prototype.tool_oneMetal = function () {
    var f = this.state.frame;
    this.set({ ring: f, medal: f, panelFrame: f, panelMetal: f });
    this.toast(t(UI.oneMetalDone));
  };
  Widget.prototype.tool_share = function () {
    var self = this, url = this.shareUrl();
    track("zd_share", { code: this.code() });
    if (navigator.share && this.isMobile()) { navigator.share({ title: "Caviar · Zodiac Duo", url: url }).catch(function () { }); return; }
    var done = function () { self.toast(t(UI.copied)); };
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, function () { prompt("", url); });
    else prompt("", url);
  };
  Widget.prototype.tool_download = function () {
    var self = this;
    track("zd_download", { code: this.code() });
    this.renderImage(this.half ? 0.5 : 1, "image/jpeg", 0.92).then(function (data) {
      var a = el("a", { href: data, download: "Caviar-Zodiac-Duo-" + self.code() + ".jpg" });
      document.body.appendChild(a); a.click(); a.remove();
    }).catch(function () {
      // file:// — браузер не отдаёт пиксели локальных картинок; на сайте работает
      self.toast(t(UI.noDownload));
    });
  };

  Widget.prototype.toast = function (msg, ms) {
    var tEl = this.toastEl;
    tEl.textContent = msg;
    tEl.classList.add("is-on");
    clearTimeout(this._toast);
    this._toast = setTimeout(function () { tEl.classList.remove("is-on"); }, ms || 3500);
  };

  /* ---------------- zoom: клик-лупа на десктопе, pinch на мобильном */
  Widget.prototype.setupZoom = function () {
    var self = this, box = this.zoomBox, ph = this.phone, z = 1, ox = 0, oy = 0;
    function apply() { ph.style.transform = z === 1 ? "" : "translate(" + ox + "px," + oy + "px) scale(" + z + ")"; box.classList.toggle("is-zoomed", z > 1); }
    function clamp() {
      var r = box.getBoundingClientRect(), mx = r.width * (z - 1) / 2, my = r.height * (z - 1) / 2;
      ox = Math.max(-mx, Math.min(mx, ox)); oy = Math.max(-my, Math.min(my, oy));
    }
    function focus(cx, cy) {
      var r = box.getBoundingClientRect();
      ox = (r.width / 2 - (cx - r.left)) * (z - 1); oy = (r.height / 2 - (cy - r.top)) * (z - 1); clamp();
    }
    var pointers = {}, pinch = null, lastTap = 0, moved = false;
    box.addEventListener("pointerdown", function (e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = false;
      var ids = Object.keys(pointers);
      if (ids.length === 2) {
        var a = pointers[ids[0]], b = pointers[ids[1]];
        pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: z };
      }
    });
    box.addEventListener("pointermove", function (e) {
      var p = pointers[e.pointerId];
      if (e.pointerType === "mouse" && z > 1 && !p) { focus(e.clientX, e.clientY); apply(); return; }
      if (!p) return;
      var ids = Object.keys(pointers);
      if (pinch && ids.length === 2) {
        p.x = e.clientX; p.y = e.clientY;
        var a = pointers[ids[0]], b = pointers[ids[1]];
        z = Math.max(1, Math.min(3, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
        clamp(); apply(); moved = true; e.preventDefault();
      } else if (z > 1 && e.pointerType !== "mouse") {
        ox += e.clientX - p.x; oy += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; clamp(); apply(); moved = true;
      }
    });
    function up(e) {
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinch = null;
    }
    box.addEventListener("pointerup", function (e) {
      var wasMoved = moved; up(e);
      if (wasMoved) return;
      if (e.pointerType === "mouse") { z = z > 1 ? 1 : 2.2; if (z > 1) focus(e.clientX, e.clientY); else { ox = oy = 0; } apply(); track("zd_zoom", {}); return; }
      var now = Date.now();
      if (now - lastTap < 300) { z = z > 1 ? 1 : 2.2; if (z > 1) focus(e.clientX, e.clientY); else { ox = oy = 0; } apply(); }
      lastTap = now;
    });
    box.addEventListener("pointercancel", up);
    box.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && z > 1) { z = 1; ox = oy = 0; apply(); } });
  };

  /* ------------------------------------------------------------------ hash state */
  var KEYS = ["sign", "frame", "medal", "medalOn", "plate", "plateColor", "ring", "decor", "enamel", "core", "panel", "panelFrame", "panelFill", "panelEnamel", "panelTex", "panelMetal", "base"];
  function serialize(s) {
    return KEYS.map(function (k) { var v = s[k]; return v == null ? "" : String(v).replace("#", ""); }).join(".");
  }
  function parseHash() {
    var m = /[#&]zd=([^&]+)/.exec(location.hash);
    if (!m) return null;
    var parts = decodeURIComponent(m[1]).split("."), s = {};
    if (parts.length !== KEYS.length) return null;
    KEYS.forEach(function (k, i) {
      var v = parts[i];
      if (k === "enamel" || k === "panelEnamel") s[k] = /^[0-9A-Fa-f]{6}$/.test(v) ? "#" + v.toUpperCase() : null;
      else if (k === "medalOn" || k === "panelTex") s[k] = +v || (k === "panelTex" ? 1 : 0);
      else s[k] = v;
    });
    return s;
  }

  /* ------------------------------------------------------------------ boot */
  function boot() {
    if (!M) { console.error("[Zodiac Duo] Не найден assets/manifest.js"); return; }
    document.querySelectorAll("[data-zodiac-duo]").forEach(function (n) { if (!n.__zd) n.__zd = new Widget(n); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
