// 网吧场景：房间、家具布局、灯光、寻路网格、工位数据
import * as THREE from 'three';
import {
  M, mat, add, box, plane, cyl, rbox, texMat, bake,
  makeWorkstation, makeChair, makeCounter, makeFridge, makeShelf, makeDispenser, makeHeadsetRack,
  makeAC, makeTubeLamp, makePlant, makePoster, makeClock, makeTV, makeExtinguisher, makeTrashCan,
  makeBicycle, makeStreetLamp, makeQuiltCurtain, makeLightBox,
} from './models.js';
import { T, canvasTex, drawText, priceBoardDraw, makeCanvas, buildingTex, signTex } from './textures.js';
import { NavGrid } from './path.js';

export const ROOM = { x0: -10, x1: 10, z0: -7, z1: 7, h: 3.2 };
export const DOOR = { x0: 6.45, x1: 7.95 };

export const P = {
  spawnL: { x: -17, z: 9.6 }, spawnR: { x: 17, z: 9.6 },
  doorOut: { x: 7.2, z: 8.4 }, doorIn: { x: 7.2, z: 6.2 },
  staff: { x: 6.2, z: 1.75 },
  staff2: { x: 7.5, z: 1.75 },
  queue: [{ x: 6.2, z: 3.5 }, { x: 6.2, z: 4.3 }, { x: 6.35, z: 5.1 }, { x: 6.6, z: 5.85 }, { x: 7.0, z: 6.5 }, { x: 7.2, z: 7.6 }, { x: 7.2, z: 8.4 }],
  fridge: { x: 8.85, z: 0.95 },
  shelf: { x: 6.4, z: 1.05 },
  headset: { x: 5.0, z: 1.05 },
  dispenser: { x: 9.05, z: 1.95 },
  trash: { x: 4.3, z: 3.55 },
  router: { x: 7.6, z: 1.75 },
  cards: { x: 7.05, z: 1.75 },
  wc: { x: 6.8, z: -6.3 },
};

// 工位定义
function seatDefs() {
  const defs = [];
  const row = (name, n, x0, dx, z, theta, type = 'normal') => {
    for (let i = 0; i < n; i++) defs.push({ id: name + (i + 1), label: name + (i + 1), row: name, x: x0 + i * dx, z, theta, type });
  };
  row('C', 8, -8.6, 1.2, -0.55, Math.PI);
  row('D', 8, -8.6, 1.2, 1.65, 0);
  row('B', 8, -8.6, 1.2, -3.05, 0);
  row('E', 8, -8.6, 1.2, 4.15, Math.PI);
  row('A', 8, -8.6, 1.2, -5.55, Math.PI);
  for (let i = 0; i < 5; i++) defs.push({ id: 'F' + (i + 1), label: 'F' + (i + 1), row: 'F', x: 8.75, z: -6.2 + i * 1.2, theta: Math.PI / 2, type: 'normal' });
  row('V', 4, 1.2, 1.2, -5.55, Math.PI, 'vip');
  return defs;
}

export class Cafe {
  constructor(scene, screens) {
    this.scene = scene;
    this.screens = screens;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.staticRoot = new THREE.Group();
    this.furnRoot = new THREE.Group();
    this.dynRoot = new THREE.Group();
    this.root.add(this.staticRoot, this.furnRoot, this.dynRoot);
    this.pickables = [];
    this.walls = {};
    this.seats = seatDefs().map((d) => ({
      ...d, owned: false, customer: null, reserved: null, mess: false, broken: false, virus: false,
      fx: Math.sin(d.theta), fz: Math.cos(d.theta), program: 'login',
    }));
    this.seatById = Object.fromEntries(this.seats.map((s) => [s.id, s]));
    for (const s of this.seats) {
      s.desk = { x: s.x + s.fx * 0.875, z: s.z + s.fz * 0.875 };
      s.service = { x: s.x - s.fx * 0.78, z: s.z - s.fz * 0.78 };
      s.approach = { x: s.x - s.fx * 0.45, z: s.z - s.fz * 0.45 };
    }
    this.nav = new NavGrid(-18, -7.2, 18, 11.5, 0.25);
    this.t = 0;
    this.buildShell();
    this.buildOutside();
    this.buildFixtures();
    this.buildLights();
    // 静态合批：墙体、固定陈设、街景
    for (const w of Object.values(this.walls)) { bake(w.full); bake(w.low); }
    bake(this.fixRoot);
    bake(this.outside);
  }

