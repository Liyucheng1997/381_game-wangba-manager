// 入口：渲染引擎、输入、主循环、标题画面
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Game } from './game.js';
import { UI } from './ui.js';
import { Sound } from './audio.js';
import './style.css';

class Engine {
  constructor(container) {
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    r.setSize(window.innerWidth, window.innerHeight);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 0.95;
    r.outputColorSpace = THREE.SRGBColorSpace;
    container.prepend(r.domElement);
    this.renderer = r;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a1022);
    this.scene.fog = new THREE.Fog(0x0a1022, 30, 60);
    this.camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.1, 120);
    this.camera.position.set(4, 15, 17);
    const c = new OrbitControls(this.camera, r.domElement);
    c.target.set(0, 0.5, 0);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.enablePan = false;
    c.minDistance = 5; c.maxDistance = 30;
    c.minPolarAngle = 0.25; c.maxPolarAngle = 1.2;
    c.mouseButtons = { LEFT: null, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
    c.rotateSpeed = 0.6;
    this.controls = c;
    this.composer = new EffectComposer(r);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.45, 0.35, 0.92);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.raycaster = new THREE.Raycaster();
    this.follow = null;
    this.overview = false;
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h); this.composer.setSize(w, h);
  }
  setBloom(s = 0.45) { this.bloom.strength = s; }
  setOverview(v) { this.overview = v; }
  project(p) {
    const v = new THREE.Vector3(p.x, p.y, p.z).project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * window.innerWidth, y: (-v.y * 0.5 + 0.5) * window.innerHeight, visible: v.z < 1 && v.z > -1 };
  }
  raycast(cx, cy, objects) {
    const ndc = new THREE.Vector2((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    return this.raycaster.intersectObjects(objects, true);
  }
  update(dt) {
    const c = this.controls;
    let tgt = null;
    if (this.overview) tgt = new THREE.Vector3(-2.5, 0.5, 0.5);
    else if (this.follow) tgt = new THREE.Vector3(this.follow.x * 0.75, 0.6, this.follow.z * 0.75 + 0.5);
    if (tgt) {
      const d = tgt.sub(c.target).multiplyScalar(Math.min(1, dt * 2.5));
      c.target.add(d); this.camera.position.add(d);
    }
    if (this.overview) {
      // 夜间经营：拉远到俯瞰全店
      const want = c.target.clone().add(new THREE.Vector3(3, 17, 15));
      this.camera.position.lerp(want, Math.min(1, dt * 1.5));
    }
    c.update();
    this.composer.render();
  }
}

// ---------- 启动 ----------
const app = document.getElementById('app');
const engine = new Engine(app);
const ui = new UI();
const audio = new Sound();
ui.engine = engine;
ui.audio = audio;
const game = new Game(engine, ui, audio);
window.__game = game;
// 调试：手动推进若干帧（后台标签页 rAF 被节流时使用）
window.__step = (n = 1, dt = 0.05) => {
  for (let i = 0; i < n; i++) { game.update(dt); game.cafe.updateCutaway(engine.camera.position); engine.update(dt); ui.frame(game, dt); }
};

// 输入
let mouse = { x: 0, y: 0, down: null };
function pickAt(x, y) {
  const objs = [...game.cafe.pickables, ...game.customers.map((c) => c.char.root)];
  const hits = engine.raycast(x, y, objs);
  if (!hits.length) return { hit: null, point: null };
  let point = null, seat = null, interact = null, customer = null;
  for (const h of hits) {
    const o = h.object;
    if (!customer && o.userData.char) {
      const c = game.customers.find((cc) => cc.char === o.userData.char);
      if (c) customer = c;
    }
    if (!seat && o.userData.seatHit) seat = game.cafe.seatById[o.userData.seatHit];
    if (!interact && o.userData.interact) interact = o.userData.interact;
    if (!point && o.userData.floor) point = h.point;
  }
  if (!point) {
    // 退而求其次：与地面平面求交
    const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const p = new THREE.Vector3();
    if (engine.raycaster.ray.intersectPlane(pl, p)) point = p;
  }
  let hit = null;
  if (customer) hit = { customer };
  else if (interact && !seat) hit = { interact };
  else if (seat) hit = { seat };
  else if (interact) hit = { interact };
  return { hit, point };
}

const canvas = engine.renderer.domElement;
canvas.addEventListener('pointerdown', (e) => { mouse.down = { x: e.clientX, y: e.clientY, b: e.button }; });
canvas.addEventListener('pointerup', (e) => {
  const d = mouse.down; mouse.down = null;
  if (!d || d.b !== 0) return;
  if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) return;
  const { hit, point } = pickAt(e.clientX, e.clientY);
  game.onClick(hit, point);
});
canvas.addEventListener('pointermove', (e) => {
  mouse.x = e.clientX; mouse.y = e.clientY;
  mouse.moved = true;
});
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
  if (game.phase !== 'play') return;
  if (e.code === 'Digit1' && !ui.dialog.classList.contains('show')) game.speed = 1;
  if (e.code === 'Digit2' && !ui.dialog.classList.contains('show')) game.speed = 2;
  if (e.code === 'Digit3' && !ui.dialog.classList.contains('show')) game.speed = 3;
  if (e.code === 'KeyP') togglePause();
  if (e.code === 'KeyE' && game.modal === 0) game.goCheckinFront();
});
window.addEventListener('keyup', (e) => { keys[e.code] = false; });

