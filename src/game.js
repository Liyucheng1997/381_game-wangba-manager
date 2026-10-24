// 游戏逻辑：时间、顾客 AI、需求、经济、剧情调度
import * as THREE from 'three';
import { Character, randomLook, pick } from './people.js';
import { Cafe, P } from './cafe.js';
import { Screens } from './screens.js';
import { CAST, DAYS, TARGET, finaleScript, endingInfo } from './story.js';
import { rng } from './textures.js';

export const CFG = {
  secPerHour: 40, openHour: 9, closeHour: 24, lastEntry: 23,
  baseArrival: 4.6, startMoney: 1000,
  elec: 0.3, netCost: 40, netCostFiber: 55,
  price: { noodle: 4, drink: 3 }, cost: { noodle: 1.5, drink: 1.2, headset: 12 },
  needRates: { noodle: 0.05, drink: 0.06, headset: 0.014, crash: 0.022, quarrel: 0.004 },
  patience: { checkin: 1.0, noodle: 1.2, drink: 1.1, headset: 1.0, crash: 1.1, virus: 1.5, smoke: 1.3, quarrel: 0.9, extend: 0.45, broken: 99, talk: 99, thief: 99 },
};

export const NEED_INFO = {
  checkin: { icon: '🪪', text: '等待开卡' },
  noodle: { icon: '🍜', text: '要一桶泡面' },
  drink: { icon: '🥤', text: '要一瓶饮料' },
  headset: { icon: '🎧', text: '耳机坏了' },
  crash: { icon: '💻', text: '电脑出故障' },
  virus: { icon: '🐼', text: '电脑中毒了' },
  smoke: { icon: '🚬', text: '在抽烟' },
  quarrel: { icon: '💢', text: '在吵架' },
  extend: { icon: '⏰', text: '想续费' },
  lag: { icon: '📶', text: '网卡了' },
  talk: { icon: '💬', text: '有话要说' },
  thief: { icon: '🕵️', text: '偷了鼠标！' },
};

const SURNAMES = '王李张刘陈杨赵黄周吴徐孙胡朱高林何郭马罗梁宋郑谢韩唐冯于董萧程曹袁邓许傅沈曾彭吕苏卢蒋蔡贾丁魏薛叶阎余潘杜戴夏钟汪田任姜范方石姚谭廖邹熊金陆郝孔白崔康毛邱秦江史顾侯邵孟龙万段雷钱汤尹黎易常武乔贺赖龚文';
const NICKS = ['阿强', '小军', '二狗', '大鹏', '阿杰', '小飞', '老三', '亮子', '阿伟', '小波', '胖虎', '东子', '阿龙', '小峰', '浩子', '大刘'];
const NICKS_F = ['小丽', '阿娟', '婷婷', '小燕', '晶晶', '阿芳', '小雪', '倩倩'];

const R = Math.random;
const castLook = (key) => ({ ...randomLook(R), glasses: false, cap: false, backpack: false, ...CAST[key].look });
const clamp = THREE.MathUtils.clamp;

function hourCurve(h) {
  const pts = [[9, 0.45], [11, 0.6], [12, 0.95], [14, 0.75], [16, 1.15], [17.5, 1.35], [19, 1.4], [20.5, 1.6], [22, 1.25], [23, 0.8], [24, 0.3]];
  for (let i = 0; i < pts.length - 1; i++) {
    const [h0, v0] = pts[i], [h1, v1] = pts[i + 1];
    if (h >= h0 && h <= h1) return v0 + (v1 - v0) * (h - h0) / (h1 - h0);
  }
  return 0.3;
}

// ---------- 基础行走体 ----------
class Agent {
  constructor(game, look) {
    this.game = game;
    this.char = new Character(look);
    this.look = look;
    game.scene.add(this.char.root);
    this.x = 0; this.z = 0; this.rot = 0; this.vz = 0;
    this.path = null; this.onArrive = null;
    this.speed = 1.35;
    this.seatedOn = null;
    this.id = Agent.nextId = (Agent.nextId || 0) + 1;
  }
  setPos(x, z) { this.x = x; this.z = z; this.sync(); }
  sync() {
    const y = this.seatedOn ? (0.5 - this.look.height * 0.5) : 0;
    this.char.root.position.set(this.x, y, this.z);
    this.char.root.rotation.y = this.rot;
    this.char.blob.position.y = 0.012 - y;
  }
  goTo(x, z, cb) {
    this.standUp();
    const p = this.game.cafe.nav.findPath(this.x, this.z, x, z);
    this.path = p && p.length ? p : [{ x, z }];
    this.onArrive = cb || null;
  }
  stop() { this.path = null; this.onArrive = null; }
  standUp() {
    if (this.seatedOn) {
      const s = this.seatedOn;
      this.seatedOn = null;
      this.x = s.approach.x; this.z = s.approach.z;
    }
  }
  sitAt(seat) {
    this.path = null;
    this.seatedOn = seat;
    this.x = seat.x + seat.fx * 0.03; this.z = seat.z + seat.fz * 0.03;
    this.rot = seat.theta;
  }
  faceTo(x, z) { this.rot = Math.atan2(x - this.x, z - this.z); }
  move(dt) {
    this.vz = 0;
    if (!this.path) return false;
    const tgt = this.path[0];
    const dx = tgt.x - this.x, dz = tgt.z - this.z;
    const d = Math.hypot(dx, dz);
    const step = this.speed * dt;
    if (d <= step) {
      this.x = tgt.x; this.z = tgt.z;
      this.path.shift();
      if (!this.path.length) {
        this.path = null;
        const cb = this.onArrive; this.onArrive = null;
        if (cb) cb();
        return true;
      }
    } else {
      this.x += dx / d * step; this.z += dz / d * step;
      this.vz = dz / d;
      const want = Math.atan2(dx, dz);
      let diff = want - this.rot;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.rot += diff * Math.min(1, dt * 12);
    }
    this.char.walkPhase += step * 5.2 / this.look.height;
    return true;
  }
  remove() {
    this.game.scene.remove(this.char.root);
    this.char.dispose();
    this.removed = true;
  }
  get walking() { return !!this.path; }
}

// ---------- 顾客 ----------
class Customer extends Agent {
  constructor(game, opts = {}) {
    const r = R;
    const minor = !!opts.minor;
    const look = opts.look || randomLook(r, { minor });
    super(game, look);
    this.minor = minor;
    this.age = opts.age || (minor ? 13 + Math.floor(r() * 4) : 18 + Math.floor(r() * 22));
    this.looksYoung = minor || (this.age <= 19 && r() < 0.5) || look.top === 'uniform';
    this.named = opts.named || null;
    this.opts = opts;
    this.name = opts.name || (look.gender === 'f' ? pick(r, NICKS_F) : (r() < 0.5 ? pick(r, NICKS) : SURNAMES[Math.floor(r() * SURNAMES.length)] + (r() < 0.5 ? '哥' : '先生')));
    this.hours = opts.hours || (2 + Math.floor(r() * 5));
    this.remaining = this.hours;
    this.sat = 72 + (r() - 0.5) * 16;
    this.smoker = !minor && !this.named && look.gender === 'm' && r() < 0.14;
    this.thief = false;
    this.rich = !minor && r() < 0.2;
    this.need = null;
    this.seat = null;
    this.state = 'arrive';
    this.speed = 1.2 + r() * 0.35;
    const progs = look.gender === 'f' ? ['qq', 'qq', 'dance', 'dance', 'movie'] : ['cs', 'cs', 'cs', 'legend', 'legend', 'war', 'qq', 'movie'];
    const pname = opts.program ? opts.program.replace(/\d+$/, '') : pick(r, progs);
    const vars = game.screens.variants(pname);
    this.program = opts.program || pick(r, vars.length ? vars : ['login']);
    this.extendAsked = false;
    this.served = 0;
    this.queueSpot = -1;
    this.hadSmoke = false;
  }
  get seated() { return this.state === 'playing' && !!this.seatedOn; }

  setNeed(type, patience, data) {
    const p = patience ?? CFG.patience[type] ?? 1;
    this.need = { type, t: p, max: p, data: data || null };
    if (type !== 'checkin' && type !== 'talk' && type !== 'extend') this.game.audio.play('need');
    this.game.onNeedCreated(this, type);
  }
  forceNeed(type, patience, delay = 0) {
    if (delay > 0) { this.pendingNeed = { type, patience, t: delay }; return; }
    if (type === 'crash') { this.seat.broken = true; this.game.cafe.applySeatScreen(this.seat); }
    if (type === 'smoke') this.char.setProp('cig');
    this.setNeed(type, patience);
  }
  clearNeed(success) {
    const n = this.need;
    if (!n) return;
    this.need = null;
    if (n.type === 'smoke') this.char.setProp(null);
    if (this.seat && (n.type === 'crash' || n.type === 'virus') && success) {
      this.seat.broken = false; this.seat.virus = false;
      this.game.cafe.applySeatScreen(this.seat);
    }
  }

