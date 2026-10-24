// 电脑屏幕动态画面：每种“程序”一张共享 CanvasTexture
import * as THREE from 'three';
import { makeCanvas, drawText, roundRect, rng } from './textures.js';

const W = 256, H = 192;

function grad(ctx, y0, y1, c0, c1) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, c0); g.addColorStop(1, c1);
  return g;
}

const PROGRAMS = {
  off(ctx) {
    ctx.fillStyle = '#0a0c0e'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, 'rgba(255,255,255,0.06)'); g.addColorStop(0.5, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  },

  login(ctx, t) {
    ctx.fillStyle = grad(ctx, 0, H, '#0b3b8c', '#06183d'); ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(120,180,255,${0.05 + 0.05 * Math.sin(t + i)})`;
      ctx.beginPath(); ctx.arc((i * 47 + t * 10) % W, 40 + (i * 31) % 120, 20 + (i % 3) * 10, 0, 7); ctx.fill();
    }
    drawText(ctx, '极速网吧', W / 2, 52, 30, '#ffd84a', { shadow: '#f80', blur: 8 });
    drawText(ctx, 'JISU INTERNET CAFE', W / 2, 78, 10, '#9cc4ff', { weight: 'normal' });
    ctx.fillStyle = 'rgba(255,255,255,0.12)'; roundRect(ctx, 48, 96, 160, 50, 6); ctx.fill();
    drawText(ctx, '本机未开通', W / 2, 112, 13, '#fff');
    drawText(ctx, '请到前台开卡上机', W / 2, 132, 12, '#bfe0ff', { weight: 'normal' });
    const s = '欢迎光临！本店新到《热血传说》新区 · 通宵仅需10元 · 文明上网 · 健康游戏 ·  ';
    ctx.font = '11px "Microsoft YaHei"'; ctx.fillStyle = '#ffe';
    const x = W - ((t * 40) % (W + 400));
    ctx.fillText(s, x, 176);
  },

  cs(ctx, t, seed) {
    const r = rng(seed);
    const pan = Math.sin(t * 0.7 + seed) * 40 + Math.sin(t * 2.3) * 6;
    const hz = 92 + Math.sin(t * 1.3 + seed) * 4;
    ctx.fillStyle = grad(ctx, 0, hz, '#7fa6c9', '#d6c9a6'); ctx.fillRect(0, 0, W, hz);
    ctx.fillStyle = grad(ctx, hz, H, '#b89a64', '#7a6038'); ctx.fillRect(0, hz, W, H - hz);
    // 沙漠地图墙体透视
    const walls = [[-120, 30, '#c9a96a'], [40, 70, '#b58f52'], [150, 45, '#d4b67a'], [-40, 55, '#a88446']];
    walls.forEach(([x, w, c], i) => {
      const xx = x - pan + W / 2;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(xx, hz - 50 - i * 6); ctx.lineTo(xx + w, hz - 38 - i * 4); ctx.lineTo(xx + w, hz + 18 + i * 3); ctx.lineTo(xx, hz + 26 + i * 4); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(xx + w * 0.6, hz - 30, w * 0.4, 50);
    });
    // 箱子
    ctx.fillStyle = '#8a6a32'; ctx.fillRect(W / 2 + 30 - pan * 0.5, hz + 4, 34, 30);
    ctx.strokeStyle = '#5a4018'; ctx.strokeRect(W / 2 + 30 - pan * 0.5, hz + 4, 34, 30);
    // 敌人
    const ex = ((t * 25 + seed * 50) % 300) - 50 - pan * 0.8;
    if (Math.sin(t * 0.5 + seed) > 0) {
      ctx.fillStyle = '#2a2a1a'; ctx.fillRect(ex, hz - 14, 8, 22); ctx.beginPath(); ctx.arc(ex + 4, hz - 18, 4, 0, 7); ctx.fill();
    }
    // 枪
    const bob = Math.sin(t * 8) * 2;
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath(); ctx.moveTo(150, H); ctx.lineTo(190, 130 + bob); ctx.lineTo(232, 128 + bob); ctx.lineTo(240, 140 + bob); ctx.lineTo(220, H); ctx.fill();
    ctx.fillStyle = '#5a4022'; ctx.fillRect(196, 150 + bob, 22, 42);
    ctx.fillStyle = '#e7c49a'; ctx.beginPath(); ctx.ellipse(205, 175 + bob, 18, 14, 0.3, 0, 7); ctx.fill();
    if ((t * 7 + seed) % 3 < 0.35) {
      ctx.fillStyle = '#ffe48a'; ctx.beginPath(); ctx.arc(192, 128 + bob, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(192, 128 + bob, 5, 0, 7); ctx.fill();
    }
    // 准星
    ctx.strokeStyle = '#4f4'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(W / 2 - 10, H / 2); ctx.lineTo(W / 2 - 4, H / 2); ctx.moveTo(W / 2 + 4, H / 2); ctx.lineTo(W / 2 + 10, H / 2);
    ctx.moveTo(W / 2, H / 2 - 10); ctx.lineTo(W / 2, H / 2 - 4); ctx.moveTo(W / 2, H / 2 + 4); ctx.lineTo(W / 2, H / 2 + 10); ctx.stroke();
    // HUD
    ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#e8c040';
    ctx.fillText('✚ 100', 6, H - 8); ctx.fillText('⛨ 100', 64, H - 8);
    ctx.fillText(`${30 - Math.floor((t * 3) % 30)} | 90`, W - 74, H - 8);
    ctx.fillText('$ ' + (800 + Math.floor(t * 13) % 15000), W - 74, 66);
    ctx.strokeStyle = 'rgba(200,255,200,0.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(26, 26, 20, 0, 7); ctx.stroke();
    ctx.fillStyle = '#f33'; ctx.fillRect(26 + Math.sin(t) * 10, 22 + Math.cos(t * 1.3) * 8, 3, 3);
    // 击杀信息
    if (Math.floor(t / 4 + seed) % 3 === 0) {
      ctx.font = '9px monospace'; ctx.fillStyle = '#fff';
      ctx.fillText(['Sniper王  ⊸  noob', 'HeadShot  ⊸  Bot', '[极速]阿强 ⊸ 小明'][Math.floor(t / 4 + seed) % 3], W - 110, 14);
    }
  },

  legend(ctx, t, seed) {
    const ox = (t * 6) % 32, oy = (t * 3) % 16;
    ctx.fillStyle = '#2f4a1e'; ctx.fillRect(0, 0, W, H);
    for (let i = -1; i < 10; i++) for (let j = -1; j < 14; j++) {
      const x = i * 32 + (j % 2) * 16 - ox, y = j * 16 - oy;
      ctx.fillStyle = (i + j + seed) % 5 === 0 ? '#5a6a2a' : ((i * 7 + j * 3) % 4 === 0 ? '#3e5a26' : '#46622a');
      ctx.beginPath(); ctx.moveTo(x, y + 8); ctx.lineTo(x + 16, y); ctx.lineTo(x + 32, y + 8); ctx.lineTo(x + 16, y + 16); ctx.fill();
    }
    // 怪物
    for (let k = 0; k < 3; k++) {
      const mx = 60 + k * 60 + Math.sin(t + k) * 10, my = 50 + (k % 2) * 40;
      ctx.fillStyle = k === 1 ? '#7a2a8a' : '#6a4a2a';
      ctx.beginPath(); ctx.ellipse(mx, my, 10, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f22'; ctx.fillRect(mx - 3, my - 3, 2, 2); ctx.fillRect(mx + 2, my - 3, 2, 2);
      ctx.fillStyle = '#300'; ctx.fillRect(mx - 10, my - 14, 20, 3);
      ctx.fillStyle = '#e22'; ctx.fillRect(mx - 10, my - 14, 20 * (0.3 + 0.7 * Math.abs(Math.sin(t * 0.3 + k))), 3);
    }
    // 主角（战士）
    const px = 128, py = 92;
    ctx.fillStyle = '#c8a040'; ctx.fillRect(px - 5, py - 16, 10, 16);
    ctx.fillStyle = '#e7c49a'; ctx.beginPath(); ctx.arc(px, py - 20, 4, 0, 7); ctx.fill();
    ctx.save(); ctx.translate(px + 6, py - 10); ctx.rotate(Math.sin(t * 8) * 1.2);
    ctx.fillStyle = '#ddd'; ctx.fillRect(0, -2, 22, 4); ctx.restore();
    // 伤害数字
    const dn = (t * 1.5) % 1;
    ctx.globalAlpha = 1 - dn;
    drawText(ctx, '-999', 150, 70 - dn * 30, 14, '#ff3', { stroke: '#a00', strokeW: 3 });
    ctx.globalAlpha = 1;
    // 底部 UI
    ctx.fillStyle = 'rgba(30,20,10,0.9)'; ctx.fillRect(0, H - 34, W, 34);
    ctx.fillStyle = '#b00'; ctx.beginPath(); ctx.arc(18, H - 17, 14, 0, 7); ctx.fill();
    ctx.fillStyle = '#04b'; ctx.beginPath(); ctx.arc(W - 18, H - 17, 14, 0, 7); ctx.fill();
    ctx.font = '9px "Microsoft YaHei"'; ctx.fillStyle = '#ff0';
    const msgs = ['[喊话]沙巴克攻城了！兄弟们上！', '[行会]谁有祝福油？高价收', '[系统]恭喜玩家 战神 获得 屠龙', '[喊话]收裁决 50万金币'];
    ctx.fillText(msgs[Math.floor(t / 3 + seed) % msgs.length], 38, H - 20);
    ctx.fillStyle = '#ddd'; ctx.fillText('Lv.' + (35 + seed) + '  战士  沙城', 38, H - 7);
  },

  qq(ctx, t, seed) {
    // XP 桌面
    ctx.fillStyle = grad(ctx, 0, 110, '#3a7bd5', '#9cc6f0'); ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4a9a2a';
    ctx.beginPath(); ctx.moveTo(0, 120); ctx.quadraticCurveTo(110, 80, W, 130); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.fill();
    ctx.fillStyle = '#245edb'; ctx.fillRect(0, H - 14, W, 14);
    ctx.fillStyle = '#3a9a3a'; roundRect(ctx, 0, H - 14, 46, 14, 5); ctx.fill();
    drawText(ctx, '开始', 23, H - 7, 9, '#fff');
    // 图标
    ['我的电脑', '回收站', 'QQ', '浏览器'].forEach((n, i) => {
      ctx.fillStyle = ['#ddd', '#9bd', '#111', '#36c'][i]; ctx.fillRect(8, 6 + i * 32, 16, 14);
      ctx.font = '7px "Microsoft YaHei"'; ctx.fillStyle = '#fff'; ctx.fillText(n, 4, 28 + i * 32);
    });
    // QQ 聊天窗口
    const wx = 70 + (seed % 2) * 10, wy = 18;
    ctx.fillStyle = '#d8e8f8'; roundRect(ctx, wx, wy, 170, 150, 4); ctx.fill();
    ctx.fillStyle = grad(ctx, wy, wy + 18, '#4a90e2', '#2a60b2'); roundRect(ctx, wx, wy, 170, 18, 4); ctx.fill();
    ctx.font = 'bold 9px "Microsoft YaHei"'; ctx.fillStyle = '#fff';
    const names = ['☆寂寞の烟花☆', '≮伤心太平洋≯', '蓝色の泪', '╰☆夏天的风'];
    ctx.fillText('与 ' + names[seed % 4] + ' 聊天中', wx + 6, wy + 12);
    ctx.fillStyle = '#fff'; ctx.fillRect(wx + 4, wy + 22, 162, 90);
    const lines = [
      ['对方', '在吗？'], ['我', '在呢 ^_^'], ['对方', '今天去网吧了么'], ['我', '在极速网吧~'], ['对方', '886 明天见'], ['我', '88 ~(@^_^@)~'],
      ['对方', '你的签名好伤感'], ['我', '哥抽的不是烟是寂寞'],
    ];
    const n = Math.floor(t / 1.6 + seed) % 6;
    for (let i = 0; i < 4; i++) {
      const [who, msg] = lines[(n + i + seed) % lines.length];
      ctx.font = '8px "Microsoft YaHei"';
      ctx.fillStyle = who === '我' ? '#008040' : '#0050c0';
      ctx.fillText(who + '  ' + (12 + (i + n) % 10) + ':3' + i, wx + 8, wy + 32 + i * 21);
      ctx.fillStyle = '#222'; ctx.fillText(msg, wx + 14, wy + 42 + i * 21);
    }
    ctx.fillStyle = '#fff'; ctx.fillRect(wx + 4, wy + 116, 162, 22);
    ctx.fillStyle = '#222'; ctx.font = '8px "Microsoft YaHei"';
    const typing = '你在干嘛呢'.slice(0, Math.floor(t * 3) % 6);
    ctx.fillText(typing + ((t * 2) % 1 > 0.5 ? '|' : ''), wx + 8, wy + 130);
    ctx.fillStyle = '#4a90e2'; roundRect(ctx, wx + 126, wy + 140, 38, 8, 2); ctx.fill();
    // 托盘企鹅闪烁
    if ((t * 2) % 1 > 0.5) { ctx.fillStyle = '#ffcc00'; ctx.beginPath(); ctx.arc(W - 12, H - 7, 4, 0, 7); ctx.fill(); }
  },

  dance(ctx, t, seed) {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, `hsl(${(t * 40) % 360},70%,35%)`); g.addColorStop(1, `hsl(${(t * 40 + 120) % 360},70%,20%)`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `hsla(${i * 60 + t * 90},90%,60%,0.25)`;
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(i * 50 + Math.sin(t * 2 + i) * 30, H); ctx.lineTo(i * 50 + 30, H); ctx.fill();
    }
    // 舞者
    for (let k = 0; k < 3; k++) {
      const x = 70 + k * 58, y = 110, s = Math.sin(t * 6 + k);
      ctx.fillStyle = ['#fff', '#ffb0e0', '#b0e0ff'][k];
      ctx.beginPath(); ctx.arc(x, y - 30, 7, 0, 7); ctx.fill();
      ctx.fillRect(x - 6, y - 22, 12, 22);
      ctx.save(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 5, y - 18); ctx.lineTo(x - 16, y - 28 + s * 12); ctx.moveTo(x + 5, y - 18); ctx.lineTo(x + 16, y - 10 - s * 12);
      ctx.moveTo(x - 3, y); ctx.lineTo(x - 8 + s * 4, y + 22); ctx.moveTo(x + 3, y); ctx.lineTo(x + 8 - s * 4, y + 22); ctx.stroke(); ctx.restore();
    }
    // 箭头条
    ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(20, 150, W - 40, 26);
    const arrows = ['←', '↑', '→', '↓', '↖', '↘'];
    for (let i = 0; i < 8; i++) {
      const done = i < Math.floor((t * 3) % 9);
      drawText(ctx, arrows[(i + seed + Math.floor(t / 3)) % 6], 36 + i * 26, 163, 16, done ? '#ff0' : '#fff');
    }
    const ph = (t * 1.2) % 1;
    if (ph < 0.5) drawText(ctx, ph < 0.25 ? 'PERFECT x' + (Math.floor(t) % 30) : 'GREAT', W / 2, 30, 20, '#fff', { stroke: '#f0a', strokeW: 4 });
  },

  war(ctx, t, seed) {
    ctx.fillStyle = '#1a2a12'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 40; i++) {
      const r = rng(i + seed);
      ctx.fillStyle = r() > 0.5 ? '#2a3a1a' : '#223218';
      ctx.beginPath(); ctx.arc(r() * W, r() * 150, 10 + r() * 20, 0, 7); ctx.fill();
    }
    ctx.fillStyle = '#5a4a3a'; ctx.fillRect(30, 30, 30, 24); ctx.fillRect(170, 90, 36, 28);
    for (let k = 0; k < 12; k++) {
      const x = 60 + (k * 13 + t * 12) % 120, y = 50 + (k * 17) % 60 + Math.sin(t + k) * 4;
      ctx.fillStyle = k < 6 ? '#3a6aff' : '#ff3a3a';
      ctx.fillRect(x, y, 4, 4);
    }
    ctx.fillStyle = 'rgba(20,15,10,0.95)'; ctx.fillRect(0, 150, W, 42);
    ctx.fillStyle = '#000'; ctx.fillRect(4, 154, 46, 34);
    ctx.fillStyle = '#3a6aff'; ctx.fillRect(10, 160, 3, 3); ctx.fillStyle = '#f33'; ctx.fillRect(38, 178, 3, 3);
    ctx.font = '9px monospace'; ctx.fillStyle = '#ffd700';
    ctx.fillText('金 ' + (500 + Math.floor(t * 7) % 900) + '  木 ' + (200 + Math.floor(t * 3) % 300), 160, 12);
  },

  movie(ctx, t, seed) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    const g = ctx.createLinearGradient(0, 24, W, 168);
    g.addColorStop(0, `hsl(${200 + Math.sin(t * 0.2) * 40},40%,${25 + Math.sin(t) * 8}%)`); g.addColorStop(1, '#100a08');
    ctx.fillStyle = g; ctx.fillRect(0, 24, W, 136);
    // 人物剪影
    ctx.fillStyle = '#050505';
    ctx.beginPath(); ctx.arc(90 + Math.sin(t * 0.3) * 6, 90, 20, 0, 7); ctx.fill(); ctx.fillRect(60, 108, 60, 52);
    ctx.beginPath(); ctx.arc(170, 96, 17, 0, 7); ctx.fill(); ctx.fillRect(146, 112, 50, 48);
    drawText(ctx, ['你是我的眼…', '我们回不去了', '出来混，迟早要还的', '曾经有一份真诚的爱情…'][Math.floor(t / 4 + seed) % 4], W / 2, 150, 11, '#fff', { stroke: '#000', strokeW: 3 });
    ctx.fillStyle = '#333'; ctx.fillRect(10, 176, W - 20, 4);
    ctx.fillStyle = '#39f'; ctx.fillRect(10, 176, (W - 20) * ((t * 0.01 + seed * 0.2) % 1), 4);
    ctx.font = '8px monospace'; ctx.fillStyle = '#aaa'; ctx.fillText('暴风影音 - 第' + (3 + seed) + '集.rmvb', 8, 14);
  },

  bsod(ctx, t) {
    ctx.fillStyle = '#0000aa'; ctx.fillRect(0, 0, W, H);
    ctx.font = '9px monospace'; ctx.fillStyle = '#fff';
    const lines = ['A problem has been detected and', 'Windows has been shut down to', 'prevent damage to your computer.', '', 'IRQL_NOT_LESS_OR_EQUAL', '', '*** STOP: 0x0000000A', '(0x00000000,0x00000002,0x00000001)', '', 'Beginning dump of physical', 'memory...' + (Math.floor(t * 4) % 2 ? '_' : '')];
    lines.forEach((l, i) => ctx.fillText(l, 8, 16 + i * 14));
  },

  virus(ctx, t) {
    ctx.fillStyle = '#f2e6d6'; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
      const x = 10 + i * 42, y = 10 + j * 44;
      // 熊猫举香
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 14, y + 16, 12, 0, 7); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.beginPath(); ctx.arc(x + 5, y + 6, 5, 0, 7); ctx.arc(x + 23, y + 6, 5, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 9, y + 15, 3, 4, 0.4, 0, 7); ctx.ellipse(x + 19, y + 15, 3, 4, -0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#c33'; ctx.fillRect(x + 26, y + 2, 2, 22);
      const f = Math.sin(t * 8 + i + j) * 2;
      ctx.fillStyle = '#f80'; ctx.beginPath(); ctx.arc(x + 27, y + 1 + f * 0.3, 2.5, 0, 7); ctx.fill();
      ctx.font = '7px "Microsoft YaHei"'; ctx.fillStyle = '#333'; ctx.fillText('.exe', x + 6, y + 38);
    }
    if ((t * 2) % 1 > 0.4) {
      ctx.fillStyle = '#ece9d8'; ctx.fillRect(50, 70, 156, 56);
      ctx.fillStyle = '#0a246a'; ctx.fillRect(50, 70, 156, 14);
      drawText(ctx, '系统警告', 128, 77, 9, '#fff');
      drawText(ctx, '你的电脑已被熊猫烧香感染!', 128, 102, 10, '#c00');
    }
  },

  tv(ctx, t) {
    ctx.fillStyle = grad(ctx, 0, H, '#103a7a', '#061a3a'); ctx.fillRect(0, 0, W, H);
    const scene = Math.floor(t / 8) % 2;
    if (scene === 0) {
      ctx.fillStyle = '#1a4a9a'; ctx.fillRect(0, 0, W, 140);
      ctx.fillStyle = '#e7c49a'; ctx.beginPath(); ctx.arc(128, 70, 22, 0, 7); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(128, 62, 23, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#222'; ctx.fillRect(96, 92, 64, 48);
      ctx.fillStyle = '#c00'; ctx.fillRect(124, 96, 8, 30);
      drawText(ctx, '新闻联播', 40, 20, 14, '#fff');
    } else {
      // 超级女声风格舞台
      ctx.fillStyle = '#300030'; ctx.fillRect(0, 0, W, 140);
      for (let i = 0; i < 5; i++) { ctx.fillStyle = `hsla(${i * 70 + t * 50},90%,60%,0.3)`; ctx.beginPath(); ctx.moveTo(i * 60, 0); ctx.lineTo(128, 140); ctx.lineTo(i * 60 + 30, 0); ctx.fill(); }
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(128, 80, 9, 0, 7); ctx.fill(); ctx.fillRect(121, 89, 14, 30);
      drawText(ctx, '想唱就唱 唱得响亮', 128, 20, 13, '#ff0');
    }
    ctx.fillStyle = '#b00'; ctx.fillRect(0, 150, W, 26);
    ctx.font = '12px "Microsoft YaHei"'; ctx.fillStyle = '#fff';
    const s = '【天气预报】青石县 今夜有小雪 气温-6℃~1℃  【提醒】冬季注意用电安全  【快讯】我县网吧专项整治行动即将开展  ';
    ctx.fillText(s, W - ((t * 35) % (W + 900)), 168);
    drawText(ctx, 'CCTV', W - 24, 14, 11, '#fff');
  },

  admin(ctx, t, seed, provider) {
    ctx.fillStyle = '#ece9d8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = grad(ctx, 0, 16, '#0a5ad8', '#0a3ab8'); ctx.fillRect(0, 0, W, 16);
    drawText(ctx, '万象网吧计费系统 v2006', 6, 8, 9, '#fff', { align: 'left' });
    const seats = provider ? provider() : [];
    seats.forEach((s, i) => {
      const x = 6 + (i % 8) * 31, y = 22 + Math.floor(i / 8) * 22;
      ctx.fillStyle = !s.owned ? '#bbb' : s.state === 'busy' ? '#3aa83a' : s.state === 'bad' ? '#d83a3a' : s.state === 'dirty' ? '#d8a83a' : '#fff';
      ctx.fillRect(x, y, 28, 18);
      ctx.strokeStyle = '#777'; ctx.strokeRect(x, y, 28, 18);
      ctx.font = '8px monospace'; ctx.fillStyle = '#222'; ctx.fillText(s.label, x + 3, y + 12);
    });
    ctx.fillStyle = '#fff'; ctx.fillRect(4, H - 18, W - 8, 14);
    ctx.font = '8px "Microsoft YaHei"'; ctx.fillStyle = '#333';
    ctx.fillText('今日营收已同步 · ' + new Date().toLocaleTimeString().slice(0, 5), 8, H - 8);
  },
};

export class Screens {
  constructor() {
    this.progs = new Map();
    this.time = 0;
    this.queue = [];
    this.adminProvider = null;
    const defs = [
      ['off', 0], ['login', 0], ['bsod', 0], ['virus', 0], ['tv', 0], ['admin', 0],
      ['cs', 0], ['cs', 1], ['cs', 2], ['legend', 0], ['legend', 1], ['qq', 0], ['qq', 1], ['dance', 0], ['dance', 1], ['war', 0], ['movie', 0], ['movie', 1],
    ];
    for (const [name, seed] of defs) {
      const c = makeCanvas(W, H);
      const ctx = c.getContext('2d');
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearFilter;
      const bright = name === 'off' ? 1 : 1.25;
      const material = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(bright, bright, bright), toneMapped: false });
      const key = seed || name === 'off' || name === 'login' || name === 'bsod' || name === 'virus' || name === 'tv' || name === 'admin' ? `${name}${seed ? seed : ''}` : name;
      const p = { name, seed, ctx, tex, material, key: seed ? name + seed : name, acc: Math.random() };
      this.progs.set(p.key, p);
      PROGRAMS[name](ctx, 0, seed, null);
      tex.needsUpdate = true;
    }
    this.list = [...this.progs.values()];
  }

  // 根据游戏类型给出材质（含随机变体）
  material(key) {
    const p = this.progs.get(key) || this.progs.get(key + '0') || this.progs.get('off');
    return p.material;
  }

  variants(name) {
    return this.list.filter((p) => p.name === name).map((p) => p.key);
  }

  update(dt) {
    this.time += dt;
    for (const p of this.list) {
      p.acc += dt;
      const fps = p.name === 'off' ? 0 : p.name === 'admin' ? 2 : 12;
      if (fps && p.acc > 1 / fps) {
        p.acc = 0;
        PROGRAMS[p.name](p.ctx, this.time + p.seed * 3.3, p.seed, this.adminProvider);
        p.tex.needsUpdate = true;
      }
    }
  }
}
