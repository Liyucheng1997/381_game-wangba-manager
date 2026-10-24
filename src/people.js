// 人物建模与程序化动画
import * as THREE from 'three';
import { mat, add, rbox, box, cyl, sph, texMat } from './models.js';
import { T } from './textures.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// 同一关节下的网格按材质合并，降低 DrawCall
function bakeShallow(group, owner) {
  const buckets = new Map();
  const remove = [];
  for (const o of group.children) {
    if (!o.isMesh || o.userData.keep) continue;
    o.updateMatrix();
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrix);
    const ng = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv'].includes(k)) ng.deleteAttribute(k);
    if (!ng.attributes.uv) ng.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2));
    ng.clearGroups();
    const key = o.material.uuid;
    if (!buckets.has(key)) buckets.set(key, { mat: o.material, geos: [] });
    buckets.get(key).geos.push(ng);
    remove.push(o);
  }
  for (const o of remove) group.remove(o);
  for (const { mat: m, geos } of buckets.values()) {
    const merged = mergeGeometries(geos, false);
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, m);
    mesh.userData.merged = true;
    mesh.userData.char = owner;
    group.add(mesh);
  }
}

let blobTex = null;
function blobMaterial() {
  if (!blobTex) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    blobTex = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false });
  }
  return blobTex;
}
const blobGeo = new THREE.PlaneGeometry(0.75, 0.75);

const capsule = (() => {
  const cache = new Map();
  return (r, l) => {
    const k = r + ',' + l;
    if (!cache.has(k)) cache.set(k, new THREE.CapsuleGeometry(r, l, 4, 10));
    return cache.get(k);
  };
})();

const col = (c) => mat('c' + c, { color: c, roughness: 0.75 });
const colGloss = (c) => mat('cg' + c, { color: c, roughness: 0.35 });

export const SKINS = [0xf1c9a5, 0xe8b88f, 0xdba57a, 0xc98e62, 0xf5d3b5];
export const HAIR_COLORS = [0x1a1410, 0x221a14, 0x2d2018, 0x3b2a1e, 0x14100c, 0x6b3a1e, 0xb07a3a];
export const TOP_COLORS = [0x2a3f6b, 0x7a1f1f, 0x2f2f33, 0x4a5a3a, 0x8a6a3a, 0x1f4f5f, 0x5a2a6a, 0xd8d0c0, 0x3a3a6a, 0xb05a1a, 0x1a1a1a, 0x7a8a9a];
export const PANTS_COLORS = [0x1f2a44, 0x2a2a2e, 0x3a3328, 0x26324a, 0x4a4a4a, 0x1a1a1a];

export function pick(r, arr) { return arr[Math.floor(r() * arr.length)]; }

export function randomLook(r, opts = {}) {
  const gender = opts.gender || (r() < 0.78 ? 'm' : 'f');
  const minor = !!opts.minor;
  const look = {
    gender,
    skin: pick(r, SKINS),
    hairColor: pick(r, HAIR_COLORS.slice(0, gender === 'f' ? 7 : 6)),
    hair: gender === 'm' ? pick(r, ['short', 'short', 'bowl', 'spiky', 'buzz', 'side', 'messy']) : pick(r, ['long', 'ponytail', 'bob', 'long']),
    top: pick(r, ['jacket', 'jacket', 'hoodie', 'sweater', 'leather', 'down', 'tshirt']),
    topColor: pick(r, TOP_COLORS),
    topColor2: pick(r, TOP_COLORS),
    pants: pick(r, PANTS_COLORS),
    shoes: pick(r, [0x1a1a1a, 0xeeeeee, 0x3a2a1a, 0x2a3a6a]),
    height: 0.95 + r() * 0.1,
    build: r() < 0.18 ? 1.25 : (r() < 0.2 ? 0.88 : 1),
    glasses: r() < 0.25,
    cap: r() < 0.08,
    backpack: false,
  };
  if (minor) {
    look.height = 0.82 + r() * 0.07;
    look.top = r() < 0.7 ? 'uniform' : look.top;
    look.topColor = pick(r, [0x2a5aa8, 0x1f3f8a, 0x2a7a4a, 0x8a1f2a]);
    look.backpack = r() < 0.8;
    look.hair = gender === 'm' ? pick(r, ['bowl', 'buzz', 'short']) : 'ponytail';
    look.glasses = r() < 0.3;
  }
  Object.assign(look, opts.look || {});
  return look;
}