  update(gdt, dt) {
    const g = this.game;
    if (this.pendingNeed) {
      this.pendingNeed.t -= gdt;
      if (this.pendingNeed.t <= 0 && this.seated && !this.need) { const pn = this.pendingNeed; this.pendingNeed = null; this.forceNeed(pn.type, pn.patience); }
    }
    // 需求倒计时
    if (this.need && this.need.max < 50 && !g.blackoutOn) {
      this.need.t -= gdt;
      if (this.need.type === 'checkin' || this.state === 'queue') this.sat -= gdt * 10;
      if (this.need.t <= 0) g.needTimeout(this);
    }
    const moving = this.move(dt);
    switch (this.state) {
      case 'queue': {
        const idx = g.queue.indexOf(this);
        const spot = Math.min(idx, P.queue.length - 1);
        if (spot !== this.queueSpot) {
          this.queueSpot = spot;
          const q = P.queue[spot];
          this.goTo(q.x + (idx >= P.queue.length ? (R() - 0.5) * 0.6 : 0), q.z);
        }
        if (!this.path) {
          this.faceTo(P.staff.x, P.staff.z);
          if (idx === 0 && !this.need) this.setNeed('checkin', this.named ? 99 : CFG.patience.checkin);
          if (idx > 0) this.sat -= gdt * 4;
        }
        break;
      }
      case 'playing': {
        if (!this.seatedOn) break;
        if (g.blackoutOn) break;
        this.remaining -= gdt;
        g.dayStats.pcHours += gdt;
        // 满意度漂移
        this.sat += gdt * g.comfortRate(this);
        // 随机需求
        if (!this.need && !this.pendingNeed && !this.named) this.rollNeeds(gdt);
        if (!this.need && this.named && this.opts.randomNeeds !== false && R() < gdt * 0.08) this.rollNeeds(gdt * 0.5);
        // 续费
        if (!this.need && !this.extendAsked && this.remaining < 0.35 && this.sat > 62 && R() < 0.55 && g.hour < 22.5) {
          this.extendAsked = true;
          this.setNeed('extend');
        } else if (this.remaining < 0.35) this.extendAsked = true;
        if (g.netDownOn) this.sat -= gdt * 12;
        if (this.remaining <= 0 && (!this.need || ['extend', 'smoke', 'quarrel'].includes(this.need.type))) {
          if (this.need) this.clearNeed(false);
          g.customerLeave(this);
        }
        break;
      }
      case 'visit':
        if (!this.path) this.faceTo(P.staff.x, P.staff.z);
        break;
      case 'leaving':
        break;
    }
    // 动画
    const c = this.char;
    if (moving) c.anim = 'walk';
    else if (this.seatedOn) {
      const n = this.need ? this.need.type : null;
      if (g.blackoutOn) c.anim = 'rageSit';
      else if (n === 'crash' || n === 'virus' || n === 'lag' || (n === 'quarrel')) c.anim = 'rageSit';
      else if (n === 'smoke') c.anim = 'smoke';
      else if (this.eatT > 0) { this.eatT -= gdt; c.anim = this.eatKind === 'noodle' ? 'eat' : 'drink'; if (this.eatT <= 0) c.setProp(null); }
      else if (this.cheerT > 0) { this.cheerT -= dt; c.anim = 'cheerSit'; }
      else if (n === 'talk' || n === 'extend') c.anim = 'sitTalk';
      else if (this.sleepy) c.anim = 'sleep';
      else c.anim = 'type';
    } else if (this.state === 'visit' && this.need) c.anim = 'talk';
    else if (this.rageT > 0) { this.rageT -= dt; c.anim = 'rage'; }
    else c.anim = 'idle';
    this.sat = clamp(this.sat, 0, 100);
    this.sync();
  }

  rollNeeds(gdt) {
    const g = this.game, rt = CFG.needRates;
    const meal = (g.hour > 11.5 && g.hour < 13.5) || (g.hour > 17.5 && g.hour < 19.5) ? 2.2 : 1;
    if (this.smoker && !this.hadSmoke && R() < gdt * 0.35) { this.hadSmoke = true; this.forceNeed('smoke'); return; }
    if (R() < gdt * rt.noodle * meal) return this.setNeed('noodle');
    if (R() < gdt * rt.drink) return this.setNeed('drink');
    if (R() < gdt * rt.headset) return this.setNeed('headset');
    if (R() < gdt * rt.crash * g.crashMul()) return this.forceNeed('crash');
    if (R() < gdt * rt.quarrel) g.startQuarrel(this);
  }
}

// ---------- 玩家（网管） ----------
class Player extends Agent {
  constructor(game) {
    super(game, castLook('me'));
    this.speed = 3.3;
    this.hand = [];
    this.action = null;
  }
  get cap() { return this.game.state.up.tray ? 3 : 1; }
  update(dt) {
    if (this.action) {
      this.action.t += dt;
      this.char.anim = this.action.anim || 'work';
      if (this.action.face) this.faceTo(this.action.face.x, this.action.face.z);
      if (this.action.t >= this.action.dur) {
        const a = this.action; this.action = null;
        a.done && a.done();
      }
    } else {
      const moving = this.move(dt) || this.keyWalking;
      this.keyWalking = false;
      this.char.anim = moving ? (this.hand.length ? 'carry' : 'walk') : 'idle';
    }
    this.char.setProp(this.hand.length ? (this.hand.length > 1 ? 'tray' : this.hand[0]) : null);
    this.sync();
  }
  doAction(dur, anim, done, face) {
    this.path = null;
    this.action = { t: 0, dur, anim, done, face };
  }
}

// ---------- 员工 NPC ----------
class Staff extends Agent {
  constructor(game, role) {
    super(game, castLook(role === 'cashier' ? 'afang' : 'wangayi'));
    this.role = role;
    this.speed = 1.6;
    this.cool = 0;
    this.task = null;
  }
  update(gdt, dt) {
    const g = this.game;
    const moving = this.move(dt);
    this.cool -= dt;
    if (this.role === 'cashier') {
      if (!moving && Math.hypot(this.x - P.staff2.x, this.z - P.staff2.z) > 0.3 && !this.path) this.goTo(P.staff2.x, P.staff2.z);
      if (!this.path) this.faceTo(P.staff2.x, P.staff2.z + 2);
      const front = g.queue[0];
      if (front && front.need && front.need.type === 'checkin' && !front.named && !this.path && this.cool <= 0 && !g.checkinBusy) {
        this.cool = 2.0;
        this.char.anim = 'counter';
        setTimeout(() => { if (front.need && front.need.type === 'checkin' && g.queue[0] === front) g.cashierCheckin(front); }, 900);
      }
      this.char.anim = moving ? 'walk' : (this.cool > 1 ? 'counter' : 'idle');
    } else {
      if (!this.task && !this.path) {
        const dirty = g.cafe.seats.find((s) => s.mess && !s.customer && !s.cleaning);
        if (dirty) {
          this.task = dirty; dirty.cleaning = true;
          this.goTo(dirty.service.x, dirty.service.z, () => { this.cleanT = 3; });
        } else if (Math.hypot(this.x - 3.2, this.z - 5.8) > 0.5) this.goTo(3.2, 5.8);
      }
      if (this.cleanT > 0) {
        this.cleanT -= dt;
        this.char.anim = 'work';
        if (this.task) this.faceTo(this.task.desk.x, this.task.desk.z);
        if (this.cleanT <= 0 && this.task) { g.cafe.setMess(this.task, false); this.task.cleaning = false; this.task = null; }
      } else this.char.anim = moving ? 'walk' : 'idle';
    }
    this.sync();
  }
}

