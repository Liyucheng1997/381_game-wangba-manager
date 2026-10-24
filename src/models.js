// 场景家具与道具建模（全部程序化几何体），所有模型原点在地面中心，正面朝 +Z
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { T, posterTex, canvasTex, drawText, quiltTex } from './textures.js';

// ---------- 材质缓存 ----------
const MAT = new Map();
export function mat(key, params, Type = THREE.MeshStandardMaterial) {
  if (!MAT.has(key)) MAT.set(key, new Type(params));
  return MAT.get(key);
}
export const M = {
  desk: () => mat('desk', { map: T.deskTop(), roughness: 0.55, metalness: 0 }),
  deskEdge: () => mat('deskEdge', { color: 0x5b3d22, roughness: 0.5 }),
  deskSide: () => mat('deskSide', { map: T.wood(), color: 0xc8a070, roughness: 0.65 }),
  metal: () => mat('metal', { color: 0x9a9da3, metalness: 0.85, roughness: 0.3 }),
  darkMetal: () => mat('darkMetal', { color: 0x2b2c30, metalness: 0.6, roughness: 0.45 }),
  beige: () => mat('beige', { map: T.plastic(), roughness: 0.5 }),
  beigeDark: () => mat('beigeDark', { color: 0xbdb59c, roughness: 0.55 }),
  black: () => mat('black', { color: 0x18191c, roughness: 0.45 }),
  blackGloss: () => mat('blackGloss', { color: 0x0e0f12, roughness: 0.2, metalness: 0.2 }),
  rubber: () => mat('rubber', { color: 0x111111, roughness: 0.9 }),
  fabricBlue: () => mat('fabricBlue', { map: T.fabric('#3d5a80'), roughness: 0.95 }),
  fabricDark: () => mat('fabricDark', { map: T.fabric('#24262c'), roughness: 0.95 }),
  leatherRed: () => mat('leatherRed', { color: 0xb3141e, roughness: 0.4 }),
  leatherBlack: () => mat('leatherBlack', { color: 0x16161a, roughness: 0.38 }),
  leatherBrown: () => mat('leatherBrown', { color: 0x5a2f1c, roughness: 0.42 }),
  white: () => mat('white', { color: 0xf2f2ee, roughness: 0.4 }),
  glass: () => mat('glass', { color: 0xa8c8d8, transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false }),
  frostGlass: () => mat('frostGlass', { color: 0xdbe8ee, transparent: true, opacity: 0.55, roughness: 0.6, depthWrite: false }),
  water: () => mat('water', { color: 0x5aa8ff, transparent: true, opacity: 0.55, roughness: 0.1 }),
  alu: () => mat('alu', { color: 0xc4c8cc, metalness: 0.7, roughness: 0.35 }),
  red: () => mat('red', { color: 0xc81e1e, roughness: 0.35 }),
  green: () => mat('green', { color: 0x2f7d3a, roughness: 0.7 }),
  leaf: () => mat('leaf', { color: 0x3c8a3a, roughness: 0.8, flatShading: true }),
  pot: () => mat('pot', { color: 0x8a4a2a, roughness: 0.8 }),
  ledGreen: () => mat('ledGreen', { color: 0x00ff55, emissive: 0x00ff55, emissiveIntensity: 3 }, THREE.MeshStandardMaterial),
  ledOrange: () => mat('ledOrange', { color: 0xffaa00, emissive: 0xff8800, emissiveIntensity: 3 }),
  ledOff: () => mat('ledOff', { color: 0x332211, roughness: 0.4 }),
  ledBlue: () => mat('ledBlue', { color: 0x4499ff, emissive: 0x3388ff, emissiveIntensity: 3 }),
  tube: () => mat('tube', { color: 0xffffff, emissive: 0xf4f8ff, emissiveIntensity: 1.1 }),
  cardboard: () => mat('cardboard', { color: 0xb08850, roughness: 0.9 }),
  paper: () => mat('paper', { color: 0xf5f1e6, roughness: 0.9 }),
};

