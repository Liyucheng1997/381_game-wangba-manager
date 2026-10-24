// 所有程序化贴图（Canvas 绘制），避免外部资源依赖
import * as THREE from 'three';

const FONT = '"Microsoft YaHei","PingFang SC","Noto Sans SC",sans-serif';
const cache = new Map();

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

export function canvasTex(key, w, h, draw, opts = {}) {
  if (key && cache.has(key)) return cache.get(key);
  const c = makeCanvas(w, h);
  const ctx = c.getContext('2d');
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = opts.linear ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  if (key) cache.set(key, t);
  return t;
}

// 简单可复现随机
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise(ctx, w, h, amt, seed = 7, alpha = 0.06) {
  const r = rng(seed);
  for (let i = 0; i < amt; i++) {
    const v = r() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
  }
}

function text(ctx, s, x, y, size, color, opts = {}) {
  ctx.save();
  ctx.font = `${opts.weight || 'bold'} ${size}px ${opts.font || FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = opts.base || 'middle';
  if (opts.stroke) { ctx.lineWidth = opts.strokeW || 4; ctx.strokeStyle = opts.stroke; ctx.strokeText(s, x, y); }
  if (opts.shadow) { ctx.shadowColor = opts.shadow; ctx.shadowBlur = opts.blur || 12; }
  ctx.fillText(s, x, y);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export { text as drawText, roundRect, FONT };

// ---------- 地面与墙面 ----------
export const T = {
  floor: () => canvasTex('floor', 512, 512, (ctx, w, h) => {
    // 2x2 块米黄色仿大理石地砖
    const r = rng(11);
    const n = 2, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const base = 222 + r() * 14;
      ctx.fillStyle = `rgb(${base},${base - 8},${base - 26})`;
      ctx.fillRect(i * s, j * s, s, s);
      // 石纹
      for (let k = 0; k < 14; k++) {
        ctx.strokeStyle = `rgba(150,130,100,${0.05 + r() * 0.08})`;
        ctx.lineWidth = 0.5 + r() * 1.5;
        ctx.beginPath();
        let x = i * s + r() * s, y = j * s + r() * s;
        ctx.moveTo(x, y);
        for (let q = 0; q < 5; q++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; ctx.lineTo(x, y); }
        ctx.stroke();
      }
      // 斑点
      for (let k = 0; k < 220; k++) {
        ctx.fillStyle = `rgba(${120 + r() * 60},${100 + r() * 50},${80},${r() * 0.18})`;
        ctx.fillRect(i * s + r() * s, j * s + r() * s, 1 + r() * 3, 1 + r() * 3);
      }
    }
    // 磨损脚印暗区
    for (let k = 0; k < 6; k++) {
      const g = ctx.createRadialGradient(r() * w, r() * h, 0, r() * w, r() * h, 80 + r() * 80);
      g.addColorStop(0, 'rgba(90,70,40,0.07)'); g.addColorStop(1, 'rgba(90,70,40,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
    // 烟头烫痕
    for (let k = 0; k < 3; k++) {
      ctx.fillStyle = 'rgba(40,30,20,0.35)';
      ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 2 + r() * 2, 1.5, r() * 3, 0, Math.PI * 2); ctx.fill();
    }
    // 砖缝
    ctx.strokeStyle = 'rgba(110,100,85,0.9)'; ctx.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke();
    }
  }, { repeat: [1, 1] }),

  wallLower: () => canvasTex('wallLower', 256, 256, (ctx, w, h) => {
    // 经典“墙裙”绿油漆
    ctx.fillStyle = '#4f8a6a'; ctx.fillRect(0, 0, w, h);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 3000, 3, 0.07);
    // 刮痕与掉漆
    const r = rng(5);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(230,230,210,${0.1 + r() * 0.2})`;
      ctx.lineWidth = 0.6;
      const x = r() * w, y = r() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 6); ctx.stroke();
    }
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = 'rgba(225,225,205,0.55)';
      ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 2 + r() * 6, 1 + r() * 3, r(), 0, 7); ctx.fill();
    }
  }, { repeat: [1, 1] }),

  wallUpper: () => canvasTex('wallUpper', 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e9e6dc'; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 2500, 9, 0.05);
    // 熏黄的烟渍（靠上更深）
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, 'rgba(160,130,60,0.16)'); g.addColorStop(1, 'rgba(160,130,60,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }, { repeat: [1, 1] }),

  wood: () => canvasTex('wood', 512, 256, (ctx, w, h) => {
    const r = rng(21);
    ctx.fillStyle = '#b98a5a'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 1) {
      const v = Math.sin(y * 0.15 + Math.sin(y * 0.03) * 4) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(90,50,20,${0.05 + v * 0.12})`;
      ctx.fillRect(0, y, w, 1);
    }
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = `rgba(80,45,20,${0.08 + r() * 0.15})`;
      ctx.lineWidth = 0.5 + r();
      const y = r() * h;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x < w; x += 20) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 3);
      ctx.stroke();
    }
    noise(ctx, w, h, 1500, 4, 0.05);
  }),

  deskTop: () => canvasTex('deskTop', 512, 256, (ctx, w, h) => {
    // 仿木纹三聚氰胺板，带烟灰、划痕、可乐印
    const r = rng(31);
    ctx.fillStyle = '#d2b48a'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      const v = Math.sin(y * 0.2 + Math.sin(y * 0.05) * 3) * 0.5 + 0.5;
      ctx.fillStyle = `rgba(120,80,40,${0.03 + v * 0.07})`;
      ctx.fillRect(0, y, w, 1);
    }
    for (let i = 0; i < 25; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + r() * 0.12})`;
      ctx.lineWidth = 0.6;
      const x = r() * w, y = r() * h;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + (r() - 0.5) * 80, y + (r() - 0.5) * 10); ctx.stroke();
    }
    for (let i = 0; i < 2; i++) {
      ctx.strokeStyle = 'rgba(90,50,20,0.18)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r() * w, r() * h, 14, 0, 7); ctx.stroke();
    }
    noise(ctx, w, h, 1500, 8, 0.05);
  }),

  plastic: () => canvasTex('plastic', 128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#e8e1cc'; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 1200, 12, 0.05);
  }),

  fabric: (color = '#2a2d36') => canvasTex('fabric' + color, 128, 128, (ctx, w, h) => {
    ctx.fillStyle = color; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { ctx.fillStyle = 'rgba(255,255,255,0.03)'; ctx.fillRect(0, y, w, 1); }
    for (let x = 0; x < w; x += 2) { ctx.fillStyle = 'rgba(0,0,0,0.06)'; ctx.fillRect(x, 0, 1, h); }
    noise(ctx, w, h, 800, 13, 0.06);
  }, { repeat: [2, 2] }),

  keyboard: () => canvasTex('keyboard', 512, 176, (ctx, w, h) => {
    ctx.fillStyle = '#d9d3bf'; ctx.fillRect(0, 0, w, h);
    const rows = [
      ['Esc', '', 'F1', 'F2', 'F3', 'F4', '', 'F5', 'F6', 'F7', 'F8', '', 'F9', 'F10', 'F11', 'F12'],
      ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', '←'],
      ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
      ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
      ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
      ['Ctrl', 'Win', 'Alt', '', 'Alt', 'Win', 'Ctrl'],
    ];
    const kw = 25, kh = 24, ox = 8;
    rows.forEach((row, ri) => {
      let x = ox;
      const y = 8 + ri * 27;
      row.forEach((k) => {
        let ww = kw;
        if (k === '') { if (ri === 5) ww = kw * 6; else { x += 10; return; } }
        if (['Tab', 'Caps', 'Ctrl', 'Alt', 'Win'].includes(k)) ww = kw * 1.4;
        if (k === 'Shift') ww = kw * 2.2;
        if (k === 'Enter' || k === '←') ww = kw * 2;
        ctx.fillStyle = '#3c3a35'; roundRect(ctx, x, y + 2, ww - 2, kh, 3); ctx.fill();
        // WASD 磨得发亮
        const worn = ['W', 'A', 'S', 'D'].includes(k);
        ctx.fillStyle = worn ? '#f6f2e4' : '#ebe5d2'; roundRect(ctx, x, y, ww - 2, kh - 2, 3); ctx.fill();
        if (worn) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x + 4, y + 10, ww - 10, 4); }
        text(ctx, worn ? '' : k, x + ww / 2 - 1, y + kh / 2 - 1, k.length > 2 ? 8 : 11, '#4a4740', { weight: 'normal' });
        x += ww;
      });
    });
    // 小键盘
    for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
      const x = 410 + i * 24, y = 35 + j * 27;
      ctx.fillStyle = '#3c3a35'; roundRect(ctx, x, y + 2, 22, 24, 3); ctx.fill();
      ctx.fillStyle = '#ebe5d2'; roundRect(ctx, x, y, 22, 22, 3); ctx.fill();
    }
    // 指示灯
    ['#3f3', '#3f3', '#333'].forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(420 + i * 22, 12, 6, 4); });
  }),

  towerFront: () => canvasTex('towerFront', 128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e4dcc4'; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 600, 2, 0.05);
    // 光驱
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = '#d4ccb2'; ctx.fillRect(10, 14 + i * 26, w - 20, 22);
      ctx.strokeStyle = '#a69f88'; ctx.strokeRect(10, 14 + i * 26, w - 20, 22);
      ctx.fillStyle = '#6d6858'; ctx.fillRect(18, 23 + i * 26, w - 52, 3);
      ctx.fillStyle = '#9c957f'; ctx.fillRect(w - 26, 20 + i * 26, 8, 5);
    }
    // 软驱
    ctx.fillStyle = '#d4ccb2'; ctx.fillRect(30, 72, w - 60, 16);
    ctx.fillStyle = '#3c3a35'; ctx.fillRect(36, 79, w - 72, 3);
    // 电源键与灯
    ctx.fillStyle = '#b8b09a'; ctx.beginPath(); ctx.arc(w / 2, 150, 12, 0, 7); ctx.fill();
    ctx.fillStyle = '#d8d0b8'; ctx.beginPath(); ctx.arc(w / 2, 150, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#b8b09a'; ctx.fillRect(w / 2 - 6, 172, 12, 6);
    // 贴纸
    ctx.fillStyle = '#1a4ea8'; roundRect(ctx, 30, 196, 68, 34, 4); ctx.fill();
    text(ctx, '奔腾 4', 64, 207, 12, '#fff');
    text(ctx, 'HT 2.8GHz', 64, 222, 9, '#bcd3ff', { weight: 'normal' });
    // 散热格栅
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 6; i++) ctx.fillRect(20, 100 + i * 6, w - 40, 2);
  }),

  crtBezel: (brand = '极光') => canvasTex('crtBezel' + brand, 256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#e6dfc8'; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 800, 6, 0.05);
    ctx.fillStyle = '#c9c1a8'; roundRect(ctx, 14, 12, w - 28, h - 52, 14); ctx.fill();
    ctx.fillStyle = '#1b1d1f'; roundRect(ctx, 22, 20, w - 44, h - 68, 10); ctx.fill();
    text(ctx, brand + ' 17"', 52, h - 22, 12, '#6d6754');
    ctx.fillStyle = '#b4ac94';
    for (let i = 0; i < 4; i++) ctx.fillRect(w - 112 + i * 18, h - 26, 12, 6);
    ctx.fillStyle = '#3d3'; ctx.fillRect(w - 30, h - 26, 8, 6);
  }),

  lcdBezel: () => canvasTex('lcdBezel', 256, 200, (ctx, w, h) => {
    ctx.fillStyle = '#1d1e22'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#26282d'; ctx.fillRect(0, h - 22, w, 22);
    text(ctx, 'SYNCVIEW', w / 2, h - 11, 10, '#8a8f99', { weight: 'normal' });
    ctx.fillStyle = '#39f'; ctx.fillRect(w - 18, h - 13, 6, 4);
  }),

  // 方便面包装
  noodle: (flavor = 0) => canvasTex('noodle' + flavor, 128, 128, (ctx, w, h) => {
    const sets = [['#d22', '#fd0', '红烧牛肉面'], ['#e80', '#fff', '香辣牛肉面'], ['#2a5', '#ff0', '老坛酸菜面'], ['#a1a', '#fff', '鲜虾鱼板面']];
    const [bg, fg, name] = sets[flavor % sets.length];
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(0, 0, w, 22);
    text(ctx, '康帅傅', w / 2, 14, 14, fg);
    ctx.fillStyle = '#f5d48a'; ctx.beginPath(); ctx.ellipse(w / 2, 68, 38, 22, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#d9a650'; ctx.lineWidth = 2;
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(w / 2 - 20 + i * 8, 64, 8, 0, Math.PI); ctx.stroke(); }
    ctx.fillStyle = '#8b3a1a'; ctx.beginPath(); ctx.ellipse(w / 2 + 14, 62, 9, 6, 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = '#3a3'; ctx.fillRect(w / 2 - 18, 58, 6, 4);
    text(ctx, name, w / 2, 106, 15, fg, { stroke: 'rgba(0,0,0,0.4)', strokeW: 3 });
  }),

  can: (kind = 0) => canvasTex('can' + kind, 128, 128, (ctx, w, h) => {
    const sets = [['#c8102e', '#fff', '可乐'], ['#1c8a3c', '#ffe25a', '冰红茶'], ['#f5c400', '#c00', '红牛'], ['#0c5bb5', '#fff', '雪碧']];
    const [bg, fg, name] = sets[kind % sets.length];
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, bg); g.addColorStop(0.35, '#fff8'); g.addColorStop(0.45, bg); g.addColorStop(1, '#0006');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = bg; ctx.fillRect(0, 36, w, 56);
    text(ctx, name, w / 2, 64, 26, fg);
    ctx.fillStyle = '#bbb'; ctx.fillRect(0, 0, w, 8); ctx.fillRect(0, h - 8, w, 8);
  }),

  marquee: null, // 动态生成

  street: () => canvasTex('street', 512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#3a3b3e'; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 9000, 15, 0.1);
    ctx.fillStyle = '#d8c64a';
    for (let x = 0; x < w; x += 128) ctx.fillRect(x + 20, h / 2 - 4, 70, 8);
  }, { repeat: [1, 1] }),

  sidewalk: () => canvasTex('sidewalk', 256, 256, (ctx, w, h) => {
    const r = rng(41);
    const s = 64;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const v = 150 + r() * 25;
      ctx.fillStyle = (i + j) % 2 ? `rgb(${v},${v - 20},${v - 30})` : `rgb(${v - 30},${v - 40},${v - 45})`;
      ctx.fillRect(i * s, j * s, s, s);
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.strokeRect(i * s, j * s, s, s);
    }
    noise(ctx, w, h, 3000, 16, 0.1);
  }, { repeat: [24, 3] }),
};