// ---------- 烟雾粒子 ----------
class Smoke {
  constructor(scene) {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(230,230,230,0.8)'); gr.addColorStop(1, 'rgba(230,230,230,0)');
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
    this.tex = new THREE.CanvasTexture(c);
    this.pool = [];
    this.scene = scene;
  }
  emit(pos) {
    let s = this.pool.find((p) => !p.visible);
    if (!s) {
      if (this.pool.length > 120) return;
      s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, opacity: 0.5 }));
      this.scene.add(s); this.pool.push(s);
    }
    s.visible = true; s.position.copy(pos); s.userData.life = 0; s.scale.setScalar(0.08);
  }
  update(dt) {
    for (const s of this.pool) {
      if (!s.visible) continue;
      s.userData.life += dt;
      const l = s.userData.life;
      s.position.y += dt * 0.25; s.position.x += Math.sin(l * 3 + s.id) * dt * 0.05;
      s.scale.setScalar(0.08 + l * 0.25);
      s.material.opacity = Math.max(0, 0.45 * (1 - l / 2.5));
      if (l > 2.5) s.visible = false;
    }
  }
}

// =================== 游戏主体 ===================
export class Game {
  constructor(engine, ui, audio) {
    this.engine = engine; this.ui = ui; this.audio = audio;
    this.scene = engine.scene;
    this.screens = new Screens();
    this.cafe = new Cafe(this.scene, this.screens);
    this.screens.adminProvider = () => this.cafe.seats.filter((s) => s.type !== 'vip').map((s) => ({ label: s.label, owned: s.owned, state: s.broken || s.virus ? 'bad' : s.customer ? 'busy' : s.mess ? 'dirty' : 'free' }));
    this.smoke = new Smoke(this.scene);
    this.customers = [];
    this.queue = [];
    this.staff = [];
    this.modal = 0;
    this.speed = 1;
    this.phase = 'title';
    this.sayQueue = [];
    this.hour = 9;
    this.player = new Player(this);
    this.player.setPos(P.staff.x, P.staff.z);
    this.marker = new THREE.Mesh(new THREE.RingGeometry(0.18, 0.26, 32), new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0, depthWrite: false }));
    this.marker.rotation.x = -Math.PI / 2; this.marker.position.y = 0.02;
    this.scene.add(this.marker);
    this.newState();
    this.cafe.rebuildFurniture(this.state);
    this.cafe.setDaylight(13);
    this.firstSeen = {};
  }

  newState() {
    const owned = this.cafe.seats.filter((s) => s.row === 'C' || s.row === 'D').map((s) => s.id);
    this.state = {
      day: 1, money: CFG.startMoney, rep: 50, price: 3, vipPrice: 6,
      owned, up: {}, stock: { noodle: 30, drink: 30, headset: 4 },
      flags: {}, aff: { laowang: 0, xiaomei: 0, boven: 0 },
      history: [], rival: false, crashMod: 1,
    };
  }
  get flags() { return this.state.flags; }

  save() {
    try { localStorage.setItem('netcafe_save_v1', JSON.stringify(this.state)); } catch (e) { /* 忽略 */ }
  }
  static hasSave() { try { return !!localStorage.getItem('netcafe_save_v1'); } catch (e) { return false; } }
  load() {
    try {
      const s = JSON.parse(localStorage.getItem('netcafe_save_v1'));
      if (s && s.day) { this.state = s; return true; }
    } catch (e) { /* 忽略 */ }
    return false;
  }

  // ---------- 流程 ----------
  async startDay() {
    const st = this.state;
    const D = DAYS[st.day];
    this.dayDef = D;
    this.hour = CFG.openHour;
    for (const c of [...this.customers]) c.remove();
    this.customers = []; this.queue = [];
    for (const s of this.staff) s.remove();
    this.staff = [];
    for (const s of this.cafe.seats) { s.customer = null; s.broken = false; s.virus = false; s.mess = false; s.reserved = null; s.cleaning = false; }
    this.cafe.rebuildFurniture(st);
    this.cafe.rivalGroup.visible = !!st.rival;
    this.player.stop(); this.player.action = null; this.player.hand = [];
    this.player.setPos(P.staff.x, P.staff.z); this.player.rot = Math.PI;
    if (st.up.cashier) { const c = new Staff(this, 'cashier'); c.setPos(P.staff2.x, P.staff2.z); this.staff.push(c); }
    if (st.up.cleaner) { const c = new Staff(this, 'cleaner'); c.setPos(3.2, 5.8); this.staff.push(c); }
    this.dayStats = { income: { net: 0, goods: 0, other: 0, night: 0 }, expense: [], customers: 0, lost: 0, served: 0, pcHours: 0, repStart: st.rep, timeouts: 0, moneyStart: st.money };
    this.mod = { arrival: 1, minors: st.day >= 3, ...(D.mods || {}) };
    if (st.day >= 3) this.mod.minors = true;
    this.events = (D.events || []).map((e) => ({ ...e, fired: false }));
    this.randomEvents = this.rollRandomEvents();
    this.netDownOn = false; this.blackoutOn = false; this.crashToday = 1;
    this.closing = false;
    this.cafe.setDaylight(this.hour);
    this.phase = 'intro';
    this.ui.dayTitle(D);
    this.audio.startAmbience();
    await this.ui.wait(2600);
    await this.say(D.intro);
    this.phase = 'play';
    this.ui.setPhase('play');
  }

  rollRandomEvents() {
    const d = this.state.day;
    if (d < 2) return [];
    const evs = [];
    const pool = ['group', 'thief', 'group', 'quarrel'];
    if (!this.state.up.net && d !== 5) pool.push('net');
    const n = d === 10 ? 2 : 1 + (R() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) evs.push({ type: pick(R, pool), at: 11 + R() * 10, fired: false });
    return evs;
  }

  async endDay() {
    this.phase = 'report';
    const st = this.state, ds = this.dayStats;
    // 通宵：打烊后留下包夜的客人
    if (!this.flags.closedEarly) {
      const owned = this.cafe.seats.filter((s) => s.owned && !s.broken).length;
      const night = Math.round(owned * clamp(st.rep / 100 + 0.15, 0.2, 1) * 0.55) * 10;
      if (night > 0) { st.money += night; ds.income.night += night; }
      ds.expense.push(['通宵电费', Math.round(night * 0.15)]); st.money -= Math.round(night * 0.15);
    }
    this.flags.closedEarly = false;
    // 结算支出
    const elec = Math.round(ds.pcHours * CFG.elec + 25);
    this.money(-elec, 'exp', '电费');
    this.money(-(st.up.net ? CFG.netCostFiber : CFG.netCost), 'exp', st.up.net ? '光纤宽带' : 'ADSL 网费');
    if (st.up.cashier) this.money(-50, 'exp', '收银员阿芳工资');
    if (st.up.cleaner) this.money(-30, 'exp', '保洁王阿姨工资');
    ds.net = Math.round(ds.income.net + ds.income.goods + ds.income.other + ds.income.night);
    this.dayStats.netTotal = ds.net;
    await this.say(this.dayDef.outro || []);
    if (this.dayDef.finale) {
      await this.say(finaleScript(this));
      if (!this.flags.ending) this.flag('paidRent', true);
      const info = endingInfo(this);
      st.history.push(this.reportData());
      this.ui.ending(info, this);
      try { localStorage.removeItem('netcafe_save_v1'); } catch (e) { /* */ }
      this.phase = 'ending';
      return;
    }
    const rep = this.reportData();
    st.history.push(rep);
    await this.ui.report(rep, this);
    this.phase = 'shop';
    await this.ui.shop(this);
    st.day++;
    this.save();
    this.startDay();
  }

  reportData() {
    const ds = this.dayStats, st = this.state;
    return {
      day: st.day, income: { ...ds.income }, expense: [...ds.expense], customers: ds.customers, lost: ds.lost, served: ds.served,
      rep: st.rep, repDelta: st.rep - ds.repStart, money: st.money, delta: st.money - ds.moneyStart, timeouts: ds.timeouts,
    };
  }

  // ---------- 主循环 ----------
  update(rdt) {
    const dt = this.modal > 0 || this.phase !== 'play' ? 0 : rdt * this.speed;
    const gdt = dt / CFG.secPerHour;
    const anyDt = rdt * (this.speed > 1 ? Math.min(this.speed, 2) : 1);
    if (this.phase === 'play' && dt > 0) {
      this.hour += gdt;
      this.cafe.setDaylight(this.hour);
      this.processEvents();
      if (!this.closing) this.spawnLogic(gdt);
      if (this.hour >= CFG.closeHour && !this.closing) this.beginClosing();
      if (this.closing && (this.customers.length === 0 || this.hour > CFG.closeHour + 0.8) && this.modal === 0 && this.sayQueue.length === 0) {
        for (const c of [...this.customers]) this.despawn(c);
        this.endDay();
      }
      if (this.blackoutOn && this.blackoutUntil && this.hour >= this.blackoutUntil) this.endBlackout();
    }
    // 角色
    for (const c of [...this.customers]) {
      if (dt > 0) c.update(gdt, dt);
      else { c.char.update(rdt * 0.5); continue; }
      if (c.need && c.need.type === 'smoke' && c.seatedOn && R() < dt * 3) {
        const p = new THREE.Vector3(); c.char.armR.hand.getWorldPosition(p); this.smoke.emit(p);
      }
      if (c.leavingOut && Math.hypot(c.x - c.leavingOut.x, c.z - c.leavingOut.z) < 0.3) this.despawn(c);
      c.char.update(dt);
    }
    for (const s of this.staff) { if (dt > 0) s.update(gdt, dt); s.char.update(dt || rdt * 0.5); }
    if (dt > 0) this.player.update(dt);
    this.player.char.update(dt > 0 ? dt : rdt * 0.5);
    this.smoke.update(dt);
    this.screens.update(rdt);
    this.cafe.update(rdt, { hour: this.hour, people: [...this.customers, this.player], netDown: this.netDownOn, neon: !!this.state.up.neon });
    if (this.marker.material.opacity > 0) { this.marker.material.opacity -= rdt * 1.2; this.marker.scale.setScalar(1 + (1 - this.marker.material.opacity) * 0.6); }
    // 剧情队列
    if (this.modal === 0 && this.sayQueue.length && this.phase === 'play') this.say(this.sayQueue.shift());
  }

  processEvents() {
    for (const e of this.events) {
      if (!e.fired && this.hour >= e.at) { e.fired = true; e.do(this); }
    }
    for (const e of this.randomEvents) {
      if (!e.fired && this.hour >= e.at) { e.fired = true; this.runRandom(e.type); }
    }
  }

  runRandom(type) {
    if (type === 'group') {
      const n = 3 + Math.floor(R() * 3);
      for (let i = 0; i < n; i++) setTimeout(() => this.spawnCustomer({ hours: 3 + Math.floor(R() * 3), program: 'cs' + (i % 3) }), i * 500);
      this.toast(`一群小伙子吵吵嚷嚷地来开黑了（${n}人）`);
    } else if (type === 'thief') {
      const c = this.spawnCustomer({});
      if (c) c.thief = true;
    } else if (type === 'quarrel') {
      const c = this.customers.find((x) => x.seated && !x.need && !x.named);
      if (c) this.startQuarrel(c);
    } else if (type === 'net') this.netDown();
  }

  spawnLogic(gdt) {
    if (this.hour > CFG.lastEntry || this.blackoutOn) return;
    const st = this.state;
    const repF = 0.3 + st.rep / 70;
    const priceF = Math.pow(3 / st.price, 1.6);
    const rivalF = st.rival ? (this.flags.tournamentWon ? 0.92 : 0.72) : 1;
    const neonF = st.up.neon ? 1.15 : 1;
    const evening = this.mod.eveningBoost && this.hour > 19 && this.hour < 22.5 ? this.mod.eveningBoost : 1;
    const plaque = this.flags.plaque ? 1.1 : 1;
    const lambda = CFG.baseArrival * hourCurve(this.hour) * repF * priceF * rivalF * neonF * (this.mod.arrival || 1) * evening * plaque * (st.day === 1 ? 0.75 : 1);
    if (R() < lambda * gdt) {
      const minorChance = this.mod.minors ? (this.hour > 15.5 && this.hour < 21 ? 0.14 : 0.06) : 0;
      this.spawnCustomer({ minor: R() < minorChance });
      if (R() < 0.18) setTimeout(() => this.spawnCustomer({}), 700);
    }
  }

  spawnCustomer(opts = {}) {
    if (this.queue.length >= 9) { this.dayStats.lost++; return null; }
    const c = new Customer(this, opts);
    const side = R() < 0.5 ? P.spawnL : P.spawnR;
    c.setPos(side.x, side.z + (R() - 0.5) * 0.8);
    this.customers.push(c);
    c.state = 'walkin';
    c.goTo(P.doorOut.x, P.doorOut.z, () => { c.state = 'queue'; c.queueSpot = -1; this.queue.push(c); this.audio.play('door'); });
    if (!opts.named) this.dayStats.customers++;
    return c;
  }

  spawnNamed(key, opts = {}) {
    const cast = CAST[key];
    const c = this.spawnCustomer({ ...opts, named: key, name: cast.name, look: castLook(key), minor: !!opts.minor, age: opts.minor ? 14 : 25 });
    if (c) { c.smoker = false; c.looksYoung = !!opts.minor; this.dayStats.customers++; }
    return c;
  }

  spawnVisitor(key, opts = {}) {
    const cast = CAST[key];
    const c = new Customer(this, { named: key, name: cast.name, look: castLook(key), visitor: true, ...opts });
    c.setPos(P.spawnR.x, P.spawnR.z);
    c.state = 'walkin';
    c.speed = 1.6;
    this.customers.push(c);
    c.goTo(P.doorOut.x, P.doorOut.z, () => {
      this.audio.play('door');
      c.goTo(7.6, 3.6, () => { c.state = 'visit'; c.setNeed('talk', 99); });
    });
    return c;
  }

  findNamed(key) { return this.customers.find((c) => c.named === key && !c.visitor && !c.opts.visitor && c.state !== 'leaving'); }

  beginClosing() {
    this.closing = true;
    this.toast('午夜十二点，打烊了。客人们陆续离开。');
    for (const c of [...this.customers]) {
      if (c.need) c.clearNeed(false);
      if (c.state === 'playing') this.customerLeave(c, true);
      else this.sendOut(c);
    }
    this.queue = [];
  }

  // ---------- 顾客流转 ----------
  sendOut(c) {
    const qi = this.queue.indexOf(c);
    if (qi >= 0) this.queue.splice(qi, 1);
    c.state = 'leaving';
    if (c.seat) { const s = c.seat; c.standUp(); s.customer = null; c.seat = null; this.cafe.applySeatScreen(s); }
    if (c.need && c.need.type !== 'thief') c.need = null;
    const side = R() < 0.5 ? P.spawnL : P.spawnR;
    c.goTo(P.doorOut.x, P.doorOut.z, () => { c.leavingOut = side; c.goTo(side.x, side.z); });
  }

  customerLeave(c, forced = false) {
    const s = c.seat;
    if (s) {
      if (R() < 0.6 && !c.named) this.cafe.setMess(s, true);
      s.customer = null;
      this.cafe.applySeatScreen(s);
    }
    c.standUp();
    c.seat = null;
    if (!forced || !c.opts.visitor) {
      const d = clamp((c.sat - 58) / 40, -1.6, 1.0) * (c.named ? 2 : 1) * 0.45;
      if (!c.opts.visitor && c.state === 'playing') this.rep(d, true);
    }
    if (c.thief && !forced) {
      c.thief = false;
      c.setNeed('thief', 99);
      this.toast(`${s ? s.label : ''} 那个客人好像把鼠标揣兜里了！快拦住他！`, 'warn');
      this.audio.play('alert');
      c.speed = 1.9;
    }
    if (c.opts.onLeave) this.sayLater(c.opts.onLeave);
    this.sendOut(c);
    if (c.need && c.need.type === 'thief') {
      c.goTo(P.doorOut.x, P.doorOut.z, () => {
        if (c.need && c.need.type === 'thief') { c.need = null; this.money(-35, 'exp', '被偷的鼠标'); this.toast('小偷跑掉了……损失一个鼠标', 'bad'); }
        const side = P.spawnL; c.leavingOut = side; c.goTo(side.x, side.z);
      });
    }
  }

  despawn(c) {
    const i = this.customers.indexOf(c);
    if (i >= 0) this.customers.splice(i, 1);
    const qi = this.queue.indexOf(c);
    if (qi >= 0) this.queue.splice(qi, 1);
    if (c.seat) { c.seat.customer = null; this.cafe.applySeatScreen(c.seat); }
    c.remove();
  }

  pickSeat(c) {
    const free = this.cafe.seats.filter((s) => s.owned && !s.customer && !s.broken && !s.virus && !s.reserved);
    if (!free.length) return null;
    if (c.opts.seat) {
      const want = this.cafe.seatById[c.opts.seat];
      if (want && free.includes(want)) return want;
    }
    const vip = free.filter((s) => s.type === 'vip');
    if (c.rich && vip.length) return pick(R, vip);
    const normal = free.filter((s) => s.type !== 'vip');
    const clean = normal.filter((s) => !s.mess);
    if (clean.length) return pick(R, clean);
    if (normal.length) return pick(R, normal);
    return pick(R, vip);
  }

  assignSeat(c) {
    const seat = this.pickSeat(c);
    const qi = this.queue.indexOf(c);
    if (qi >= 0) this.queue.splice(qi, 1);
    if (c.need && c.need.type === 'checkin') c.need = null;
    if (!seat) {
      this.toast(`${c.name}：“没位置了？那我去别家……”`, 'bad');
      this.dayStats.lost++;
      this.rep(-0.15, true);
      this.sendOut(c);
      return false;
    }
    seat.customer = c;
    c.seat = seat;
    c.state = 'toSeat';
    if (seat.mess) c.sat -= 12;
    const price = seat.type === 'vip' ? this.state.vipPrice : this.state.price;
    if (c.opts.paid !== false) {
      this.money(c.hours * price, 'net', '上网费', { x: P.staff.x, z: P.staff.z + 0.8 });
    }
    this.audio.play('cash');
    this.dayStats.served++;
    c.goTo(seat.approach.x, seat.approach.z, () => {
      c.sitAt(seat);
      c.state = 'playing';
      this.cafe.applySeatScreen(seat);
      if (c.opts.afterSeat) c.opts.afterSeat(c);
    });
    return true;
  }

  // 玩家开卡
  async doCheckin(c) {
    if (this.checkinBusy) return;
    this.checkinBusy = true;
    try {
      if (c.opts.onCheckin) {
        this.forceSeat = false; this.cancelled = false; this.currentCheckin = c;
        const special = c.opts.special;
        await this.say(c.opts.onCheckin);
        this.currentCheckin = null;
        if (this.cancelled) { this.sendOut(c); return; }
        if (!special || this.forceSeat) this.assignSeat(c);
        return;
      }
      if (c.looksYoung) {
        const res = await this.idCheck(c);
        if (res === 'refuse') return;
      }
      this.assignSeat(c);
    } finally { this.checkinBusy = false; }
  }

  async idCheck(c) {
    const scan = this.state.up.idscan;
    const agetxt = `${c.age}岁`;
    let checked = scan;
    let lines;
    if (scan) {
      lines = [['sys', `【身份证读卡器】${c.name}，${agetxt}。` + (c.minor ? '⚠ 未成年人！' : '已成年。')]];
    } else {
      lines = [['sys', `${c.name}看起来年纪不大……`]];
    }
    let result = 'ok';
    const ask = c.minor
      ? [['sys', `身份证上写着：${agetxt}。是个未成年人。`], { choice: [
        { t: '“小朋友，回家写作业去。”（拒绝）', do: () => { result = 'refuse'; } },
        { t: '“……下不为例。”（违规放行）', do: () => { result = 'ok'; this.flag('minorsLetIn', (this.flags.minorsLetIn || 0) + 1); } },
      ] }]
      : [['sys', `身份证上写着：${agetxt}。成年了。`]];
    if (checked) lines.push(...ask.slice(1));
    else lines.push({ choice: [
      { t: '“身份证我看下。”', then: ask },
      { t: '直接开卡', do: () => { if (c.minor) this.flag('minorsLetIn', (this.flags.minorsLetIn || 0) + 1); } },
    ] });
    await this.say(lines);
    if (result === 'refuse') {
      if (c.minor) this.rep(0.5);
      this.toast(`${c.name}被劝走了`);
      this.sendOut(c);
    }
    return result;
  }

  cashierCheckin(c) {
    if (c.named) return;
    if (c.minor) { this.toast('阿芳查了身份证，劝走了一个未成年人'); this.sendOut(c); return; }
    this.assignSeat(c);
  }

  // 剧情用
  cancelCheckin() { this.cancelled = true; }
  forceCheckin() { this.forceSeat = true; }
  kickNamed(key) { const c = this.findNamed(key); if (c) { if (c.need) c.clearNeed(false); this.customerLeave(c, true); c.speed = 1.9; } }

  // ---------- 需求处理 ----------
  onNeedCreated(c, type) {
    if (!this.firstSeen[type] && this.state.day <= 2) {
      this.firstSeen[type] = true;
      const tips = {
        noodle: '有客人要泡面🍜：货架拿泡面 → 饮水机接热水 → 送到座位。',
        drink: '有客人要饮料🥤：去冰柜拿饮料，送到座位。',
        headset: '有客人耳机坏了🎧：去耳机架拿新耳机送过去。',
        crash: '有电脑出故障了💻：走过去点一下进行维修。',
        smoke: '有人抽烟🚬：过去劝阻一下，烟味会让周围客人不满。',
        extend: '有客人想续费⏰：过去点一下就能多收钱！',
      };
      if (tips[type]) this.hint(tips[type]);
    }
  }

  needTimeout(c) {
    const n = c.need;
    c.need = null;
    this.dayStats.timeouts++;
    const t = n.type;
    if (t === 'checkin') {
      this.toast(`${c.name}等得不耐烦，走了`, 'bad');
      this.rep(-1.2); this.dayStats.lost++;
      c.rageT = 1.5;
      this.sendOut(c);
      return;
    }
    if (t === 'smoke') { c.char.setProp(null); this.neighbors(c).forEach((o) => { o.sat -= 6; }); return; }
    if (t === 'extend') return;
    c.sat -= 25;
    this.rep(-1);
    if (t === 'crash' || t === 'virus') {
      this.toast(`${c.name}：“什么破机器！退钱！”气呼呼地走了`, 'bad');
      c.remaining = 0;
      this.customerLeave(c);
      return;
    }
    if (t === 'quarrel') {
      const other = n.data && n.data.other;
      this.toast('两个客人越吵越凶，其中一个摔门走了', 'bad');
      if (other && other.need && other.need.type === 'quarrel') other.need = null;
      this.customerLeave(c);
      return;
    }
    this.toast(`${c.name}等不及了，很不满意`, 'bad');
    if (c.sat < 15) { c.remaining = 0; this.customerLeave(c); }
  }

  resolveNeed(c, extraSat = 8) {
    const type = c.need ? c.need.type : null;
    c.clearNeed(true);
    c.sat += extraSat;
    c.served++;
    if (c.opts.onServe) c.opts.onServe(this, type);
    return type;
  }

  comfortRate(c) {
    const u = this.state.up;
    let r = 0.6;
    if (u.lcd || (c.seat && c.seat.type === 'vip')) r += 2;
    if (u.gaming || (c.seat && c.seat.type === 'vip')) r += 1.5;
    r += u.ac ? 2.5 : -1.2;
    if (u.net) r += 1;
    r -= (this.state.price - 3) * 2.5;
    if (this.smokersNear(c)) r -= 4;
    return r;
  }
  crashMul() { return (this.state.up.restore ? 0.45 : 1) * (this.flags.bovenHelper && this.state.day === 3 ? 0.5 : 1); }
  reduceCrash() { /* 第三天由 crashMul 处理 */ }

  neighbors(c) {
    if (!c.seat) return [];
    return this.customers.filter((o) => o !== c && o.seat && Math.hypot(o.seat.x - c.seat.x, o.seat.z - c.seat.z) < 1.6);
  }
  smokersNear(c) { return this.neighbors(c).some((o) => o.need && o.need.type === 'smoke'); }

  startQuarrel(c) {
    const nb = this.neighbors(c).filter((o) => o.seated && !o.need && !o.named);
    if (!nb.length || c.need) return;
    const o = nb[0];
    c.setNeed('quarrel', CFG.patience.quarrel, { other: o });
    o.setNeed('quarrel', CFG.patience.quarrel, { other: c });
    this.audio.play('alert');
  }

  // ---------- 玩家点击 ----------
  onHover(hit) {
    if (!hit) return null;
    if (hit.customer) {
      const c = hit.customer;
      const n = c.need ? NEED_INFO[c.need.type] : null;
      let t = c.name;
      if (c.named) t = `${CAST[c.named].name}`;
      if (n) t += ` · ${n.icon} ${n.text}`;
      else if (c.state === 'playing') t += ` · 剩余 ${c.remaining.toFixed(1)} 小时 · 满意度 ${Math.round(c.sat)}`;
      else if (c.state === 'queue') t += ' · 排队中';
      return t;
    }
    if (hit.seat) {
      const s = hit.seat;
      if (s.customer && s.customer.seated) return this.onHover({ customer: s.customer });
      return `${s.label} · ${s.broken ? '故障' : s.virus ? '中毒' : s.mess ? '有垃圾（点击清理）' : '空闲'}`;
    }
    if (hit.interact) {
      const st = this.state.stock;
      return {
        fridge: `冰柜 · 拿饮料（库存 ${st.drink}）`, shelf: `货架 · 拿泡面（库存 ${st.noodle}）`, headset: `耳机架 · 拿耳机（库存 ${st.headset}）`,
        dispenser: '饮水机 · 给泡面加热水', trash: '垃圾桶 · 扔掉手上的东西', router: this.netDownOn ? '路由器 · 网络故障！点击重启' : '路由器 · 运行正常', counter: '收银台 · 去前台开卡',
      }[hit.interact];
    }
    return null;
  }

  onClick(hit, point) {
    if (this.phase !== 'play' || this.modal > 0) return;
    if (this.player.action) return;
    const pl = this.player;
    if (hit && hit.customer) return this.clickCustomer(hit.customer);
    if (hit && hit.seat) return this.clickSeat(hit.seat);
    if (hit && hit.interact) return this.clickInteract(hit.interact);
    if (point) {
      pl.goTo(point.x, point.z);
      this.showMarker(point.x, point.z);
    }
  }

  showMarker(x, z) { this.marker.position.set(x, 0.02, z); this.marker.material.opacity = 0.9; this.marker.scale.setScalar(1); }

  walkThen(pt, fn) {
    this.showMarker(pt.x, pt.z);
    this.player.goTo(pt.x, pt.z, fn);
  }

  clickCustomer(c) {
    if (c.need && c.need.type === 'thief') {
      return this.walkThen({ x: c.x, z: c.z }, () => {
        if (c.need && c.need.type === 'thief' && Math.hypot(c.x - this.player.x, c.z - this.player.z) < 1.6) {
          c.need = null; c.stop();
          this.say([['me', '站住！兜里是啥？'], ['sys', '对方脸一红，乖乖交出了鼠标，灰溜溜地走了。'], { do: (g) => { g.rep(2); g.sendOut(c); } }]);
        } else if (c.need && c.need.type === 'thief') this.clickCustomer(c);
      });
    }
    if (c.state === 'queue' || (c.state === 'walkin')) return this.goCheckinFront();
    if (c.state === 'visit' && c.need && c.need.type === 'talk') {
      return this.walkThen({ x: 7.6, z: 4.6 }, async () => {
        this.player.faceTo(c.x, c.z);
        c.need = null;
        await this.say(c.opts.onTalk || []);
        if (!c.opts.stay) this.sendOut(c);
      });
    }
    if (c.seat) return this.clickSeat(c.seat);
  }

  goCheckinFront() {
    this.walkThen(P.staff, () => {
      this.player.rot = 0;
      const front = this.queue[0];
      if (front && front.need && front.need.type === 'checkin') {
        this.player.doAction(0.45, 'counter', () => this.doCheckin(front), { x: P.staff.x, z: P.staff.z + 2 });
      }
    });
  }

  clickSeat(s) {
    const c = s.customer && s.customer.seated ? s.customer : null;
    const pl = this.player;
    if (c && c.need) {
      const t = c.need.type;
      if (['noodle', 'drink', 'headset'].includes(t)) {
        const want = t === 'noodle' ? 'noodle' : t;
        if (!pl.hand.includes(want)) {
          if (t === 'noodle' && pl.hand.includes('noodle_dry')) return this.toast('泡面还没加热水呢！先去饮水机。', 'warn');
          return this.toast({ noodle: '先去货架拿泡面，再到饮水机加热水', drink: '先去冰柜拿饮料', headset: '先去耳机架拿耳机' }[t], 'warn');
        }
        return this.walkThen(s.service, () => {
          if (!c.need || c.need.type !== t) return;
          pl.doAction(0.5, 'work', () => {
            pl.hand.splice(pl.hand.indexOf(want), 1);
            this.resolveNeed(c, 10);
            if (t === 'headset') { this.audio.play('ok'); this.toast('换好耳机了'); }
            else {
              this.money(CFG.price[t], 'goods', t === 'noodle' ? '泡面' : '饮料', { x: s.x, z: s.z });
              c.eatT = 0.6; c.eatKind = t; c.char.setProp(t);
              this.audio.play('cash');
            }
          }, s.desk);
        });
      }
      if (t === 'crash' || t === 'virus') {
        return this.walkThen(s.service, () => {
          pl.faceTo(s.desk.x, s.desk.z);
          this.repairSeat(s, c, t);
        });
      }
      if (t === 'smoke') {
        return this.walkThen(s.service, async () => {
          pl.faceTo(s.desk.x, s.desk.z);
          if (!c.need || c.need.type !== 'smoke') return;
          const ok = R() < 0.7;
          c.clearNeed(true);
          c.sat -= ok ? 4 : 14;
          this.toast(ok ? `${c.name}：“好好好，掐了掐了。”` : `${c.name}：“抽根烟都管？什么破店！”（不满）`, ok ? 'ok' : 'warn');
        });
      }
      if (t === 'quarrel') {
        return this.walkThen(s.service, () => { pl.faceTo(s.desk.x, s.desk.z); this.mediate(c); });
      }
      if (t === 'extend') {
        return this.walkThen(s.service, () => {
          if (!c.need || c.need.type !== 'extend') return;
          pl.doAction(0.4, 'work', () => {
            const h = 1 + Math.floor(R() * 2);
            c.remaining += h; c.clearNeed(true);
            const price = s.type === 'vip' ? this.state.vipPrice : this.state.price;
            this.money(h * price, 'net', '续费', { x: s.x, z: s.z });
            this.audio.play('cash');
            this.toast(`${c.name}续了${h}小时`);
          }, s.desk);
        });
      }
      if (t === 'talk') {
        return this.walkThen(s.service, async () => { c.need = null; await this.say(c.opts.onTalk || []); });
      }
    }
    if (!c && (s.broken || s.virus)) {
      return this.walkThen(s.service, () => { pl.faceTo(s.desk.x, s.desk.z); this.repairSeat(s, null, s.virus ? 'virus' : 'broken'); });
    }
    if (!c && s.mess) {
      return this.walkThen(s.service, () => {
        pl.doAction(1.3, 'work', () => { this.cafe.setMess(s, false); this.audio.play('clean'); }, s.desk);
      });
    }
    if (this.netDownOn && c) return this.toast('网络断了！去柜台重启路由器', 'warn');
    this.walkThen(s.service);
  }

  async repairSeat(s, c, type) {
    if (type === 'broken' && s.smashed) {
      const ok = await this.say([['sys', `${s.label}的显示器被砸坏了，换一台二手显示器要150元。`], { choice: [{ t: '换（-150元）', do: () => { this.money(-150, 'exp', '更换显示器'); s.smashed = false; s.broken = false; this.cafe.applySeatScreen(s); } }, { t: '先不换' }] }]);
      return;
    }
    this.modal++;
    let ok;
    try {
      ok = type === 'virus' ? await this.ui.virusGame(this) : await this.ui.repairGame(this, s);
    } finally { this.modal--; }
    if (ok) {
      s.broken = false; s.virus = false;
      if (c && c.need) this.resolveNeed(c, 6);
      this.cafe.applySeatScreen(s);
      this.audio.play('ok');
      this.toast(`${s.label} 修好了！`, 'ok');
    } else if (c && c.need) {
      c.need.t -= 0.25;
      c.sat -= 6;
    }
  }

  async mediate(c) {
    const other = c.need && c.need.data && c.need.data.other;
    if (!c.need || c.need.type !== 'quarrel') return;
    const both = () => { [c, other].forEach((x) => { if (x && x.need && x.need.type === 'quarrel') x.clearNeed(true); }); };
    await this.say([
      ['sys', `${c.name}和${other ? other.name : '邻座'}因为“谁偷听谁耳机声音”吵了起来。`],
      { choice: [
        { t: '“都消消气，一人送瓶饮料。”（消耗2瓶饮料）', do: (g) => {
          if (g.state.stock.drink >= 2) { g.state.stock.drink -= 2; both(); [c, other].forEach((x) => x && (x.sat += 6)); g.toast('两人碰了碰可乐罐，和好了', 'ok'); }
          else { g.toast('饮料不够了……', 'warn'); }
        } },
        { t: '“再吵就都出去！”', do: (g) => {
          if (R() < 0.6) { both(); [c, other].forEach((x) => x && (x.sat -= 5)); g.toast('两人悻悻地坐下了'); }
          else { both(); g.toast(`${c.name}：“走就走！”`, 'bad'); c.remaining = 0; g.customerLeave(c); g.rep(-1); }
        } },
        { t: '“我给你换个位置。”', do: (g) => {
          const free = g.cafe.seats.find((s) => s.owned && !s.customer && !s.broken && !s.virus && Math.hypot(s.x - c.seat.x, s.z - c.seat.z) > 3);
          both();
          if (free) {
            const old = c.seat; old.customer = null; g.cafe.applySeatScreen(old);
            c.seat = free; free.customer = c; c.state = 'toSeat'; c.sat += 3;
            c.goTo(free.approach.x, free.approach.z, () => { c.sitAt(free); c.state = 'playing'; g.cafe.applySeatScreen(free); });
            g.toast('换了个位置，世界清静了', 'ok');
          } else g.toast('没空位可换，两人只好继续互相瞪眼', 'warn');
        } },
      ] },
    ]);
  }

  clickInteract(k) {
    const pl = this.player, st = this.state.stock;
    const take = (item, stockKey, label) => {
      if (pl.hand.length >= pl.cap) return this.toast(pl.cap > 1 ? '托盘装满了' : '手里拿不下了（夜间可以买托盘）', 'warn');
      if (st[stockKey] <= 0) return this.toast(`${label}卖完了！夜间记得进货`, 'bad');
      st[stockKey]--; pl.hand.push(item);
      this.audio.play('pick');
    };
    if (k === 'fridge') return this.walkThen(P.fridge, () => pl.doAction(0.35, 'work', () => take('drink', 'drink', '饮料'), { x: 9.6, z: 0.95 }));
    if (k === 'shelf') return this.walkThen(P.shelf, () => pl.doAction(0.35, 'work', () => take('noodle_dry', 'noodle', '泡面'), { x: 6.4, z: 0.4 }));
    if (k === 'headset') return this.walkThen(P.headset, () => pl.doAction(0.35, 'work', () => take('headset', 'headset', '耳机'), { x: 5.0, z: 0.3 }));
    if (k === 'dispenser') return this.walkThen(P.dispenser, () => {
      if (!pl.hand.includes('noodle_dry')) return this.toast('手上没有要泡的面', 'warn');
      this.audio.play('water');
      pl.doAction(1.0, 'work', () => { pl.hand = pl.hand.map((h) => (h === 'noodle_dry' ? 'noodle' : h)); this.toast('泡面加好热水了，趁热送过去！'); }, { x: 9.7, z: 1.95 });
    });
    if (k === 'trash') return this.walkThen(P.trash, () => { if (pl.hand.length) { pl.hand = []; this.toast('扔掉了手上的东西'); } });
    if (k === 'router') return this.walkThen(P.router, () => {
      if (!this.netDownOn) return this.toast('路由器运行正常，灯一闪一闪的');
      pl.doAction(2.2, 'work', () => this.fixNet(), { x: 8.05, z: 2.5 });
    });
    if (k === 'counter') return this.goCheckinFront();
  }

  // ---------- 键盘直接移动 ----------
  keyMove(dx, dz, rdt) {
    if (this.phase !== 'play' || this.modal > 0 || this.player.action) return;
    const pl = this.player;
    const sp = pl.speed * rdt * this.speed;
    const nx = pl.x + dx * sp, nz = pl.z + dz * sp;
    pl.path = null;
    if (this.cafe.nav.free(nx, pl.z)) pl.x = nx;
    if (this.cafe.nav.free(pl.x, nz)) pl.z = nz;
    pl.rot = Math.atan2(dx, dz);
    pl.char.walkPhase += sp * 5.2;
    pl.keyWalking = true;
  }

  // ---------- 特殊事件 ----------
  netDown() {
    if (this.netDownOn) return;
    this.netDownOn = true;
    this.audio.play('alert');
    this.toast('全场掉线！“网管！！网又卡了！！”——去柜台重启路由器', 'bad');
    for (const c of this.customers) if (c.seated && !c.need) c.lagShow = true;
  }
  fixNet() {
    this.netDownOn = false;
    for (const c of this.customers) c.lagShow = false;
    this.audio.play('ok');
    this.toast('路由器重启完毕，网络恢复', 'ok');
  }

  infect(n) {
    const cands = this.cafe.seats.filter((s) => s.customer && s.customer.seated && !s.customer.need);
    const extra = this.cafe.seats.filter((s) => s.owned && !s.customer);
    let count = 0;
    for (const s of cands.sort(() => R() - 0.5).slice(0, n)) {
      s.virus = true; s.customer.setNeed('virus'); this.cafe.applySeatScreen(s); count++;
    }
    for (const s of extra.sort(() => R() - 0.5).slice(0, Math.max(0, n - count))) { s.virus = true; this.cafe.applySeatScreen(s); count++; }
    this.audio.play('alert');
    return count;
  }
  cureAll() {
    for (const s of this.cafe.seats) {
      if (s.virus) {
        s.virus = false;
        if (s.customer && s.customer.need && s.customer.need.type === 'virus') this.resolveNeed(s.customer, 5);
        this.cafe.applySeatScreen(s);
      }
    }
  }
  breakPCs(n) {
    const owned = this.cafe.seats.filter((s) => s.owned && s.type !== 'vip').sort(() => R() - 0.5).slice(0, n);
    for (const s of owned) {
      s.broken = true; s.smashed = true;
      if (s.customer) { const c = s.customer; if (c.need) c.clearNeed(false); c.remaining = 0; c.rageT = 2; this.customerLeave(c, true); }
      this.cafe.applySeatScreen(s);
    }
    this.audio.play('smash');
  }

  async inspection() {
    const v = this.spawnVisitor('likezhang', { stay: true });
    v.need = null;
    v.opts.onTalk = null;
    this.toast('文化局检查组来了！', 'warn');
    v.goTo(P.doorOut.x, P.doorOut.z, () => {
      v.goTo(-3.5, 0.6, async () => {
        v.state = 'visit';
        await this.ui.wait(800);
        const minors = this.customers.filter((c) => c.minor && c.seated).length;
        const smokers = this.customers.filter((c) => c.need && c.need.type === 'smoke').length;
        const ext = !!this.state.up.extinguisher;
        let fine = minors * 500 + smokers * 200 + (ext ? 0 : 300);
        const lines = [['likezhang', '县文化局，例行检查。把营业执照和上网登记本拿出来。'], ['sys', '李科长背着手，在机器间转了一圈。']];
        if (minors) lines.push(['likezhang', `这几个孩子多大了？身份证呢？……${minors}个未成年人！你们胆子不小啊！`]);
        if (smokers) lines.push(['likezhang', '室内吸烟，墙上“禁止吸烟”贴着是摆设？']);
        if (!ext) lines.push(['likezhang', '灭火器呢？连个灭火器都没有？出了事谁负责？']);
        if (fine === 0) {
          lines.push(['likezhang', '嗯……登记规范，没有未成年人，消防也到位。不错。'], ['likezhang', '这块“文明网吧”的牌子，挂上吧。'], ['sys', '获得“文明网吧”称号！口碑+10，客流+10%。'], { do: (g) => { g.rep(10); g.flag('plaque', true); } });
        } else {
          lines.push(['likezhang', `罚款${fine}元，限期整改！`], { do: (g) => { g.money(-fine, 'exp', '文化局罚款'); g.rep(-6 - minors * 3); g.flag('fined', true); } });
          if (minors) lines.push({ do: (g) => { g.customers.filter((c) => c.minor && c.seated).forEach((c) => g.customerLeave(c, true)); } });
        }
        await this.say(lines);
        this.sendOut(v);
      });
    });
  }

  async tournament() {
    // 腾出5台机器给战队
    const free = this.cafe.seats.filter((s) => s.owned && !s.customer && !s.broken && !s.virus && s.type !== 'vip').slice(0, 5);
    const team = [];
    const names = [this.findNamed('laowang') ? null : 'laowang', null, null, null, null];
    free.forEach((s, i) => {
      const c = new Customer(this, names[i] ? { named: 'laowang', name: '老王', look: castLook('laowang'), program: 'cs0', paid: false, hours: 3 } : { program: 'cs' + (i % 3), paid: false, hours: 3 });
      c.setPos(s.approach.x, s.approach.z);
      c.seat = s; s.customer = c; c.sitAt(s); c.state = 'playing'; c.remaining = 2.5; c.tourney = true;
      this.customers.push(c); team.push(c);
      this.cafe.applySeatScreen(s);
    });
    const u = this.state.up;
    let p = 0.42 + (u.lcd ? 0.07 : 0) + (u.net ? 0.08 : 0) + (u.gaming ? 0.04 : 0) + (this.flags.laowangLoyal ? 0.08 : 0) + (this.state.aff.laowang >= 3 ? 0.04 : 0);
    if (free.length < 5) p -= 0.08;
    this.modal++;
    const result = await this.ui.tournament(this, p);
    this.modal--;
    const bet = this.flags.bet || 0;
    if (result.win) {
      team.forEach((c) => (c.cheerT = 6));
      this.audio.play('cheer');
      await this.say([
        ['sys', `最终比分 ${result.score}！极速战队赢了！！`],
        ['laowang', '哈哈哈哈！钱胖子！看见没有！这叫情怀！'],
        ['qianzong', '……（对面传来摔键盘的声音）'],
        { do: (g) => { g.flag('tournamentWon', true); g.rep(14); if (bet) g.money(bet, 'other', '战队赛赌注'); g.money(300, 'other', '比赛观众消费'); } },
        ['sys', bet ? `赢得赌注${bet}元！对面的客人们纷纷跑过来看热闹。` : '对面的客人们纷纷跑过来看热闹。'],
      ]);
    } else {
      team.forEach((c) => (c.rageT = 3));
      await this.say([
        ['sys', `最终比分 ${result.score}……极速战队惜败。`],
        ['laowang', '……妈的，手生了。小川，对不住。'],
        { do: (g) => { g.rep(-4); if (bet) g.money(-bet, 'exp', '战队赛赌注'); g.money(150, 'other', '比赛观众消费'); } },
      ]);
    }
  }

  async blackout() {
    this.blackoutOn = true;
    this.audio.play('powerdown');
    this.cafe.lamps.forEach((l) => (l.userData.i = l.intensity, l.intensity = 0));
    for (const s of this.cafe.seats) if (s.screen) s.screen.material = this.screens.material('off');
    this.engine.setBloom(0.2);
    await this.say([
      ['sys', '“啪”——整条街一片漆黑。停电了！'],
      ['sys', '黑暗中响起一片哀嚎：“我的装备！！”“我还没存档！！”'],
      ['me', '供电局说要修一个多小时……怎么办？'],
      { choice: [
        { t: '找隔壁小卖部老孙租发电机（-400元，很快恢复）', do: (g) => { g.money(-400, 'exp', '租发电机'); g.blackoutUntil = g.hour + 0.25; g.toast('发电机轰隆隆地响了起来……'); } },
        { t: '点上蜡烛，给每人泡一桶面，陪大家聊天（消耗泡面）', do: (g) => {
          const n = g.customers.filter((c) => c.seated).length;
          g.state.stock.noodle = Math.max(0, g.state.stock.noodle - n);
          g.customers.forEach((c) => { if (c.seated) { c.sat += 15; c.eatT = 1.2; c.eatKind = 'noodle'; c.char.setProp('noodle'); } });
          g.rep(6); g.blackoutUntil = g.hour + 1.0; g.flag('candle', true);
          g.toast('烛光里，老王讲起了当年在厂里的故事……');
        } },
        { t: '宣布提前打烊，退还剩余网费', do: (g) => {
          let refund = 0;
          g.customers.forEach((c) => { if (c.seated) refund += Math.max(0, Math.round(c.remaining)) * g.state.price; });
          g.money(-refund, 'exp', '停电退费'); g.rep(-2);
          g.blackoutUntil = g.hour + 0.05; g.hour = Math.max(g.hour, 23.95); g.flag('closedEarly', true);
        } },
      ] },
    ]);
  }
  endBlackout() {
    this.blackoutOn = false; this.blackoutUntil = 0;
    this.cafe.lamps.forEach((l) => (l.intensity = l.userData.i || 7));
    this.engine.setBloom();
    for (const s of this.cafe.seats) this.cafe.applySeatScreen(s);
    this.audio.play('powerup');
    this.toast('来电了！全场欢呼！', 'ok');
  }

  later(h, fn) { this.events.push({ at: this.hour + h, do: fn, fired: false }); }

  setRival(v) { this.state.rival = v; this.cafe.rivalGroup.visible = v; }

  // ---------- 通用 ----------
  money(d, cat, label, at) {
    d = Math.round(d);
    this.state.money += d;
    if (this.dayStats) {
      if (d > 0 && this.dayStats.income[cat] !== undefined) this.dayStats.income[cat] += d;
      else if (d < 0) this.dayStats.expense.push([label, -d]);
      else if (d > 0) this.dayStats.income.other += d;
    }
    if (at) this.ui.floatText(new THREE.Vector3(at.x, 2.0, at.z), (d > 0 ? '+¥' : '-¥') + Math.abs(d), d > 0 ? '#ffd84a' : '#ff6a6a');
    else if (Math.abs(d) >= 50) this.toast(`${label} ${d > 0 ? '+' : '-'}¥${Math.abs(d)}`, d > 0 ? 'ok' : 'bad');
  }
  rep(d, silent) {
    this.state.rep = clamp(this.state.rep + d, 0, 100);
    if (!silent && Math.abs(d) >= 2) this.toast(`口碑 ${d > 0 ? '+' : ''}${Math.round(d)}`, d > 0 ? 'ok' : 'bad');
  }
  flag(k, v) { this.state.flags[k] = v; }
  aff(k, d) { this.state.aff[k] = (this.state.aff[k] || 0) + d; }
  toast(t, type) { this.ui.toast(t, type); }
  hint(t) { this.ui.hint(t); }
  sayLater(lines) { this.sayQueue.push(lines); }

  fmt(text) {
    const gap = Math.max(0, TARGET - this.state.money);
    return text.replace('{net}', this.dayStats ? (this.dayStats.netTotal ?? Math.round(this.dayStats.income.net + this.dayStats.income.goods + this.dayStats.income.other)) : 0)
      .replace('{left}', String(10 - this.state.day)).replace('{gap}', String(gap)).replace('{gapNow}', String(gap));
  }

  async say(lines) {
    if (!lines || !lines.length) return;
    this.modal++;
    try { await this.runLines(lines); } finally { this.modal--; this.ui.closeDialog(); }
  }
  async runLines(lines) {
    for (const ln of lines) {
      if (!ln) continue;
      if (Array.isArray(ln)) {
        const [who, text] = ln;
        await this.ui.line(who, CAST[who] || CAST.sys, this.fmt(text));
      } else if (ln.choice) {
        const opts = ln.choice;
        const idx = await this.ui.choice(opts.map((o) => o.t));
        const o = opts[idx];
        this.audio.play('click');
        if (o.do) await o.do(this);
        if (o.then) await this.runLines(o.then);
      } else if (ln.if !== undefined && ln.then) {
        const cond = typeof ln.if === 'function' ? ln.if(this) : !!ln.if;
        if (cond) await this.runLines(ln.then);
        else if (ln.else) await this.runLines(ln.else);
      } else if (ln.do) {
        await ln.do(this);
      }
    }
  }

  // 头顶气泡数据
  bubbles() {
    const out = [];
    for (const c of this.customers) {
      let icon = null, ratio = 1, cls = '';
      if (c.need) {
        icon = NEED_INFO[c.need.type].icon;
        ratio = c.need.max > 50 ? 1 : clamp(c.need.t / c.need.max, 0, 1);
        cls = c.need.type === 'talk' ? 'talk' : c.need.type === 'extend' ? 'good' : '';
        if (c.need.type === 'checkin' && c.looksYoung && this.state.up.idscan && c.minor) icon = '🔞';
        if (c.need.type === 'checkin' && c.looksYoung && !this.state.up.idscan) icon = '❓';
      } else if (this.netDownOn && c.seated) { icon = '📶'; ratio = 1; cls = 'bad'; }
      else if (c.named && c.state !== 'leaving') { icon = null; }
      const label = c.named ? CAST[c.named].name : null;
      if (!icon && !label) continue;
      const h = c.seatedOn ? 1.55 : 2.05;
      out.push({ id: c.id, pos: new THREE.Vector3(c.x, h * c.look.height, c.z), icon, ratio, cls, label });
    }
    return out;
  }

  needsList() {
    return this.customers.filter((c) => c.need && c.need.type !== 'talk' || (c.need && c.need.type === 'talk')).map((c) => ({
      c, type: c.need.type, info: NEED_INFO[c.need.type], ratio: c.need.max > 50 ? 1 : c.need.t / c.need.max,
      where: c.seat ? c.seat.label : (c.state === 'queue' ? '前台' : '门口'), name: c.named ? CAST[c.named].name : c.name,
    })).sort((a, b) => a.ratio - b.ratio);
  }
}

export { TARGET };
