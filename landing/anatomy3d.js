/* Caviar · Zodiac Duo — «Анатомия» в настоящем 3D (Three.js).
   Модель собрана в Blender по контурам слоёв PSD: объёмные детали с фаской, текстуры PSD на лицевой стороне.
   Логика та же, что у CSS-версии: прокрутка наклоняет и разбирает модель, выбранная деталь подсвечена,
   детали над ней прозрачны, под ней — приглушены. Если WebGL недоступен, остаётся CSS-версия. */
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const sec = document.getElementById("anatomy");
const stage = sec && sec.querySelector(".lp-anat__stage");
const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const MOBILE = matchMedia("(max-width: 1100px)").matches;

function webgl() { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl2") || c.getContext("webgl")); } catch (e) { return false; } }

if (sec && stage && webgl()) init().catch((e) => console.warn("[anatomy3d] fallback to CSS:", e));

async function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, MOBILE ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = "lp-anat__canvas";
  canvas.setAttribute("aria-hidden", "true");

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 40);

  const key = new THREE.DirectionalLight(0xfff3e2, 1.5);
  key.position.set(-1.6, 3.2, 1.8);
  key.castShadow = true;
  key.shadow.mapSize.set(MOBILE ? 1024 : 2048, MOBILE ? 1024 : 2048);
  key.shadow.camera.left = -1.3; key.shadow.camera.right = 1.3; key.shadow.camera.top = 1.3; key.shadow.camera.bottom = -1.3;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 8;
  key.shadow.radius = 6; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.01;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdbe6ff, 0.9); rim.position.set(2.2, 1.6, -2.4); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xf2efe8, 0x0d1117, 0.35));

  const gltf = await new GLTFLoader().loadAsync("landing/model/anatomy.glb?v=14");
  const root = gltf.scene;
  scene.add(root);

  // уровни сверху вниз — в порядке списка подписей (0 = медальон … 6 = корпус)
  const LEVEL = { medal_sagittarius_rose: 6, frame_rose: 5, panel_frame_rose: 4, panel_fill_meteorite: 4, ring_rose: 3, ring_enamel: 3,
    spots_stone_white: 3, core_white: 2, const_sagittarius: 2, plate_croc_burgundy: 1, base_starwhite: 0 };
  const parts = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    let n = o; while (n && !(n.name in LEVEL)) n = n.parent;
    const name = n ? n.name : o.name;
    const level = LEVEL[name] ?? 0;
    o.castShadow = true; o.receiveShadow = true;
    o.material = o.material.clone();
    const m = o.material;
    m.transparent = true;
    if (m.map) { m.map.anisotropy = renderer.capabilities.getMaxAnisotropy(); }
    if (/^EDGE_metal/.test(m.name)) { m.metalness = 1; m.roughness = 0.24; m.envMapIntensity = 1.3; }
    if (/^TOP_/.test(m.name) && /rose|const/.test(name)) { m.metalness = 0.35; m.roughness = 0.3; m.envMapIntensity = 1.1; }
    // глазки камер из PSD: без «молочного» налёта от окружения
    if (m.name === "TOP_base_lens") { m.envMapIntensity = 0.25; m.roughness = 0.4; m.clearcoat = 0.15; m.color.setScalar(0.8); }
    m.userData.baseColor = m.color.clone();
    parts.push({ mesh: o, node: n || o, level, baseY: (n || o).position.y });
  });
  // узлы деталей: собранное положение = исходное по Y минус «разнос» из Blender
  const nodes = new Map();
  parts.forEach((p) => { if (!nodes.has(p.node)) nodes.set(p.node, { node: p.node, level: p.level, meshes: [] }); nodes.get(p.node).meshes.push(p.mesh); });
  const GAP_BLENDER = 0.15;
  // в собранном виде уровни лежат друг на друге (шаг ≈ толщина детали), а не в одной плоскости
  const STACK = 0.012;
  nodes.forEach((g) => { g.y0 = g.node.position.y - g.level * GAP_BLENDER + g.level * STACK; g.cur = g.y0; g.dim = 0; g.front = 0; });

  // canvas поверх CSS-сцены; CSS-версия скрывается
  stage.appendChild(canvas);
  sec.classList.add("is-3d");

  function resize() {
    const r = stage.getBoundingClientRect();
    renderer.setSize(r.width, r.height, false);
    canvas.style.width = r.width + "px"; canvas.style.height = r.height + "px";
    camera.aspect = r.width / Math.max(1, r.height);
    camera.updateProjectionMatrix();
  }
  resize();
  addEventListener("resize", resize);

  const sm = (a, b, x) => { x = Math.max(0, Math.min(1, (x - a) / (b - a))); return x * x * (3 - 2 * x); };
  const lerp = (a, b, t) => a + (b - a) * t;
  let target = 0, prog = REDUCED ? 0.75 : 0, mx = 0, my = 0, pmx = 0, pmy = 0;
  function readScroll() {
    const r = sec.getBoundingClientRect(), total = sec.offsetHeight - innerHeight;
    target = REDUCED ? 0.75 : Math.max(0, Math.min(1, -r.top / Math.max(1, total)));
  }
  addEventListener("scroll", readScroll, { passive: true });
  readScroll();
  if (!MOBILE) addEventListener("pointermove", (e) => { mx = (e.clientX / innerWidth - 0.5); my = (e.clientY / innerHeight - 0.5); }, { passive: true });

  let visible = true;
  new IntersectionObserver((es) => { visible = es[0].isIntersecting; }, { rootMargin: "200px" }).observe(sec);

  const tmp = new THREE.Vector3();
  function frame() {
    requestAnimationFrame(frame);
    if (!visible) return;
    prog = lerp(prog, target, REDUCED ? 1 : 0.12);
    pmx = lerp(pmx, mx, 0.05); pmy = lerp(pmy, my, 0.05);
    const p = prog, tilt = sm(0.02, 0.32, p), ex = sm(0.1, 0.62, p);
    const active = Math.min(6, Math.floor(sm(0.16, 0.9, p) * 7)); // индекс в списке: 0 = медальон
    const focus = ex > 0.5 && p < 0.9; // в конце — вся разобранная модель без фокуса

    // камера: от фронтального вида к наклонному, плюс лёгкий параллакс от курсора
    const el = THREE.MathUtils.degToRad(lerp(89.5, 34, tilt) - pmy * 6 * tilt);
    const az = THREE.MathUtils.degToRad(lerp(0, -30, tilt) + pmx * 10 * tilt);
    const stackH = 6 * 0.17 * ex;
    const D = (lerp(3.75, 3.9, tilt) + stackH * 0.75) * (camera.aspect < 0.8 ? 1.25 : 1);
    camera.position.set(D * Math.cos(el) * Math.sin(az), D * Math.sin(el), D * Math.cos(el) * Math.cos(az));
    camera.up.set(-Math.sin(az), 0, -Math.cos(az));
    tmp.set(0, stackH * 0.5 - 0.02, 0);
    camera.lookAt(tmp);

    nodes.forEach((g) => {
      const idx = 6 - g.level; // позиция в списке
      const lift = focus && idx === active ? 0.06 : 0;
      const y = g.y0 + g.level * 0.17 * ex + lift;
      g.cur = lerp(g.cur, y, 0.18); g.node.position.y = g.cur;
      const wantFront = focus && idx < active ? 1 : 0, wantDim = focus && idx > active ? 1 : 0;
      g.front = lerp(g.front, wantFront, 0.12); g.dim = lerp(g.dim, wantDim, 0.12);
      g.meshes.forEach((m) => {
        const mat = m.material;
        mat.opacity = 1 - 0.88 * g.front;
        mat.depthWrite = g.front < 0.5;
        m.castShadow = g.front < 0.5;
        mat.color.copy(mat.userData.baseColor).multiplyScalar(1 - 0.62 * g.dim - 0.3 * g.front);
      });
    });
    renderer.render(scene, camera);
  }
  frame();
}
