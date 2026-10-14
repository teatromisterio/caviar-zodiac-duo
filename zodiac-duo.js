/*!
 * Caviar · Zodiac Duo configurator — v2
 * Автономный виджет: <div data-zodiac-duo></div> + zodiac-duo.css + assets/manifest.js + этот файл.
 * Настройки — window.ZodiacDuoConfig (см. README.md).
 *
 * Интерфейс в два слоя: навигатор шагов (всегда виден) + рабочая область одного шага.
 * Десктоп: превью · навигатор · рабочая область. Средняя ширина: навигатор — степпер над рабочей областью.
 * Мобильный: превью на весь экран + нижняя шторка с тремя положениями.
 */
(function () {
  "use strict";

  /* ================================================================== config */
  var CFG = Object.assign({
    assets: null,            // путь к папке assets; по умолчанию — рядом со скриптом
    lang: null,              // "ru" | "en"; по умолчанию — <html lang>
    leadEndpoint: "",        // TODO: URL обработчика заявок (email) на стороне сайта
    bitrixWebhook: "",       // TODO: входящий вебхук Битрикс24 (лучше проксировать через сервер)
    policyUrl: "#",          // TODO: ссылка на политику конфиденциальности
    ymId: null,              // TODO: ID счётчика Яндекс Метрики
    storageKey: "zodiac-duo:v1",
    initial: null            // стартовая сборка для новых посетителей (частичный объект состояния), напр. как на hero лендинга
  }, window.ZodiacDuoConfig || {});

  var SCRIPT_SRC = (document.currentScript && document.currentScript.src) || "";
  var ASSETS = CFG.assets || SCRIPT_SRC.replace(/[^/]*$/, "") + "assets";
  var AV = "?v=m20"; // версия ассетов (медальоны v2) — сброс кэша слоёв и свотчей
  var M = window.ZD_MANIFEST;
  // Медальон в конструкторе чуть меньше слоя PSD (масштаб от центра); общий манифест не трогаем — лендинг видит исходный размер
  var MEDAL_SCALE = 0.9;
  function box(key) {
    var L = M.layers[key];
    if (!L || key.indexOf("medal_") !== 0) return L;
    var w = L.w * MEDAL_SCALE, h = L.h * MEDAL_SCALE;
    return { x: L.x + (L.w - w) / 2, y: L.y + (L.h - h) / 2, w: w, h: h };
  }
  var CANVAS_W = 1792, CANVAS_H = 2400;
  // Видимая область сцены: телефон без пустых полей холста PSD (телефон занимает 346–1445 × 408–1966)
  var CROP = { x: 316, y: 380, w: 1160, h: 1616 };
  var REDUCED = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ================================================================== i18n */
  var LANG = (CFG.lang || document.documentElement.lang || "ru").slice(0, 2).toLowerCase() === "en" ? "en" : "ru";
  function t(o) { return o == null ? "" : typeof o === "string" ? o : (o[LANG] || o.ru); }
  function L(ru, en) { return { ru: ru, en: en }; }

  var UI = {
    title: L("Zodiac Duo", "Zodiac Duo"),
    lead: L("Ваш знак. Ваши материалы. Единственный экземпляр.", "Your sign. Your materials. A single piece."),
    steps: {
      sign: L("Знак зодиака", "Zodiac sign"), frame: L("Рама", "Frame"), plate: L("Плато", "Back plate"),
      ring: L("Зодиакальный круг", "Zodiac circle"), medal: L("Медальон", "Medallion"),
      panel: L("Декоративная панель", "Decorative panel"), base: L("Корпус iPhone Duo", "iPhone Duo body"), summary: L("Итог", "Summary")
    },
    short: {
      sign: L("Знак", "Sign"), frame: L("Рама", "Frame"), plate: L("Плато", "Plate"), ring: L("Круг", "Circle"),
      medal: L("Медальон", "Medallion"), panel: L("Панель", "Panel"), base: L("Корпус", "Body"), summary: L("Итог", "Summary")
    },
    g: {
      sign: L("Знак", "Sign"), presets: L("Сборки знаков", "Sign looks"), metal: L("Металл", "Metal"),
      base: L("Основа", "Base"), color: L("Цвет", "Colour"), decor: L("Декор", "Decor"), enamel: L("Эмаль", "Enamel"),
      core: L("Камень", "Stone"), medal: L("Медальон", "Medallion"), panel: L("Тип панели", "Panel type"),
      fill: L("Наполнение", "Inlay"), pframe: L("Рамка", "Frame"), penamel: L("Цвет эмали", "Enamel colour"),
      texture: L("Фактура", "Texture"), body: L("Цвет корпуса", "Body colour")
    },
    stepOf: L("Шаг {n} из 8", "Step {n} of 8"),
    on: L("С медальоном", "With medallion"), off: L("Без медальона", "No medallion"),
    noPanel: L("Без панели", "No panel"), clear: L("Прозрачная", "Open-work"), solid: L("Цельная", "Solid"),
    noStones: L("Без камней", "No stones"),
    blackRule: L("Камни недоступны для круга из чёрного титана: их невозможно закрепить в этом металле. Декор заменён на «Без камней».",
                 "Stones are not available for a black titanium circle: they cannot be set in this metal. Decor switched to “No stones”."),
    blackHint: L("Недоступно для круга из чёрного титана: камни невозможно закрепить в этом металле.",
                 "Not available for a black titanium circle: stones cannot be set in this metal."),
    tools: {
      undo: L("Отменить", "Undo"), reset: L("Сбросить", "Reset"), zoom: L("Лупа", "Zoom"),
      share: L("Поделиться", "Share"), download: L("Скачать", "Download"), copy: L("Копировать", "Copy"),
      oneMetal: L("Всё в металле рамы", "Match all to frame metal")
    },
    build: L("Сборка", "Your design"),
    copied: L("Ссылка на вашу сборку скопирована", "Link to your design copied"),
    codeCopied: L("Код сборки скопирован", "Design code copied"),
    openCode: L("Открыть по коду", "Open by code"), openBtn: L("Открыть", "Open"),
    codeOpened: L("Сборка {n} открыта", "Design {n} opened"),
    codeBad: L("Код не распознан — проверьте символы", "Code not recognised — please check the characters"),
    codeOld: L("Это код прежней версии конфигуратора — по нему сборку не восстановить. Попросите ссылку из заявки или новый код вида ZD-SAG-XXXX-XXXX.",
               "This code is from an earlier version and cannot be restored. Ask for the link from the request or a new code like ZD-SAG-XXXX-XXXX."),
    oneMetalDone: L("Металл рамы применён к кругу, медальону и рамке панели", "Frame metal applied to circle, medallion and panel frame"),
    noDownload: L("Скачивание изображения работает на сайте; при открытии файла с диска браузер его блокирует.",
                  "Image download works on the website; browsers block it for files opened from disk."),
    next: L("Далее", "Next"), back: L("Назад", "Back"), toSummary: L("К итогу", "To summary"),
    price: L("Цена по запросу", "Price on request"), code: L("Код сборки", "Design code"),
    codeHint: L("Назовите код менеджеру или отправьте ссылку — он откроет вашу сборку в точности.",
                "Give this code to your manager or send the link — they will open your exact design."),
    order: L("Оформить заявку", "Request this design"),
    progress: L("{n} из 7 пройдено", "{n} of 7 viewed"),
    openOther: L("Открыть другую сборку по коду", "Open another design by code"),
    disclaimer: L("Изображение носит иллюстративный характер. Финальный вид изделия согласуется с менеджером.",
                  "The image is for illustration only. The final appearance is agreed with your manager."),
    enamelDefault: L("Бургундия", "Burgundy"), enamelDefaultInfo: L("Оттенок из эскиза Caviar — рекомендация дома.", "The shade from the Caviar sketch — the house recommendation."), tune: L("Настроить оттенок", "Fine-tune colour"), tuneHide: L("Скрыть настройку", "Hide fine-tuning"),
    custom: L("Свой оттенок", "Custom shade"), customInfo: L("Любой оттенок эмали: тон, насыщенность и яркость настраиваются вручную.", "Any enamel shade: hue, saturation and lightness set by hand."),
    hue: L("Оттенок", "Hue"), sat: L("Насыщенность", "Saturation"), light: L("Яркость", "Lightness"),
    random: L("Удивите меня", "Surprise me"),
    randomInfo: L("Случайная сборка из допустимых сочетаний. Нажмите ещё раз — будет новая.", "A random design from valid combinations. Tap again for another."),
    edit: L("Изменить", "Edit"),
    form: {
      title: L("Заявка на Zodiac Duo", "Zodiac Duo request"),
      lead: L("Менеджер Caviar свяжется с вами, уточнит детали и назовёт стоимость вашей сборки.",
              "A Caviar manager will contact you to discuss the details and the price of your design."),
      name: L("Имя", "Name"), phone: L("Телефон", "Phone"), email: L("Email", "Email"),
      messenger: L("Мессенджер", "Messenger"), comment: L("Комментарий", "Comment"), none: L("Не важно", "Any"),
      consent: L("Я согласен на обработку персональных данных и принимаю ", "I agree to the processing of personal data and accept the "),
      policy: L("политику конфиденциальности", "privacy policy"),
      submit: L("Отправить заявку", "Send request"), sending: L("Отправляем…", "Sending…"),
      required: L("Укажите имя и телефон или email и подтвердите согласие", "Please enter your name, phone or email and confirm consent"),
      error: L("Не удалось отправить. Попробуйте ещё раз или свяжитесь с нами напрямую.", "Could not send. Please try again or contact us directly."),
      close: L("Закрыть", "Close")
    },
    thanks: {
      title: L("Заявка принята", "Request received"),
      text: L("Ваш Zodiac Duo уже обрёл форму. Менеджер Caviar свяжется с вами, чтобы обсудить детали и сроки изготовления.",
              "Your Zodiac Duo has taken shape. A Caviar manager will contact you to discuss the details and production time."),
      back: L("Вернуться к конфигуратору", "Back to configurator")
    }
  };

  /* ================================================================== data */
  var SIGNS = [
    ["aries", "Овен", "Aries", "♈", "21.03–19.04"], ["taurus", "Телец", "Taurus", "♉", "20.04–20.05"],
    ["gemini", "Близнецы", "Gemini", "♊", "21.05–20.06"], ["cancer", "Рак", "Cancer", "♋", "21.06–22.07"],
    ["leo", "Лев", "Leo", "♌", "23.07–22.08"], ["virgo", "Дева", "Virgo", "♍", "23.08–22.09"],
    ["libra", "Весы", "Libra", "♎", "23.09–22.10"], ["scorpio", "Скорпион", "Scorpio", "♏", "23.10–21.11"],
    ["sagittarius", "Стрелец", "Sagittarius", "♐", "22.11–21.12"], ["capricorn", "Козерог", "Capricorn", "♑", "22.12–19.01"],
    ["aquarius", "Водолей", "Aquarius", "♒", "20.01–18.02"], ["pisces", "Рыбы", "Pisces", "♓", "19.02–20.03"]
  ].map(function (s) { return { id: s[0], name: L(s[1], s[2]), sym: s[3], dates: s[4] }; });

  var EL = { fire: L("Огонь", "Fire"), earth: L("Земля", "Earth"), air: L("Воздух", "Air"), water: L("Вода", "Water") };
  var ELEMENTS = { aries: EL.fire, taurus: EL.earth, gemini: EL.air, cancer: EL.water, leo: EL.fire, virgo: EL.earth, libra: EL.air,
    scorpio: EL.water, sagittarius: EL.fire, capricorn: EL.earth, aquarius: EL.air, pisces: EL.water };

  var METALS = [
    { id: "silver", name: L("Серебро", "Silver"), full: L("Серебро", "Silver"),
      info: L("Холодный блеск благородного металла. Гильош нанесён вручную и играет светом под любым углом.", "The cool lustre of a noble metal. Hand-cut guilloché plays with light at every angle.") },
    { id: "gold", name: L("Жёлтое золото", "Yellow gold"), full: L("Жёлтое золото", "Yellow gold"),
      info: L("Тёплое сияние жёлтого золота — классика ювелирного дома Caviar.", "The warm glow of yellow gold — a Caviar classic.") },
    { id: "rose", name: L("Розовое золото", "Rose gold"), full: L("Розовое золото", "Rose gold"),
      info: L("Розовое золото: мягкий, глубокий оттенок, который раскрывается при дневном свете.", "Rose gold: a soft, deep shade that comes alive in daylight.") },
    { id: "black", name: L("Чёрный титан", "Black titanium"), full: L("Титан с чёрным PVD-покрытием", "Titanium with black PVD coating"),
      info: L("Титан с чёрным PVD-покрытием: прочный, лёгкий, глубокого графитового цвета.", "Titanium with black PVD coating: strong, light, in a deep graphite tone.") }
  ];
  var PLATE_METAL_INFO = L("Металлическое плато с лучевым гильошем: линии расходятся от центра круга.", "Metal plate with radial guilloché: lines radiate from the centre of the circle.");
  var LEATHERS = [
    { id: "croc", name: L("Кожа крокодила", "Crocodile leather"), short: L("Крокодил", "Crocodile"),
      info: L("Рисунок чешуи неповторим: двух одинаковых панелей не существует.", "The scale pattern is unrepeatable: no two panels are alike."),
      colors: [["burgundy", "Burgundy"], ["red", "Red"], ["navy", "Navy"], ["black", "Black"]] },
    { id: "calf", name: L("Кожа телёнка", "Calf leather"), short: L("Телёнок", "Calf"),
      info: L("Мягкая зернистая кожа телёнка — тактильная и благородная.", "Soft grained calf leather — tactile and refined."),
      colors: [["navy", "Navy"], ["burgundy", "Burgundy"], ["beige", "Beige"], ["white", "Snow White"], ["paleblue", "Sky Blue"]] }
  ];
  // Кожи, снятые с коллекции 14.10.2026 (питон и прежние оттенки), → ближайшая из текущих:
  // так открываются старые сохранения, ссылки #zd= и коды сборок.
  var LEGACY_PLATE = { "croc:white": "calf:white", "python:violet": "croc:navy", "python:paleblue": "calf:paleblue",
    "calf:cherry": "calf:burgundy", "calf:rosepink": "croc:red", "calf:beigecream": "calf:beige", "calf:snowwhite": "calf:white", "calf:black": "croc:black" };
  function fixPlate(s) {
    if (!s || s.plate === "metal") return s;
    var l = null;
    for (var i = 0; i < LEATHERS.length; i++) if (LEATHERS[i].id === s.plate) l = LEATHERS[i];
    if (l && l.colors.some(function (c) { return c[0] === s.plateColor; })) return s;
    var to = (LEGACY_PLATE[s.plate + ":" + s.plateColor] || "croc:burgundy").split(":");
    s.plate = to[0]; s.plateColor = to[1];
    return s;
  }
  var STONES = [
    { id: "white", name: L("Белые бриллианты", "White diamonds"), info: L("Бриллианты в закрепке по всей внешней окружности — чистый холодный блеск.", "Diamonds set around the entire outer ring — a pure, cool sparkle.") },
    { id: "black", name: L("Чёрные бриллианты", "Black diamonds"), info: L("Чёрные бриллианты по окружности — графичный, глубокий блеск.", "Black diamonds around the ring — a graphic, deep sparkle.") },
    { id: "ruby", name: L("Рубины", "Rubies"), info: L("Рубины по окружности — насыщенный красный акцент.", "Rubies around the ring — a rich red accent.") }
  ];
  var CORES = [
    { id: "red", name: L("Красный", "Red"), info: L("Красная вставка с глубоким блеском.", "A red inlay with a deep lustre.") },
    { id: "white", name: L("Белый", "White"), info: L("Перламутровая белая вставка.", "A pearlescent white inlay.") },
    { id: "blacksky", name: L("Чёрное небо", "Black sky"), info: L("Чёрная вставка с мерцающими вкраплениями — как ночное небо.", "A black inlay with shimmering flecks — like the night sky.") },
    { id: "bluesky", name: L("Синее небо", "Blue sky"), info: L("Глубокий синий с серебристыми вкраплениями.", "Deep blue with silvery flecks.") }
  ];
  var TEXTURES = [
    { id: 1, name: L("Клу-де-Пари", "Clous de Paris"), info: L("Классический гильош из пирамидальной сетки.", "Classic guilloché of a pyramid grid.") },
    { id: 2, name: L("Шеврон", "Chevron"), info: L("Гильош «шеврон»: ритм диагональных линий.", "Chevron guilloché: a rhythm of diagonal lines.") }
  ];
  var BASES = [
    { id: "starwhite", name: L("Star White", "Star White"), color: "#E7E5E1", info: L("Базовый корпус iPhone Duo. Виден на торцах и шарнире.", "The iPhone Duo base body, visible on the edges and hinge.") },
    { id: "nightsky", name: L("Night Sky", "Night Sky"), color: "#1D2433", info: L("Базовый корпус iPhone Duo. Виден на торцах и шарнире.", "The iPhone Duo base body, visible on the edges and hinge.") }
  ];
  var ENAMEL_PRESETS = [
    { id: "burgundy", name: L("Бургундия", "Burgundy"), hex: "#641616" },
    { id: "ruby", name: L("Рубин", "Ruby"), hex: "#A3121F" },
    { id: "sapphire", name: L("Сапфир", "Sapphire"), hex: "#123E8C" },
    { id: "emerald", name: L("Изумруд", "Emerald"), hex: "#0D5E3C" },
    { id: "amethyst", name: L("Аметист", "Amethyst"), hex: "#5B2A86" },
    { id: "turquoise", name: L("Бирюза", "Turquoise"), hex: "#14808C" },
    { id: "onyx", name: L("Оникс", "Onyx"), hex: "#141414" },
    { id: "ivory", name: L("Слоновая кость", "Ivory"), hex: "#EAE2CF" }
  ];
  var ENAMEL_INFO = L("Ювелирная эмаль: глубокий цвет, который вы выбираете сами.", "Jewellery enamel in a deep colour of your choice.");

  var DEFAULT = {
    sign: "aries", frame: "silver", medal: "silver", medalOn: 1,
    plate: "metal", plateColor: "black",
    ring: "silver", decor: "black", enamel: null, core: "blacksky",
    panel: "clear", panelFrame: "silver", panelFill: "meteorite", panelEnamel: null, panelTex: 1, panelMetal: "silver",
    base: "starwhite"
  };

  // Стартовая сборка: DEFAULT, дополненный настройкой страницы (CFG.initial)
  var START = Object.assign({}, DEFAULT, CFG.initial || {});

  // Сборки знаков: по одной на знак, палитра — от стихии, сочетания — по правилам цветового круга.
  var ELEM_TONE = { fire: L("Огонь", "Fire"), earth: L("Земля", "Earth"), air: L("Воздух", "Air"), water: L("Вода", "Water") };
  var PRESETS = [
    { id: "aries", name: L("Пламя", "Flame"), el: "fire", harmony: L("Аналоговая тёплая гамма: красный и янтарь в жёлтом золоте, рубины — искры пламени.", "Analogous warm palette: red and amber in yellow gold, rubies as sparks."),
      s: { frame: "gold", medal: "gold", medalOn: 1, plate: "croc", plateColor: "red", ring: "gold", decor: "ruby", enamel: "#E8B04A", core: "red", panel: "solid", panelFrame: "gold", panelFill: "enamel", panelEnamel: "#5B2A86", panelTex: 2, panelMetal: "gold", base: "starwhite" } },
    { id: "taurus", name: L("Сад Венеры", "Garden of Venus"), el: "earth", harmony: L("Комплементарная пара: розовое золото и изумруд — тёплое против прохладного.", "Complementary pair: rose gold against emerald — warm against cool."),
      s: { frame: "rose", medal: "rose", medalOn: 1, plate: "calf", plateColor: "beige", ring: "rose", decor: "white", enamel: "#0D5E3C", core: "white", panel: "solid", panelFrame: "rose", panelFill: "meteorite", panelEnamel: null, panelTex: 1, panelMetal: "rose", base: "starwhite" } },
    { id: "gemini", name: L("Двойной свет", "Twin light"), el: "air", harmony: L("Светлая гамма: серебро, белый и дымчато-голубой; чёрные бриллианты — дуальность знака.", "Light palette: silver, white and misty blue; black diamonds for the sign's duality."),
      s: { frame: "silver", medal: "silver", medalOn: 1, plate: "calf", plateColor: "white", ring: "silver", decor: "black", enamel: "#D2DEEF", core: "white", panel: "clear", panelFrame: "silver", panelFill: "enamel", panelEnamel: "#D6E1F0", panelTex: 1, panelMetal: "silver", base: "starwhite" } },
    { id: "cancer", name: L("Лунный прилив", "Lunar tide"), el: "water", harmony: L("Контраст глубокого синего и бордо под лунным серебром, перламутр в центре.", "Deep blue against bordeaux under lunar silver, with pearl at the centre."),
      s: { frame: "silver", medal: "silver", medalOn: 1, plate: "croc", plateColor: "burgundy", ring: "silver", decor: "white", enamel: "#1D3154", core: "white", panel: "clear", panelFrame: "silver", panelFill: "enamel", panelEnamel: "#DBDBDB", panelTex: 1, panelMetal: "silver", base: "starwhite" } },
    { id: "leo", name: L("Солнце", "Sun"), el: "fire", harmony: L("Тёплая гамма: золото, бургундия и красный на чёрном — солнечный диск.", "Warm palette: gold, burgundy and red on black — the solar disc."),
      s: { frame: "gold", medal: "gold", medalOn: 1, plate: "croc", plateColor: "black", ring: "gold", decor: "white", enamel: null, core: "red", panel: "solid", panelFrame: "gold", panelFill: "meteorite", panelEnamel: null, panelTex: 2, panelMetal: "gold", base: "nightsky" } },
    { id: "virgo", name: L("Жатва", "Harvest"), el: "earth", harmony: L("Аналоговая земляная гамма: шалфей, слоновая кость, беж и золото.", "Analogous earth palette: sage, ivory, beige and gold."),
      s: { frame: "gold", medal: "gold", medalOn: 1, plate: "calf", plateColor: "beige", ring: "gold", decor: "white", enamel: "#7A8B5A", core: "white", panel: "clear", panelFrame: "gold", panelFill: "enamel", panelEnamel: "#EAE2CF", panelTex: 1, panelMetal: "gold", base: "starwhite" } },
    { id: "libra", name: L("Равновесие", "Balance"), el: "air", harmony: L("Пастельная комплементарная пара: пудрово-розовый и небесно-голубой в равных долях.", "Pastel complementary pair: powder pink and sky blue in equal measure."),
      s: { frame: "rose", medal: "rose", medalOn: 1, plate: "calf", plateColor: "paleblue", ring: "rose", decor: "white", enamel: "#C98BA0", core: "white", panel: "clear", panelFrame: "rose", panelFill: "enamel", panelEnamel: "#9FC3E0", panelTex: 1, panelMetal: "rose", base: "starwhite" } },
    { id: "scorpio", name: L("Глубина", "Depth"), el: "water", harmony: L("Комплементарная пара: бордо и глубокая морская бирюза в чёрном титане.", "Complementary pair: bordeaux and deep sea teal in black titanium."),
      s: { frame: "black", medal: "black", medalOn: 1, plate: "croc", plateColor: "burgundy", ring: "black", decor: "metal", enamel: "#0F4C4A", core: "blacksky", panel: "clear", panelFrame: "black", panelFill: "meteorite", panelEnamel: null, panelTex: 1, panelMetal: "black", base: "nightsky" } },
    { id: "sagittarius", name: L("Стрела", "Arrow"), el: "fire", harmony: L("Бордо, оникс и розовое золото — сдержанный огонь в движении.", "Bordeaux, onyx and rose gold — restrained fire in motion."),
      s: { frame: "rose", medal: "rose", medalOn: 1, plate: "croc", plateColor: "burgundy", ring: "rose", decor: "white", enamel: "#141414", core: "white", panel: "clear", panelFrame: "rose", panelFill: "meteorite", panelEnamel: null, panelTex: 1, panelMetal: "rose", base: "starwhite" } },
    { id: "capricorn", name: L("Вершина", "Summit"), el: "earth", harmony: L("Земляная гамма: умбра и беж в чёрном титане — строгость вершины.", "Earth palette: umber and beige in black titanium — the rigour of the summit."),
      s: { frame: "black", medal: "black", medalOn: 1, plate: "calf", plateColor: "beige", ring: "black", decor: "metal", enamel: "#6B4A2E", core: "blacksky", panel: "solid", panelFrame: "black", panelFill: "meteorite", panelEnamel: null, panelTex: 2, panelMetal: "black", base: "nightsky" } },
    { id: "aquarius", name: L("Ток", "Current"), el: "air", harmony: L("Расщеплённая комплементарность: бирюза и тёмно-синий, рубины — точечный тёплый акцент.", "Split complementary: turquoise and navy, with rubies as a warm accent."),
      s: { frame: "silver", medal: "silver", medalOn: 1, plate: "calf", plateColor: "navy", ring: "silver", decor: "ruby", enamel: "#14808C", core: "bluesky", panel: "solid", panelFrame: "silver", panelFill: "meteorite", panelEnamel: null, panelTex: 1, panelMetal: "silver", base: "nightsky" } },
    { id: "pisces", name: L("Океан", "Ocean"), el: "water", harmony: L("Аналоговая гамма: глубокий фиолетовый и тёмно-синий — толща воды.", "Analogous palette: deep violet and navy — the depth of the water."),
      s: { frame: "silver", medal: "silver", medalOn: 1, plate: "croc", plateColor: "navy", ring: "silver", decor: "white", enamel: "#3D1C59", core: "bluesky", panel: "solid", panelFrame: "silver", panelFill: "enamel", panelEnamel: "#1A263C", panelTex: 2, panelMetal: "silver", base: "nightsky" } }
  ];

  var STEP_IDS = ["sign", "base", "frame", "plate", "ring", "medal", "panel", "summary"];

  // Зоны телефона в координатах холста PSD: подсветка изменений и навигация кликом по превью
  var ZONES = {
    medal: { shape: "circle", cx: 1197, cy: 598, r: 105 },
    core: { shape: "circle", cx: 869, cy: 1215, r: 231 },
    ring: { shape: "circle", cx: 870, cy: 1214, r: 353 },
    panel: { shape: "rect", x: 418, y: 1362, w: 908, h: 468, rad: 40 },
    plate: { shape: "rect", x: 442, y: 845, w: 858, h: 1041, rad: 26 },
    frame: { shape: "rect", x: 346, y: 410, w: 1091, h: 1557, rad: 110 },
    base: { shape: "rect", x: 346, y: 408, w: 1099, h: 1558, rad: 110 }
  };
  // что подсвечивать при изменении поля состояния
  var FIELD_ZONES = {
    sign: ["core", "medal"], frame: ["frame"], medal: ["medal"], medalOn: ["medal"], plate: ["plate"], plateColor: ["plate"],
    ring: ["ring"], decor: ["ring"], enamel: ["ring"], core: ["core"], panel: ["panel"], panelFrame: ["panel"],
    panelFill: ["panel"], panelEnamel: ["panel"], panelTex: ["panel"], panelMetal: ["panel"], base: ["base"]
  };
  // клик/ховер по зоне превью → шаг и вкладка (порядок — приоритет попадания)
  var HIT = [["medal", "medal", null], ["core", "ring", "core"], ["ring", "ring", "metal"], ["panel", "panel", null], ["plate", "plate", null], ["frame", "frame", null]];
  var AUTO_ZOOM = { ring: { z: 1.55, x: 870, y: 1214 }, panel: { z: 1.6, x: 872, y: 1590 } };

  /* ================================================================== utils */
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
  function sw(name) { return ASSETS + "/swatches/" + name + ".webp" + AV; }
  function fmt(s, n) { return s.replace("{n}", n); }

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
    function f(x) { if (x < 0) x += 1; if (x > 1) x -= 1; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; }
    return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255];
  }
  function hslToHex(h, s, l) {
    var c = hslToRgb(h, s / 100, l / 100);
    return "#" + c.map(function (v) { return ("0" + Math.round(v).toString(16)).slice(-2); }).join("").toUpperCase();
  }
  function hexRgb(hex) { var x = hexToHsl(hex); return hslToRgb(x[0], x[1] / 100, x[2] / 100); }
  function nearestPreset(hex) {
    var a = hexRgb(hex), best = null, bd = 1e9;
    ENAMEL_PRESETS.forEach(function (p) {
      var b = hexRgb(p.hex), d = Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2);
      if (d < bd) { bd = d; best = p; }
    });
    return best;
  }
  function enamelName(hex) {
    if (!hex) return t(UI.enamelDefault);
    for (var i = 0; i < ENAMEL_PRESETS.length; i++) if (ENAMEL_PRESETS[i].hex === hex) return t(ENAMEL_PRESETS[i].name);
    return "≈ " + t(nearestPreset(hex).name);
  }
  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0; return h.toString(36).toUpperCase(); }
  function colorName(type, id) { var l = find(LEATHERS, type); for (var i = 0; i < l.colors.length; i++) if (l.colors[i][0] === id) return l.colors[i][1]; return id; }

  function track(name, params) {
    try {
      if (window.ym && CFG.ymId) window.ym(CFG.ymId, "reachGoal", name, params || {});
      if (window.gtag) window.gtag("event", name, params || {});
    } catch (e) { /* аналитика не должна ломать виджет */ }
  }

  var ICONS = {
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    reset: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.3" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/>',
    share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/>',
    download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    zoom: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5M11 8v6M8 11h6"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    left: '<path d="m15 6-6 6 6 6"/>', right: '<path d="m9 6 6 6-6 6"/>', chevUp: '<path d="m6 15 6-6 6 6"/>'
  };
  function icon(name, cls) {
    return '<svg class="' + (cls || "") + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[name] + "</svg>";
  }

  /* ================================================================== enamel recolour */
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
      var Lm = (Math.max(r, g, b) + Math.min(r, g, b)) >> 1;
      lum[i] = Lm;
      if (a > 128) { sum += Lm; cnt++; }
    }
    this.lum = lum; this.L0 = cnt ? sum / cnt / 255 : 0.3;
  }
  Recolor.prototype.apply = function (hex) {
    var hsl = hexToHsl(hex), lut = new Uint8ClampedArray(256 * 3);
    for (var v = 0; v < 256; v++) {
      var Lv = Math.min(1, Math.max(0, hsl[2] / 100 + (v / 255 - this.L0) * 1.15));
      var rgb = hslToRgb(hsl[0], hsl[1] / 100, Lv);
      lut[v * 3] = rgb[0]; lut[v * 3 + 1] = rgb[1]; lut[v * 3 + 2] = rgb[2];
    }
    var s = this.src.data, o = this.out.data, lum = this.lum;
    for (var i = 0, n = lum.length; i < n; i++) {
      var k = lum[i] * 3, j = i * 4;
      o[j] = lut[k]; o[j + 1] = lut[k + 1]; o[j + 2] = lut[k + 2]; o[j + 3] = s[j + 3];
    }
    this.ctx.putImageData(this.out, 0, 0);
  };

  /* ================================================================== starfield */
  // Звёздное небо: звёзды рождаются у краёв сцены и медленно плывут к телефону, уменьшаясь и угасая —
  // телефон словно парит в глубине. Плюс неподвижный дальний слой с мерцанием.
  function Sky(canvas, center) {
    var self = this;
    this.c = canvas; this.ctx = canvas.getContext("2d"); this.center = center;
    this.stars = []; this.far = []; this.running = false; this.visible = true; this.last = 0;
    // спрайт звезды: мягкое ядро с ореолом
    var sp = document.createElement("canvas"); sp.width = sp.height = 64;
    var g = sp.getContext("2d"), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, "rgba(255,250,238,1)"); gr.addColorStop(0.12, "rgba(255,246,226,0.9)");
    gr.addColorStop(0.35, "rgba(236,222,186,0.22)"); gr.addColorStop(1, "rgba(236,222,186,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    this.sprite = sp;
    this.resize();
    if (window.ResizeObserver) new ResizeObserver(function () { self.resize(); }).observe(canvas.parentNode);
    else window.addEventListener("resize", function () { self.resize(); });
    document.addEventListener("visibilitychange", function () { self.toggle(); });
    if (window.IntersectionObserver) new IntersectionObserver(function (e) { self.visible = e[0].isIntersecting; self.toggle(); }).observe(canvas);
    this.toggle();
  }
  Sky.prototype.resize = function () {
    var r = this.c.parentNode.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = r.width; this.h = r.height; this.dpr = dpr;
    this.c.width = Math.round(r.width * dpr); this.c.height = Math.round(r.height * dpr);
    var n = Math.round(Math.max(70, Math.min(230, r.width * r.height / 5200)));
    this.stars = [];
    for (var i = 0; i < n; i++) this.stars.push(this.spawn(Math.random()));
    this.far = [];
    for (var j = 0; j < Math.round(n * 0.45); j++) this.far.push({ x: Math.random(), y: Math.random(), s: 0.35 + Math.random() * 0.55, a: 0.12 + Math.random() * 0.3, f: 0.2 + Math.random() * 0.6, ph: Math.random() * 6.28 });
    if (REDUCED || !this.running) this.draw(0);
  };
  Sky.prototype.spawn = function (progress) {
    var near = Math.random();
    return {
      th: Math.random() * Math.PI * 2,
      out: 1.02 + Math.random() * 0.14,                     // старт чуть за краем сцены
      inn: 0.42 + Math.random() * 0.3,                       // финиш у силуэта телефона
      T: (17 + Math.random() * 15) * (1.25 - near * 0.5),     // 13–40 с на путь: медленно
      t: progress,                                           // 0..1 — доля пути
      s: 0.6 + near * 1.7,                                   // ближние крупнее
      a: 0.45 + near * 0.55,
      tw: 0.6 + Math.random() * 1.4, ph: Math.random() * 6.28
    };
  };
  Sky.prototype.toggle = function () {
    var on = this.visible && !document.hidden && !REDUCED;
    if (on && !this.running) { this.running = true; this.last = 0; var self = this; requestAnimationFrame(function f(ts) { if (!self.running) return; self.frame(ts); requestAnimationFrame(f); }); }
    else if (!on) this.running = false;
  };
  Sky.prototype.frame = function (ts) {
    var dt = this.last ? Math.min(0.05, (ts - this.last) / 1000) : 0;
    this.last = ts;
    for (var i = 0; i < this.stars.length; i++) {
      var st = this.stars[i];
      st.t += dt / st.T;
      if (st.t >= 1) this.stars[i] = this.spawn(0);
    }
    this.draw(ts / 1000);
  };
  function smooth(a, b, x) { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); }
  Sky.prototype.draw = function (time) {
    var ctx = this.ctx, dpr = this.dpr, w = this.w, h = this.h, c = this.center();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = "lighter";
    var sp = this.sprite;
    // дальний слой — неподвижный, медленно мерцает
    for (var j = 0; j < this.far.length; j++) {
      var f = this.far[j], fa = f.a * (0.65 + 0.35 * Math.sin(time * f.f + f.ph)), fs = f.s * 4;
      ctx.globalAlpha = fa;
      ctx.drawImage(sp, f.x * w - fs / 2, f.y * h - fs / 2, fs, fs);
    }
    // путь от края к телефону по эллипсу сцены
    var RX = Math.max(c.x, w - c.x) * 1.05, RY = Math.max(c.y, h - c.y) * 1.05, ex = c.pw / 2, ey = c.ph / 2;
    for (var i = 0; i < this.stars.length; i++) {
      var s = this.stars[i], p = s.t, e = Math.pow(p, 1.35);
      var cos = Math.cos(s.th), sin = Math.sin(s.th);
      var rx = RX * s.out + (ex * s.inn - RX * s.out) * e, ry = RY * s.out + (ey * s.inn - RY * s.out) * e;
      var x = c.x + cos * rx, y = c.y + sin * ry;
      var a = s.a * smooth(0, 0.14, p) * (1 - smooth(0.62, 0.96, p)) * (0.82 + 0.18 * Math.sin(time * s.tw + s.ph));
      if (a <= 0.004) continue;
      var size = s.s * (1 - 0.55 * p) * 4.2;
      ctx.globalAlpha = a;
      ctx.drawImage(sp, x - size / 2, y - size / 2, size, size);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  };

  /* ================================================================== widget */
  function Widget(root) {
    this.root = root;
    this.state = this.loadState();
    this.history = [];
    this.step = "sign";
    this.tab = {};
    this.visited = { sign: true };
    this.tune = {};
    this.slots = {};
    this.recolors = {};
    this.imgCache = {};
    this.sheet = "half";
    this.zs = { z: 1, ox: 0, oy: 0, manual: false };
    this.build();
    this.renderPhone();
    this.renderUI(false);
    if (this.openedByCode) { this.visited = { sign: 1, frame: 1, plate: 1, ring: 1, medal: 1, panel: 1, base: 1 }; this.go("summary"); }
    track("zd_open", { sign: this.state.sign });
  }
  var P = Widget.prototype;

  P.loadState = function () {
    var qc = /[?&]code=([^&#]+)/.exec(location.search), fromCode = qc && decodeCode(decodeURIComponent(qc[1]));
    if (fromCode) { this.openedByCode = true; return fixPlate(Object.assign(clone(DEFAULT), fromCode)); }
    var s = fixPlate(clone(START)), fromHash = parseHash();
    if (fromHash) return fixPlate(Object.assign(s, fromHash));
    try { var saved = JSON.parse(localStorage.getItem(CFG.storageKey)); if (saved) Object.assign(s, saved); } catch (e) { }
    return fixPlate(s);
  };
  P.saveState = function () { try { localStorage.setItem(CFG.storageKey, JSON.stringify(this.state)); } catch (e) { } };

  /* ------------------------------------------------------------ layers */
  // Порядок слоёв снизу вверх — как в PSD.
  P.layers = function () {
    var s = this.state, Ls = [];
    Ls.push(["plate", s.plate === "metal" ? "plate_metal_" + s.plateColor : "plate_" + s.plate + "_" + s.plateColor]);
    Ls.push(["core", "core_" + s.core]);
    Ls.push(["const", "const_" + s.sign]);
    Ls.push(["ringEnamel", "ring_enamel", s.enamel]);
    Ls.push(["ring", "ring_" + s.ring]);
    Ls.push(["spots", s.decor === "metal" ? "spots_metal_" + s.ring : "spots_stone_" + s.decor]);
    if (s.panel === "clear") {
      Ls.push(["panelFill", "panel_fill_" + s.panelFill, s.panelFill === "enamel" ? s.panelEnamel : null]);
      Ls.push(["panelFrame", "panel_frame_" + s.panelFrame]);
    } else { Ls.push(["panelFill", null]); Ls.push(["panelFrame", null]); }
    Ls.push(["panelMono", s.panel === "solid" ? "panel_mono" + s.panelTex + "_" + s.panelMetal : null]);
    Ls.push(["frame", "frame_" + s.frame]);
    Ls.push(["medal", s.medalOn ? "medal_" + s.sign + "_" + s.medal : null]);
    Ls.push(["base", "base_" + s.base]);
    return Ls;
  };

  P.url = function (key) {
    var k = key + (this.half ? "@half" : "");
    return (M.inline && M.inline[k]) || ASSETS + "/layers/" + k + ".webp" + AV;
  };
  P.loadImg = function (key) {
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

  // Возвращает Promise: все изменённые слои появились на сцене (подсветка стартует вместе с проявлением)
  P.renderPhone = function () {
    var self = this, jobs = [];
    this.layers().forEach(function (spec, idx) {
      var slot = spec[0], key = spec[1], color = spec[2] || null;
      var cur = self.slots[slot] || (self.slots[slot] = { key: undefined, color: undefined, node: null });
      if (cur.key === key && cur.color === color) return;
      if (cur.key === key && key && cur.node && cur.node.tagName === "CANVAS" && color) {
        self.recolors[key].apply(color); cur.color = color; return;
      }
      cur.key = key; cur.color = color;
      var token = (cur.token = (cur.token || 0) + 1);
      if (!key) { self.swapNode(cur, null); return; }
      jobs.push(self.loadImg(key).then(function (img) {
        if (cur.token !== token) return;
        var node;
        if (color) {
          var rc = self.recolors[key] || (self.recolors[key] = new Recolor(img));
          rc.apply(color);
          node = rc.canvas;
        } else { node = img.cloneNode(); node.alt = ""; }
        self.swapNode(cur, node, key, idx);
      }).catch(function () { /* нет ассета — слой пропускаем */ }));
    });
    return Promise.all(jobs);
  };

  P.swapNode = function (slot, node, key, z) {
    var old = slot.node;
    if (node) {
      var Ly = box(key);
      node.className = "zd-layer";
      node.style.left = ((Ly.x - CROP.x) / CROP.w * 100) + "%";
      node.style.top = ((Ly.y - CROP.y) / CROP.h * 100) + "%";
      node.style.width = (Ly.w / CROP.w * 100) + "%";
      node.style.height = (Ly.h / CROP.h * 100) + "%";
      node.style.zIndex = z + 1;
      if (old && old === node) return;
      if (!REDUCED && old) {
        node.style.opacity = "0";
        this.layersBox.appendChild(node);
        requestAnimationFrame(function () { requestAnimationFrame(function () { node.style.opacity = "1"; }); });
      } else {
        // перекрашенный слой (эмаль) — общий canvas на ключ: при прошлом скрытии ему ставили opacity 0,
        // при повторном показе без «старого» слоя прозрачность нужно вернуть, иначе эмаль пропадает
        node.style.opacity = "";
        this.layersBox.appendChild(node);
      }
    }
    slot.node = node;
    if (old && old !== node) {
      if (!REDUCED) {
        if (!node) old.style.opacity = "0";
        setTimeout(function () { if (old.parentNode && old !== slot.node) old.remove(); }, 620);
      } else old.remove();
    }
  };

  /* ------------------------------------------------------------ DOM skeleton */
  P.build = function () {
    var self = this, r = this.root;
    r.classList.add("zd");
    r.innerHTML = "";

    // превью
    this.stage = el("div", { class: "zd-stage" });
    this.layersBox = el("div", { class: "zd-layers" });
    this.fx = el("div", { class: "zd-fx", "aria-hidden": "true" });
    this.phone = el("div", { class: "zd-phone", role: "img", "aria-label": "Zodiac Duo" }, [this.layersBox, this.fx]);
    this.halo = el("div", { class: "zd-halo", "aria-hidden": "true" });
    this.zoomBox = el("div", { class: "zd-zoom" }, [this.halo, this.phone]);
    this.skyCanvas = el("canvas", { class: "zd-sky", "aria-hidden": "true" });
    this.stage.appendChild(this.skyCanvas);
    this.stage.appendChild(el("div", { class: "zd-stage__head" }, [
      el("div", { class: "zd-brand" }, [el("span", { class: "zd-brand__t", text: t(UI.title) }), el("span", { class: "zd-brand__l", text: t(UI.lead) })])
    ]));
    this.stage.appendChild(this.zoomBox);
    var tools = el("div", { class: "zd-tools" });
    this.undoBtn = this.toolBtn("undo", function () { self.tool_undo(); });
    this.zoomBtn = this.toolBtn("zoom", function () { self.toggleZoom(); });
    tools.appendChild(this.undoBtn);
    tools.appendChild(this.toolBtn("reset", function () { self.tool_reset(); }));
    // кнопка «Лупа» убрана из панели; приближение — щипком и колесом
    this.stage.appendChild(tools);
    this.toastEl = el("div", { class: "zd-toast", role: "status", "aria-live": "polite" });
    this.stage.appendChild(this.toastEl);

    // слой 1: навигатор
    this.nav = el("nav", { class: "zd-nav", "aria-label": t(UI.build) });
    this.navList = el("ol", { class: "zd-nav__list" });
    this.navBuild = el("div", { class: "zd-nav__build" });
    this.nav.appendChild(this.navList);
    this.nav.appendChild(this.navBuild);

    // слой 2: рабочая область (на мобильном — шторка)
    this.work = el("section", { class: "zd-work" });
    this.handle = el("button", { class: "zd-handle", type: "button", "aria-label": "", html: "<span></span>" });
    this.mstep = el("div", { class: "zd-mstep" });
    this.mstepWrap = el("div", { class: "zd-mstep-wrap" }, [this.mstep]);
    this.mcur = el("div", { class: "zd-mcur" });
    this.head = el("header", { class: "zd-work__head" });
    this.tabsBar = el("div", { class: "zd-tabs2", role: "tablist" });
    this.content = el("div", { class: "zd-content" });
    this.foot = el("div", { class: "zd-work__foot" });
    this.cta = el("div", { class: "zd-cta-bar" });
    [this.handle, this.mstepWrap, this.mcur, this.head, this.tabsBar, this.content, this.foot, this.cta].forEach(function (n) { self.work.appendChild(n); });

    r.appendChild(this.stage);
    r.appendChild(this.nav);
    r.appendChild(this.work);
    this.pop = el("div", { class: "zd-pop", role: "tooltip", hidden: true });
    r.appendChild(this.pop);
    this.modal = el("div", { class: "zd-modal", hidden: true });
    r.appendChild(this.modal);

    this.mq = window.matchMedia("(max-width: 860px)");
    var onMq = function () { self.renderUI(false); self.fit(); self.pickResolution(); };
    if (this.mq.addEventListener) this.mq.addEventListener("change", onMq); else this.mq.addListener(onMq);
    window.addEventListener("hashchange", function () {
      var h = parseHash(); if (h) self.commit(Object.assign(clone(DEFAULT), h), { fromHash: true });
    });
    this.setupZoom();
    this.setupZones();
    this.inPanel({ x: 0, y: 0 }); // заранее готовим маску панели
    this.setupSheet();
    this.setupSwipe();
    this.fit();
    if (window.ResizeObserver) new ResizeObserver(function () { self.fit(); }).observe(this.zoomBox);
    else window.addEventListener("resize", function () { self.fit(); });
    window.addEventListener("resize", function () { self.pickResolution(); });
    this.pickResolution(true);
    var zb = this.zoomBox, stage = this.stage, ph = this.phone;
    this.sky = new Sky(this.skyCanvas, function () {
      var sr = stage.getBoundingClientRect(), r = zb.getBoundingClientRect();
      return { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, pw: ph.offsetWidth, ph: ph.offsetHeight };
    });
  };

  P.toolBtn = function (k, fn) {
    return el("button", { class: "zd-tool", type: "button", "aria-label": t(UI.tools[k]), "data-tip": t(UI.tools[k]), onclick: fn },
      [el("span", { class: "zd-tool__i", html: icon(k === "zoom" ? "zoom" : k) }), el("span", { class: "zd-tool__l", text: t(UI.tools[k]) })]);
  };

  P.isMobile = function () { return this.mq.matches; };

  // Телефон вписывается в сцену с сохранением пропорций
  P.fit = function () {
    var r = this.zoomBox.getBoundingClientRect(), k = this.isMobile() ? 0.92 : 0.9;
    var sc = Math.min(r.width * k / CROP.w, r.height * k / CROP.h);
    if (!(sc > 0)) return;
    this.phone.style.width = Math.round(CROP.w * sc) + "px";
    this.phone.style.height = Math.round(CROP.h * sc) + "px";
    this.halo.style.width = Math.round(CROP.w * sc * 1.7) + "px";
    this.halo.style.height = Math.round(CROP.h * sc * 1.38) + "px";
    if (this.zs && this.zs.z > 1 && this.zs.target) this.zoomToCanvas(this.zs.z, this.zs.target.x, this.zs.target.y, false);
  };

  P.pickResolution = function (initial) {
    var w = this.phone.getBoundingClientRect().width || 600;
    var needFull = w * (CANVAS_W / CROP.w) * (window.devicePixelRatio || 1) > 1000;
    if (initial) { this.half = !needFull; return; }
    if (needFull && this.half) {
      this.half = false; this.slots = {}; this.recolors = {}; this.layersBox.innerHTML = ""; this.renderPhone();
    }
  };

  /* ------------------------------------------------------------ state */
  P.set = function (patch, opt) { this.commit(Object.assign(clone(this.state), patch), opt); };

  P.commit = function (next, opt) {
    opt = opt || {};
    fixPlate(next);
    // Правило: камни нельзя закрепить в чёрном титане
    if (next.ring === "black" && next.decor !== "metal") {
      next.decor = "metal";
      if (!opt.silent) this.toast(t(UI.blackRule));
    }
    var prev = this.state;
    if (JSON.stringify(next) === JSON.stringify(prev)) return;
    if (!opt.noHistory) { this.history.push(prev); if (this.history.length > 50) this.history.shift(); }
    this.state = next;
    this.saveState();
    if (!opt.fromHash && location.hash.indexOf("zd=") > -1) history.replaceState(null, "", location.pathname + location.search);
    if (next.sign !== prev.sign) track("zd_sign_select", { sign: next.sign });
    else track("zd_option_change", { step: this.step });
    var self = this;
    this.renderPhone().then(function () { self.flashChanges(prev, next); });
    this.renderUI(false);
  };

  /* ------------------------------------------------------------ step model */
  // Шаг = [родительский выбор-карточки] + вкладки (независимые подпункты) или блоки.
  P.model = function (step) {
    var s = this.state, self = this, m = { parent: null, tabs: null, blocks: [] };
    function metalOpts(field, swFn, extra) {
      return METALS.map(function (mt) {
        return Object.assign({ id: mt.id, label: t(mt.name), sw: swFn(mt.id), sel: s[field] === mt.id, info: mt.info,
          pick: function () { var p = {}; p[field] = mt.id; self.set(p); } }, extra ? extra(mt) : {});
      });
    }
    function frameSw(id) { return sw("frame_" + id); }
    switch (step) {
      case "sign":
        m.blocks.push({ id: "sign", title: t(UI.g.sign), cls: "zd-grid--sign", opts: SIGNS.map(function (z) {
          var elm = ELEMENTS[z.id];
          return { id: z.id, label: t(z.name), sub: z.dates, sw: sw("sign_" + z.id), sel: s.sign === z.id,
            cardSw: sw("const_" + z.id), cardTitle: t(z.name) + " · " + t(elm), cardSub: z.dates,
            info: L("Созвездие знака выложено бриллиантами в центре круга, на медальоне — рельефный символ знака.", "The constellation is set with diamonds in the centre of the circle; the medallion carries the sign's symbol in relief."),
            infoTitle: t(z.name) + " · " + z.dates,
            pick: function () { self.set({ sign: z.id }); } };
        }) });
        // сборка текущего знака — первой
        var looks = PRESETS.filter(function (p) { return p.id === s.sign; }).concat(PRESETS.filter(function (p) { return p.id !== s.sign; }));
        m.blocks.push({ id: "presets", optional: true, cls: "zd-grid--row", title: t(UI.g.presets), opts: looks.map(function (p) {
          var z = find(SIGNS, p.id);
          return { id: p.id, label: t(z.name), sw: sw("look_" + p.id), sel: false, infoTitle: t(z.name) + " · «" + t(p.name) + "» · " + t(ELEM_TONE[p.el]), info: self.presetInfo(p),
            pick: function () { self.set(Object.assign({ panelTex: 1, panelMetal: p.s.frame, panelFrame: p.s.frame, panelFill: "meteorite", panelEnamel: null }, p.s, { sign: p.id })); track("zd_preset", { preset: p.id }); } };
        }).concat([{ id: "random", label: { ru: "Случайно", en: "Random" }[LANG], infoTitle: t(UI.random), iconSw: "dice", sel: false, info: UI.randomInfo, pick: function () { self.tool_random(); } }]) });
        // на мобильном две группы первого шага — вкладками, чтобы в шторке была одна лента
        if (this.isMobile()) { m.tabs = m.blocks; m.blocks = []; }
        else {
          // карточка знака — под пресетами: «Выбор Caviar» остаётся в первом экране и на планшете
          m.blocks[0].noCard = true;
          var curSign = m.blocks[0].opts.filter(function (o) { return o.sel; })[0];
          if (curSign) m.blocks.push({ id: "signcard", kind: "card", opt: curSign });
        }
        break;
      case "frame":
        m.blocks.push({ id: "metal", title: t(UI.g.metal), opts: metalOpts("frame", frameSw) });
        m.blocks.push({ id: "one", kind: "action", label: t(UI.tools.oneMetal), act: function () { self.tool_oneMetal(); } });
        break;
      case "plate":
        m.parent = { id: "base", title: t(UI.g.base), opts: [{ id: "metal", label: t(UI.g.metal), sub: { ru: "Лучевой гильош", en: "Radial guilloché" }[LANG],
          sw: sw("plate_metal_" + (s.plate === "metal" ? s.plateColor : "silver")), info: PLATE_METAL_INFO }]
          .concat(LEATHERS.map(function (l) {
            return { id: l.id, label: t(l.short), sub: { ru: l.colors.length + (l.colors.length > 4 ? " цветов" : " цвета"), en: l.colors.length + " colours" }[LANG],
              sw: sw("plate_" + l.id + "_" + (s.plate === l.id ? s.plateColor : l.colors[0][0])), info: l.info };
          })).map(function (o) {
            return Object.assign(o, { sel: s.plate === o.id, pick: function () {
              if (s.plate === o.id) return;
              self.set({ plate: o.id, plateColor: o.id === "metal" ? "black" : find(LEATHERS, o.id).colors[0][0] });
            } });
          }) };
        if (s.plate === "metal") m.blocks.push({ id: "color", child: true, title: t(UI.g.metal) + " · " + { ru: "лучевой гильош", en: "radial guilloché" }[LANG],
          opts: metalOpts("plateColor", function (id) { return sw("plate_metal_" + id); }) });
        else {
          var lt = find(LEATHERS, s.plate);
          m.blocks.push({ id: "color", child: true, title: t(UI.g.color) + " · " + t(lt.name), opts: lt.colors.map(function (c) {
            return { id: c[0], label: c[1], sw: sw("plate_" + lt.id + "_" + c[0]), sel: s.plateColor === c[0], info: lt.info, infoTitle: t(lt.name) + " · " + c[1],
              pick: function () { self.set({ plateColor: c[0] }); } };
          }) });
        }
        break;
      case "ring":
        var black = s.ring === "black";
        m.tabs = [
          { id: "metal", title: t(UI.g.metal), opts: metalOpts("ring", frameSw) },
          { id: "decor", title: t(UI.g.decor), opts: [{ id: "metal", label: t(UI.noStones), sw: sw("none"), sel: s.decor === "metal",
              info: L("Металлические вставки в цвет круга.", "Metal inserts matching the circle."), pick: function () { self.set({ decor: "metal" }); } }]
            .concat(STONES.map(function (st) {
              return { id: st.id, label: t(st.name), sw: sw("decor_" + st.id), sel: s.decor === st.id, info: st.info,
                disabled: black ? UI.blackHint : null, pick: function () { self.set({ decor: st.id }); } };
            })) },
          { id: "enamel", title: t(UI.g.enamel), kind: "color", field: "enamel", base: M.enamel_base.ring_enamel },
          { id: "core", title: t(UI.g.core), opts: CORES.map(function (c) {
            return { id: c.id, label: t(c.name), sw: sw("core_" + c.id), sel: s.core === c.id, info: c.info, pick: function () { self.set({ core: c.id }); } };
          }) }
        ];
        break;
      case "medal":
        m.parent = { id: "medal", title: t(UI.g.medal), opts: [
          { id: "on", label: t(UI.on), sw: sw("medal_" + s.sign + "_" + s.medal), sel: !!s.medalOn, info: L("Медальон с рельефным символом знака.", "Medallion with your sign's symbol in relief."), pick: function () { self.set({ medalOn: 1 }); } },
          { id: "off", label: t(UI.off), sw: sw("none"), sel: !s.medalOn, info: L("Гильош рамы остаётся открытым.", "The frame guilloché stays open."), pick: function () { self.set({ medalOn: 0 }); } }
        ] };
        if (s.medalOn) m.blocks.push({ id: "metal", child: true, title: t(UI.g.metal) + " · " + t(UI.g.medal).toLowerCase(), opts: METALS.map(function (mt) {
          return { id: mt.id, label: t(mt.name), sw: sw("medal_" + s.sign + "_" + mt.id), sel: s.medal === mt.id, info: mt.info, pick: function () { self.set({ medal: mt.id }); } };
        }) });
        break;
      case "panel":
        m.parent = { id: "panel", title: t(UI.g.panel), big: true, opts: [
          { id: "clear", label: t(UI.clear), sub: { ru: "Метеорит или эмаль", en: "Meteorite or enamel" }[LANG], sw: sw("panel_clear"), sel: s.panel === "clear",
            info: L("Ажурная рамка с вставками: метеорит или ювелирная эмаль.", "An open-work frame with inlays: meteorite or jewellery enamel."), pick: function () { self.set({ panel: "clear" }); } },
          { id: "solid", label: t(UI.solid), sub: { ru: "Металл с гильошем", en: "Metal with guilloché" }[LANG], sw: sw("panel_mono1_" + s.panelMetal), sel: s.panel === "solid",
            info: L("Цельный металл с гильошем.", "Solid metal with guilloché."), pick: function () { self.set({ panel: "solid" }); } },
          { id: "none", label: t(UI.noPanel), sub: { ru: "Плато открыто", en: "Plate fully open" }[LANG], sw: sw("none"), sel: s.panel === "none",
            info: L("Плато открыто целиком.", "The plate stays fully open."), pick: function () { self.set({ panel: "none" }); } }
        ] };
        if (s.panel === "clear") {
          m.tabs = [{ id: "fill", title: t(UI.g.fill), opts: [
            { id: "meteorite", label: { ru: "Метеорит", en: "Meteorite" }[LANG], sw: sw("fill_meteorite"), sel: s.panelFill === "meteorite",
              info: L("Пластины метеорита: рисунок кристаллов формировался миллионы лет, и каждый срез уникален.", "Meteorite plates: the crystal pattern formed over millions of years, and every slice is unique."),
              pick: function () { self.set({ panelFill: "meteorite" }); } },
            { id: "enamel", label: { ru: "Эмаль", en: "Enamel" }[LANG], sw: sw("fill_enamel"), sel: s.panelFill === "enamel", info: ENAMEL_INFO,
              pick: function () { self.set({ panelFill: "enamel" }); } }
          ] }];
          if (s.panelFill === "enamel") m.tabs.push({ id: "penamel", title: t(UI.g.penamel), kind: "color", field: "panelEnamel", base: M.enamel_base.panel_fill_enamel });
          m.tabs.push({ id: "pframe", title: t(UI.g.pframe), opts: metalOpts("panelFrame", frameSw) });
        } else if (s.panel === "solid") {
          m.tabs = [
            { id: "texture", title: t(UI.g.texture), opts: TEXTURES.map(function (x) {
              return { id: String(x.id), label: t(x.name), sw: sw("panel_mono" + x.id + "_" + s.panelMetal), sel: s.panelTex === x.id, info: x.info, pick: function () { self.set({ panelTex: x.id }); } };
            }) },
            { id: "metal", title: t(UI.g.metal), opts: METALS.map(function (mt) {
              return { id: mt.id, label: t(mt.name), sw: sw("panel_mono" + s.panelTex + "_" + mt.id), sel: s.panelMetal === mt.id, info: mt.info, pick: function () { self.set({ panelMetal: mt.id }); } };
            }) }
          ];
        } else m.tabs = [];
        m.childTabs = true;
        break;
      case "base":
        m.blocks.push({ id: "body", title: t(UI.g.body), opts: BASES.map(function (b) {
          return { id: b.id, label: t(b.name), color: b.color, sw: sw("base_" + b.id), sel: s.base === b.id, info: b.info, pick: function () { self.set({ base: b.id }); } };
        }) });
        break;
    }
    return m;
  };

  P.presetInfo = function (p) {
    var x = p.s, parts = [t(find(METALS, x.frame).name)];
    parts.push(x.plate === "metal" ? t(UI.g.metal) : t(find(LEATHERS, x.plate).short) + " " + colorName(x.plate, x.plateColor));
    parts.push(x.decor === "metal" ? t(UI.noStones) : t(find(STONES, x.decor).name));
    var h = t(p.harmony) + " " + parts.join(" · ") + ".";
    return L(h, h);
  };

  P.groupValue = function (g) {
    if (!g) return "";
    if (g.kind === "color") return enamelName(this.state[g.field]);
    if (!g.opts) return "";
    for (var i = 0; i < g.opts.length; i++) if (g.opts[i].sel) return g.opts[i].label;
    return g.id === "presets" ? { ru: "12 сборок", en: "12 looks" }[LANG] : "";
  };

  P.curTab = function (step, m) {
    m = m || this.model(step);
    if (!m.tabs || !m.tabs.length) return null;
    var id = this.tab[step], ok = m.tabs.some(function (g) { return g.id === id; });
    if (!ok) id = this.tab[step] = m.tabs[0].id;
    return id;
  };

  P.stepValue = function (step) {
    var s = this.state;
    switch (step) {
      case "sign": return t(find(SIGNS, s.sign).name);
      case "frame": return t(find(METALS, s.frame).name);
      case "plate": return s.plate === "metal" ? t(UI.g.metal) + " · " + t(find(METALS, s.plateColor).name) : t(find(LEATHERS, s.plate).short) + " · " + colorName(s.plate, s.plateColor);
      case "ring": return t(find(METALS, s.ring).name) + " · " + (s.decor === "metal" ? t(UI.noStones) : t(find(STONES, s.decor).name));
      case "medal": return s.medalOn ? t(find(METALS, s.medal).name) : t(UI.off);
      case "panel": return s.panel === "none" ? t(UI.noPanel) : s.panel === "clear" ? t(UI.clear) + " · " + (s.panelFill === "meteorite" ? { ru: "метеорит", en: "meteorite" }[LANG] : { ru: "эмаль", en: "enamel" }[LANG]) : t(UI.solid) + " · " + t(find(TEXTURES, s.panelTex).name);
      case "base": return t(find(BASES, s.base).name);
      case "summary": return t(UI.price);
    }
  };

  /* ------------------------------------------------------------ navigation */
  P.go = function (step, tab, opt) {
    opt = opt || {};
    var prevStep = this.step, dir = STEP_IDS.indexOf(step) >= STEP_IDS.indexOf(prevStep) ? 1 : -1;
    this.step = step;
    if (tab) this.tab[step] = tab;
    this.visited[step] = true;
    if (step === "summary") track("zd_summary", {});
    if (this.isMobile()) {
      // шаг круга уже разбит на вкладки и помещается в половину; развёрнутая шторка — для итога
      if (false) { /* итог остаётся в половине шторки: превью не сжимается, список листается внутри */ }
      else if (this.sheetAuto && this.sheet === "expanded") { this.setSheet("half"); this.sheetAuto = false; }
      if (opt.fromZone && this.sheet === "collapsed") this.setSheet("half");
    }
    this.autoZoom();
    this.renderUI(true, opt.dir || dir);
  };

  // «Далее»/«Назад» ходят по вкладкам шага, затем по шагам; необязательные вкладки (готовые образы) пропускаются
  function seqTabs(m) { return (m.tabs || []).filter(function (g) { return !g.optional; }); }
  function tabIndex(tabs, cur) { var i = tabs.map(function (g) { return g.id; }).indexOf(cur); return i < 0 ? tabs.length - 1 : i; }
  P.next = function () {
    var m = this.model(this.step), tabs = seqTabs(m), i = tabIndex(tabs, this.curTab(this.step, m));
    if (tabs.length && i < tabs.length - 1) { this.tab[this.step] = tabs[i + 1].id; this.renderUI(true, 1); return; }
    var idx = STEP_IDS.indexOf(this.step);
    if (idx < STEP_IDS.length - 1) { var ns = STEP_IDS[idx + 1], nm = this.model(ns); if (nm.tabs && nm.tabs.length) this.tab[ns] = nm.tabs[0].id; this.go(ns, null, { dir: 1 }); }
  };
  P.prev = function () {
    var m = this.model(this.step), tabs = seqTabs(m), i = tabIndex(tabs, this.curTab(this.step, m));
    if (tabs.length && i > 0) { this.tab[this.step] = tabs[i - 1].id; this.renderUI(true, -1); return; }
    var idx = STEP_IDS.indexOf(this.step);
    if (idx > 0) { var ps = STEP_IDS[idx - 1], pm = this.model(ps); var pt = seqTabs(pm); if (pt.length) this.tab[ps] = pt[pt.length - 1].id; this.go(ps, null, { dir: -1 }); }
  };
  P.nextLabel = function () {
    var m = this.model(this.step), tabs = seqTabs(m), i = tabIndex(tabs, this.curTab(this.step, m));
    if (tabs.length && i < tabs.length - 1) return t(UI.next) + " · " + tabs[i + 1].title;
    var idx = STEP_IDS.indexOf(this.step);
    if (idx >= STEP_IDS.length - 1) return "";
    var ns = STEP_IDS[idx + 1];
    return ns === "summary" ? t(UI.toSummary) : t(UI.next) + " · " + t(UI.short[ns]);
  };

  /* ------------------------------------------------------------ render UI */
  P.renderUI = function (animate, dir) {
    this.root.classList.toggle("zd--mobile", this.isMobile());
    this.root.setAttribute("data-step", this.step);
    this.renderNav();
    this.renderWork(animate, dir);
    this.undoBtn.disabled = !this.history.length;
  };

  P.progress = function () {
    var self = this;
    return STEP_IDS.slice(0, 7).filter(function (s) { return self.visited[s]; }).length;
  };

  P.renderNav = function () {
    var self = this;
    this.navList.innerHTML = "";
    STEP_IDS.forEach(function (id, i) {
      var active = self.step === id, done = self.visited[id] && !active;
      var li = el("li", { class: "zd-nav__item" + (active ? " is-active" : "") + (done ? " is-done" : "") + (self.hintStep === id ? " is-hint" : ""), "data-step": id }, [
        el("button", { type: "button", "aria-current": active ? "step" : null, onclick: function () { self.go(id); } }, [
          el("span", { class: "zd-nav__n", html: done ? icon("check") : String(i + 1) }),
          el("span", { class: "zd-nav__t" }, [el("span", { class: "zd-nav__name" }, [el("span", { class: "zd-nav__full", text: t(UI.steps[id]) }), el("span", { class: "zd-nav__short", text: t(UI.short[id]) })]), el("span", { class: "zd-nav__val", text: self.stepValue(id) })])
        ])
      ]);
      self.navList.appendChild(li);
    });
    // блок «Сборка»: код, копирование, поделиться, скачать
    this.navBuild.innerHTML = "";
    this.navBuild.appendChild(el("div", { class: "zd-nav__bt", text: t(UI.build) }));
    this.navBuild.appendChild(this.codeChip());
    this.navBuild.appendChild(el("div", { class: "zd-nav__acts" }, [
      this.actBtn("download", function () { self.tool_download(); })
    ]));

    // мобильный степпер: короткие ярлыки, активный по центру
    this.mstep.innerHTML = "";
    STEP_IDS.forEach(function (id, i) {
      var active = self.step === id, done = self.visited[id] && !active;
      self.mstep.appendChild(el("button", { class: "zd-mstep__b" + (active ? " is-active" : "") + (done ? " is-done" : ""), type: "button", onclick: function () { self.go(id); } },
        [el("span", { class: "zd-mstep__n", html: done ? icon("check") : String(i + 1) }), el("span", { text: t(UI.short[id]) })]));
    });
    var at = this.mstep.querySelector(".is-active");
    if (at) {
      var ms = this.mstep;
      requestAnimationFrame(function () {
        var target = at.offsetLeft - (ms.clientWidth - at.offsetWidth) / 2;
        if (ms.scrollTo && !REDUCED) ms.scrollTo({ left: target, behavior: "smooth" }); else ms.scrollLeft = target;
      });
    }
    // свёрнутая шторка: текущий шаг, значение, «Далее»
    this.mcur.innerHTML = "";
    var idx = STEP_IDS.indexOf(this.step);
    this.mcur.appendChild(el("button", { class: "zd-mcur__t", type: "button", onclick: function () { self.setSheet("half"); } }, [
      el("span", { class: "zd-mcur__name", text: (idx + 1) + " · " + t(UI.steps[this.step]) }),
      el("span", { class: "zd-mcur__val", text: this.stepValue(this.step) })
    ]));
    var nl = this.nextLabel();
    if (nl) this.mcur.appendChild(el("button", { class: "zd-btn zd-btn--next", type: "button", onclick: function () { self.next(); } },
      [el("span", { text: t(UI.next) }), el("span", { class: "zd-btn__i", html: icon("right") })]));
    else this.mcur.appendChild(el("button", { class: "zd-btn zd-btn--gold", type: "button", text: t(UI.order), onclick: function () { self.openForm(); } }));
  };

  P.actBtn = function (k, fn) {
    return el("button", { class: "zd-act", type: "button", onclick: fn }, [el("span", { class: "zd-act__i", html: icon(k) }), el("span", { text: t(UI.tools[k]) })]);
  };
  // Поле «Открыть по коду»: менеджер вводит код (или вставляет ссылку) — открывается сборка и её итог
  P.codeOpener = function () {
    var self = this, msg = el("div", { class: "zd-open__msg", role: "status" });
    var inp = el("input", { class: "zd-open__in", type: "text", inputmode: "text", autocomplete: "off", autocapitalize: "characters", spellcheck: "false",
      placeholder: "ZD-ARI-XXXX-XXXX", "aria-label": t(UI.openCode) });
    var form = el("form", { class: "zd-open", novalidate: true }, [
      el("label", { class: "zd-open__l", text: t(UI.openCode) }),
      el("div", { class: "zd-open__row" }, [inp, el("button", { class: "zd-open__b", type: "submit", text: t(UI.openBtn) })]),
      msg
    ]);
    inp.addEventListener("input", function () { msg.textContent = ""; inp.classList.remove("is-bad"); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var v = inp.value.trim(), st = decodeCode(v);
      if (!st && /zd=/.test(v)) { var mm = /zd=([^&\s]+)/.exec(v); st = mm && parseHashStr(mm[1]); }
      if (!st) {
        // код прежнего формата (до 11.10.2026): 4 символа после знака, сборку не хранил
        var old = /^ZD[-\s]?[A-Z]{3}[-\s]?[0-9A-Z]{4}$/i.test(v.replace(/\s+/g, " ").trim());
        msg.textContent = t(old ? UI.codeOld : UI.codeBad); inp.classList.add("is-bad"); return;
      }
      self.commit(Object.assign(clone(DEFAULT), st), { silent: true });
      self.toast(fmt(t(UI.codeOpened), self.code()));
      track("zd_code_open", { code: self.code() });
      self.go("summary");
    });
    return form;
  };

  P.codeChip = function (big) {
    var self = this;
    return el("div", { class: "zd-code" + (big ? " zd-code--big" : "") }, [
      el("span", { class: "zd-code__l", text: t(UI.code) }),
      el("span", { class: "zd-code__v", text: this.code() }),
      el("button", { class: "zd-code__copy", type: "button", "aria-label": t(UI.tools.copy), "data-tip": t(UI.tools.copy), html: icon("copy"),
        onclick: function () { self.copy(self.code(), t(UI.codeCopied)); } })
    ]);
  };

  P.renderWork = function (animate, dir) {
    var self = this, step = this.step, idx = STEP_IDS.indexOf(step), m = step === "summary" ? null : this.model(step);
    var keepScroll = !animate ? this.content.scrollTop : 0;

    // заголовок шага
    this.head.innerHTML = "";
    this.head.appendChild(el("div", { class: "zd-work__step", text: fmt(t(UI.stepOf), idx + 1) }));
    this.head.appendChild(el("h3", { class: "zd-work__title", text: t(UI.steps[step]) }));

    // контент
    var body = el("div", { class: "zd-body2" });
    this.tabsBar.innerHTML = "";
    this.tabsBar.hidden = true;
    if (step === "summary") body.appendChild(this.renderSummary());
    else {
      if (m.parent) body.appendChild(this.renderCards(m.parent));
      var dep = el("div", { class: "zd-dep" + (m.parent ? " is-child" : "") });
      var depInner = el("div", { class: "zd-dep__in" });
      dep.appendChild(depInner);
      if (m.tabs && m.tabs.length) {
        var cur = this.curTab(step, m), g = null;
        var bar = el("div", { class: "zd-tabs2", role: "tablist" });
        m.tabs.forEach(function (tg) {
          if (tg.id === cur) g = tg;
          bar.appendChild(el("button", { class: "zd-tab2" + (tg.id === cur ? " is-active" : ""), type: "button", role: "tab", "aria-selected": tg.id === cur ? "true" : "false",
            onclick: function () { self.tab[step] = tg.id; self.renderUI(true, 0); } },
            [el("span", { class: "zd-tab2__t", text: tg.title }), el("span", { class: "zd-tab2__v", text: self.groupValue(tg) })]));
        });
        if (m.parent) depInner.appendChild(el("div", { class: "zd-dep__t", html: "<b>↳</b> " + { ru: "Настройка", en: "Options" }[LANG] + " · " + this.groupValue(m.parent) }));
        // вкладки шага без родителя живут в отдельной полосе над контентом
        if (m.parent) depInner.appendChild(bar);
        else { this.tabsBar.replaceWith(bar); this.tabsBar = bar; }
        depInner.appendChild(this.renderGroup(g, true));
      } else {
        m.blocks.forEach(function (b) {
          if (b.kind === "card") { depInner.appendChild(self.matCard(b.opt)); return; }
          if (b.kind === "action") {
            depInner.appendChild(el("button", { class: "zd-link", type: "button", onclick: b.act, html: icon("link") + "<span>" + b.label + "</span>" }));
            return;
          }
          var box = self.renderGroup(b, !!m.parent);
          if (b.child && m.parent) box.insertBefore(el("div", { class: "zd-dep__t", html: "<b>↳</b> " + b.title }), box.firstChild);
          depInner.appendChild(box);
        });
      }
      var hasDep = depInner.childNodes.length > 0;
      // зависимые опции появляются/сворачиваются анимированно (смысл: «без панели» → настраивать нечего)
      var prevDep = this.content.querySelector(".zd-dep");
      var hadDep = prevDep && prevDep.getAttribute("data-step") === step && prevDep.getAttribute("data-open") === "1";
      dep.setAttribute("data-step", step);
      dep.setAttribute("data-open", hasDep ? "1" : "0");
      if (hasDep && m.parent && !hadDep && prevDep && prevDep.getAttribute("data-step") === step && !REDUCED) dep.classList.add("is-opening");
      if (!hasDep && hadDep && !REDUCED) {
        var ghost = prevDep.cloneNode(true);
        ghost.classList.add("is-closing");
        ghost.style.pointerEvents = "none";
        body.appendChild(ghost);
        setTimeout(function () { if (ghost.parentNode) ghost.remove(); }, 380);
      }
      body.appendChild(dep);
    }
    if (m && m.tabs && m.tabs.length && !m.parent) { this.tabsBar.hidden = false; this.tabsBar.className = "zd-tabs2 zd-tabs2--top"; }
    else if (this.tabsBar) this.tabsBar.hidden = true;

    this.content.innerHTML = "";
    this.content.appendChild(body);
    // смена раздела: заголовок, вкладки и блоки содержимого проявляются по очереди
    if (animate && !REDUCED) {
      // тот же шаг (переключение вкладки) — анимируется только содержимое подгруппы, заголовок и вкладки стоят
      var w = this.work, cls = dir < 0 ? "is-sw-back" : "is-sw", sub = this._swStep === step;
      w.classList.remove("is-sw", "is-sw-back", "is-sw-sub"); void w.offsetWidth; w.classList.add(cls);
      if (sub) w.classList.add("is-sw-sub");
      clearTimeout(this._swT); this._swT = setTimeout(function () { w.classList.remove(cls, "is-sw-sub"); }, 2400);
    }
    this._swStep = step;
    this.content.scrollTop = keepScroll;
    this.checkMore();
    // в горизонтальных лентах выбранный вариант всегда в поле зрения
    if (this.isMobile()) body.querySelectorAll(".zd-grid, .zd-cards, .zd-tabs2").forEach(function (row) {
      var sel = row.querySelector(".is-sel, .is-active");
      if (!sel) return;
      var rr = row.getBoundingClientRect(), sr = sel.getBoundingClientRect();
      if (sr.right > rr.right - 24 || sr.left < rr.left) row.scrollLeft += sr.left - rr.left - 16;
    });

    // низ: Назад / Далее
    this.foot.innerHTML = "";
    if (idx > 0) this.foot.appendChild(el("button", { class: "zd-btn zd-btn--ghost", type: "button", "aria-label": t(UI.back), onclick: function () { self.prev(); } },
      [el("span", { class: "zd-btn__i", html: icon("left") }), el("span", { class: "zd-btn__l", text: t(UI.back) })]));
    var nl = this.nextLabel();
    if (nl) this.foot.appendChild(el("button", { class: "zd-btn zd-btn--next", type: "button", onclick: function () { self.next(); } },
      [el("span", { text: nl }), el("span", { class: "zd-btn__i", html: icon("right") })]));

    // липкий CTA на всех шагах, кроме итога (там он главный)
    this.cta.innerHTML = "";
    var isSum = step === "summary";
    this.cta.classList.toggle("is-main", isSum);
    this.cta.appendChild(el("button", { class: "zd-cta" + (isSum ? " zd-cta--big" : ""), type: "button", text: t(UI.order), onclick: function () { self.openForm(); } }));
    this.cta.appendChild(el("div", { class: "zd-cta__cap" }, [
      isSum ? el("span", { class: "zd-cta__code", text: t(UI.price) + " · " + this.code() }) : null,
      null // счётчик «N из 7 пройдено» убран
    ]));
    // мобильный: на шагах 1–7 вместо второй большой кнопки — тонкая строка «прогресс · Оформить →»
    if (!isSum) this.cta.appendChild(el("button", { class: "zd-cta__link", type: "button", onclick: function () { self.openForm(); } },
      [el("span", { text: { ru: "Оформить", en: "Request" }[LANG] }), el("span", { class: "zd-btn__i", html: icon("right") })]));
  };

  // Затухание над кнопками, если ниже в шаге есть ещё контент
  P.checkMore = function () {
    var c = this.content, self = this;
    if (!this._moreBound) {
      this._moreBound = true;
      c.addEventListener("scroll", function () { self.checkMore(); }, { passive: true });
      if (window.ResizeObserver) new ResizeObserver(function () { self.checkMore(); }).observe(c);
    }
    var upd = function () { c.classList.toggle("has-more", c.scrollHeight - c.scrollTop - c.clientHeight > 6); };
    upd(); setTimeout(upd, 120); // повтор — после загрузки картинок и анимации входа
  };

  // Родительский выбор — крупные карточки
  P.renderCards = function (g) {
    var self = this, box = el("div", { class: "zd-cards-wrap" });
    box.appendChild(el("div", { class: "zd-group__t", text: g.title }));
    var row = el("div", { class: "zd-cards" + (g.opts.length === 3 ? " zd-cards--3" : ""), role: "radiogroup", "aria-label": g.title });
    g.opts.forEach(function (o) {
      var thumb = el("span", { class: "zd-card__img" });
      if (o.sw) thumb.style.backgroundImage = "url('" + o.sw + "')";
      var b = el("button", { class: "zd-card" + (o.sel ? " is-sel" : ""), type: "button", role: "radio", "aria-checked": o.sel ? "true" : "false",
        onclick: function () { o.pick(); } }, [thumb,
        el("span", { class: "zd-card__txt" }, [el("span", { class: "zd-card__t", text: o.label }), o.sub ? el("span", { class: "zd-card__s", text: o.sub }) : null]),
        el("span", { class: "zd-card__ok", html: icon("check") })]);
      self.bindInfo(b, o);
      row.appendChild(b);
    });
    box.appendChild(row);
    return box;
  };

  P.renderGroup = function (g, inner) {
    var self = this, box = el("div", { class: "zd-group" + (g.child ? " zd-group--child" : "") });
    if (!inner && g.title) box.appendChild(el("div", { class: "zd-group__t", text: g.title }));
    if (g.kind === "color") { box.appendChild(this.renderColor(g)); return box; }
    var row = el("div", { class: "zd-grid" + (g.cls ? " " + g.cls : "") });
    g.opts.forEach(function (o) { row.appendChild(self.renderOpt(o)); });
    box.appendChild(row);
    // карточка выбранного материала — статично под свотчами (ховер остаётся дополнением)
    var sel = null;
    g.opts.forEach(function (o) { if (o.sel) sel = o; });
    if (sel && sel.info && !g.noCard) box.appendChild(this.matCard(sel));
    return box;
  };
  P.matCard = function (o) {
    var img = el("span", { class: "zd-mat__img" });
    if (o.cardSw || o.sw) img.style.backgroundImage = "url('" + (o.cardSw || o.sw) + "')";
    if (o.color) { if (o.cardSw || o.sw) img.style.backgroundColor = o.color; else img.style.background = o.color; }
    return el("div", { class: "zd-mat" }, [img, el("div", { class: "zd-mat__txt" }, [
      el("div", { class: "zd-mat__t", text: o.cardTitle || o.infoTitle || o.label }),
      o.cardSub ? el("div", { class: "zd-mat__s", text: o.cardSub }) : null,
      el("div", { class: "zd-mat__d", text: t(o.info) })
    ])]);
  };

  // Единый свотч: круг 60 px + подпись в одну строку; выбранный — кольцо, галочка, жирная подпись
  P.renderOpt = function (o) {
    var self = this;
    var circle = el("span", { class: "zd-sw__c" });
    if (o.sw) circle.style.backgroundImage = "url('" + o.sw + "')";
    if (o.color) { if (o.sw) circle.style.backgroundColor = o.color; else circle.style.background = o.color; }
    if (o.iconSw) circle.innerHTML = icon(o.iconSw, "zd-sw__ico");
    var kids = [el("span", { class: "zd-sw__ring" }, [circle, el("span", { class: "zd-sw__ok", html: icon("check") })]), el("span", { class: "zd-sw__l", text: o.label })];
    if (o.sub) kids.push(el("span", { class: "zd-sw__s", text: o.sub }));
    var b = el("button", { class: "zd-sw" + (o.sel ? " is-sel" : "") + (o.disabled ? " is-off" : ""), type: "button", "aria-pressed": o.sel ? "true" : "false",
      "aria-disabled": o.disabled ? "true" : null, "aria-label": o.label + (o.disabled ? ". " + t(o.disabled) : ""),
      onclick: function () {
        if (b._lp) { b._lp = false; return; }
        if (o.disabled) { self.toast(t(o.disabled)); return; }
        o.pick();
      } }, kids);
    this.bindInfo(b, o);
    return b;
  };

  // Карточка материала: ховер на десктопе (с задержкой), долгое нажатие на мобильном
  P.bindInfo = function (b, o) {
    var self = this, timer;
    if (!o.info && !o.disabled) return;
    b.addEventListener("pointerenter", function (e) {
      if (e.pointerType !== "mouse") return;
      clearTimeout(timer); timer = setTimeout(function () { self.showPop(b, o); }, 350);
    });
    b.addEventListener("pointerleave", function () { clearTimeout(timer); self.hidePop(); });
    b.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse") return;
      var sx = e.clientX, sy = e.clientY;
      clearTimeout(timer);
      timer = setTimeout(function () { b._lp = true; self.showPop(b, o); if (navigator.vibrate) navigator.vibrate(8); }, 450);
      var cancel = function (ev) {
        if (ev.type === "pointermove" && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return;
        clearTimeout(timer);
        if (ev.type !== "pointermove") setTimeout(function () { self.hidePop(); }, b._lp ? 1600 : 0);
        b.removeEventListener("pointermove", cancel); b.removeEventListener("pointerup", cancel); b.removeEventListener("pointercancel", cancel);
      };
      b.addEventListener("pointermove", cancel); b.addEventListener("pointerup", cancel); b.addEventListener("pointercancel", cancel);
    });
    b.addEventListener("contextmenu", function (e) { if (b._lp) e.preventDefault(); });
  };
  P.showPop = function (anchor, o) {
    var p = this.pop;
    p.innerHTML = "";
    p.appendChild(el("div", { class: "zd-pop__t", text: o.infoTitle || o.label }));
    if (o.info) p.appendChild(el("div", { class: "zd-pop__d", text: t(o.info) }));
    if (o.disabled) p.appendChild(el("div", { class: "zd-pop__off", text: t(o.disabled) }));
    p.hidden = false;
    var rr = this.root.getBoundingClientRect(), ar = anchor.getBoundingClientRect(), pr = p.getBoundingClientRect();
    var x = ar.left - rr.left + ar.width / 2 - pr.width / 2, y = ar.top - rr.top - pr.height - 8;
    if (y < 8) y = ar.bottom - rr.top + 8;
    x = Math.max(8, Math.min(rr.width - pr.width - 8, x));
    p.style.left = x + "px"; p.style.top = y + "px";
    p.classList.add("is-on");
  };
  P.hidePop = function () { this.pop.classList.remove("is-on"); this.pop.hidden = true; };

  P.renderColor = function (g) {
    var self = this, field = g.field, cur = this.state[field], hex = cur || g.base, hsl = hexToHsl(hex);
    var box = el("div", { class: "zd-color" });
    var row = el("div", { class: "zd-grid zd-grid--dots" });
    var basePreset = ENAMEL_PRESETS.filter(function (p) { return p.hex.toUpperCase() === String(g.base).toUpperCase(); })[0];
    row.appendChild(this.renderOpt({ id: "default", label: t(UI.enamelDefault), color: g.base, sw: basePreset ? sw("enamel_" + basePreset.id) : null, sel: !cur, info: UI.enamelDefaultInfo, infoTitle: t(UI.enamelDefault) + " · Caviar", pick: function () { var p = {}; p[field] = null; self.set(p); } }));
    // «Бургундия» уже представлена оттенком из эскиза — в списке не дублируем
    ENAMEL_PRESETS.filter(function (p) { return p.id !== "burgundy"; }).forEach(function (p) {
      row.appendChild(self.renderOpt({ id: p.id, label: t(p.name), color: p.hex, sw: sw("enamel_" + p.id), sel: cur === p.hex, pick: function () { var x = {}; x[field] = p.hex; self.set(x); } }));
    });
    // «Свой оттенок» — свотч в общем ряду: открывает настройку, выбранный свой цвет подписан под ним
    var open = !!this.tune[field];
    var isCustom = !!cur && !ENAMEL_PRESETS.some(function (p) { return p.hex.toUpperCase() === String(cur).toUpperCase(); });
    var sliders = el("div", { class: "zd-sliders" + (open ? " is-open" : "") });
    var customBtn = this.renderOpt({ id: "custom", label: t(UI.custom), sub: isCustom ? cur.toUpperCase() : null, sw: sw("enamel_custom"), sel: isCustom,
      info: UI.customInfo, infoTitle: t(UI.custom),
      pick: function () {
        self.tune[field] = !self.tune[field];
        sliders.classList.toggle("is-open", self.tune[field]);
        customBtn.classList.toggle("is-tune", self.tune[field]);
        customBtn.setAttribute("aria-expanded", self.tune[field] ? "true" : "false");
      } });
    customBtn.classList.toggle("is-tune", open);
    customBtn.setAttribute("aria-expanded", open ? "true" : "false");
    row.appendChild(customBtn);
    box.appendChild(row);
    function setCustomSub(hx) {
      var sub = customBtn.querySelector(".zd-sw__s");
      if (!sub) { sub = el("span", { class: "zd-sw__s" }); customBtn.appendChild(sub); }
      sub.textContent = hx.toUpperCase();
      [].forEach.call(row.querySelectorAll(".zd-sw"), function (x) { x.classList.toggle("is-sel", x === customBtn); });
    }
    var vals = hsl.slice(), readout = el("span", { class: "zd-hex", text: hex });
    function grad(i) {
      if (i === 0) return "linear-gradient(90deg," + [0, 60, 120, 180, 240, 300, 360].map(function (h) { return hslToHex(h, Math.max(40, vals[1]), 45); }).join(",") + ")";
      if (i === 1) return "linear-gradient(90deg," + hslToHex(vals[0], 0, vals[2]) + "," + hslToHex(vals[0], 100, vals[2]) + ")";
      return "linear-gradient(90deg,#000," + hslToHex(vals[0], vals[1], 50) + ",#fff)";
    }
    var inputs = [], inner = el("div", { class: "zd-sliders__in" });
    [[UI.hue, 360], [UI.sat, 100], [UI.light, 100]].forEach(function (d, i) {
      var inp = el("input", { type: "range", min: "0", max: String(d[1]), value: String(vals[i]), "aria-label": t(d[0]) });
      inp.style.background = grad(i);
      inp.addEventListener("input", function () {
        vals[i] = +inp.value;
        var hx = hslToHex(vals[0], vals[1], vals[2]);
        readout.textContent = hx;
        setCustomSub(hx);
        inputs.forEach(function (x, j) { x.style.background = grad(j); });
        var p = {}; p[field] = hx;
        // живое обновление без перерисовки панели и без лишних записей в историю
        self.state = Object.assign(clone(self.state), p);
        self.renderPhone();
      });
      inp.addEventListener("change", function () {
        var hx = hslToHex(vals[0], vals[1], vals[2]), before = clone(self.state); before[field] = cur;
        self.history.push(before);
        self.saveState();
        track("zd_option_change", { step: self.step, enamel: hx });
        cur = hx;
        self.flash(field === "enamel" ? ["ring"] : ["panel"]);
        self.renderUI(false);
      });
      inputs.push(inp);
      inner.appendChild(el("label", { class: "zd-slider" }, [el("span", { text: t(d[0]) }), inp]));
    });
    inner.appendChild(readout);
    sliders.appendChild(inner);
    box.appendChild(sliders);
    return box;
  };

  /* ------------------------------------------------------------ summary */
  // Строки итога: каждая ведёт в свой шаг и подпункт
  P.specRows = function () {
    var s = this.state, R = [];
    function metal(id) { return t(find(METALS, id).full); }
    var sign = find(SIGNS, s.sign);
    R.push({ step: "sign", label: t(UI.g.sign), value: t(sign.name) + " " + sign.sym + "︎" });
    R.push({ step: "base", label: t(UI.g.color), value: t(find(BASES, s.base).name) });
    R.push({ step: "frame", label: t(UI.g.metal), value: metal(s.frame) });
    R.push({ step: "plate", label: t(UI.g.base), value: s.plate === "metal" ? { ru: "Металл, лучевой гильош · ", en: "Metal, radial guilloché · " }[LANG] + metal(s.plateColor) : t(find(LEATHERS, s.plate).name) + " · " + colorName(s.plate, s.plateColor) });
    R.push({ step: "ring", tab: "metal", label: t(UI.g.metal), value: metal(s.ring) });
    R.push({ step: "ring", tab: "decor", label: t(UI.g.decor), value: s.decor === "metal" ? t(UI.noStones) : t(find(STONES, s.decor).name) });
    R.push({ step: "ring", tab: "enamel", label: t(UI.g.enamel), value: enamelName(s.enamel) + (s.enamel ? " · " + s.enamel : "") });
    R.push({ step: "ring", tab: "core", label: t(UI.g.core), value: t(find(CORES, s.core).name) });
    R.push({ step: "medal", label: t(UI.g.medal), value: s.medalOn ? { ru: "Символ знака · ", en: "Sign symbol · " }[LANG] + metal(s.medal) : t(UI.off) });
    if (s.panel === "none") R.push({ step: "panel", label: t(UI.g.panel), value: t(UI.noPanel) });
    else if (s.panel === "clear") {
      R.push({ step: "panel", label: t(UI.g.panel), value: t(UI.clear) });
      R.push({ step: "panel", tab: "fill", label: t(UI.g.fill), value: s.panelFill === "meteorite" ? { ru: "Метеорит", en: "Meteorite" }[LANG] : { ru: "Эмаль · ", en: "Enamel · " }[LANG] + enamelName(s.panelEnamel) + (s.panelEnamel ? " · " + s.panelEnamel : "") });
      R.push({ step: "panel", tab: "pframe", label: t(UI.g.pframe), value: metal(s.panelFrame) });
    } else {
      R.push({ step: "panel", label: t(UI.g.panel), value: t(UI.solid) });
      R.push({ step: "panel", tab: "texture", label: t(UI.g.texture), value: t(find(TEXTURES, s.panelTex).name) });
      R.push({ step: "panel", tab: "metal", label: t(UI.g.metal), value: metal(s.panelMetal) });
    }
    return R;
  };
  P.spec = function () {
    return this.specRows().map(function (r) { return [t(UI.steps[r.step]) + " · " + r.label, r.value]; });
  };
  P.code = function () { return encodeCode(this.state); };
  P.shareUrl = function () { return location.href.split("#")[0] + "#zd=" + serialize(this.state); };

  P.renderSummary = function () {
    var self = this, box = el("div", { class: "zd-summary" });
    box.appendChild(el("div", { class: "zd-sum__code" }, [this.codeChip(true), el("p", { class: "zd-sum__hint", text: t(UI.codeHint) })]));
    var list = el("div", { class: "zd-spec" }), rows = this.specRows(), last = null, grp = null;
    rows.forEach(function (r) {
      if (r.step !== last) {
        last = r.step;
        var n = STEP_IDS.indexOf(r.step) + 1;
        grp = el("div", { class: "zd-spec__g" }, [el("div", { class: "zd-spec__h" }, [el("span", { class: "zd-spec__n", text: String(n) }), el("span", { text: t(UI.steps[r.step]) })])]);
        list.appendChild(grp);
      }
      grp.appendChild(el("button", { class: "zd-spec__r", type: "button", title: t(UI.edit), onclick: function () { self.go(r.step, r.tab, { dir: -1 }); } }, [
        el("span", { class: "zd-spec__l", text: r.label }), el("span", { class: "zd-spec__v", text: r.value }), el("span", { class: "zd-spec__e", html: icon("right") })
      ]));
    });
    box.appendChild(list);
    box.appendChild(el("div", { class: "zd-sum__acts" }, [
      this.actBtn("download", function () { self.tool_download(); })
    ]));
    box.appendChild(el("p", { class: "zd-disc", text: t(UI.disclaimer) }));
    // инструмент менеджера — свёрнут в самом низу итога
    var det = el("details", { class: "zd-other" }, [el("summary", { text: t(UI.openOther) }), this.codeOpener()]);
    box.appendChild(det);
    return box;
  };

  /* ------------------------------------------------------------ preview feedback */
  P.zoneEl = function (name, cls) {
    var z = ZONES[name], n = el("span", { class: cls });
    if (z.shape === "circle") {
      n.style.left = ((z.cx - z.r - CROP.x) / CROP.w * 100) + "%"; n.style.top = ((z.cy - z.r - CROP.y) / CROP.h * 100) + "%";
      n.style.width = (2 * z.r / CROP.w * 100) + "%"; n.style.height = (2 * z.r / CROP.h * 100) + "%"; n.style.borderRadius = "50%";
    } else {
      n.style.left = ((z.x - CROP.x) / CROP.w * 100) + "%"; n.style.top = ((z.y - CROP.y) / CROP.h * 100) + "%";
      n.style.width = (z.w / CROP.w * 100) + "%"; n.style.height = (z.h / CROP.h * 100) + "%";
      n.style.borderRadius = (z.rad / CROP.w * 100) + "% / " + (z.rad / CROP.h * 100) + "%";
    }
    return n;
  };
  // Короткая подсветка зоны, которая изменилась (0,6 с)
  // Мягкое свечение зоны + световой блик, проходящий по ней (≈1,4 с, только opacity/transform)
  P.flash = function (zones) {
    if (REDUCED) return;
    var self = this;
    zones.forEach(function (z) {
      var glow = self.zoneEl(z, "zd-flash");
      var sweep = self.zoneEl(z, "zd-sweep");
      sweep.appendChild(el("i"));
      self.fx.appendChild(glow);
      self.fx.appendChild(sweep);
      setTimeout(function () { glow.remove(); sweep.remove(); }, 1600);
    });
  };
  P.flashChanges = function (a, b) {
    var zs = {};
    Object.keys(FIELD_ZONES).forEach(function (k) { if (a[k] !== b[k]) FIELD_ZONES[k].forEach(function (z) { zs[z] = 1; }); });
    var list = Object.keys(zs);
    if (list.length > 3) list = ["base"];
    this.flash(list);
  };

  P.canvasPoint = function (cx, cy) {
    var r = this.phone.getBoundingClientRect();
    if (!r.width) return null;
    return { x: CROP.x + (cx - r.left) / r.width * CROP.w, y: CROP.y + (cy - r.top) / r.height * CROP.h };
  };
  P.hitZone = function (p) {
    if (!p) return null;
    for (var i = 0; i < HIT.length; i++) {
      var z = ZONES[HIT[i][0]];
      var inside = z.shape === "circle" ? Math.hypot(p.x - z.cx, p.y - z.cy) <= z.r : p.x >= z.x && p.x <= z.x + z.w && p.y >= z.y && p.y <= z.y + z.h;
      if (inside && HIT[i][0] === "panel") inside = this.state.panel !== "none" && this.inPanel(p);
      if (inside) return HIT[i];
    }
    return null;
  };
  // Панель — дуга, а не прямоугольник: проверяем по реальной форме слоя (маска в 1/8 разрешения)
  P.inPanel = function (p) {
    var self = this, key = "panel_mono1_silver", Ly = M.layers[key];
    if (!this._panelMask && !this._panelMaskLoading) {
      this._panelMaskLoading = true;
      this.loadImg(key).then(function (img) {
        try {
          var c = document.createElement("canvas"), w = Math.ceil(Ly.w / 8), h = Math.ceil(Ly.h / 8);
          c.width = w; c.height = h;
          var ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0, w, h);
          var d = ctx.getImageData(0, 0, w, h).data, mask = new Uint8Array(w * h);
          for (var i = 0; i < w * h; i++) mask[i] = d[i * 4 + 3] > 40 ? 1 : 0;
          self._panelMask = { w: w, h: h, m: mask };
        } catch (e) { self._panelMask = { fallback: true }; } // file:// — пиксели недоступны
      });
    }
    var mk = this._panelMask;
    if (!mk || mk.fallback) return p.y > 1560; // до загрузки маски — нижняя часть дуги
    var x = Math.floor((p.x - Ly.x) / 8), y = Math.floor((p.y - Ly.y) / 8);
    return x >= 0 && y >= 0 && x < mk.w && y < mk.h && mk.m[y * mk.w + x] === 1;
  };

  // Ховер по зоне превью подсвечивает шаг в навигаторе, клик — открывает его
  P.setupZones = function () {
    var self = this, hoverEl = null, cur = null;
    this.zoomBox.addEventListener("pointermove", function (e) {
      if (e.pointerType !== "mouse" || self.zs.manual) return;
      var h = self.hitZone(self.canvasPoint(e.clientX, e.clientY));
      var key = h ? h[0] : null;
      if (key === cur) return;
      cur = key;
      if (hoverEl) { hoverEl.remove(); hoverEl = null; }
      self.hintStep = h ? h[1] : null;
      self.navList.querySelectorAll(".zd-nav__item").forEach(function (li) { li.classList.toggle("is-hint", li.getAttribute("data-step") === self.hintStep); });
      self.zoomBox.classList.toggle("is-zone", !!h);
      if (h) { hoverEl = self.zoneEl(h[0], "zd-hover"); self.fx.appendChild(hoverEl); }
    });
    this.zoomBox.addEventListener("pointerleave", function () {
      cur = null; self.hintStep = null;
      if (hoverEl) { hoverEl.remove(); hoverEl = null; }
      self.zoomBox.classList.remove("is-zone");
      self.navList.querySelectorAll(".is-hint").forEach(function (li) { li.classList.remove("is-hint"); });
    });
    this.onZoneTap = function (cx, cy) {
      var h = self.hitZone(self.canvasPoint(cx, cy));
      if (!h) return false;
      track("zd_zone_click", { zone: h[0] });
      self.go(h[1], h[2], { fromZone: true });
      return true;
    };
  };

  /* ------------------------------------------------------------ zoom */
  P.applyZoom = function (smooth) {
    var zs = this.zs;
    this.phone.classList.toggle("is-smooth", !!smooth && !REDUCED);
    this.phone.style.transform = zs.z === 1 && !zs.ox && !zs.oy ? "" : "translate(" + zs.ox + "px," + zs.oy + "px) scale(" + zs.z + ")";
    this.zoomBox.classList.toggle("is-zoomed", zs.z > 1);
    this.zoomBtn.classList.toggle("is-on", !!zs.manual);
  };
  P.clampZoom = function () {
    var zs = this.zs, pw = this.phone.offsetWidth, ph = this.phone.offsetHeight;
    // телефон можно сдвигать, пока его край не дошёл до середины сцены
    var mx = Math.max(0, pw * zs.z / 2 - pw * 0.2), my = Math.max(0, ph * zs.z / 2 - ph * 0.2);
    if (zs.z <= 1) { mx = 0; my = 0; }
    zs.ox = Math.max(-mx, Math.min(mx, zs.ox)); zs.oy = Math.max(-my, Math.min(my, zs.oy));
  };
  // Приблизить точку холста к центру сцены
  P.zoomToCanvas = function (z, x, y, smooth) {
    var k = this.phone.offsetWidth / CROP.w;
    var dx = (x - CROP.x - CROP.w / 2) * k, dy = (y - CROP.y - CROP.h / 2) * k;
    // на мобильном центрируем в свободной области над шторкой (если шторка перекрывает сцену)
    var shift = 0;
    if (this.isMobile()) {
      var zb = this.zoomBox.getBoundingClientRect(), top = this.work.getBoundingClientRect().top;
      var visBottom = Math.min(zb.bottom, top - 8);
      shift = (zb.top + visBottom) / 2 - (zb.top + zb.bottom) / 2;
    }
    this.zs.z = z; this.zs.ox = -dx * z; this.zs.oy = -dy * z + shift; this.zs.target = { x: x, y: y };
    this.clampZoom(); this.applyZoom(smooth);
  };
  P.resetZoom = function (smooth) { this.zs = { z: 1, ox: 0, oy: 0, manual: false }; this.applyZoom(smooth); };
  // При входе в шаг круга или панели превью мягко приближается к этой зоне
  P.autoZoom = function () {
    var a = AUTO_ZOOM[this.step];
    if (this.zs.manual) return;
    if (a) this.zoomToCanvas(a.z, a.x, a.y, true);
    else if (this.zs.z !== 1) this.resetZoom(true);
  };
  P.toggleZoom = function () {
    if (this.zs.manual) { this.resetZoom(true); this.autoZoom(); return; }
    this.zs.manual = true;
    this.zoomToCanvas(2.2, CROP.x + CROP.w / 2, CROP.y + CROP.h / 2, true);
    track("zd_zoom", {});
  };

  P.setupZoom = function () {
    var self = this, box = this.zoomBox, pointers = {}, pinch = null, lastTap = 0, moved = false, down = null;
    function focusMouse(cx, cy) {
      var r = box.getBoundingClientRect(), zs = self.zs;
      zs.ox = (r.width / 2 - (cx - r.left)) * (zs.z - 1); zs.oy = (r.height / 2 - (cy - r.top)) * (zs.z - 1);
      self.clampZoom(); self.applyZoom(false);
    }
    box.addEventListener("pointerdown", function (e) {
      pointers[e.pointerId] = { x: e.clientX, y: e.clientY }; moved = false; down = { x: e.clientX, y: e.clientY };
      var ids = Object.keys(pointers);
      if (ids.length === 2) { var a = pointers[ids[0]], b = pointers[ids[1]]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: self.zs.z }; }
    });
    box.addEventListener("pointermove", function (e) {
      var p = pointers[e.pointerId], zs = self.zs;
      if (e.pointerType === "mouse" && zs.manual && !p) { focusMouse(e.clientX, e.clientY); return; }
      if (!p) return;
      var ids = Object.keys(pointers);
      if (pinch && ids.length === 2) {
        p.x = e.clientX; p.y = e.clientY;
        var a = pointers[ids[0]], b = pointers[ids[1]];
        zs.z = Math.max(1, Math.min(3, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
        zs.manual = zs.z > 1;
        self.clampZoom(); self.applyZoom(false); moved = true; e.preventDefault();
      } else if (zs.z > 1 && e.pointerType !== "mouse") {
        zs.ox += e.clientX - p.x; zs.oy += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
        self.clampZoom(); self.applyZoom(false);
        if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) moved = true;
      } else if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) moved = true;
    });
    function up(e) { delete pointers[e.pointerId]; if (Object.keys(pointers).length < 2) pinch = null; }
    box.addEventListener("pointerup", function (e) {
      var wasMoved = moved; up(e);
      if (wasMoved) return;
      if (e.pointerType === "mouse") {
        if (self.zs.manual) { self.resetZoom(true); self.autoZoom(); return; }
        self.onZoneTap(e.clientX, e.clientY);
        return;
      }
      var now = Date.now();
      if (now - lastTap < 300) {
        clearTimeout(self._tapT);
        if (self.zs.z > 1) { self.resetZoom(true); }
        else { self.zs.manual = true; var cp = self.canvasPoint(e.clientX, e.clientY); self.zoomToCanvas(2.2, cp.x, cp.y, true); }
        lastTap = 0; return;
      }
      lastTap = now;
      var cx = e.clientX, cy = e.clientY;
      self._tapT = setTimeout(function () { if (!self.zs.manual) self.onZoneTap(cx, cy); }, 300);
    });
    box.addEventListener("pointercancel", up);
    box.addEventListener("pointerleave", function (e) { if (e.pointerType === "mouse" && self.zs.manual) { self.resetZoom(true); self.autoZoom(); } });
  };

  /* ------------------------------------------------------------ mobile sheet */
  var SHEETS = ["collapsed", "half", "expanded"];
  P.setSheet = function (s) {
    this.sheet = s;
    this.root.setAttribute("data-sheet", s);
    this.handle.setAttribute("aria-label", s === "collapsed" ? "↑" : "↓");
  };
  P.setupSheet = function () {
    var self = this, start = null;
    this.setSheet("half");
    function onDown(e) { start = { y: e.clientY, t: Date.now() }; self.handle.setPointerCapture && self.handle.setPointerCapture(e.pointerId); }
    this.handle.addEventListener("pointerdown", onDown);
    this.handle.addEventListener("pointerup", function (e) {
      if (!start) return;
      var dy = e.clientY - start.y, i = SHEETS.indexOf(self.sheet);
      if (Math.abs(dy) < 8) self.setSheet(self.sheet === "collapsed" ? "half" : self.sheet === "half" ? "expanded" : "half");
      else if (dy < 0) self.setSheet(SHEETS[Math.min(2, i + (dy < -160 ? 2 : 1))]);
      else self.setSheet(SHEETS[Math.max(0, i - (dy > 160 ? 2 : 1))]);
      self.sheetAuto = false;
      start = null;
    });
  };
  // Свайп по рабочей области влево/вправо = Далее/Назад (дублирует кнопки)
  P.setupSwipe = function () {
    var self = this, st = null;
    this.content.addEventListener("pointerdown", function (e) {
      if (e.pointerType !== "touch" || !self.isMobile()) return;
      if (e.target.closest(".zd-grid, .zd-tabs2, .zd-sliders, input, .zd-cards, .zd-spec")) return;
      st = { x: e.clientX, y: e.clientY };
    });
    this.content.addEventListener("pointerup", function (e) {
      if (!st) return;
      var dx = e.clientX - st.x, dy = e.clientY - st.y; st = null;
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) { if (dx < 0) self.next(); else self.prev(); }
    });
    this.content.addEventListener("pointercancel", function () { st = null; });
  };

  /* ------------------------------------------------------------ lead form */
  P.openForm = function () {
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
    var sel = el("select", { name: "messenger" }, [el("option", { value: "", text: t(F.none) }), el("option", { value: "Telegram", text: "Telegram" }), el("option", { value: "WhatsApp", text: "WhatsApp" })]);
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
      self.sendLead(d).then(function () { track("zd_lead_submit", { code: self.code() }); self.showThanks(); })
        .catch(function () { err.textContent = t(F.error); submit.disabled = false; submit.textContent = t(F.submit); });
    });
    m.appendChild(el("div", { class: "zd-dialog", role: "dialog", "aria-modal": "true", "aria-label": t(F.title) }, [
      el("button", { class: "zd-dialog__x", type: "button", "aria-label": t(F.close), html: icon("close"), onclick: function () { self.closeForm(); } }),
      el("h3", { text: t(F.title) }),
      el("p", { class: "zd-dialog__lead", text: t(F.lead) }),
      el("div", { class: "zd-dialog__code" }, [el("span", { text: t(UI.code) + " " }), el("b", { text: this.code() })]),
      form
    ]));
    m.hidden = false;
    m.onclick = function (e) { if (e.target === m) self.closeForm(); };
    this._esc = function (e) { if (e.key === "Escape") self.closeForm(); };
    document.addEventListener("keydown", this._esc);
    setTimeout(function () { var f = form.querySelector("input"); if (f) f.focus({ preventScroll: true }); }, 30);
  };
  P.closeForm = function () { this.modal.hidden = true; this.modal.innerHTML = ""; document.removeEventListener("keydown", this._esc); };
  P.showThanks = function () {
    var self = this, T = UI.thanks;
    this.modal.innerHTML = "";
    this.modal.appendChild(el("div", { class: "zd-dialog zd-dialog--thanks", role: "dialog", "aria-modal": "true" }, [
      el("h3", { text: t(T.title) }), el("p", { text: t(T.text) }),
      el("div", { class: "zd-dialog__code" }, [el("span", { text: t(UI.code) + " " }), el("b", { text: this.code() })]),
      el("button", { class: "zd-cta", type: "button", text: t(T.back), onclick: function () { self.closeForm(); } })
    ]));
  };

  P.sendLead = function (d) {
    var spec = this.spec().map(function (r) { return r[0] + ": " + r[1]; }).join("\n");
    var payload = { code: this.code(), link: this.shareUrl(), spec: spec, state: this.state, lang: LANG,
      name: d.name, phone: d.phone, email: d.email, messenger: d.messenger, comment: d.comment, page: location.href };
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

  /* ------------------------------------------------------------ image export */
  P.renderImage = function (scale, type, quality) {
    var self = this, W = Math.round(CANVAS_W * scale), H = Math.round(CANVAS_H * scale);
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
        var Ly = box(specs[i][1]);
        ctx.drawImage(img, Ly.x * scale, Ly.y * scale, Ly.w * scale, Ly.h * scale);
      });
      return c.toDataURL(type || "image/jpeg", quality || 0.9);
    });
  };

  /* ------------------------------------------------------------ tools */
  P.tool_undo = function () { if (this.history.length) this.commit(this.history.pop(), { noHistory: true, silent: true }); };
  P.tool_reset = function () {
    this.set(clone(START));
    this.visited = { sign: true }; this.tab = {};
    this.go("sign");
  };
  P.tool_random = function () {
    function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
    var m = METALS.map(function (x) { return x.id; }), plate = pick(["metal", "croc", "calf"]), ring = pick(m);
    this.set({
      frame: pick(m), medal: pick(m), medalOn: Math.random() < 0.8 ? 1 : 0,
      plate: plate, plateColor: plate === "metal" ? pick(m) : pick(find(LEATHERS, plate).colors)[0],
      ring: ring, decor: ring === "black" ? "metal" : pick(["metal", "white", "black", "ruby"]),
      enamel: Math.random() < 0.3 ? null : pick(ENAMEL_PRESETS).hex, core: pick(CORES).id,
      panel: pick(["clear", "clear", "solid", "none"]), panelFrame: pick(m), panelFill: pick(["meteorite", "enamel"]), panelEnamel: pick(ENAMEL_PRESETS).hex,
      panelTex: pick([1, 2]), panelMetal: pick(m), base: pick(BASES).id
    }, { silent: true });
    track("zd_random", {});
  };
  P.tool_oneMetal = function () {
    var f = this.state.frame;
    this.set({ ring: f, medal: f, panelFrame: f, panelMetal: f });
    this.toast(t(UI.oneMetalDone));
  };
  P.copy = function (text, msg) {
    var self = this, done = function () { self.toast(msg); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, function () { prompt("", text); });
    else prompt("", text);
  };
  P.tool_share = function () {
    var url = this.shareUrl();
    track("zd_share", { code: this.code() });
    if (navigator.share && this.isMobile()) { navigator.share({ title: "Caviar · Zodiac Duo · " + this.code(), url: url }).catch(function () { }); return; }
    this.copy(url, t(UI.copied));
  };
  P.tool_download = function () {
    var self = this;
    track("zd_download", { code: this.code() });
    this.renderImage(this.half ? 0.5 : 1, "image/jpeg", 0.92).then(function (data) {
      var a = el("a", { href: data, download: "Caviar-Zodiac-Duo-" + self.code() + ".jpg" });
      document.body.appendChild(a); a.click(); a.remove();
    }).catch(function () { self.toast(t(UI.noDownload)); });
  };

  P.toast = function (msg, ms) {
    var tEl = this.toastEl;
    tEl.textContent = msg;
    tEl.classList.add("is-on");
    clearTimeout(this._toast);
    this._toast = setTimeout(function () { tEl.classList.remove("is-on"); }, ms || 3500);
  };

  /* ================================================================== hash state */
  var KEYS = ["sign", "frame", "medal", "medalOn", "plate", "plateColor", "ring", "decor", "enamel", "core", "panel", "panelFrame", "panelFill", "panelEnamel", "panelTex", "panelMetal", "base"];
  function serialize(s) { return KEYS.map(function (k) { var v = s[k]; return v == null ? "" : String(v).replace("#", ""); }).join("."); }
  /* ================================================================== design code */
  // Код сборки сам хранит конфигурацию: ZD-<знак>-XXXX-XXXX[-HEX6][-HEX6]
  // 7 знаков — сборка в смешанной системе счисления (base32 Crockford, без I/L/O/U), 8-й — контрольный.
  // Свои оттенки эмали (не из готовых) добавляются хвостом HEX.
  var B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
  var SIGN_CODE = { aries: "ARI", taurus: "TAU", gemini: "GEM", cancer: "CAN", leo: "LEO", virgo: "VIR", libra: "LIB", scorpio: "SCO", sagittarius: "SAG", capricorn: "CAP", aquarius: "AQU", pisces: "PIS" };
  // 15 позиций плато в коде — как в первой версии, чтобы выданные коды открывались и дальше:
  // позиции снятых кож отданы новым, а две последние — дубли (при кодировании берётся первая позиция).
  var PLATES = ["metal:silver", "metal:gold", "metal:rose", "metal:black",
    "croc:burgundy", "calf:white", "croc:black", "croc:navy", "calf:paleblue", "calf:burgundy", "calf:navy", "croc:red", "calf:beige",
    "calf:white", "croc:black"];
  var MIDS = METALS.map(function (m) { return m.id; });
  var EN = [null].concat(ENAMEL_PRESETS.map(function (p) { return p.hex; })).concat(["custom"]);
  var FIELDS = [
    ["frame", MIDS], ["medal", MIDS], ["medalOn", [0, 1]], ["_plate", PLATES], ["ring", MIDS], ["decor", ["metal", "white", "black", "ruby"]],
    ["enamel", EN], ["core", CORES.map(function (c) { return c.id; })], ["panel", ["clear", "solid", "none"]], ["panelFrame", MIDS],
    ["panelFill", ["meteorite", "enamel"]], ["panelEnamel", EN], ["panelTex", [1, 2]], ["panelMetal", MIDS], ["base", BASES.map(function (b) { return b.id; })]
  ];
  function enIdx(v) { if (v == null) return 0; var i = EN.indexOf(v); return i < 0 ? EN.length - 1 : i; }
  function encodeCode(s) {
    var n = 0, tail = [];
    FIELDS.forEach(function (f) {
      var k = f[0], list = f[1], i;
      if (k === "_plate") i = PLATES.indexOf(s.plate + ":" + s.plateColor);
      else if (k === "enamel" || k === "panelEnamel") { i = enIdx(s[k]); if (EN[i] === "custom") tail.push(s[k].slice(1).toUpperCase()); }
      else i = list.indexOf(s[k]);
      n = n * list.length + Math.max(0, i);
    });
    var body = "", sum = 0;
    for (var j = 0; j < 7; j++) { body = B32[n % 32] + body; n = Math.floor(n / 32); }
    for (var q = 0; q < 7; q++) sum += B32.indexOf(body[q]) * (q + 3);
    body += B32[sum % 32];
    return ["ZD", SIGN_CODE[s.sign] || "ARI", body.slice(0, 4), body.slice(4)].concat(tail).join("-");
  }
  function decodeCode(raw) {
    var str = String(raw || "").toUpperCase().replace(/[\s_–—]/g, "-");
    var m = /ZD-?([A-Z]{3})-?([0-9A-Z]{4})-?([0-9A-Z]{4})((?:-?[0-9A-F]{6}){0,2})/.exec(str);
    if (!m) return null;
    var sign = null;
    for (var k in SIGN_CODE) if (SIGN_CODE[k] === m[1]) sign = k;
    if (!sign) return null;
    var body = (m[2] + m[3]).replace(/O/g, "0").replace(/[IL]/g, "1"), sum = 0, n = 0;
    for (var q = 0; q < 8; q++) if (B32.indexOf(body[q]) < 0) return null;
    for (q = 0; q < 7; q++) { sum += B32.indexOf(body[q]) * (q + 3); n = n * 32 + B32.indexOf(body[q]); }
    if (B32[sum % 32] !== body[7]) return null;
    var tail = (m[4].match(/[0-9A-F]{6}/g) || []).map(function (h) { return "#" + h; });
    var st = { sign: sign }, vals = [];
    for (var i = FIELDS.length - 1; i >= 0; i--) { var len = FIELDS[i][1].length; vals[i] = n % len; n = Math.floor(n / len); }
    if (n !== 0) return null;
    FIELDS.forEach(function (f, i) {
      var v = f[1][vals[i]];
      if (f[0] === "_plate") { var pp = v.split(":"); st.plate = pp[0]; st.plateColor = pp[1]; }
      else if (v === "custom") st[f[0]] = tail.shift() || null;
      else st[f[0]] = v;
    });
    return st;
  }

  function parseHash() {
    var mt = /[#&]zd=([^&]+)/.exec(location.hash);
    return mt ? parseHashStr(mt[1]) : null;
  }
  function parseHashStr(str) {
    var parts = decodeURIComponent(str).split("."), s = {};
    if (parts.length !== KEYS.length) return null;
    KEYS.forEach(function (k, i) {
      var v = parts[i];
      if (k === "enamel" || k === "panelEnamel") s[k] = /^[0-9A-Fa-f]{6}$/.test(v) ? "#" + v.toUpperCase() : null;
      else if (k === "medalOn" || k === "panelTex") s[k] = +v || (k === "panelTex" ? 1 : 0);
      else s[k] = v;
    });
    return s;
  }

  /* ================================================================== boot */
  function boot() {
    if (!M) { console.error("[Zodiac Duo] Не найден assets/manifest.js"); return; }
    // data-zd-defer — виджет создаётся позже, по вызову ZodiacDuo.mount(node) (например, при открытии на весь экран)
    document.querySelectorAll("[data-zodiac-duo]:not([data-zd-defer])").forEach(function (n) { if (!n.__zd) n.__zd = new Widget(n); });
  }
  window.ZodiacDuo = { mount: function (n) { if (M && n && !n.__zd) n.__zd = new Widget(n); return n && n.__zd; } };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();
})();