// ---------- 几何体缓存与构件 ----------
const GEO = new Map();
function geo(key, make) { if (!GEO.has(key)) GEO.set(key, make()); return GEO.get(key); }
export const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const rbox = (w, h, d, r = 0.02, s = 2) => geo(`r${w},${h},${d},${r},${s}`, () => new RoundedBoxGeometry(w, h, d, s, r));
export const cyl = (rt, rb, h, s = 16) => geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
export const sph = (r, ws = 16, hs = 12) => geo(`s${r},${ws},${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
export const plane = (w, h) => geo(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h));

export function add(parent, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geometry, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
export function texMat(key, tex, extra = {}) {
  return mat(key, { map: tex, roughness: 0.6, ...extra });
}
function tubeAlong(parent, pts, r, material) {
  const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
  const g = new THREE.TubeGeometry(curve, 16, r, 5, false);
  const m = new THREE.Mesh(g, material);
  m.castShadow = false; m.receiveShadow = true;
  parent.add(m);
  return m;
}

const crtBackGeo = () => geo('crtBack', () => {
  const c = new THREE.CylinderGeometry(0.15, 0.27, 0.32, 4, 1);
  c.rotateY(Math.PI / 4); c.rotateX(-Math.PI / 2); c.scale(1, 0.92, 1);
  return c;
});
const hsBandGeo = () => geo('hsBand', () => new THREE.TorusGeometry(0.075, 0.008, 6, 18, Math.PI));

// CRT 弧面屏幕
function crtScreenGeo(w, h, bulge) {
  return geo(`crt${w},${h},${bulge}`, () => {
    const g = new THREE.PlaneGeometry(w, h, 10, 8);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i) / (w / 2), y = p.getY(i) / (h / 2);
      p.setZ(i, bulge * (1 - 0.5 * (x * x + y * y)));
    }
    g.computeVertexNormals();
    return g;
  });
}

// ---------- 电脑桌（工位） ----------
// 返回 { group, screen, leds:{power,hdd}, mess }
export function makeWorkstation({ monitor = 'crt', vip = false, owned = true } = {}) {
  const g = new THREE.Group();
  const W = vip ? 1.1 : 1.12, D = 0.65, H = 0.75;
  // 桌面
  add(g, box(W, 0.025, D), M.desk(), 0, H - 0.0125, 0);
  add(g, box(W, 0.028, 0.012), M.deskEdge(), 0, H - 0.0125, D / 2 + 0.006);
  // 侧板与背板
  add(g, box(0.02, H - 0.025, D - 0.04), M.deskSide(), -W / 2 + 0.01, (H - 0.025) / 2, 0);
  add(g, box(0.02, H - 0.025, D - 0.04), M.deskSide(), W / 2 - 0.01, (H - 0.025) / 2, 0);
  add(g, box(W - 0.04, 0.4, 0.018), M.deskSide(), 0, H - 0.23, -D / 2 + 0.03);
  // 桌上隔断（蓝色绒布屏风 + 铝边）
  const divH = 0.38;
  add(g, box(W, divH, 0.025), M.fabricBlue(), 0, H + divH / 2, -D / 2 + 0.0125);
  add(g, box(W, 0.02, 0.035), M.alu(), 0, H + divH, -D / 2 + 0.0125);
  add(g, box(0.025, divH, D - 0.05), M.fabricBlue(), -W / 2 + 0.0125, H + divH / 2, 0.0);
  add(g, box(0.035, 0.02, D - 0.05), M.alu(), -W / 2 + 0.0125, H + divH, 0.0);

  const res = { group: g, screen: null, leds: {}, mess: null, items: [] };
  if (!owned) {
    // 空位：桌上放个“暂停使用”牌子
    const sign = add(g, box(0.18, 0.12, 0.01), texMat('vacant', canvasTex('vacant', 128, 96, (c, w, h) => {
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.strokeStyle = '#c33'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      drawText(c, '暂停使用', w / 2, h / 2, 22, '#c33');
    })), 0, H + 0.07, 0, -0.25, 0, 0);
    sign.castShadow = false;
    return res;
  }

  // 主机（放桌面左侧）
  const tw = 0.19, th = 0.42, td = 0.42;
  const tx = -W / 2 + 0.16, tz = -0.05;
  add(g, rbox(tw, th, td, 0.008), M.beige(), tx, H + th / 2, tz);
  const tf = add(g, plane(tw - 0.01, th - 0.01), texMat('towerFront', T.towerFront()), tx, H + th / 2, tz + td / 2 + 0.002);
  tf.castShadow = false;
  const pled = add(g, box(0.012, 0.006, 0.004), M.ledGreen(), tx, H + 0.205, tz + td / 2 + 0.004);
  const hled = add(g, box(0.012, 0.006, 0.004), M.ledOrange(), tx, H + 0.155, tz + td / 2 + 0.004);
  pled.userData.dynamic = hled.userData.dynamic = true;
  res.leds = { power: pled, hdd: hled };

  // 显示器
  const mx = 0.08, mz = -0.1;
  let screen;
  if (monitor === 'crt') {
    const sw = 0.42, sh = 0.39;
    // 底座
    add(g, cyl(0.11, 0.12, 0.02, 20), M.beigeDark(), mx, H + 0.01, mz);
    add(g, cyl(0.06, 0.08, 0.05, 16), M.beige(), mx, H + 0.045, mz);
    const yC = H + 0.07 + sh / 2;
    // 前框
    add(g, rbox(sw, sh, 0.07, 0.015), M.beige(), mx, yC, mz + 0.06);
    const bz = add(g, plane(sw - 0.01, sh - 0.01), texMat('crtBezel', T.crtBezel()), mx, yC, mz + 0.0955);
    bz.castShadow = false;
    // 后壳（四棱台）
    const back = new THREE.Mesh(crtBackGeo(), M.beige());
    back.position.set(mx, yC - 0.01, mz - 0.13);
    back.castShadow = back.receiveShadow = true;
    g.add(back);
    add(g, box(0.16, 0.12, 0.06), M.beigeDark(), mx, yC - 0.02, mz - 0.3);
    // 散热槽
    for (let i = 0; i < 5; i++) add(g, box(0.18, 0.004, 0.006), M.beigeDark(), mx, yC + 0.12, mz - 0.06 - i * 0.03);
    screen = new THREE.Mesh(crtScreenGeo(0.33, 0.25, 0.014), M.black());
    screen.position.set(mx, yC + 0.022, mz + 0.0965);
  } else {
    // 液晶
    add(g, rbox(0.22, 0.015, 0.16, 0.006), M.black(), mx, H + 0.008, mz - 0.02);
    add(g, box(0.05, 0.22, 0.025), M.black(), mx, H + 0.12, mz - 0.06, -0.12, 0, 0);
    add(g, rbox(0.46, 0.31, 0.035, 0.008), M.blackGloss(), mx, H + 0.33, mz - 0.03);
    const bz = add(g, plane(0.455, 0.305), texMat('lcdBezel', T.lcdBezel()), mx, H + 0.33, mz - 0.0115);
    bz.castShadow = false;
    screen = new THREE.Mesh(plane(0.42, 0.255), M.black());
    screen.position.set(mx, H + 0.337, mz - 0.0105);
  }
  screen.userData.dynamic = true;
  screen.castShadow = false;
  g.add(screen);
  res.screen = screen;

  // 键盘
  const kb = new THREE.Group();
  add(kb, rbox(0.44, 0.022, 0.15, 0.006), M.beige(), 0, 0.011, 0);
  const kt = add(kb, plane(0.43, 0.14), texMat('kbTop', T.keyboard(), { roughness: 0.7 }), 0, 0.0225, 0, -Math.PI / 2, 0, 0);
  kt.castShadow = false;
  kb.position.set(0.0, H, 0.15);
  kb.rotation.x = 0.06;
  g.add(kb);
  // 鼠标垫 + 鼠标 + 线
  const pad = add(g, box(0.22, 0.003, 0.18), texMat('mousepad', canvasTex('mousepad', 128, 104, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#13204a'); gr.addColorStop(1, '#3b0d4f');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    drawText(c, '极速网吧', w / 2, h / 2 - 8, 18, '#ffd34a');
    drawText(c, 'TEL: 0371-6688', w / 2, h / 2 + 16, 10, '#9fb4ff', { weight: 'normal' });
  }), { roughness: 0.9 }), 0.4, H + 0.0015, 0.16);
  pad.castShadow = false;
  const mouse = add(g, sph(0.03, 14, 10), M.beige(), 0.4, H + 0.012, 0.16);
  mouse.scale.set(0.85, 0.5, 1.15);
  tubeAlong(g, [[0.4, H + 0.01, 0.125], [0.38, H + 0.006, 0.05], [0.3, H + 0.004, -0.05], [0.2, H + 0.004, -0.2], [0.15, H + 0.03, -0.29]], 0.003, M.black());
  tubeAlong(g, [[0.0, H + 0.01, 0.08], [0.02, H + 0.004, -0.0], [-0.1, H + 0.004, -0.15], [-0.2, H + 0.05, -0.22]], 0.003, M.black());
  // 耳机（挂在隔断上）
  const hs = new THREE.Group();
  add(hs, hsBandGeo(), M.black(), 0, 0, 0);
  add(hs, cyl(0.04, 0.04, 0.03, 16), M.darkMetal(), 0.075, -0.005, 0, 0, 0, Math.PI / 2);
  add(hs, cyl(0.04, 0.04, 0.03, 16), M.darkMetal(), -0.075, -0.005, 0, 0, 0, Math.PI / 2);
  add(hs, cyl(0.032, 0.032, 0.032, 16), M.fabricDark(), 0.06, -0.005, 0, 0, 0, Math.PI / 2);
  hs.position.set(W / 2 - 0.16, H + divH - 0.08, -D / 2 + 0.06);
  hs.rotation.set(0, 0, 0);
  g.add(hs);
  // 桌上小物件：烟灰缸
  add(g, cyl(0.045, 0.04, 0.025, 12), M.glass(), W / 2 - 0.1, H + 0.0125, 0.22);

  // 杂物（客人离开后的垃圾：泡面桶、可乐罐、纸团）
  const mess = new THREE.Group();
  add(mess, cyl(0.06, 0.045, 0.1, 14), texMat('cupNoodle', T.noodle(0)), -0.22, H + 0.05, 0.18);
  add(mess, geo('chopstick', () => new THREE.CylinderGeometry(0.003, 0.003, 0.2, 4)), M.cardboard(), -0.2, H + 0.11, 0.18, 0.3, 0, 1.2);
  add(mess, cyl(0.032, 0.032, 0.12, 12), texMat('can0', T.can(0)), 0.28, H + 0.06, 0.02);
  const can2 = add(mess, cyl(0.032, 0.032, 0.12, 12), texMat('can1', T.can(1)), 0.36, H + 0.032, 0.25, 0, 0, Math.PI / 2);
  can2.rotation.y = 0.7;
  for (let i = 0; i < 3; i++) add(mess, sph(0.025, 6, 5), M.paper(), -0.05 + i * 0.07, H + 0.02, 0.27 - i * 0.03);
  add(mess, box(0.06, 0.012, 0.09), mat('cigpack', { color: 0xc8202a, roughness: 0.6 }), 0.18, H + 0.006, 0.26, 0, 0.4, 0);
  mess.visible = false;
  mess.userData.dynamic = true;
  g.add(mess);
  res.mess = mess;
  return res;
}

// ---------- 椅子 ----------
export function makeChair(type = 'office') {
  const g = new THREE.Group();
  // 五星脚
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leg = add(g, box(0.04, 0.03, 0.3), M.darkMetal(), Math.sin(a) * 0.15, 0.075, Math.cos(a) * 0.15, 0, a, 0);
    leg.castShadow = true;
    add(g, sph(0.026, 8, 6), M.rubber(), Math.sin(a) * 0.29, 0.028, Math.cos(a) * 0.29);
  }
  add(g, cyl(0.045, 0.05, 0.05, 12), M.darkMetal(), 0, 0.09, 0);
  add(g, cyl(0.022, 0.022, 0.3, 10), M.metal(), 0, 0.27, 0);
  if (type === 'gaming') {
    const red = M.leatherRed(), blk = M.leatherBlack();
    add(g, rbox(0.5, 0.09, 0.5, 0.03), blk, 0, 0.46, 0);
    add(g, rbox(0.08, 0.07, 0.48, 0.03), red, 0.22, 0.51, 0);
    add(g, rbox(0.08, 0.07, 0.48, 0.03), red, -0.22, 0.51, 0);
    const back = new THREE.Group();
    add(back, rbox(0.5, 0.82, 0.09, 0.04), blk, 0, 0.41, 0);
    add(back, rbox(0.1, 0.78, 0.12, 0.04), red, 0.21, 0.41, 0.02);
    add(back, rbox(0.1, 0.78, 0.12, 0.04), red, -0.21, 0.41, 0.02);
    add(back, rbox(0.28, 0.12, 0.08, 0.04), red, 0, 0.7, 0.06);
    add(back, rbox(0.3, 0.12, 0.07, 0.03), blk, 0, 0.22, 0.06);
    back.position.set(0, 0.5, -0.24); back.rotation.x = -0.12;
    g.add(back);
    for (const s of [-1, 1]) {
      add(g, box(0.04, 0.2, 0.04), M.darkMetal(), s * 0.28, 0.58, -0.02);
      add(g, rbox(0.07, 0.03, 0.24, 0.012), blk, s * 0.28, 0.69, 0.0);
    }
  } else if (type === 'sofa') {
    g.clear();
    const lb = M.leatherBrown();
    add(g, rbox(0.72, 0.28, 0.7, 0.04), lb, 0, 0.2, 0);
    add(g, rbox(0.58, 0.14, 0.56, 0.05), lb, 0, 0.4, 0.04);
    add(g, rbox(0.72, 0.55, 0.16, 0.06), lb, 0, 0.6, -0.28, -0.1, 0, 0);
    add(g, rbox(0.12, 0.38, 0.68, 0.05), lb, 0.32, 0.45, 0);
    add(g, rbox(0.12, 0.38, 0.68, 0.05), lb, -0.32, 0.45, 0);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(g, cyl(0.025, 0.02, 0.06, 8), M.darkMetal(), sx * 0.3, 0.03, sz * 0.28);
  } else {
    const fab = M.fabricDark();
    add(g, rbox(0.47, 0.08, 0.45, 0.03), fab, 0, 0.46, 0);
    add(g, box(0.05, 0.3, 0.03), M.darkMetal(), 0, 0.6, -0.23, -0.15, 0, 0);
    add(g, rbox(0.43, 0.46, 0.07, 0.03), fab, 0, 0.86, -0.27, -0.12, 0, 0);
    for (const s of [-1, 1]) {
      add(g, box(0.03, 0.18, 0.03), M.black(), s * 0.25, 0.56, 0.0);
      add(g, rbox(0.06, 0.025, 0.22, 0.01), M.black(), s * 0.25, 0.655, 0.02);
    }
  }
  return g;
}

// ---------- 收银台 ----------
export function makeCounter() {
  const g = new THREE.Group();
  const L = 3.8, D = 0.62, H = 1.08;
  // 前板（客人侧 +z）带木饰与灯带
  add(g, box(L, H - 0.04, 0.04), M.deskSide(), 0, (H - 0.04) / 2, D / 2 - 0.02);
  const plate = add(g, plane(1.6, 0.36), texMat('counterPlate', canvasTex('counterPlate', 512, 116, (c, w, h) => {
    const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2a1208'); gr.addColorStop(1, '#4a2410');
    c.fillStyle = gr; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#d8a540'; c.lineWidth = 4; c.strokeRect(6, 6, w - 12, h - 12);
    drawText(c, '收 银 台', w / 2, 46, 48, '#f5c860', { font: 'KaiTi,STKaiti,serif' });
    drawText(c, '上网请出示有效身份证件', w / 2, 92, 20, '#e8d8b0', { weight: 'normal' });
  }), { roughness: 0.4, metalness: 0.2 }), 0.2, 0.62, D / 2 + 0.001);
  plate.castShadow = false;
  const strip = add(g, box(L - 0.1, 0.02, 0.02), mat('ledStripBlue', { color: 0x66aaff, emissive: 0x3388ff, emissiveIntensity: 2.5 }), 0, 0.08, D / 2 + 0.01);
  strip.castShadow = false;
  // 侧板
  add(g, box(0.04, H - 0.04, D), M.deskSide(), -L / 2 + 0.02, (H - 0.04) / 2, 0);
  add(g, box(0.04, H - 0.04, D), M.deskSide(), L / 2 - 0.02, (H - 0.04) / 2, 0);
  // 高台面（大理石色）
  add(g, rbox(L + 0.06, 0.04, 0.3, 0.01), mat('counterTop', { color: 0x3a3330, roughness: 0.25, metalness: 0.1 }), 0, H, D / 2 - 0.12);
  // 内侧工作台
  add(g, box(L - 0.08, 0.03, D - 0.1), M.desk(), 0, 0.76, -0.02);
  // 内侧储物格
  add(g, box(L - 0.08, 0.02, D - 0.12), M.deskSide(), 0, 0.3, -0.02);

  // 网管电脑（面朝 -z 员工侧）
  const pc = new THREE.Group();
  const ws = makeWorkstationMini();
  pc.add(ws.group);
  pc.position.set(-0.8, 0.775, -0.05);
  pc.rotation.y = Math.PI;
  g.add(pc);
  // 收银钱箱
  add(g, rbox(0.38, 0.1, 0.36, 0.01), M.darkMetal(), 0.3, 0.825, -0.05);
  add(g, box(0.3, 0.012, 0.01), M.metal(), 0.3, 0.83, -0.235);
  // 点卡盒（传奇、魔兽、QQ币）
  add(g, rbox(0.24, 0.1, 0.16, 0.01), mat('cardBox', { color: 0x2a2a3a, roughness: 0.5 }), 0.6, 0.825, -0.12);
  [0xe8b020, 0x2a7ae8, 0xd83a3a, 0x3ab86a, 0xa04ad8].forEach((c, i) => add(g, box(0.035, 0.07, 0.005), mat('cardC' + i, { color: c, roughness: 0.3, metalness: 0.3 }), 0.52 + i * 0.04, 0.89, -0.12 + (i % 2) * 0.03, -0.2, 0, 0));
  // 刷卡器 / 身份证读卡器
  add(g, rbox(0.12, 0.04, 0.16, 0.01), M.black(), 0.7, 1.12, 0.05);
  // 红色座机
  const phone = new THREE.Group();
  add(phone, rbox(0.2, 0.06, 0.22, 0.02), M.red(), 0, 0.03, 0);
  add(phone, rbox(0.22, 0.04, 0.06, 0.02), M.red(), 0, 0.08, 0);
  add(phone, box(0.1, 0.005, 0.08), M.white(), 0, 0.062, 0.04);
  phone.position.set(1.2, 0.775, -0.05);
  g.add(phone);
  // 糖果罐
  add(g, cyl(0.06, 0.06, 0.16, 16), M.glass(), -1.5, 1.18, 0.1);
  for (let i = 0; i < 10; i++) {
    const colors = [0xff3355, 0x33aaff, 0xffcc00, 0x33cc66];
    add(g, sph(0.012, 6, 5), mat('candy' + (i % 4), { color: colors[i % 4], roughness: 0.3 }), -1.5 + (Math.random() - 0.5) * 0.07, 1.12 + Math.random() * 0.08, 0.1 + (Math.random() - 0.5) * 0.07);
  }
  // 登记本 + 笔
  add(g, box(0.22, 0.015, 0.3), mat('ledger', { color: 0x1f3a8a, roughness: 0.7 }), 1.0, 1.108, 0.06, 0, 0.2, 0);
  add(g, cyl(0.004, 0.004, 0.14, 6), M.black(), 1.05, 1.12, 0.06, 0, 0.6, Math.PI / 2);
  // 绿萝
  const plant = makePlant('pothos');
  plant.position.set(1.65, 1.1, 0.08);
  g.add(plant);
  // 泡面堆（台面下方储物格）
  for (let i = 0; i < 6; i++) add(g, cyl(0.06, 0.05, 0.1, 12), texMat('cupNoodle' + (i % 4), T.noodle(i % 4)), -1.4 + i * 0.14, 0.36, -0.05);
  // 路由器（动态灯）
  const router = new THREE.Group();
  add(router, rbox(0.24, 0.04, 0.16, 0.01), M.black(), 0, 0.02, 0);
  add(router, cyl(0.004, 0.004, 0.14, 6), M.black(), -0.09, 0.09, -0.06);
  add(router, cyl(0.004, 0.004, 0.14, 6), M.black(), 0.09, 0.09, -0.06);
  const leds = [];
  for (let i = 0; i < 5; i++) {
    const l = add(router, box(0.012, 0.006, 0.004), M.ledGreen(), -0.07 + i * 0.035, 0.03, 0.081);
    l.userData.dynamic = true; leds.push(l);
  }
  router.position.set(1.55, 0.775, -0.12);
  g.add(router);
  return { group: g, routerLeds: leds, pcScreen: ws.screen, router };
}

function makeWorkstationMini() {
  // 网管专用 CRT（只有显示器+键盘）
  const g = new THREE.Group();
  const sw = 0.42, sh = 0.39;
  add(g, cyl(0.11, 0.12, 0.02, 20), M.beigeDark(), 0, 0.01, 0);
  const yC = 0.07 + sh / 2;
  add(g, rbox(sw, sh, 0.07, 0.015), M.beige(), 0, yC, 0.06);
  const bz = add(g, plane(sw - 0.01, sh - 0.01), texMat('crtBezel', T.crtBezel()), 0, yC, 0.0955);
  bz.castShadow = false;
  const back = new THREE.Mesh(crtBackGeo(), M.beige());
  back.position.set(0, yC - 0.01, -0.13);
  back.castShadow = true;
  g.add(back);
  const screen = new THREE.Mesh(crtScreenGeo(0.33, 0.25, 0.014), M.black());
  screen.position.set(0, yC + 0.022, 0.0965);
  screen.userData.dynamic = true;
  g.add(screen);
  const kb = new THREE.Group();
  add(kb, rbox(0.44, 0.022, 0.15, 0.006), M.beige(), 0, 0.011, 0);
  add(kb, plane(0.43, 0.14), texMat('kbTop', T.keyboard()), 0, 0.0225, 0, -Math.PI / 2, 0, 0);
  kb.position.set(0, 0, 0.26);
  g.add(kb);
  return { group: g, screen };
}

// ---------- 冰柜 ----------
export function makeFridge() {
  const g = new THREE.Group();
  const W = 0.68, H = 1.9, D = 0.62;
  const body = mat('fridgeBody', { color: 0xf3f3f3, roughness: 0.35, metalness: 0.1 });
  add(g, box(W, 0.12, D), body, 0, 0.06, 0);
  add(g, box(W, 0.06, D), body, 0, H - 0.25, 0);
  add(g, box(0.04, H - 0.12, D), body, -W / 2 + 0.02, H / 2, 0);
  add(g, box(0.04, H - 0.12, D), body, W / 2 - 0.02, H / 2, 0);
  add(g, box(W, H - 0.12, 0.03), body, 0, H / 2, -D / 2 + 0.015);
  // 顶部灯箱
  const sign = add(g, box(W, 0.22, D), mat('fridgeSign', {
    map: canvasTex('fridgeSign', 256, 80, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#c8102e'); gr.addColorStop(1, '#ff4a4a');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      drawText(c, '冰 爽 饮 料', w / 2, h / 2, 36, '#fff');
    }), emissive: 0xffffff, emissiveIntensity: 0.6, emissiveMap: null,
  }), 0, H - 0.11, 0);
  sign.material.emissiveMap = sign.material.map;
  // 内部发光
  const inner = add(g, box(W - 0.09, H - 0.42, 0.01), mat('fridgeInner', { color: 0xeaf6ff, emissive: 0xcfeaff, emissiveIntensity: 0.8 }), 0, H / 2 - 0.08, -D / 2 + 0.035);
  inner.castShadow = false;
  // 隔板与饮料
  for (let s = 0; s < 4; s++) {
    const y = 0.2 + s * 0.36;
    add(g, box(W - 0.09, 0.01, D - 0.1), M.glass(), 0, y, 0);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) {
      const k = (s + i) % 4;
      add(g, cyl(0.03, 0.03, 0.12, 10), texMat('can' + k, T.can(k), { roughness: 0.3, metalness: 0.4 }), -0.22 + i * 0.11, y + 0.065, 0.1 - j * 0.14);
    }
  }
  // 玻璃门 + 把手
  const door = add(g, box(W - 0.02, H - 0.36, 0.02), M.glass(), 0, H / 2 - 0.04, D / 2 - 0.01);
  door.castShadow = false;
  add(g, box(0.025, 0.5, 0.03), M.alu(), W / 2 - 0.07, 1.0, D / 2 + 0.02);
  return g;
}

// ---------- 货架 ----------
export function makeShelf() {
  const g = new THREE.Group();
  const W = 1.6, H = 1.7, D = 0.38;
  for (const s of [-1, 1]) for (const f of [-1, 1]) add(g, box(0.03, H, 0.03), M.metal(), s * (W / 2 - 0.015), H / 2, f * (D / 2 - 0.015));
  for (let l = 0; l < 4; l++) {
    const y = 0.12 + l * 0.48;
    add(g, box(W, 0.02, D), M.metal(), 0, y, 0);
    if (l < 3) {
      for (let i = 0; i < 9; i++) {
        const k = (i + l) % 4;
        add(g, cyl(0.065, 0.05, 0.11, 12), texMat('cupNoodle' + k, T.noodle(k)), -W / 2 + 0.1 + i * 0.175, y + 0.065, 0.08);
        add(g, cyl(0.065, 0.05, 0.11, 12), texMat('cupNoodle' + k, T.noodle(k)), -W / 2 + 0.1 + i * 0.175, y + 0.065, -0.08);
        if (i % 3 === 0) add(g, cyl(0.065, 0.05, 0.11, 12), texMat('cupNoodle' + k, T.noodle(k)), -W / 2 + 0.1 + i * 0.175, y + 0.175, 0.08);
      }
    } else {
      // 顶层：火腿肠与纸箱
      add(g, box(0.5, 0.3, 0.32), M.cardboard(), -0.45, y + 0.16, 0);
      add(g, box(0.4, 0.22, 0.3), M.cardboard(), 0.15, y + 0.12, 0);
      for (let i = 0; i < 6; i++) add(g, cyl(0.012, 0.012, 0.18, 6), mat('sausage', { color: 0xd8463a, roughness: 0.5 }), 0.55 + (i % 3) * 0.03, y + 0.02 + Math.floor(i / 3) * 0.025, 0, 0, 0, Math.PI / 2);
    }
  }
  return g;
}

// ---------- 饮水机 ----------
export function makeDispenser() {
  const g = new THREE.Group();
  add(g, rbox(0.32, 0.95, 0.32, 0.02), M.white(), 0, 0.475, 0);
  add(g, box(0.26, 0.2, 0.02), mat('dispFront', { color: 0xd9dde0, roughness: 0.4 }), 0, 0.72, 0.161);
  add(g, box(0.05, 0.05, 0.05), mat('tapRed', { color: 0xdd2222, roughness: 0.3 }), -0.06, 0.66, 0.18);
  add(g, box(0.05, 0.05, 0.05), mat('tapBlue', { color: 0x2266dd, roughness: 0.3 }), 0.06, 0.66, 0.18);
  add(g, box(0.22, 0.02, 0.1), M.darkMetal(), 0, 0.52, 0.17);
  const bottle = add(g, cyl(0.14, 0.14, 0.38, 20), M.water(), 0, 1.15, 0);
  bottle.castShadow = false;
  add(g, cyl(0.05, 0.14, 0.06, 20), M.water(), 0, 0.93, 0);
  const red = add(g, sph(0.008, 6, 4), mat('ledRedSmall', { color: 0xff2222, emissive: 0xff0000, emissiveIntensity: 3 }), -0.06, 0.78, 0.172);
  red.castShadow = false;
  return g;
}

// ---------- 耳机架 ----------
export function makeHeadsetRack() {
  const g = new THREE.Group();
  add(g, box(1.0, 0.5, 0.03), M.deskSide(), 0, 1.5, 0);
  for (let i = 0; i < 4; i++) {
    const x = -0.36 + i * 0.24;
    add(g, cyl(0.006, 0.006, 0.08, 6), M.metal(), x, 1.62, 0.05, Math.PI / 2, 0, 0);
    const hs = new THREE.Group();
    add(hs, hsBandGeo(), M.black(), 0, 0, 0);
    add(hs, cyl(0.04, 0.04, 0.03, 14), i % 2 ? M.ledBlue() : M.darkMetal(), 0.075, -0.005, 0, 0, 0, Math.PI / 2);
    add(hs, cyl(0.04, 0.04, 0.03, 14), M.darkMetal(), -0.075, -0.005, 0, 0, 0, Math.PI / 2);
    hs.position.set(x, 1.58, 0.07);
    g.add(hs);
  }
  // 纸箱（新耳机库存）+ 叠好的毛毯
  add(g, box(0.5, 0.3, 0.35), M.cardboard(), -0.2, 0.15, 0.2);
  const bl = mat('blanket', { color: 0x8a2a3a, roughness: 0.95 }), bl2 = mat('blanketBlue', { color: 0x2a4a8a, roughness: 0.95 });
  for (let i = 0; i < 4; i++) add(g, rbox(0.34, 0.07, 0.26, 0.025), i % 2 ? bl2 : bl, 0.28, 0.04 + i * 0.075, 0.22);
  return g;
}

// ---------- 柜式空调 ----------
export function makeAC() {
  const g = new THREE.Group();
  add(g, rbox(0.5, 1.78, 0.32, 0.04), M.white(), 0, 0.89, 0);
  const front = add(g, plane(0.44, 1.7), texMat('acFront', canvasTex('acFront', 128, 512, (c, w, h) => {
    c.fillStyle = '#f4f4f2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d8d8d4';
    for (let y = 30; y < 200; y += 8) c.fillRect(10, y, w - 20, 4);
    c.fillStyle = '#1a1a1a'; c.fillRect(30, 230, 68, 36);
    drawText(c, '26°C', 64, 248, 20, '#5cf');
    drawText(c, '格立', 64, 300, 26, '#c22');
    c.fillStyle = '#e6e6e2'; c.fillRect(10, 340, w - 20, 160);
    for (let y = 350; y < 500; y += 10) { c.fillStyle = '#cfcfca'; c.fillRect(14, y, w - 28, 3); }
  })), 0, 0.89, 0.161);
  front.castShadow = false;
  return g;
}

// ---------- 灯具 ----------
export function makeTubeLamp() {
  const g = new THREE.Group();
  add(g, box(1.24, 0.05, 0.16), M.white(), 0, 0, 0);
  const t1 = add(g, cyl(0.016, 0.016, 1.16, 8), M.tube(), 0, -0.035, 0.04, 0, 0, Math.PI / 2);
  const t2 = add(g, cyl(0.016, 0.016, 1.16, 8), M.tube(), 0, -0.035, -0.04, 0, 0, Math.PI / 2);
  t1.castShadow = t2.castShadow = false;
  add(g, cyl(0.003, 0.003, 0.3, 4), M.darkMetal(), -0.5, 0.17, 0);
  add(g, cyl(0.003, 0.003, 0.3, 4), M.darkMetal(), 0.5, 0.17, 0);
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return g;
}

// ---------- 植物 ----------
export function makePlant(kind = 'tree') {
  const g = new THREE.Group();
  if (kind === 'pothos') {
    add(g, cyl(0.07, 0.05, 0.1, 12), M.white(), 0, 0.05, 0);
    for (let i = 0; i < 14; i++) {
      const a = i * 2.4, r = 0.04 + (i % 4) * 0.03;
      const l = add(g, sph(0.035, 5, 4), M.leaf(), Math.cos(a) * r, 0.1 + (i % 3) * 0.03 - (i > 9 ? 0.12 : 0), Math.sin(a) * r);
      l.scale.set(1, 0.4, 1.4); l.rotation.y = a;
    }
  } else {
    add(g, cyl(0.2, 0.15, 0.36, 16), M.pot(), 0, 0.18, 0);
    add(g, cyl(0.19, 0.19, 0.02, 16), mat('soil', { color: 0x3a2a1a }), 0, 0.35, 0);
    for (let i = 0; i < 3; i++) add(g, cyl(0.02, 0.03, 1.1, 6), mat('trunk', { color: 0x6a4a2a, roughness: 0.9 }), Math.cos(i * 2) * 0.04, 0.9, Math.sin(i * 2) * 0.04, Math.cos(i * 2) * 0.1, 0, Math.sin(i * 2) * 0.1);
    for (let i = 0; i < 22; i++) {
      const a = i * 2.39, r = 0.1 + Math.random() * 0.22, y = 1.25 + Math.random() * 0.45;
      const l = add(g, geo('leafIco', () => new THREE.IcosahedronGeometry(0.12, 0)), M.leaf(), Math.cos(a) * r, y, Math.sin(a) * r);
      l.scale.set(1, 0.5, 1);
    }
  }
  return g;
}

// ---------- 墙上挂件 ----------
export function makePoster(kind, w = 0.5, h = 0.7) {
  const m = new THREE.Mesh(plane(w, h), texMat('poster_' + kind, posterTex(kind), { roughness: 0.8 }));
  m.receiveShadow = true;
  return m;
}

export function makeClock() {
  const g = new THREE.Group();
  add(g, cyl(0.17, 0.17, 0.04, 32), M.white(), 0, 0, 0, Math.PI / 2, 0, 0);
  add(g, geo('clockRing', () => new THREE.TorusGeometry(0.17, 0.015, 8, 32)), M.red(), 0, 0, 0.02);
  const face = add(g, geo('clockFace', () => new THREE.CircleGeometry(0.16, 32)), texMat('clockFace', canvasTex('clockFace', 256, 256, (c, w, h) => {
    c.fillStyle = '#fbfaf5'; c.fillRect(0, 0, w, h);
    for (let i = 1; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      drawText(c, String(i), w / 2 + Math.sin(a) * 100, h / 2 - Math.cos(a) * 100, 26, '#222');
    }
    drawText(c, '恒久牌', w / 2, h / 2 + 50, 16, '#c22');
  })), 0, 0, 0.021);
  face.castShadow = false;
  const hour = new THREE.Group(); const minute = new THREE.Group();
  add(hour, box(0.012, 0.08, 0.004), M.black(), 0, 0.04, 0);
  add(minute, box(0.008, 0.12, 0.004), M.black(), 0, 0.06, 0);
  hour.position.z = 0.025; minute.position.z = 0.028;
  g.add(hour, minute);
  hour.userData.dynamic = minute.userData.dynamic = true;
  g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  return { group: g, hour, minute };
}

export function makeTV() {
  const g = new THREE.Group();
  add(g, rbox(0.62, 0.48, 0.42, 0.03), M.darkMetal(), 0, 0, -0.1);
  const screen = new THREE.Mesh(crtScreenGeo(0.48, 0.36, 0.015), M.black());
  screen.position.set(0, 0.01, 0.112);
  screen.userData.dynamic = true;
  g.add(screen);
  add(g, box(0.2, 0.04, 0.3), M.darkMetal(), 0, -0.26, -0.15);
  add(g, box(0.04, 0.3, 0.04), M.darkMetal(), 0, -0.4, -0.25);
  return { group: g, screen };
}

export function makeExtinguisher() {
  const g = new THREE.Group();
  add(g, cyl(0.075, 0.075, 0.5, 16), M.red(), 0, 0.25, 0);
  add(g, sph(0.075, 16, 8), M.red(), 0, 0.5, 0);
  add(g, box(0.1, 0.04, 0.03), M.black(), 0, 0.6, 0);
  tubeAlong(g, [[0.03, 0.58, 0], [0.09, 0.5, 0.03], [0.09, 0.3, 0.04]], 0.008, M.black());
  const lab = add(g, plane(0.1, 0.16), texMat('extLabel', canvasTex('extLabel', 64, 100, (c, w, h) => {
    c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); drawText(c, '灭火器', w / 2, 30, 13, '#c00'); drawText(c, 'MFZ/4', w / 2, 60, 11, '#333');
  })), 0, 0.3, 0.076);
  lab.castShadow = false;
  return g;
}

export function makeTrashCan() {
  const g = new THREE.Group();
  add(g, cyl(0.17, 0.14, 0.5, 16), mat('trash', { color: 0x4a6a8a, roughness: 0.6 }), 0, 0.25, 0);
  add(g, cyl(0.18, 0.18, 0.04, 16), mat('trashLid', { color: 0x3a5a7a, roughness: 0.6 }), 0, 0.52, 0);
  add(g, box(0.14, 0.02, 0.04), M.black(), 0, 0.545, 0);
  return g;
}

export function makeBicycle(color = 0x1a3a8a) {
  const g = new THREE.Group();
  const frame = mat('bike' + color, { color, metalness: 0.5, roughness: 0.4 });
  for (const x of [-0.5, 0.5]) {
    add(g, geo('wheel', () => new THREE.TorusGeometry(0.33, 0.02, 6, 24)), M.rubber(), x, 0.34, 0);
    for (let i = 0; i < 6; i++) add(g, cyl(0.002, 0.002, 0.64, 3), M.metal(), x, 0.34, 0, 0, 0, i * Math.PI / 6);
  }
  add(g, cyl(0.018, 0.018, 0.75, 6), frame, 0, 0.55, 0, 0, 0, Math.PI / 2 + 0.1);
  add(g, cyl(0.018, 0.018, 0.55, 6), frame, -0.22, 0.48, 0, 0, 0, 0.85);
  add(g, cyl(0.018, 0.018, 0.5, 6), frame, 0.38, 0.55, 0, 0, 0, -0.35);
  add(g, rbox(0.2, 0.05, 0.1, 0.02), M.black(), -0.15, 0.85, 0);
  add(g, cyl(0.012, 0.012, 0.5, 6), M.metal(), 0.45, 0.88, 0, Math.PI / 2, 0, 0);
  add(g, box(0.35, 0.02, 0.18), M.metal(), -0.5, 0.7, 0);
  return g;
}

export function makeStreetLamp() {
  const g = new THREE.Group();
  add(g, cyl(0.07, 0.1, 5.5, 10), M.darkMetal(), 0, 2.75, 0);
  add(g, box(0.06, 0.06, 1.2), M.darkMetal(), 0, 5.4, -0.55);
  const head = add(g, rbox(0.25, 0.12, 0.5, 0.03), M.darkMetal(), 0, 5.35, -1.1);
  const bulb = add(g, box(0.2, 0.02, 0.4), mat('lampBulb', { color: 0xffd28a, emissive: 0xffb050, emissiveIntensity: 3 }), 0, 5.28, -1.1);
  bulb.userData.dynamic = true;
  return { group: g, bulb, head };
}

// 门帘（冬季棉门帘），动态摆动
export function makeQuiltCurtain(w = 1.3, h = 2.2) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(box(w, h, 0.05), texMat('quilt', quiltTex(), { roughness: 0.95 }));
  m.position.y = -h / 2;
  m.castShadow = true;
  g.add(m);
  g.userData.dynamic = true;
  return g;
}

// 旋转灯箱
export function makeLightBox() {
  const g = new THREE.Group();
  add(g, box(0.56, 0.08, 0.56), M.darkMetal(), 0, 0.04, 0);
  const rot = new THREE.Group();
  const faces = ['网吧', '上网', '通宵', '游戏'];
  faces.forEach((f, i) => {
    const t = canvasTex('lb_' + f, 128, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff2a3a'); gr.addColorStop(1, '#b80018');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      drawText(c, f[0], w / 2, 70, 84, '#fff7a0', { shadow: '#ff0', blur: 10 });
      drawText(c, f[1], w / 2, 175, 84, '#fff7a0', { shadow: '#ff0', blur: 10 });
    });
    const p = new THREE.Mesh(plane(0.46, 1.1), new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 1.4, roughness: 0.4 }));
    const a = (i / 4) * Math.PI * 2;
    p.position.set(Math.sin(a) * 0.231, 0.68, Math.cos(a) * 0.231);
    p.rotation.y = a;
    rot.add(p);
  });
  add(rot, box(0.48, 0.04, 0.48), M.alu(), 0, 1.25, 0);
  add(rot, box(0.48, 0.04, 0.48), M.alu(), 0, 0.11, 0);
  g.add(rot);
  g.userData.dynamic = true;
  return { group: g, rot };
}

// ---------- 静态合批 ----------
// 把非动态网格按材质合并，大幅减少 DrawCall
export function bake(root) {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const keep = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    let p = o, dyn = false;
    while (p && p !== root) { if (p.userData.dynamic) { dyn = true; break; } p = p.parent; }
    if (dyn || Array.isArray(o.material) || o.material.transparent && false) { return; }
    const g = o.geometry.clone();
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    g.applyMatrix4(m);
    const ng = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
    if (!ng.attributes.uv) ng.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2));
    ng.clearGroups();
    const key = o.material.uuid + (o.castShadow ? 's' : 'n');
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [], cast: o.castShadow });
    buckets.get(key).geos.push(ng);
    keep.push(o);
  });
  for (const o of keep) o.parent.remove(o);
  for (const { mat: mt, geos, cast } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, mt);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    root.add(mesh);
  }
  // 清理空 Group
  return root;
}