const HIP = 0.88;

export class Character {
  constructor(look) {
    this.look = look;
    this.root = new THREE.Group();
    this.root.userData.character = this;
    this.t = Math.random() * 10;
    this.anim = 'idle';
    this.walkPhase = 0;
    this.moveSpeed = 0;
    this.prop = null;
    this.pose = {};
    this.sitBlend = 0;
    this.build();
  }

  build() {
    const L = this.look;
    const skin = mat('skin' + L.skin, { color: L.skin, roughness: 0.62 });
    const hairM = mat('hair' + L.hairColor, { color: L.hairColor, roughness: 0.8 });
    const topM = col(L.topColor);
    const top2M = col(L.topColor2);
    const pantsM = col(L.pants);
    const shoeM = colGloss(L.shoes);
    const white = col(0xf4f4f0);
    const bw = L.build; // 体型宽度系数
    const fem = L.gender === 'f';

    const s = L.height;
    const scaleRoot = new THREE.Group();
    scaleRoot.scale.setScalar(s);
    this.root.add(scaleRoot);
    this.scaleRoot = scaleRoot;

    const body = new THREE.Group();
    body.position.y = HIP;
    scaleRoot.add(body);
    this.body = body;

    // 骨盆
    add(body, rbox(0.3 * bw, 0.14, 0.18 * bw, 0.05), pantsM, 0, 0.0, 0);

    // 脊柱 / 躯干
    const spine = new THREE.Group();
    spine.position.y = 0.06;
    body.add(spine);
    this.spine = spine;
    const torsoW = (fem ? 0.32 : 0.36) * bw, torsoD = 0.2 * bw;
    const puffy = L.top === 'down' ? 1.12 : 1;
    const torso = add(spine, rbox(torsoW * puffy, 0.48, torsoD * puffy, 0.07), topM, 0, 0.25, 0);
    if (L.build > 1.1) add(spine, sph(0.15, 14, 10), topM, 0, 0.14, 0.05).scale.set(1.2, 0.9, 1);
    // 衣服细节
    if (L.top === 'jacket' || L.top === 'leather') {
      add(spine, box(0.012, 0.44, 0.005), mat('zip', { color: 0x999999, metalness: 0.8, roughness: 0.3 }), 0, 0.25, torsoD / 2 + 0.002);
      // 领子
      add(spine, rbox(torsoW * 0.7, 0.07, torsoD * 1.05, 0.03), L.top === 'leather' ? topM : top2M, 0, 0.5, 0);
      if (L.top === 'jacket') add(spine, box(torsoW + 0.004, 0.05, torsoD + 0.004), top2M, 0, 0.06, 0);
    } else if (L.top === 'hoodie') {
      add(spine, sph(0.13, 12, 8), topM, 0, 0.47, -0.1).scale.set(1.2, 0.7, 0.8);
      add(spine, box(0.004, 0.12, 0.004), white, 0.04, 0.38, torsoD / 2 + 0.01);
      add(spine, box(0.004, 0.12, 0.004), white, -0.04, 0.38, torsoD / 2 + 0.01);
      add(spine, rbox(0.2, 0.1, 0.02, 0.01), topM, 0, 0.15, torsoD / 2 + 0.005);
    } else if (L.top === 'uniform') {
      // 国民校服：白色肩条 + 胸前校徽
      add(spine, box(torsoW + 0.004, 0.08, torsoD + 0.004), white, 0, 0.42, 0);
      add(spine, box(0.012, 0.44, 0.005), white, 0, 0.25, torsoD / 2 + 0.003);
      add(spine, box(0.04, 0.04, 0.004), mat('badge', { color: 0xd8aa2a, roughness: 0.4 }), 0.08, 0.36, torsoD / 2 + 0.004);
    } else if (L.top === 'down') {
      for (let i = 0; i < 4; i++) add(spine, box(torsoW * puffy + 0.006, 0.008, torsoD * puffy + 0.006), top2M, 0, 0.08 + i * 0.11, 0);
      add(spine, rbox(torsoW * 0.75, 0.09, torsoD * 1.1, 0.04), topM, 0, 0.5, 0);
    } else if (L.top === 'sweater') {
      add(spine, box(torsoW + 0.003, 0.12, torsoD + 0.003), top2M, 0, 0.27, 0);
      add(spine, rbox(0.14, 0.06, 0.14, 0.02), top2M, 0, 0.5, 0);
    } else if (L.top === 'tshirt') {
      add(spine, box(0.1, 0.08, 0.004), top2M, 0, 0.32, torsoD / 2 + 0.002);
    } else if (L.top === 'staff') {
      // 网管马甲（黑色 + 黄色工牌）
      add(spine, box(torsoW + 0.004, 0.44, torsoD + 0.004), col(0x14161a), 0, 0.23, 0);
      add(spine, box(0.07, 0.09, 0.005), mat('staffCard', { color: 0xffd43a, roughness: 0.4 }), -0.09, 0.32, torsoD / 2 + 0.006);
      add(spine, box(0.004, 0.18, 0.004), mat('lanyard', { color: 0xd02020 }), -0.05, 0.42, torsoD / 2 + 0.005, 0, 0, 0.3);
    }
    if (fem) add(spine, sph(0.07, 10, 8), topM, 0, 0.32, 0.07).scale.set(2.0, 0.9, 0.8);
    if (L.backpack) {
      add(spine, rbox(0.28, 0.34, 0.12, 0.04), col(L.topColor2), 0, 0.26, -torsoD / 2 - 0.06);
      add(spine, rbox(0.2, 0.12, 0.05, 0.02), col(L.topColor2), 0, 0.17, -torsoD / 2 - 0.13);
    }

    // 脖子 + 头
    add(spine, cyl(0.045, 0.052, 0.07, 10), skin, 0, 0.5, -0.005);
    const head = new THREE.Group();
    head.position.y = 0.505;
    spine.add(head);
    this.head = head;
    const hs = 0.115;
    const skull = add(head, sph(hs, 20, 16), skin, 0, 0.11, 0.0);
    skull.scale.set(0.95, 1.08, 1.0);
    add(head, sph(0.075, 14, 10), skin, 0, 0.065, 0.012).scale.set(1.05, 0.95, 1.0); // 下颌
    // 耳朵
    add(head, sph(0.025, 8, 6), skin, hs * 0.95, 0.1, 0).scale.set(0.5, 1, 0.8);
    add(head, sph(0.025, 8, 6), skin, -hs * 0.95, 0.1, 0).scale.set(0.5, 1, 0.8);
    // 眼睛
    const eyeW = mat('eyeWhite', { color: 0xffffff, roughness: 0.3 });
    const eyeB = mat('eyeBlack', { color: 0x14100c, roughness: 0.2 });
    for (const sx of [-1, 1]) {
      add(head, sph(0.018, 10, 8), eyeW, sx * 0.042, 0.115, hs * 0.92).scale.set(1, fem ? 1 : 0.8, 0.5);
      const pupil = add(head, sph(0.011, 8, 6), eyeB, sx * 0.042, 0.115, hs * 0.92 + 0.008);
      pupil.scale.set(1, 1, 0.5);
      add(head, box(0.04, 0.008, 0.01), hairM, sx * 0.043, 0.148, hs * 0.92, 0, 0, sx * -0.12);
    }
    this.eyes = head.children.filter((c) => c.material === eyeW);
    // 鼻子
    add(head, sph(0.016, 8, 6), skin, 0, 0.085, hs * 1.0).scale.set(0.9, 1.1, 1);
    // 嘴
    this.mouth = add(head, box(0.032, 0.006, 0.01), mat('mouth', { color: 0x7a2e2e, roughness: 0.6 }), 0, 0.052, hs * 0.9);
    // 腮红
    if (this.look.gender === 'f' || this.look.height < 0.9) for (const sx of [-1, 1]) add(head, sph(0.016, 8, 6), mat('blush', { color: 0xf09a9a, roughness: 0.8, transparent: true, opacity: 0.55 }), sx * 0.062, 0.085, hs * 0.82).scale.set(1.3, 0.7, 0.4);
    // 眼镜
    if (L.glasses) {
      const gm = mat('glassFrame', { color: 0x111111, roughness: 0.3 });
      for (const sx of [-1, 1]) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.0035, 6, 16), gm);
        ring.position.set(sx * 0.043, 0.115, hs * 0.99);
        head.add(ring);
        add(head, box(0.004, 0.004, 0.11), gm, sx * 0.092, 0.118, hs * 0.5);
      }
      add(head, box(0.025, 0.004, 0.004), gm, 0, 0.12, hs * 1.0);
    }
    this.buildHair(head, hairM, hs);
    if (L.cap) {
      const capM = col(L.topColor2);
      const c = add(head, new THREE.SphereGeometry(hs * 1.08, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, 0.13, -0.005);
      c.scale.set(1, 0.9, 1.05);
      add(head, box(0.18, 0.012, 0.11), capM, 0, 0.15, hs + 0.04, 0.12, 0, 0);
    }

    // 手臂
    const armW = (fem ? 0.042 : 0.05) * (bw > 1.1 ? 1.2 : 1) * (L.top === 'down' ? 1.25 : 1);
    const sleeveM = L.top === 'tshirt' ? skin : topM;
    const makeArm = (sx) => {
      const sh = new THREE.Group();
      sh.position.set(sx * (torsoW / 2 + 0.03), 0.46, 0);
      spine.add(sh);
      add(sh, sph(armW * 1.25, 10, 8), topM, 0, 0, 0);
      add(sh, capsule(armW, 0.2), L.top === 'tshirt' ? topM : sleeveM, 0, -0.13, 0);
      if (L.top === 'uniform') add(sh, box(0.012, 0.24, 0.012), white, sx * armW * 0.95, -0.13, 0);
      const el = new THREE.Group();
      el.position.y = -0.27;
      sh.add(el);
      add(el, capsule(armW * 0.88, 0.18), L.top === 'tshirt' ? skin : topM, 0, -0.12, 0);
      if (L.top === 'uniform') add(el, box(0.012, 0.22, 0.012), white, sx * armW * 0.9, -0.12, 0);
      const hand = new THREE.Group();
      hand.position.y = -0.25;
      el.add(hand);
      add(hand, sph(0.042, 10, 8), skin, 0, -0.02, 0).scale.set(0.8, 1.1, 0.6);
      add(hand, sph(0.016, 6, 5), skin, sx * -0.03, -0.0, 0.02);
      return { sh, el, hand };
    };
    this.armL = makeArm(1);
    this.armR = makeArm(-1);

    // 腿
    const legW = 0.065 * (bw > 1.1 ? 1.15 : 1);
    const makeLeg = (sx) => {
      const hip = new THREE.Group();
      hip.position.set(sx * 0.085 * bw, -0.02, 0);
      body.add(hip);
      add(hip, capsule(legW, 0.3), pantsM, 0, -0.21, 0);
      const knee = new THREE.Group();
      knee.position.y = -0.43;
      hip.add(knee);
      add(knee, capsule(legW * 0.85, 0.3), pantsM, 0, -0.2, 0);
      const shoe = add(knee, rbox(0.1, 0.07, 0.24, 0.03), shoeM, 0, -0.41, 0.04);
      if (L.shoes === 0xeeeeee || L.shoes === 0x2a3a6a) add(knee, box(0.102, 0.02, 0.22), white, 0, -0.435, 0.04);
      return { hip, knee, shoe };
    };
    this.legL = makeLeg(1);
    this.legR = makeLeg(-1);

    for (const e of this.eyes) e.userData.keep = true;
    this.mouth.userData.keep = true;
    const groups = [];
    this.root.traverse((o) => { if (o.isGroup || o === this.root) groups.push(o); });
    for (const gr of groups) bakeShallow(gr, this);
    this.root.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.userData.char = this; } });
    // 软阴影贴片
    const blob = new THREE.Mesh(blobGeo, blobMaterial());
    blob.rotation.x = -Math.PI / 2;
    blob.position.y = 0.012;
    blob.renderOrder = -1;
    this.root.add(blob);
    this.blob = blob;
  }

  dispose() {
    this.root.traverse((o) => { if (o.isMesh && o.userData.merged) o.geometry.dispose(); });
  }

  buildHair(head, hairM, hs) {
    const st = this.look.hair;
    // 发盖：球冠向后倾斜，前额露出、后脑勺包住
    const top = (sx = 1.08, sy = 1.12, y = 0.112, tilt = -0.36, theta = 0.5) => {
      const h = add(head, new THREE.SphereGeometry(hs, 22, 12, 0, Math.PI * 2, 0, Math.PI * theta), hairM, 0, y, -0.006);
      h.scale.set(sx, sy, sx * 1.05);
      h.rotation.x = tilt;
      return h;
    };
    if (st === 'buzz') {
      top(1.03, 1.1, 0.11, -0.3, 0.46);
    } else if (st === 'short' || st === 'side') {
      top(1.08, 1.13);
      add(head, rbox(0.2, 0.05, 0.06, 0.02), hairM, st === 'side' ? 0.02 : 0, 0.2, 0.07, 0.3, 0, st === 'side' ? -0.2 : 0);
      add(head, rbox(0.21, 0.12, 0.06, 0.02), hairM, 0, 0.12, -0.085);
    } else if (st === 'bowl') {
      // 锅盖头 / 蘑菇头
      top(1.16, 1.06, 0.115, -0.05, 0.5);
      add(head, cyl(hs * 1.15, hs * 1.17, 0.04, 22), hairM, 0, 0.14, 0.0);
    } else if (st === 'spiky') {
      top(1.07, 1.12);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        add(head, new THREE.ConeGeometry(0.03, 0.09, 5), hairM, Math.cos(a) * 0.06, 0.24, Math.sin(a) * 0.06 - 0.01, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      }
    } else if (st === 'messy') {
      top(1.1, 1.16);
      for (let i = 0; i < 6; i++) add(head, sph(0.04, 6, 5), hairM, (Math.random() - 0.5) * 0.15, 0.21 + Math.random() * 0.03, (Math.random() - 0.5) * 0.15);
    } else if (st === 'long') {
      top(1.11, 1.15, 0.112, -0.3, 0.52);
      add(head, rbox(0.25, 0.36, 0.1, 0.04), hairM, 0, -0.0, -0.07);
      add(head, rbox(0.05, 0.28, 0.08, 0.02), hairM, 0.11, 0.03, 0.02);
      add(head, rbox(0.05, 0.28, 0.08, 0.02), hairM, -0.11, 0.03, 0.02);
      add(head, rbox(0.2, 0.05, 0.05, 0.02), hairM, 0, 0.19, 0.08, 0.4, 0, 0);
    } else if (st === 'ponytail') {
      top(1.09, 1.14);
      add(head, sph(0.035, 8, 6), col(0xd02050), 0, 0.17, -0.12);
      add(head, capsule(0.035, 0.18), hairM, 0, 0.05, -0.15, 0.3, 0, 0);
      add(head, rbox(0.2, 0.05, 0.05, 0.02), hairM, 0, 0.2, 0.08, 0.4, 0, 0);
    } else if (st === 'bob') {
      top(1.12, 1.16, 0.112, -0.2, 0.5);
      add(head, new THREE.CylinderGeometry(hs * 1.13, hs * 1.22, 0.17, 18, 1, true, Math.PI * 0.32, Math.PI * 1.36), mat('hairDS' + this.look.hairColor, { color: this.look.hairColor, roughness: 0.8, side: THREE.DoubleSide }), 0, 0.07, -0.01);
    } else if (st === 'bald') {
      // 地中海
      add(head, rbox(0.2, 0.07, 0.07, 0.03), hairM, 0, 0.09, -0.09);
    }
  }

  setProp(kind) {
    if (this.propKind === kind) return;
    if (this.prop) { this.prop.parent.remove(this.prop); this.prop = null; }
    this.propKind = kind;
    if (!kind) return;
    const g = new THREE.Group();
    if (kind === 'noodle' || kind === 'noodle_dry') {
      add(g, cyl(0.06, 0.045, 0.1, 12), texMat('cupNoodle0', T.noodle(0)), 0, -0.02, 0.06);
      if (kind === 'noodle') add(g, cyl(0.062, 0.062, 0.004, 12), mat('lid', { color: 0xf0f0f0 }), 0, 0.03, 0.06);
    } else if (kind === 'drink') {
      add(g, cyl(0.032, 0.032, 0.12, 12), texMat('can0', T.can(0)), 0, -0.02, 0.04);
    } else if (kind === 'headset') {
      add(g, new THREE.TorusGeometry(0.075, 0.008, 6, 16, Math.PI), mat('black', { color: 0x18191c }), 0, 0.0, 0.05);
      add(g, cyl(0.04, 0.04, 0.03, 12), mat('darkMetal', { color: 0x2b2c30 }), 0.075, -0.01, 0.05, 0, 0, Math.PI / 2);
      add(g, cyl(0.04, 0.04, 0.03, 12), mat('darkMetal', { color: 0x2b2c30 }), -0.075, -0.01, 0.05, 0, 0, Math.PI / 2);
    } else if (kind === 'cig') {
      add(g, cyl(0.004, 0.004, 0.07, 5), mat('white', { color: 0xf2f2ee }), 0, 0, 0.03, Math.PI / 2, 0, 0);
      add(g, cyl(0.0045, 0.0045, 0.006, 5), mat('ember', { color: 0xff5500, emissive: 0xff3300, emissiveIntensity: 3 }), 0, 0, 0.066, Math.PI / 2, 0, 0);
    } else if (kind === 'tray') {
      add(g, box(0.36, 0.015, 0.26), mat('trayM', { color: 0x8a5a2a, roughness: 0.5 }), 0, 0, 0.12);
    } else if (kind === 'phone') {
      add(g, box(0.05, 0.1, 0.02), mat('nokia', { color: 0x334455, roughness: 0.4 }), 0, -0.02, 0.03);
    }
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    this.armR.hand.add(g);
    this.prop = g;
  }

  // 主更新：根据当前动作计算目标姿态并平滑插值
  update(dt) {
    this.t += dt;
    const t = this.t;
    const P = {
      bodyY: 0, bodyZ: 0, lean: 0, spineY: 0, headX: 0, headY: 0,
      shLx: 0.05, shLz: 0.08, shRx: 0.05, shRz: -0.08, elL: -0.1, elR: -0.1,
      hipL: 0, hipR: 0, knL: 0, knR: 0, mouth: 1,
    };
    const a = this.anim;
    const seated = ['sit', 'type', 'eat', 'drink', 'smoke', 'sleep', 'rageSit', 'cheerSit', 'sitTalk'].includes(a);
    if (seated) {
      P.hipL = P.hipR = -1.52; P.knL = P.knR = 1.45;
      P.bodyY = -0.38; P.bodyZ = -0.06; P.lean = 0.08;
      P.shLx = P.shRx = -0.35; P.elL = P.elR = -0.7; P.shLz = 0.12; P.shRz = -0.12;
      // 抖腿
      if (Math.sin(t * 0.37) > 0.6) P.knL += Math.sin(t * 18) * 0.06;
    }
    switch (a) {
      case 'idle':
        P.lean = Math.sin(t * 1.6) * 0.01;
        P.headY = Math.sin(t * 0.5) * 0.25;
        P.shLz = 0.1 + Math.sin(t * 1.6) * 0.02; P.shRz = -P.shLz;
        break;
      case 'walk':
      case 'carry': {
        const p = this.walkPhase;
        P.hipL = Math.sin(p) * 0.55; P.hipR = -Math.sin(p) * 0.55;
        P.knL = Math.max(0, -Math.cos(p)) * 0.8 + 0.05; P.knR = Math.max(0, Math.cos(p)) * 0.8 + 0.05;
        P.bodyY = Math.abs(Math.cos(p)) * 0.025 - 0.01;
        P.lean = -0.05;
        if (a === 'walk') {
          P.shLx = -Math.sin(p) * 0.45; P.shRx = Math.sin(p) * 0.45;
          P.elL = -0.3 - Math.max(0, Math.sin(p)) * 0.3; P.elR = -0.3 - Math.max(0, -Math.sin(p)) * 0.3;
        } else {
          P.shLx = P.shRx = -0.75; P.elL = P.elR = -0.8; P.shLz = -0.05; P.shRz = 0.05;
        }
        P.spineY = Math.sin(p) * 0.06;
        break;
      }
      case 'type':
        P.lean = -0.12; P.headX = 0.12;
        P.shLx = -0.75; P.shRx = -0.62; P.shLz = -0.12; P.shRz = 0.25;
        P.elL = -0.95 + Math.sin(t * 22) * 0.06; P.elR = -1.0 + Math.sin(t * 5.3) * 0.04;
        P.headY = Math.sin(t * 0.7) * 0.05;
        break;
      case 'eat':
        P.lean = -0.15; P.headX = 0.25;
        P.shLx = -0.7; P.elL = -0.9; P.shLz = -0.1;
        P.shRx = -0.95 - Math.max(0, Math.sin(t * 3)) * 0.35; P.elR = -1.6; P.shRz = 0.15;
        break;
      case 'drink':
        P.headX = -0.25 * Math.max(0, Math.sin(t * 1.2));
        P.shRx = -1.0 - Math.max(0, Math.sin(t * 1.2)) * 0.5; P.elR = -1.9; P.shRz = 0.2;
        break;
      case 'smoke': {
        const k = Math.max(0, Math.sin(t * 0.9));
        P.shRx = -0.5 - k * 0.7; P.elR = -1.0 - k * 1.0; P.shRz = 0.15 + k * 0.1;
        P.lean = 0.12; P.headX = -0.05;
        break;
      }
      case 'sleep':
        P.lean = -0.55; P.headX = 0.5;
        P.shLx = P.shRx = -1.2; P.elL = P.elR = -1.8; P.shLz = -0.3; P.shRz = 0.3;
        break;
      case 'rageSit':
        P.lean = -0.08 + Math.sin(t * 9) * 0.05;
        P.shLx = -1.4 + Math.sin(t * 10) * 0.6; P.shRx = -1.4 + Math.cos(t * 10) * 0.6;
        P.elL = P.elR = -0.3; P.headY = Math.sin(t * 7) * 0.3; P.mouth = 3;
        break;
      case 'rage':
        P.shLx = -2.6 + Math.sin(t * 9) * 0.4; P.shRx = -2.6 + Math.cos(t * 9) * 0.4;
        P.shLz = 0.3; P.shRz = -0.3; P.elL = P.elR = -0.3; P.headY = Math.sin(t * 6) * 0.25; P.mouth = 3;
        P.bodyY = Math.abs(Math.sin(t * 6)) * 0.04;
        break;
      case 'cheer':
      case 'cheerSit':
        P.shLx = P.shRx = -2.8 + Math.sin(t * 12) * 0.2; P.shLz = 0.25; P.shRz = -0.25; P.elL = P.elR = -0.2; P.mouth = 2.5;
        if (a === 'cheer') P.bodyY = Math.abs(Math.sin(t * 8)) * 0.08;
        break;
      case 'talk':
        P.shRx = -0.5 + Math.sin(t * 3) * 0.25; P.elR = -1.1; P.shRz = -0.1;
        P.headY = Math.sin(t * 1.3) * 0.15; P.mouth = 1 + Math.abs(Math.sin(t * 14)) * 2;
        break;
      case 'sitTalk':
        P.shRx = -0.6 + Math.sin(t * 3) * 0.3; P.elR = -1.1;
        P.headY = Math.sin(t * 1.3) * 0.2; P.mouth = 1 + Math.abs(Math.sin(t * 14)) * 2;
        break;
      case 'work':
        P.lean = -0.35; P.headX = 0.3;
        P.shLx = -1.1 + Math.sin(t * 6) * 0.15; P.shRx = -1.1 + Math.cos(t * 7) * 0.15;
        P.elL = P.elR = -0.5; P.hipL = P.hipR = -0.15; P.knL = P.knR = 0.25; P.bodyY = -0.03;
        break;
      case 'counter':
        P.lean = -0.08; P.headX = 0.1;
        P.shLx = P.shRx = -0.6; P.elL = P.elR = -0.9; P.shLz = -0.1; P.shRz = 0.1;
        P.elL += Math.sin(t * 18) * 0.04;
        break;
      case 'sit':
      default:
        if (seated) { P.headY = Math.sin(t * 0.4) * 0.2; }
    }
    // 眨眼
    const blink = (t % 3.7) < 0.12 ? 0.1 : 1;
    for (const e of this.eyes) e.scale.y = (this.look.gender === 'f' ? 1 : 0.8) * blink;

    // 平滑插值
    const k = 1 - Math.exp(-dt * (a === 'walk' || a === 'carry' ? 20 : 9));
    const cur = this.pose;
    for (const key in P) cur[key] = cur[key] === undefined ? P[key] : cur[key] + (P[key] - cur[key]) * k;
    this.body.position.y = HIP + cur.bodyY;
    this.body.position.z = cur.bodyZ;
    this.body.rotation.x = 0;
    this.spine.rotation.x = -cur.lean; // lean 正值后仰，负值前倾
    this.spine.rotation.y = cur.spineY;
    this.head.rotation.x = cur.headX;
    this.head.rotation.y = cur.headY;
    this.armL.sh.rotation.x = cur.shLx; this.armL.sh.rotation.z = cur.shLz;
    this.armR.sh.rotation.x = cur.shRx; this.armR.sh.rotation.z = cur.shRz;
    this.armL.el.rotation.x = cur.elL; this.armR.el.rotation.x = cur.elR;
    this.legL.hip.rotation.x = cur.hipL; this.legR.hip.rotation.x = cur.hipR;
    this.legL.knee.rotation.x = cur.knL; this.legR.knee.rotation.x = cur.knR;
    this.mouth.scale.y = cur.mouth;
  }
}
