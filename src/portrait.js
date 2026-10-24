// 用 3D 人物模型实时渲染对话头像
import * as THREE from 'three';
import { Character, randomLook } from './people.js';

export class Portraits {
  constructor() {
    this.cache = new Map();
    this.size = 256;
    this.renderer = null;
  }

  init() {
    if (this.renderer) return;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    this.renderer.setSize(this.size, this.size);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.4));
    const key = new THREE.DirectionalLight(0xfff2e0, 2.2); key.position.set(1, 1.5, 2); this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x66aaff, 1.6); rim.position.set(-2, 1, -1.5); this.scene.add(rim);
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.05, 10);
  }

  get(key, look) {
    if (this.cache.has(key)) return this.cache.get(key);
    this.init();
    const L = { ...randomLook(Math.random), glasses: false, cap: false, backpack: false, ...look };
    const ch = new Character(L);
    ch.anim = 'idle';
    ch.t = 0.5;
    for (let i = 0; i < 30; i++) ch.update(0.05);
    ch.head.rotation.y = 0.25;
    this.scene.add(ch.root);
    ch.root.rotation.y = -0.2;
    ch.root.updateMatrixWorld(true);
    const head = new THREE.Vector3();
    ch.head.getWorldPosition(head);
    head.y += 0.07 * L.height;
    this.camera.position.set(head.x + 0.2, head.y + 0.03, head.z + 0.9);
    this.camera.lookAt(head.x, head.y - 0.06, head.z);
    this.renderer.render(this.scene, this.camera);
    const url = this.renderer.domElement.toDataURL('image/png');
    this.scene.remove(ch.root);
    this.cache.set(key, url);
    return url;
  }
}