// ---------- 海报 / 标牌 ----------
export function posterTex(kind) {
  return canvasTex('poster_' + kind, 256, 360, (ctx, w, h) => {
    const r = rng(kind.length * 31);
    if (kind === 'cs') {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2b2a1f'); g.addColorStop(1, '#6b5a2a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // 硝烟
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(220,200,150,${r() * 0.12})`;
        ctx.beginPath(); ctx.arc(r() * w, 120 + r() * 200, 20 + r() * 40, 0, 7); ctx.fill();
      }
      // 士兵剪影
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(128, 150, 26, 0, 7); ctx.fill();
      ctx.fillRect(98, 170, 60, 110);
      ctx.fillRect(70, 200, 120, 18);
      ctx.fillRect(150, 192, 80, 10); // 枪
      ctx.fillRect(100, 280, 22, 70); ctx.fillRect(134, 280, 22, 70);
      ctx.fillStyle = '#c33'; ctx.fillRect(116, 142, 24, 5);
      text(ctx, '反恐精锐', w / 2, 46, 40, '#e8d07a', { stroke: '#000', strokeW: 5 });
      text(ctx, 'COUNTER · STRIKE 1.6', w / 2, 82, 13, '#fff');
      text(ctx, '每周六 战队赛', w / 2, h - 18, 16, '#ff0', { stroke: '#000' });
    } else if (kind === 'legend') {
      const g = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h);
      g.addColorStop(0, '#8b1010'); g.addColorStop(1, '#1a0202');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#e8b830'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, w - 20, h - 20);
      // 屠龙刀
      ctx.save(); ctx.translate(128, 200); ctx.rotate(-0.6);
      ctx.fillStyle = '#ddd'; ctx.fillRect(-10, -120, 26, 170);
      ctx.fillStyle = '#e8b830'; ctx.fillRect(-20, 50, 46, 10); ctx.fillStyle = '#5a2a10'; ctx.fillRect(-4, 60, 14, 50);
      ctx.restore();
      text(ctx, '热血传说', w / 2, 60, 46, '#ffd24a', { stroke: '#400', strokeW: 6, shadow: '#f80' });
      text(ctx, '一刀999  新区火爆开启', w / 2, h - 50, 15, '#fff', { stroke: '#000', strokeW: 3 });
      text(ctx, '是兄弟就来砍我', w / 2, h - 26, 13, '#fd5');
    } else if (kind === 'dance') {
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#ff5fb4'); g.addColorStop(1, '#5a3cff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { ctx.fillStyle = `rgba(255,255,255,${r() * 0.6})`; ctx.beginPath(); ctx.arc(r() * w, r() * h, r() * 3, 0, 7); ctx.fill(); }
      ['←', '↑', '→', '↓'].forEach((a, i) => text(ctx, a, 50 + i * 52, 210, 44, '#fff', { stroke: '#a0f', strokeW: 4 }));
      text(ctx, '劲舞天团', w / 2, 70, 44, '#fff', { stroke: '#c0e', strokeW: 6 });
      text(ctx, '你的舞台 你的天下', w / 2, 120, 16, '#fff');
      text(ctx, '9 级 P 键 · 爱情来得太快', w / 2, h - 30, 13, '#fff');
    } else if (kind === 'war') {
      ctx.fillStyle = '#0e1a2e'; ctx.fillRect(0, 0, w, h);
      const g = ctx.createRadialGradient(w / 2, 150, 10, w / 2, 150, 160);
      g.addColorStop(0, '#3a7bd5'); g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#9ac'; ctx.beginPath(); ctx.moveTo(128, 70); ctx.lineTo(180, 260); ctx.lineTo(76, 260); ctx.closePath(); ctx.fill();
      text(ctx, '魔兽大陆', w / 2, 300, 42, '#f5c542', { stroke: '#321', strokeW: 6 });
      text(ctx, '公测火热进行中', w / 2, 336, 15, '#cde');
    } else if (kind === 'nominor') {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#c00'; ctx.lineWidth = 10; ctx.strokeRect(8, 8, w - 16, h - 16);
      ctx.strokeStyle = '#c00'; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(128, 120, 70, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(78, 70); ctx.lineTo(178, 170); ctx.stroke();
      text(ctx, '18', 128, 122, 56, '#222');
      text(ctx, '未成年人', w / 2, 236, 38, '#c00');
      text(ctx, '禁止入内', w / 2, 282, 38, '#c00');
      text(ctx, '青石县文化市场管理办公室 监制', w / 2, 334, 11, '#666', { weight: 'normal' });
    } else if (kind === 'nosmoke') {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#333'; ctx.fillRect(60, 110, 136, 26); ctx.fillStyle = '#e60'; ctx.fillRect(170, 110, 26, 26);
      ctx.strokeStyle = '#c00'; ctx.lineWidth = 16; ctx.beginPath(); ctx.arc(128, 123, 80, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(72, 67); ctx.lineTo(184, 179); ctx.stroke();
      text(ctx, '禁止吸烟', w / 2, 260, 44, '#c00');
      text(ctx, 'NO SMOKING', w / 2, 306, 20, '#333');
    } else if (kind === 'price') {
      ctx.fillStyle = '#21352a'; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 12; ctx.strokeRect(0, 0, w, h);
      text(ctx, '上网价目表', w / 2, 44, 30, '#fff7d0', { font: 'KaiTi,STKaiti,serif' });
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, 70); ctx.lineTo(w - 30, 70); ctx.stroke();
    } else if (kind === 'notice') {
      ctx.fillStyle = '#fffbe6'; ctx.fillRect(0, 0, w, h);
      text(ctx, '网管提醒', w / 2, 40, 30, '#c00');
      const lines = ['1. 上网请出示身份证', '2. 请保管好随身物品', '   贵重物品丢失概不负责', '3. 禁止浏览不良网站', '4. 泡面4元 饮料3元', '5. 有事请喊网管'];
      lines.forEach((l, i) => text(ctx, l, 24, 92 + i * 38, 17, '#333', { align: 'left', weight: 'normal' }));
      text(ctx, '极速网吧', w - 30, h - 24, 16, '#555', { align: 'right' });
    } else if (kind === 'calendar') {
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d22'; ctx.fillRect(0, 0, w, 120);
      text(ctx, '2006', w / 2, 40, 30, '#fff');
      text(ctx, '十二月', w / 2, 86, 36, '#fff');
      ctx.fillStyle = '#ffd'; ctx.fillRect(0, 120, w, 30);
      text(ctx, '恭喜发财 · 青石县农村信用社', w / 2, 135, 13, '#a00', { weight: 'normal' });
      for (let i = 0; i < 35; i++) {
        const d = i - 4; if (d < 1 || d > 31) continue;
        text(ctx, String(d), 26 + (i % 7) * 34, 170 + Math.floor(i / 7) * 36, 16, i % 7 === 0 || i % 7 === 6 ? '#d22' : '#333', { weight: 'normal' });
      }
    } else if (kind === 'fire') {
      ctx.fillStyle = '#0a7a3a'; ctx.fillRect(0, 0, w, h);
      text(ctx, '安全出口', w / 2, 140, 46, '#fff');
      text(ctx, 'EXIT', w / 2, 200, 40, '#fff');
      text(ctx, '🏃', w / 2, 280, 70, '#fff');
    } else if (kind === 'wc') {
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(0, 0, w, h);
      text(ctx, 'WC', w / 2, 140, 90, '#2a5aa8');
      text(ctx, '卫生间', w / 2, 250, 40, '#333');
    }
    // 老化：边缘泛黄、胶带
    const g2 = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.75);
    g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(120,90,20,0.25)');
    ctx.fillStyle = g2; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,250,220,0.55)';
    ctx.save(); ctx.translate(14, 10); ctx.rotate(-0.6); ctx.fillRect(-20, -6, 40, 12); ctx.restore();
    ctx.save(); ctx.translate(w - 14, 10); ctx.rotate(0.6); ctx.fillRect(-20, -6, 40, 12); ctx.restore();
  });
}

// 价目表需要动态价格
export function priceBoardDraw(ctx, w, h, price, vipPrice) {
  ctx.fillStyle = '#21352a'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 12; ctx.strokeRect(0, 0, w, h);
  text(ctx, '上网价目表', w / 2, 44, 30, '#fff7d0', { font: 'KaiTi,STKaiti,serif' });
  ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, 70); ctx.lineTo(w - 30, 70); ctx.stroke();
  const rows = [['普通区', `${price}元/小时`], ['VIP包间', vipPrice ? `${vipPrice}元/小时` : '装修中'], ['通宵', '10元'], ['泡面', '4元'], ['饮料', '3元']];
  rows.forEach(([a, b], i) => {
    text(ctx, a, 36, 108 + i * 48, 22, '#ffffff', { align: 'left', font: 'KaiTi,STKaiti,serif' });
    text(ctx, b, w - 30, 108 + i * 48, 22, i === 0 ? '#ffe56a' : '#d8f5d0', { align: 'right', font: 'KaiTi,STKaiti,serif' });
  });
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 20; i++) ctx.fillRect(Math.random() * w, Math.random() * h, 30, 2);
}

export function signTex(textStr, sub, bg, fg, key) {
  return canvasTex(key, 512, 160, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(8, 8, w - 16, h - 16);
    text(ctx, textStr, w / 2, sub ? 66 : h / 2, 76, fg, { shadow: fg, blur: 18 });
    if (sub) text(ctx, sub, w / 2, 128, 24, '#fff', { weight: 'normal' });
  });
}

export function verticalSignTex(chars, bg, fg, key) {
  return canvasTex(key, 128, 512, (ctx, w, h) => {
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = fg; ctx.lineWidth = 6; ctx.strokeRect(6, 6, w - 12, h - 12);
    const step = (h - 40) / chars.length;
    [...chars].forEach((c, i) => text(ctx, c, w / 2, 20 + step * (i + 0.5), 82, fg, { shadow: fg, blur: 16 }));
  });
}

export function buildingTex(seed, lit) {
  return canvasTex('bld' + seed + lit, 256, 256, (ctx, w, h) => {
    const r = rng(seed);
    const base = 90 + r() * 60;
    ctx.fillStyle = `rgb(${base},${base - 10},${base - 20})`; ctx.fillRect(0, 0, w, h);
    noise(ctx, w, h, 3000, seed, 0.08);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const on = r() < lit;
      ctx.fillStyle = on ? `rgb(255,${200 + r() * 40},${120 + r() * 60})` : '#2a3038';
      ctx.fillRect(20 + i * 58, 20 + j * 58, 36, 40);
      ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(20 + i * 58, 58 + j * 58, 36, 3);
    }
  });
}

export function quiltTex() {
  // 冬季军绿色棉门帘
  return canvasTex('quilt', 128, 256, (ctx, w, h) => {
    ctx.fillStyle = '#4b5a32'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      const g = ctx.createLinearGradient(0, y, 0, y + 32);
      g.addColorStop(0, 'rgba(0,0,0,0.25)'); g.addColorStop(0.5, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = g; ctx.fillRect(0, y, w, 32);
    }
    ctx.fillStyle = '#6a3a1a'; ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, h - 10, w, 10);
    noise(ctx, w, h, 1500, 3, 0.08);
  });
}
