// Tabuleiro 3D (Three.js): madeira, linhas, pontos, iluminação, câmera e seleção por clique.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { PTS, EDGES, N } from './rules.js';

export const S = 1.4; // distância entre pontos
// x,y do tabuleiro -> mundo (triângulo fica no fundo, -Z)
export const pointVec = (i) => new THREE.Vector3((PTS[i].x - 2) * S, 0, -(PTS[i].y - 3) * S);

export function woodTexture(base = '#a8733f') {
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 170; i++) {
    const y = Math.random() * 512, a = 0.04 + Math.random() * 0.16;
    g.strokeStyle = `rgba(${50 + Math.random() * 30},${25 + Math.random() * 15},8,${a})`;
    g.lineWidth = 0.5 + Math.random() * 2.2;
    g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 64) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 4 + (Math.random() - 0.5) * 2);
    g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Board {
  constructor(el) {
    this.el = el; this.updaters = []; this.rings = []; this.pickGroups = () => []; this.pickCb = () => {};
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    el.appendChild(r.domElement);

    const sc = (this.scene = new THREE.Scene());
    sc.background = new THREE.Color(0x0d2216);
    sc.fog = new THREE.Fog(0x0d2216, 28, 60);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 120);

    sc.add(new THREE.HemisphereLight(0xcfe8ff, 0x3b2a1a, 0.75));
    const sun = (this.sun = new THREE.DirectionalLight(0xfff0d0, 1.5));
    sun.position.set(6, 13, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    sun.shadow.bias = -0.0004;
    sc.add(sun);
    const warm = new THREE.PointLight(0xffb060, 0.6, 30); warm.position.set(-6, 5, 4); sc.add(warm);

    this.build();

    const ctl = (this.controls = new OrbitControls(this.camera, r.domElement));
    ctl.enableDamping = true; ctl.enablePan = false;
    ctl.minDistance = 6; ctl.maxDistance = 42; ctl.maxPolarAngle = 1.45;

    // clique (ignora arrastos da câmera)
    let down = null;
    r.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    r.domElement.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y), dt = performance.now() - down.t;
      down = null;
      if (moved < 7 && dt < 600) this.pick(e);
    });

    this.ray = new THREE.Raycaster();
    new ResizeObserver(() => this.resize()).observe(el);
    this.clock = new THREE.Clock();
    this.resize(); this.resetCamera();
    r.setAnimationLoop(() => this.frame());
  }

  build() {
    const tex = woodTexture();
    const wood = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.65, metalness: 0.02 });
    const m = 0.45, sx = (v) => (v - 2) * S, sy = (v) => (v - 3) * S;
    const poly = [[-m, -m], [4 + m, -m], [4 + m, 4 + m], [3.0, 4 + m], [5.0, 6 + m], [-1.0, 6 + m], [1.0, 4 + m], [-m, 4 + m]];
    const shape = new THREE.Shape();
    poly.forEach(([x, y], i) => (i ? shape.lineTo(sx(x), sy(y)) : shape.moveTo(sx(x), sy(y))));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.35, bevelEnabled: true, bevelSize: 0.09, bevelThickness: 0.09, bevelSegments: 4 });
    // textura em escala de mundo
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.22, uv.getY(i) * 0.22);
    const slab = new THREE.Mesh(geo, wood);
    slab.rotation.x = -Math.PI / 2; slab.position.y = -0.44;
    slab.castShadow = slab.receiveShadow = true;
    this.scene.add(slab);

    // mesa
    const tt = woodTexture('#4a3220'); tt.repeat.set(10, 10);
    const table = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ map: tt, roughness: 0.9 }));
    table.rotation.x = -Math.PI / 2; table.position.y = -0.46; table.receiveShadow = true;
    this.scene.add(table);

    // linhas gravadas
    const lineMat = new THREE.MeshStandardMaterial({ color: 0x2a170a, roughness: 0.9 });
    for (const [a, b] of EDGES) {
      const A = pointVec(a), B = pointVec(b), d = B.clone().sub(A), L = d.length();
      const bar = new THREE.Mesh(new THREE.BoxGeometry(L, 0.02, 0.05), lineMat);
      bar.position.copy(A).add(B).multiplyScalar(0.5); bar.position.y = 0.012;
      bar.rotation.y = Math.atan2(-d.z, d.x);
      this.scene.add(bar);
    }
    // pontos (encaixes) + alvos de clique invisíveis
    const pm = new THREE.MeshStandardMaterial({ color: 0x1b0e05, roughness: 0.8 });
    const rimM = new THREE.MeshStandardMaterial({ color: 0xc9964f, roughness: 0.5 });
    this.hits = [];
    for (let i = 0; i < N; i++) {
      const p = pointVec(i);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.03, 20), rimM);
      rim.position.set(p.x, 0.012, p.z); this.scene.add(rim);
      const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.05, 20), pm);
      dot.position.set(p.x, 0.016, p.z); this.scene.add(dot);
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.3, 12), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.set(p.x, 0.1, p.z); hit.userData.idx = i;
      this.scene.add(hit); this.hits.push(hit);
    }
  }

  addUpdater(f) { this.updaters.push(f); }
  onPick(cb) { this.pickCb = cb; }
  setPickGroups(fn) { this.pickGroups = fn; }
  setShadows(on) { this.sun.castShadow = on; this.renderer.shadowMap.enabled = on; this.scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }

  // list: [{idx, kind:'move'|'jump'|'sel'}]
  setHighlights(list) {
    for (const r of this.rings) { this.scene.remove(r); r.geometry.dispose(); r.material.dispose(); }
    this.rings = [];
    const col = { move: 0x7dff8a, jump: 0xff5a4d, sel: 0xffd34d };
    for (const { idx, kind } of list) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.04, 8, 28), new THREE.MeshBasicMaterial({ color: col[kind] || col.move }));
      ring.rotation.x = Math.PI / 2;
      const p = pointVec(idx); ring.position.set(p.x, 0.07, p.z);
      ring.userData.kind = kind; this.scene.add(ring); this.rings.push(ring);
    }
  }

  pick(e) {
    const rc = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rc.left) / rc.width) * 2 - 1, -((e.clientY - rc.top) / rc.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.camera);
    const hits = this.ray.intersectObjects([...this.hits, ...this.pickGroups()], true);
    for (const h of hits) {
      let o = h.object;
      while (o) {
        if (o.userData.idx !== undefined) return this.pickCb({ idx: o.userData.idx });
        if (o.userData.pid !== undefined) return this.pickCb({ pid: o.userData.pid });
        o = o.parent;
      }
    }
  }

  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
  }

  resetCamera() {
    const a = this.camera.aspect || 1.6;
    const dist = a >= 1.3 ? 15 : 15 * Math.pow(1.3 / a, 0.75);
    this.controls.target.set(0, 0, 0);
    this.camera.position.set(0, dist * 0.8, dist * 0.6);
    this.controls.update();
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05), t = this.clock.elapsedTime;
    for (const f of this.updaters) f(dt, t);
    const s = 1 + 0.13 * Math.sin(t * 5);
    for (const r of this.rings) r.scale.setScalar(r.userData.kind === 'sel' ? 1 : s);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