let pausedSpeed = 1;
function togglePause() {
  if (game.speed > 0) { pausedSpeed = game.speed; game.speed = 0; } else game.speed = pausedSpeed || 1;
  document.getElementById('pause-mask').classList.toggle('show', game.speed === 0);
}
document.querySelectorAll('#speed button').forEach((b) => (b.onclick = () => {
  const s = +b.dataset.s;
  if (s === 0) return togglePause();
  game.speed = s;
  document.getElementById('pause-mask').classList.remove('show');
}));
document.getElementById('pause-mask').onclick = togglePause;
document.getElementById('btn-mute').onclick = (e) => { audio.setMuted(!audio.muted); e.currentTarget.textContent = audio.muted ? '🔇' : '🔊'; };

// 标题画面
const title = document.getElementById('title-screen');
const btnNew = document.getElementById('btn-new');
const btnCont = document.getElementById('btn-continue');
if (Game.hasSave()) btnCont.style.display = '';
engine.controls.autoRotate = true;
engine.controls.autoRotateSpeed = 0.35;
function begin(load) {
  audio.init();
  title.classList.add('hide');
  engine.controls.autoRotate = false;
  if (load && game.load()) { /* 读档 */ } else game.newState();
  engine.follow = game.player;
  setTimeout(() => { title.style.display = 'none'; }, 900);
  game.startDay();
}
btnNew.onclick = () => begin(false);
btnCont.onclick = () => begin(true);
document.getElementById('btn-help').onclick = () => document.getElementById('help').classList.toggle('show');
document.getElementById('help').onclick = (e) => { if (e.target.id === 'help' || e.target.classList.contains('close')) document.getElementById('help').classList.remove('show'); };
document.getElementById('btn-help2').onclick = () => document.getElementById('help').classList.add('show');

// 主循环
const clock = new THREE.Clock();
let hoverAcc = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  // WASD（相对相机方向）
  let mx = 0, mz = 0;
  if (keys.KeyW || keys.ArrowUp) mz -= 1;
  if (keys.KeyS || keys.ArrowDown) mz += 1;
  if (keys.KeyA || keys.ArrowLeft) mx -= 1;
  if (keys.KeyD || keys.ArrowRight) mx += 1;
  if ((mx || mz) && game.phase === 'play') {
    const fwd = new THREE.Vector3(); engine.camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0));
    const v = fwd.multiplyScalar(-mz).add(right.multiplyScalar(mx)).normalize();
    game.keyMove(v.x, v.z, dt);
  }
  game.update(dt);
  audio.busy = game.phase === 'play' && game.modal === 0 ? game.customers.filter((c) => c.seated).length : 0;
  game.cafe.updateCutaway(engine.camera.position);
  engine.update(dt);
  ui.frame(game, dt);
  hoverAcc += dt;
  if (hoverAcc > 0.08 && mouse.moved) {
    hoverAcc = 0; mouse.moved = false;
    if (game.phase === 'play' && game.modal === 0) {
      const { hit } = pickAt(mouse.x, mouse.y);
      const t = game.onHover(hit);
      ui.showTooltip(t, mouse.x, mouse.y);
      canvas.style.cursor = hit ? 'pointer' : 'default';
    } else ui.showTooltip(null);
  }
}
loop();