  // ---------- 房间外壳 ----------
  buildShell() {
    const S = this.staticRoot;
    const floorTex = T.floor().clone();
    floorTex.needsUpdate = true;
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(20 / 1.2, 14 / 1.2);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.32, metalness: 0.05 }));
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    floor.userData.floor = true;
    this.root.add(floor);
    this.floor = floor;
    this.pickables.push(floor);

    const H = ROOM.h;
    // 墙：前墙(窗+门)、后墙、左墙、右墙
    this.walls.back = this.buildWall([-10.2, -7], [10.2, -7], [0, 0, 1], [{ a: 16.6, b: 17.4, y0: 0, y1: 2.15, door: 'wc' }]);
    this.walls.front = this.buildWall([-10.2, 7], [10.2, 7], [0, 0, -1], [
      { a: 1.6, b: 8.8, y0: 0.9, y1: 2.6, win: true }, { a: 10.6, b: 15.6, y0: 0.9, y1: 2.6, win: true }, { a: DOOR.x0 + 10.2, b: DOOR.x1 + 10.2, y0: 0, y1: 2.4, door: 'main' },
    ]);
    this.walls.left = this.buildWall([-10, -7.2], [-10, 7.2], [1, 0, 0], []);
    this.walls.right = this.buildWall([10, -7.2], [10, 7.2], [-1, 0, 0], []);

    // 墙面装饰
    const deco = (wall, obj, x, y, z, ry) => { obj.position.set(x, y, z); obj.rotation.y = ry; wall.full.add(obj); return obj; };
    const bw = this.walls.back, lw = this.walls.left, rw = this.walls.right, fw = this.walls.front;
    deco(bw, makePoster('cs', 0.62, 0.86), -7.6, 2.05, -6.985, 0);
    deco(bw, makePoster('legend', 0.62, 0.86), -5.6, 2.05, -6.985, 0);
    const clock = makeClock();
    deco(bw, clock.group, -3.4, 2.45, -6.97, 0);
    this.clock = clock;
    deco(bw, makePoster('nominor', 0.46, 0.64), -1.6, 2.0, -6.985, 0);
    deco(bw, makePoster('wc', 0.34, 0.46), 6.0, 1.75, -6.985, 0);
    deco(bw, makePoster('fire', 0.4, 0.28), 8.6, 2.6, -6.985, 0);
    deco(lw, makePoster('dance', 0.6, 0.84), -9.985, 2.05, -4.3, Math.PI / 2);
    deco(lw, makePoster('war', 0.6, 0.84), -9.985, 2.05, -1.8, Math.PI / 2);
    deco(lw, makePoster('nosmoke', 0.46, 0.64), -9.985, 2.0, 0.6, Math.PI / 2);
    deco(lw, makePoster('notice', 0.5, 0.7), -9.985, 2.0, 2.9, Math.PI / 2);
    deco(rw, makePoster('calendar', 0.4, 0.56), 9.985, 1.75, 2.85, -Math.PI / 2);
    deco(rw, makePoster('nominor', 0.4, 0.56), 9.985, 1.9, -0.25, -Math.PI / 2);
    // 价目表（动态）
    const pc = makeCanvas(256, 360);
    this.priceCanvas = pc;
    this.priceTex = new THREE.CanvasTexture(pc);
    this.priceTex.colorSpace = THREE.SRGBColorSpace;
    const pb = new THREE.Mesh(plane(0.66, 0.92), new THREE.MeshStandardMaterial({ map: this.priceTex, roughness: 0.8 }));
    deco(fw, pb, 3.2, 1.55, 6.985, Math.PI);
    pb.position.set(9.985, 1.9, 4.6); pb.rotation.y = -Math.PI / 2;
    rw.full.add(pb);
    this.setPrices(3, 0);
    // 挂墙电视
    const tv = makeTV();
    tv.group.position.set(9.62, 2.35, -0.95); tv.group.rotation.y = -Math.PI / 2;
    rw.full.add(tv.group);
    tv.screen.material = this.screens.material('tv');
    // 卫生间门
    const wcDoor = new THREE.Group();
    add(wcDoor, box(0.8, 2.12, 0.05), mat('wcDoor', { color: 0x8a6a4a, roughness: 0.6 }), 0, 1.06, 0);
    add(wcDoor, cyl(0.02, 0.02, 0.1, 8), M.metal(), 0.3, 1.0, 0.05, Math.PI / 2, 0, 0);
    wcDoor.position.set(6.8, 0, -6.98);
    bw.full.add(wcDoor);
  }

  buildWall(p0, p1, n, openings) {
    const H = ROOM.h;
    const full = new THREE.Group(), low = new THREE.Group();
    const dx = p1[0] - p0[0], dz = p1[1] - p0[1];
    const len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    const ry = Math.atan2(-uz, ux);
    const th = 0.2;
    const lowerM = mat('wallLowerM', { map: T.wallLower(), roughness: 0.55 });
    const upperM = mat('wallUpperM', { map: T.wallUpper(), roughness: 0.9 });
    const stripM = mat('wallStrip', { color: 0x7a2a1a, roughness: 0.5 });
    const baseM = mat('baseboard', { color: 0x3a2a1e, roughness: 0.5 });
    const piece = (group, a, b, y0, y1, isLow) => {
      if (b - a < 0.01 || y1 - y0 < 0.01) return;
      const mid = (a + b) / 2, w = b - a;
      const cx = p0[0] + ux * mid - n[0] * th / 2, cz = p0[1] + uz * mid - n[2] * th / 2;
      const seg = (yy0, yy1, m, depth = th, off = 0) => {
        if (yy1 - yy0 < 0.005) return;
        const g = new THREE.BoxGeometry(w, yy1 - yy0, depth);
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / 2.5, uv.getY(i) * (yy1 - yy0) / 2.5);
        const mesh = new THREE.Mesh(g, m);
        mesh.position.set(cx + n[0] * off, (yy0 + yy1) / 2, cz + n[2] * off);
        mesh.rotation.y = ry;
        mesh.castShadow = true; mesh.receiveShadow = true;
        group.add(mesh);
      };
      const split = 1.2;
      seg(y0, Math.min(split, y1), lowerM);
      seg(Math.max(split, y0), y1, upperM);
      if (y0 < split && y1 > split) seg(split - 0.025, split + 0.025, stripM, th + 0.02);
      if (y0 < 0.01) seg(0, 0.1, baseM, th + 0.016);
      if (isLow) seg(y1 - 0.03, y1, mat('wallCap', { color: 0xd8d4c8, roughness: 0.6 }), th + 0.03);
    };
    const ops = [...openings].sort((a, b) => a.a - b.a);
    let cur = 0;
    for (const o of ops) {
      piece(full, cur, o.a, 0, H);
      piece(full, o.a, o.b, 0, o.y0);
      piece(full, o.a, o.b, o.y1, H);
      piece(low, cur, o.a, 0, 0.45, true);
      if (o.y0 > 0) piece(low, o.a, o.b, 0, Math.min(o.y0, 0.45), true);
      if (o.win) this.addWindow(full, p0, ux, uz, n, o, ry);
      if (o.win) this.addWindow(low, p0, ux, uz, n, { ...o, lowOnly: true }, ry);
      cur = o.b;
    }
    piece(full, cur, len, 0, H);
    piece(low, cur, len, 0, 0.45, true);
    this.staticRoot.add(full, low);
    low.visible = false;
    // 寻路阻挡
    const pad = 0.25;
    const segBlock = (a, b) => {
      const xs = [p0[0] + ux * a, p0[0] + ux * b], zs = [p0[1] + uz * a, p0[1] + uz * b];
      xs.push(xs[0] - n[0] * th, xs[1] - n[0] * th); zs.push(zs[0] - n[2] * th, zs[1] - n[2] * th);
      this.nav.block(Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs), pad);
    };
    cur = 0;
    for (const o of ops) { segBlock(cur, o.a); if (!o.door || o.door !== 'main') segBlock(o.a, o.b); cur = o.b; }
    segBlock(cur, len);
    return { full, low };
  }

  addWindow(group, p0, ux, uz, n, o, ry) {
    const mid = (o.a + o.b) / 2, w = o.b - o.a;
    const cx = p0[0] + ux * mid - n[0] * 0.1, cz = p0[1] + uz * mid - n[2] * 0.1;
    const wg = new THREE.Group();
    wg.position.set(cx, 0, cz);
    wg.rotation.y = ry;
    group.add(wg);
    const h = o.y1 - o.y0;
    if (o.lowOnly) {
      add(wg, box(w, 0.04, 0.3), M.alu(), 0, 0.47, 0);
      return;
    }
    const glass = add(wg, box(w, h, 0.02), M.glass(), 0, o.y0 + h / 2, 0);
    glass.castShadow = false;
    add(wg, box(w, 0.05, 0.12), M.alu(), 0, o.y0, 0);
    add(wg, box(w, 0.05, 0.12), M.alu(), 0, o.y1, 0);
    const n2 = Math.round(w / 1.2);
    for (let i = 0; i <= n2; i++) add(wg, box(0.05, h, 0.12), M.alu(), -w / 2 + (i * w) / n2, o.y0 + h / 2, 0);
    // 窗台
    add(wg, box(w + 0.1, 0.04, 0.3), mat('sill', { color: 0xd8d4c8, roughness: 0.4 }), 0, o.y0 - 0.02, 0.05);
    // 玻璃贴字
    const st = canvasTex('winSticker' + Math.round(w), 512, 128, (c, cw, ch) => {
      c.clearRect(0, 0, cw, ch);
      drawText(c, w > 6 ? '网络会所 · 通宵10元 · 电竞专区' : '空调开放 · 光纤宽带', cw / 2, ch / 2, w > 6 ? 40 : 46, '#ff2a2a', { stroke: '#fff', strokeW: 6 });
    });
    const sticker = new THREE.Mesh(plane(Math.min(w - 0.3, 5), 0.6), new THREE.MeshBasicMaterial({ map: st, transparent: true, depthWrite: false }));
    sticker.position.set(0, o.y0 + 0.45, 0.012);
    sticker.rotation.y = Math.PI;
    wg.add(sticker);
    const sticker2 = sticker.clone();
    sticker2.position.z = -0.012; sticker2.rotation.y = 0;
    wg.add(sticker2);
  }

  // ---------- 室外街景 ----------
  buildOutside() {
    const O = new THREE.Group();
    this.outside = O;
    this.root.add(O);
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(60, 4.0), new THREE.MeshStandardMaterial({ map: T.sidewalk(), roughness: 0.9 }));
    sw.rotation.x = -Math.PI / 2; sw.position.set(0, 0.0, 9.2); sw.receiveShadow = true;
    O.add(sw);
    add(O, box(60, 0.15, 0.25), mat('curb', { color: 0x9a9a92, roughness: 0.8 }), 0, 0.02, 11.25);
    const roadTex = T.street().clone(); roadTex.needsUpdate = true; roadTex.wrapS = roadTex.wrapT = THREE.RepeatWrapping; roadTex.repeat.set(8, 1);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(60, 8), new THREE.MeshStandardMaterial({ map: roadTex, roughness: 0.85 }));
    road.rotation.x = -Math.PI / 2; road.position.set(0, -0.08, 15.3); road.receiveShadow = true;
    O.add(road);
    const sw2 = sw.clone(); sw2.position.z = 21; O.add(sw2);
    // 对面楼房
    const blds = [[-20, 8, 0.2], [-11, 9, 0.5], [-1, 8, 0.3], [9, 10, 0.4], [20, 8, 0.6]];
    this.rivalGroup = new THREE.Group();
    blds.forEach(([x, w, lit], i) => {
      const t = buildingTex(50 + i, lit);
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / 4, 2);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, 9, 6), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.0 }));
      b.position.set(x, 4.5, 26);
      b.userData.building = true;
      O.add(b);
      (this.buildings ||= []).push(b);
    });
    // 天网电竞馆（对手，剧情中开业）
    const rv = this.rivalGroup;
    const rs = new THREE.Mesh(plane(7, 1.6), new THREE.MeshStandardMaterial({ map: signTex('天网电竞馆', 'SKYNET E-SPORTS · 全场液晶 · 开业大酬宾', '#120a3a', '#3cf', 'rivalSign'), emissive: 0xffffff, emissiveMap: signTex('天网电竞馆', 'SKYNET E-SPORTS · 全场液晶 · 开业大酬宾', '#120a3a', '#3cf', 'rivalSign'), emissiveIntensity: 1.4 }));
    rs.position.set(-1, 4.2, 22.95); rs.rotation.y = Math.PI;
    rv.add(rs);
    this.rivalSign = rs;
    for (let i = 0; i < 6; i++) {
      const ball = add(rv, rbox(0.6, 0.6, 0.6, 0.29), mat('balloon' + (i % 3), { color: [0xff3355, 0xffcc00, 0x33aaff][i % 3], roughness: 0.3 }), -4 + i * 1.5, 3.0 + (i % 2) * 0.4, 22.6);
      ball.castShadow = false;
    }
    const rl = new THREE.PointLight(0x33ccff, 8, 12, 2);
    rl.position.set(-1, 4, 21.5);
    rv.add(rl);
    rv.visible = false;
    rv.userData.dynamic = true;
    O.add(rv);
    // 邻居店面（小卖部、发廊）
    const shop = (x, title, sub, bg, fg, key) => {
      const g = new THREE.Group();
      add(g, box(6, 3.4, 0.3), mat('nbWall' + key, { color: 0xbdb4a2, roughness: 0.9 }), 0, 1.7, 0);
      const s = new THREE.Mesh(plane(5.2, 0.9), new THREE.MeshStandardMaterial({ map: signTex(title, sub, bg, fg, key), emissive: 0xffffff, emissiveMap: signTex(title, sub, bg, fg, key), emissiveIntensity: 0.5 }));
      s.position.set(0, 2.85, 0.16); g.add(s);
      add(g, box(3.6, 2.2, 0.05), mat('shutter', { color: 0x8a9096, metalness: 0.5, roughness: 0.5 }), 0, 1.1, 0.16);
      g.position.set(x, 0, 7.15);
      O.add(g);
      return g;
    };
    shop(-13.3, '红星小卖部', '烟酒 · 副食 · 冷饮 · 公用电话', '#b01818', '#ffe04a', 'nb1');
    const salon = shop(13.3, '时尚发廊', '烫染 · 造型 · 洗剪吹15元', '#1a1a3a', '#ff7ad8', 'nb2');
    const pole = new THREE.Group();
    add(pole, cyl(0.12, 0.12, 0.9, 16), mat('pole', {
      map: canvasTex('barberPole', 64, 128, (c, w, h) => {
        c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
        for (let i = -4; i < 10; i++) { c.fillStyle = i % 2 ? '#d22' : '#22d'; c.beginPath(); c.moveTo(0, i * 20); c.lineTo(w, i * 20 - 30); c.lineTo(w, i * 20 - 20); c.lineTo(0, i * 20 + 10); c.fill(); }
      }), emissive: 0x333333,
    }), 0, 0, 0);
    pole.position.set(-2.6, 1.8, 0.35);
    pole.userData.dynamic = true;
    salon.add(pole);
    this.barberPole = pole;
    // 自行车、路灯、树
    [[-6, 0x1a3a8a], [-5.2, 0x8a1a1a], [2.5, 0x1a1a1a]].forEach(([x, c], i) => {
      const b = makeBicycle(c); b.position.set(x, 0, 10.4); b.rotation.y = 0.15 * i; O.add(b);
      this.nav.block(x - 0.8, 10.2, x + 0.8, 10.6, 0.1);
    });
    this.streetLamps = [];
    for (const x of [-12, 0.5, 12]) {
      const l = makeStreetLamp();
      l.group.position.set(x, 0, 10.9); l.group.rotation.y = Math.PI;
      O.add(l.group);
      const pl = new THREE.PointLight(0xffb060, 0, 12, 2);
      pl.position.set(x, 5.0, 12.0);
      O.add(pl);
      this.streetLamps.push({ ...l, light: pl });
    }
    // 旋转灯箱
    const lb = makeLightBox();
    lb.group.position.set(5.4, 0, 8.6);
    O.add(lb.group);
    this.lightBox = lb;
    this.nav.block(5.1, 8.3, 5.7, 8.9, 0.15);
    const lbLight = new THREE.PointLight(0xff3040, 3, 5, 2);
    lbLight.position.set(5.4, 1.0, 9.2);
    O.add(lbLight);
    // 门头雨棚 + 霓虹招牌（升级后点亮）
    const canopy = new THREE.Group();
    add(canopy, box(2.4, 0.06, 1.1), mat('canopy', { color: 0x1a4a8a, roughness: 0.5 }), 0, 2.75, 0.55, 0.15, 0, 0);
    const neonTex = signTex('极速网吧', 'JISU NET CAFE', '#1a0510', '#ff3a6a', 'neonMain');
    const neon = new THREE.Mesh(plane(2.0, 0.62), new THREE.MeshStandardMaterial({ map: neonTex, emissive: 0xffffff, emissiveMap: neonTex, emissiveIntensity: 0.15 }));
    neon.position.set(0, 3.15, 1.12); neon.rotation.x = -0.5;
    canopy.add(neon);
    add(canopy, box(2.1, 0.7, 0.06), M.darkMetal(), 0, 3.15, 1.08, -0.5, 0, 0);
    canopy.position.set(7.2, 0, 7.2);
    O.add(canopy);
    this.neonSign = neon;
    // 室外地面拾取（让玩家可以走出门）
    this.pickables.push(sw);
    sw.userData.floor = true;
    sw.userData.dynamic = true;
    // 寻路：只允许室内与门前人行道
    this.nav.block(-18, 11.1, 18, 11.5, 0);
    this.nav.block(-18, 7.0, -10.2, 7.35, 0);
    this.nav.block(10.2, 7.0, 18, 7.35, 0);
  }

  // ---------- 固定陈设 ----------
  buildFixtures() {
    const S = new THREE.Group();
    this.fixRoot = S;
    this.staticRoot.add(S);
    const counter = makeCounter();
    counter.group.position.set(6.5, 0, 2.62);
    S.add(counter.group);
    this.counter = counter;
    counter.pcScreen.material = this.screens.material('admin');
    this.nav.block(4.6, 2.31, 8.4, 2.93, 0.2);

    const shelf = makeShelf(); shelf.position.set(6.4, 0, 0.45); S.add(shelf);
    this.nav.block(5.6, 0.26, 7.2, 0.64, 0.2);
    const fridge = makeFridge(); fridge.position.set(9.6, 0, 0.95); fridge.rotation.y = -Math.PI / 2; S.add(fridge);
    this.nav.block(9.29, 0.61, 9.95, 1.29, 0.2);
    const disp = makeDispenser(); disp.position.set(9.7, 0, 1.95); disp.rotation.y = -Math.PI / 2; S.add(disp);
    this.nav.block(9.54, 1.79, 9.95, 2.11, 0.2);
    const rack = makeHeadsetRack();
    add(rack, box(0.04, 1.8, 0.04), M.metal(), -0.48, 0.9, 0);
    add(rack, box(0.04, 1.8, 0.04), M.metal(), 0.48, 0.9, 0);
    add(rack, box(0.4, 0.03, 0.4), M.metal(), -0.48, 0.015, 0);
    add(rack, box(0.4, 0.03, 0.4), M.metal(), 0.48, 0.015, 0);
    rack.position.set(5.0, 0, 0.35); S.add(rack);
    this.nav.block(4.5, 0.15, 5.5, 0.6, 0.2);
    const trash = makeTrashCan(); trash.position.set(4.3, 0, 3.05); S.add(trash);
    this.nav.block(4.1, 2.85, 4.5, 3.25, 0.15);
    const plant1 = makePlant(); plant1.position.set(-9.55, 0, 6.5); S.add(plant1);
    this.nav.block(-9.8, 6.25, -9.3, 6.75, 0.15);
    const plant2 = makePlant(); plant2.position.set(9.5, 0, 6.5); S.add(plant2);
    this.nav.block(9.25, 6.25, 9.75, 6.75, 0.15);

    // VIP 玻璃隔断
    const vipG = new THREE.Group();
    const glassPanel = (x0, z0, x1, z1) => {
      const len = Math.hypot(x1 - x0, z1 - z0), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const ry = Math.atan2(-(z1 - z0), x1 - x0);
      const g = new THREE.Group(); g.position.set(cx, 0, cz); g.rotation.y = ry;
      add(g, box(len, 0.9, 0.06), mat('vipWood', { map: T.wood(), color: 0x6a3a1a, roughness: 0.5 }), 0, 0.45, 0);
      const gl = add(g, box(len, 1.5, 0.02), M.frostGlass(), 0, 1.65, 0); gl.castShadow = false;
      add(g, box(len, 0.05, 0.08), M.alu(), 0, 2.42, 0);
      vipG.add(g);
      this.nav.block(Math.min(x0, x1), Math.min(z0, z1), Math.max(x0, x1), Math.max(z0, z1), 0.2);
    };
    glassPanel(0.6, -7, 0.6, -3.6);
    glassPanel(0.6, -3.6, 2.6, -3.6);
    glassPanel(3.6, -3.6, 5.7, -3.6);
    glassPanel(5.7, -3.6, 5.7, -7);
    const vipSign = new THREE.Mesh(plane(1.4, 0.36), new THREE.MeshStandardMaterial({ map: signTex('VIP 包间', '', '#2a0a2a', '#ffcf4a', 'vipSign'), emissive: 0xffffff, emissiveMap: signTex('VIP 包间', '', '#2a0a2a', '#ffcf4a', 'vipSign'), emissiveIntensity: 0.8 }));
    vipSign.position.set(3.1, 2.65, -3.56);
    vipG.add(vipSign);
    S.add(vipG);

    // 吊灯
    this.lampPositions = [];
    for (const x of [-7.4, -3.8, -0.2]) for (const z of [-4.3, -1.8, 0.6, 2.9, 5.4]) this.lampPositions.push([x, z]);
    for (const [x, z] of [[3.1, -5.3], [7.2, -4.3], [7.2, -1.8], [6.5, 1.5], [6.5, 4.8], [2.5, 1.2], [2.5, 4.5]]) this.lampPositions.push([x, z]);
    for (const [x, z] of this.lampPositions) {
      const l = makeTubeLamp(); l.position.set(x, 3.0, z); S.add(l);
    }

    // 收银台上方 LED 走字屏
    const mc = makeCanvas(512, 48);
    this.marqueeCanvas = mc;
    this.marqueeTex = new THREE.CanvasTexture(mc);
    this.marqueeTex.colorSpace = THREE.SRGBColorSpace;
    const mq = new THREE.Group();
    add(mq, box(2.7, 0.3, 0.08), M.black(), 0, 0, 0);
    const mqs = new THREE.Mesh(plane(2.6, 0.24), new THREE.MeshBasicMaterial({ map: this.marqueeTex, toneMapped: false, color: new THREE.Color(1.6, 1.6, 1.6) }));
    mqs.position.z = 0.041;
    mq.add(mqs);
    add(mq, cyl(0.005, 0.005, 0.5, 4), M.darkMetal(), -1.1, 0.4, 0);
    add(mq, cyl(0.005, 0.005, 0.5, 4), M.darkMetal(), 1.1, 0.4, 0);
    mq.position.set(6.5, 2.55, 2.75);
    this.dynRoot.add(mq);
    this.marqueeText = '欢迎光临极速网吧    普通区3元/小时    通宵10元    泡面4元 饮料3元    文明上网 拒绝未成年人    ';

    // 门帘
    this.curtain = makeQuiltCurtain(1.5, 2.35);
    this.curtain.position.set(7.2, 2.4, 6.93);
    this.dynRoot.add(this.curtain);
    // 门框
    const df = new THREE.Group();
    add(df, box(0.08, 2.45, 0.22), M.alu(), -0.78, 1.22, 0);
    add(df, box(0.08, 2.45, 0.22), M.alu(), 0.78, 1.22, 0);
    add(df, box(1.64, 0.08, 0.22), M.alu(), 0, 2.42, 0);
    df.position.set(7.2, 0, 7.1);
    this.walls.front.full.add(df);
    // 门口地垫
    const mat1 = add(S, box(1.4, 0.015, 0.9), mat('doormat', {
      map: canvasTex('doormat', 256, 160, (c, w, h) => {
        c.fillStyle = '#8a1a1a'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#d8a83a'; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20);
        drawText(c, '欢迎光临', w / 2, h / 2, 44, '#f5d070');
      }), roughness: 0.95,
    }), 7.2, 0.008, 6.25);
    mat1.castShadow = false;

    // 交互热区（不可见拾取盒）
    this.hotspots = {};
    const hot = (name, x, z, w, d, h = 1.8, y = 0) => {
      this.hotspots[name] = { x, z };
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
      m.position.set(x, y + h / 2, z);
      m.userData.interact = name;
      this.root.add(m);
      this.pickables.push(m);
      return m;
    };
    hot('fridge', 9.6, 0.95, 0.7, 0.75, 2);
    hot('shelf', 6.4, 0.45, 1.6, 0.45, 1.7);
    hot('headset', 5.0, 0.35, 1.0, 0.5, 2);
    hot('dispenser', 9.7, 1.95, 0.4, 0.4, 1.4);
    hot('trash', 4.3, 3.05, 0.45, 0.45, 0.7);
    hot('router', 8.05, 2.5, 0.35, 0.3, 0.3, 0.75);
    hot('counter', 5.7, 2.62, 1.6, 0.62, 1.2);
    hot('cards', 7.1, 2.5, 0.45, 0.35, 0.35, 0.78);
    this.ac = makeAC();
    this.ac.position.set(-9.55, 0, -6.55);
    this.ac.rotation.y = Math.PI / 4;
    this.ac.visible = false;
    this.ac.userData.dynamic = true;
    S.add(this.ac);
    this.extinguisher = makeExtinguisher();
    this.extinguisher.position.set(4.4, 0, 0.4);
    this.extinguisher.visible = false;
    this.extinguisher.userData.dynamic = true;
    S.add(this.extinguisher);
    this.heater = new THREE.Group();
    // 小太阳取暖器（没装空调时）
    add(this.heater, cyl(0.04, 0.12, 0.05, 12), M.white(), 0, 0.025, 0);
    add(this.heater, cyl(0.015, 0.015, 0.5, 6), M.white(), 0, 0.3, 0);
    add(this.heater, cyl(0.18, 0.18, 0.06, 20), M.metal(), 0, 0.6, 0, Math.PI / 2, 0, 0);
    add(this.heater, cyl(0.12, 0.12, 0.02, 20), mat('heaterGlow', { color: 0xff7a20, emissive: 0xff5a00, emissiveIntensity: 0.9 }), 0, 0.6, 0.03, Math.PI / 2, 0, 0);
    this.heater.position.set(5.3, 0, 1.2);
    this.heater.rotation.y = Math.PI * 0.75;
    this.heater.userData.dynamic = true;
    S.add(this.heater);
  }

  buildLights() {
    const sc = this.scene;
    this.hemi = new THREE.HemisphereLight(0xcfe0ff, 0x3a2e22, 0.4);
    sc.add(this.hemi);
    const key = new THREE.DirectionalLight(0xf0f4ff, 0.9);
    key.position.set(-4, 14, 6);
    key.target.position.set(0, 0, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    const sh = key.shadow.camera;
    sh.left = -14; sh.right = 14; sh.top = 12; sh.bottom = -12; sh.near = 1; sh.far = 40;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    key.shadow.radius = 3;
    sc.add(key, key.target);
    this.keyLight = key;
    this.sun = new THREE.DirectionalLight(0xfff0d0, 0.0);
    this.sun.position.set(6, 8, 20);
    sc.add(this.sun);
    // 室内点光（日光灯）
    this.lamps = [];
    const sel = [[-7.4, -3], [-3.8, -3], [-0.2, -3], [-7.4, 2], [-3.8, 2], [-0.2, 2], [3.1, -5.3], [7.2, -3], [6.5, 2.5], [2.5, 3]];
    for (const [x, z] of sel) {
      const pl = new THREE.PointLight(0xeaf2ff, 4.5, 9, 1.6);
      pl.position.set(x, 2.8, z);
      sc.add(pl);
      this.lamps.push(pl);
    }
    const warm = new THREE.PointLight(0xffb060, 4, 5, 2);
    warm.position.set(6.5, 2.2, 1.8);
    sc.add(warm);
    this.heaterLight = new THREE.PointLight(0xff6a20, 0.8, 2.5, 2);
    this.heaterLight.position.set(5.3, 0.6, 1.4);
    sc.add(this.heaterLight);
  }

  // ---------- 家具（随升级重建） ----------
  rebuildFurniture(state) {
    // 释放旧的
    this.furnRoot.traverse((o) => { if (o.isMesh && o.geometry && o.userData.baked) o.geometry.dispose(); });
    this.root.remove(this.furnRoot);
    this.furnRoot = new THREE.Group();
    this.root.add(this.furnRoot);
    this.pickables = this.pickables.filter((p) => !p.userData.seatHit);
    for (const s of this.seats) {
      s.owned = s.type === 'vip' ? !!state.up.vip : state.owned.includes(s.id);
      const showDesk = s.type === 'vip' ? !!state.up.vip : true;
      if (!showDesk) { s.screen = null; continue; }
      const ws = makeWorkstation({ monitor: s.type === 'vip' ? 'lcd' : (state.up.lcd ? 'lcd' : 'crt'), vip: s.type === 'vip', owned: s.owned });
      ws.group.position.set(s.desk.x, 0, s.desk.z);
      ws.group.rotation.y = s.theta + Math.PI;
      this.furnRoot.add(ws.group);
      s.screen = ws.screen; s.leds = ws.leds; s.messObj = ws.mess;
      if (s.messObj) s.messObj.visible = s.mess;
      if (s.owned) {
        const ch = makeChair(s.type === 'vip' ? 'sofa' : (state.up.gaming ? 'gaming' : 'office'));
        ch.position.set(s.x, 0, s.z);
        ch.rotation.y = s.theta;
        this.furnRoot.add(ch);
        // 拾取盒
        const hb = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.3, 1.5), new THREE.MeshBasicMaterial({ visible: false }));
        hb.position.set((s.x + s.desk.x) / 2, 0.65, (s.z + s.desk.z) / 2);
        hb.rotation.y = s.theta;
        hb.userData.seatHit = s.id;
        this.root.add(hb);
        this.pickables.push(hb);
        s.hit = hb;
      }
    }
    // 旧拾取盒清理
    this.root.children.filter((c) => c.userData.seatHit && !this.pickables.includes(c)).forEach((c) => this.root.remove(c));
    bake(this.furnRoot);
    this.furnRoot.traverse((o) => { if (o.isMesh) o.userData.baked = true; });
    for (const s of this.seats) this.applySeatScreen(s);
    // 寻路网格重算家具部分
    this.rebuildNav(state);
    this.ac.visible = !!state.up.ac;
    this.heater.visible = !state.up.ac;
    this.heaterLight.intensity = state.up.ac ? 0 : 0.8;
    this.extinguisher.visible = !!state.up.extinguisher;
    this.neonSign.material.emissiveIntensity = state.up.neon ? 1.6 : 0.15;
    this.setPrices(state.price, state.up.vip ? state.vipPrice : 0);
  }

  rebuildNav(state) {
    if (!this.navBase) this.navBase = this.nav.blocked.slice();
    this.nav.blocked.set(this.navBase);
    for (const s of this.seats) {
      if (!s.screen && s.type === 'vip') continue;
      const horiz = Math.abs(s.fz) > 0.5;
      const hw = horiz ? 0.56 : 0.325, hd = horiz ? 0.325 : 0.56;
      this.nav.block(s.desk.x - hw, s.desk.z - hd, s.desk.x + hw, s.desk.z + hd, 0.18);
    }
    if (!state.up.vip) this.nav.block(0.6, -7, 5.7, -3.6, 0.2);
    // 保证门口通畅
    this.nav.open(DOOR.x0 + 0.15, 6.6, DOOR.x1 - 0.15, 7.6);
  }

  applySeatScreen(s) {
    if (!s.screen) return;
    let prog = 'off';
    if (s.owned) {
      if (s.virus) prog = 'virus';
      else if (s.broken) prog = 'bsod';
      else if (s.customer && s.customer.seated) prog = s.customer.program;
      else prog = 'login';
    }
    s.program = prog;
    s.screen.material = this.screens.material(prog);
  }

  setMess(s, v) {
    s.mess = v;
    if (s.messObj) s.messObj.visible = v;
  }

  setPrices(price, vip) {
    priceBoardDraw(this.priceCanvas.getContext('2d'), 256, 360, price, vip);
    this.priceTex.needsUpdate = true;
    this.marqueeText = `欢迎光临极速网吧    普通区${price}元/小时    ${vip ? 'VIP包间' + vip + '元/小时    ' : ''}通宵10元    泡面4元 饮料3元    文明上网 拒绝未成年人    `;
  }

  setMarquee(text) { this.marqueeText = text; }

  // 墙体剖切：靠近相机一侧的墙降低
  updateCutaway(camPos) {
    const c = camPos;
    const set = (w, hide) => { w.full.visible = !hide; w.low.visible = hide; };
    set(this.walls.front, c.z > ROOM.z1 - 1);
    set(this.walls.back, c.z < ROOM.z0 + 1);
    set(this.walls.left, c.x < ROOM.x0 + 1);
    set(this.walls.right, c.x > ROOM.x1 + 1);
  }

  setDaylight(hour) {
    // 9:00-24:00
    const day = THREE.MathUtils.clamp(1 - Math.abs(hour - 13) / 5.5, 0, 1);
    const dusk = THREE.MathUtils.clamp(1 - Math.abs(hour - 17.5) / 1.5, 0, 1);
    const night = hour > 18 || hour < 7 ? THREE.MathUtils.clamp((hour - 17.5) / 1.5, 0, 1) : 0;
    const bg = new THREE.Color(0x0a1022).lerp(new THREE.Color(0x9ab8d8), day).lerp(new THREE.Color(0xd88a5a), dusk * 0.5);
    this.scene.background = bg;
    if (this.scene.fog) this.scene.fog.color.copy(bg);
    this.sun.intensity = day * 1.6 + dusk * 0.6;
    this.sun.color.setHex(dusk > 0.3 ? 0xffa060 : 0xfff0d0);
    this.hemi.intensity = 0.28 + day * 0.25;
    for (const l of this.streetLamps) { l.light.intensity = night * 14; l.bulb.material.emissiveIntensity = night * 3 + 0.2; }
    for (const b of this.buildings || []) b.material.emissiveIntensity = night * 0.55;
    this.night = night;
  }

  update(dt, ctx) {
    this.t += dt;
    const t = this.t;
    // 时钟
    if (this.clock && ctx.hour !== undefined) {
      const h = ctx.hour % 12, m = (ctx.hour % 1) * 60;
      this.clock.hour.rotation.z = -(h / 12) * Math.PI * 2;
      this.clock.minute.rotation.z = -(m / 60) * Math.PI * 2;
    }
    this.lightBox.rot.rotation.y += dt * 0.8;
    if (this.barberPole) this.barberPole.children[0].material.map.offset.y = (t * 0.3) % 1;
    // 路由器灯
    const lag = ctx.netDown;
    this.counter.routerLeds.forEach((l, i) => { l.visible = lag ? (i === 0 || Math.sin(t * 10) > 0) && i < 2 : Math.random() > 0.3 || i === 0; l.material = lag && i === 1 ? M.ledOrange() : M.ledGreen(); });
    // 主机硬盘灯
    for (const s of this.seats) {
      if (!s.leds || !s.leds.hdd) continue;
      const on = s.owned && s.customer && s.customer.seated;
      s.leds.hdd.visible = on && Math.random() > 0.5;
      s.leds.power.visible = s.owned;
    }
    // 门帘摆动
    let near = 0;
    for (const p of ctx.people || []) {
      const d = Math.hypot(p.x - 7.2, p.z - 6.95);
      if (d < 0.9) near = Math.max(near, (0.9 - d) / 0.9 * Math.sign(p.vz || 0.0001));
    }
    this.curtainSwing = (this.curtainSwing || 0) + (near * 0.9 - (this.curtainSwing || 0)) * Math.min(1, dt * 6);
    this.curtain.rotation.x = -this.curtainSwing * 0.8 + Math.sin(t * 1.3) * 0.01;
    // 走字屏
    this.marqueeAcc = (this.marqueeAcc || 0) + dt;
    if (this.marqueeAcc > 1 / 24) {
      this.marqueeAcc = 0;
      const c = this.marqueeCanvas.getContext('2d');
      const W = 512, H = 48;
      c.fillStyle = '#100000'; c.fillRect(0, 0, W, H);
      c.font = 'bold 34px "Microsoft YaHei",sans-serif';
      c.fillStyle = '#ff2a10';
      c.textBaseline = 'middle';
      const tw = c.measureText(this.marqueeText).width;
      const x = W - ((t * 90) % (tw + W));
      c.fillText(this.marqueeText, x, H / 2 + 2);
      c.fillText(this.marqueeText, x + tw + 40, H / 2 + 2);
      // 点阵网格
      c.fillStyle = 'rgba(0,0,0,0.55)';
      for (let i = 0; i < W; i += 4) c.fillRect(i, 0, 1, H);
      for (let j = 0; j < H; j += 4) c.fillRect(0, j, W, 1);
      this.marqueeTex.needsUpdate = true;
    }
    // 对手霓虹闪烁
    if (this.rivalGroup.visible) this.rivalSign.material.emissiveIntensity = 1.2 + (Math.sin(t * 7) > 0.92 ? -0.8 : 0) + Math.sin(t * 2) * 0.2;
    if (ctx.neon) this.neonSign.material.emissiveIntensity = 1.5 + (Math.sin(t * 5) > 0.97 ? -1 : 0);
    // 小太阳
    if (this.heater.visible) this.heaterLight.intensity = 0.75 + Math.sin(t * 13) * 0.05;
  }
}
