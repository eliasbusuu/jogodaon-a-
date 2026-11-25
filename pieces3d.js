// Peças 3D procedurais (sem arquivos externos): onça-pintada e 14 cachorros, com animações.
import * as THREE from 'three';
import { pointVec } from './board3d.js';

const mat = (c, r = 0.7) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
const M = (geo, material, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); return m; };
const rng = (seed) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function shadows(g) { g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); return g; }

// Frente do modelo = +X
export function makeJaguar() {
  const g = new THREE.Group();
  const gold = mat(0xd69a1c, 0.8), dark = mat(0x15100a, 0.6), cream = mat(0xf3deaa, 0.8);
  const body = M(new THREE.CapsuleGeometry(0.21, 0.6, 6, 16), gold, 0, 0.5, 0); body.rotation.z = Math.PI / 2; g.add(body);
  const chest = M(new THREE.SphereGeometry(0.23, 16, 12), gold, 0.3, 0.5, 0); g.add(chest);
  const head = M(new THREE.SphereGeometry(0.2, 18, 14), gold, 0.58, 0.66, 0); head.scale.set(1.05, 0.92, 1.05); g.add(head);
  const snout = M(new THREE.SphereGeometry(0.11, 14, 10), cream, 0.75, 0.6, 0); snout.scale.set(1.2, 0.8, 0.95); g.add(snout);
  g.add(M(new THREE.SphereGeometry(0.04, 10, 8), dark, 0.87, 0.63, 0));
  for (const s of [1, -1]) {
    g.add(M(new THREE.SphereGeometry(0.07, 10, 8), gold, 0.5, 0.86, 0.14 * s));
    g.add(M(new THREE.SphereGeometry(0.035, 8, 6), dark, 0.53, 0.86, 0.14 * s));
    g.add(M(new THREE.SphereGeometry(0.032, 8, 6), mat(0x9be15d, 0.3), 0.71, 0.72, 0.09 * s));
  }
  for (const x of [0.32, -0.32]) for (const z of [0.13, -0.13]) {
    g.add(M(new THREE.CylinderGeometry(0.075, 0.06, 0.36, 10), gold, x, 0.2, z));
    const paw = M(new THREE.SphereGeometry(0.085, 10, 8), cream, x + 0.03, 0.04, z); paw.scale.set(1.2, 0.6, 1); g.add(paw);
  }
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.55, 0.52, 0), new THREE.Vector3(-0.8, 0.42, 0.08),
    new THREE.Vector3(-1.0, 0.55, 0.14), new THREE.Vector3(-1.08, 0.8, 0.06)]);
  g.add(M(new THREE.TubeGeometry(curve, 14, 0.052, 8), gold));
  g.add(M(new THREE.SphereGeometry(0.06, 8, 6), dark, -1.08, 0.82, 0.06));
  // manchas pretas (determinísticas)
  const r = rng(7);
  for (let i = 0; i < 34; i++) {
    const x = -0.5 + r() * 1.0, phi = -0.35 + r() * (Math.PI + 0.7), R = 0.205;
    const sp = M(new THREE.SphereGeometry(0.04 + r() * 0.02, 8, 6), dark, x, 0.5 + R * Math.sin(phi), R * Math.cos(phi));
    sp.scale.set(1.3, 1, 1); g.add(sp);
  }
  for (let i = 0; i < 6; i++) g.add(M(new THREE.SphereGeometry(0.03, 6, 5), dark, 0.5 + r() * 0.15, 0.76 + r() * 0.1, (r() - 0.5) * 0.18));
  g.scale.setScalar(0.78);
  return shadows(g);
}

const PATCH = [0x8a5a2d, 0x3b2a1f, 0xb57a3a, 0x5b4636];
export function makeDog(i) {
  const g = new THREE.Group();
  const cream = mat(0xf2ead7, 0.85), patch = mat(PATCH[i % 4], 0.85), dark = mat(0x111111, 0.5);
  const body = M(new THREE.CapsuleGeometry(0.13, 0.32, 6, 12), cream, 0, 0.36, 0); body.rotation.z = Math.PI / 2; g.add(body);
  const saddle = M(new THREE.SphereGeometry(0.14, 12, 8), patch, -0.02, 0.43, 0); saddle.scale.set(1.2, 0.5, 0.95); g.add(saddle);
  g.add(M(new THREE.SphereGeometry(0.135, 14, 12), cream, 0.34, 0.5, 0));
  g.add(M(new THREE.BoxGeometry(0.15, 0.085, 0.1), mat(0xe6d9bb), 0.47, 0.46, 0));
  g.add(M(new THREE.SphereGeometry(0.03, 8, 6), dark, 0.55, 0.48, 0));
  for (const s of [1, -1]) {
    const ear = M(new THREE.BoxGeometry(0.08, 0.15, 0.03), patch, 0.3, 0.56, 0.115 * s); ear.rotation.x = 0.35 * s; g.add(ear);
    g.add(M(new THREE.SphereGeometry(0.022, 6, 5), dark, 0.43, 0.55, 0.06 * s));
  }
  const collar = M(new THREE.TorusGeometry(0.1, 0.022, 6, 14), mat(0xc4262e, 0.5), 0.24, 0.46, 0); collar.rotation.y = Math.PI / 2; g.add(collar);
  for (const x of [0.2, -0.2]) for (const z of [0.075, -0.075]) g.add(M(new THREE.CylinderGeometry(0.04, 0.035, 0.26, 8), cream, x, 0.13, z));
  const tail = M(new THREE.CapsuleGeometry(0.03, 0.2, 4, 8), cream, -0.36, 0.5, 0); tail.rotation.z = -0.9; g.add(tail);
  return shadows(g);
}

const handPos = (i) => new THREE.Vector3(((i % 7) - 3) * 0.85, 0, 5.5 + Math.floor(i / 7) * 0.9);

class Piece {
  constructor(group, pid, base = 1) {
    this.g = group; this.pid = pid; this.base = base; this.idx = null; this.status = 'new'; this.anim = null; this.face = Math.PI / 2;
    group.userData.pid = pid; group.rotation.y = this.face;
  }
}

export class Pieces {
  constructor(board) {
    this.board = board;
    this.root = new THREE.Group(); board.scene.add(this.root);
    this.jag = new Piece(makeJaguar(), 'j', 0.78);
    this.dogs = Array.from({ length: 14 }, (_, i) => new Piece(makeDog(i), i));
    this.all = [this.jag, ...this.dogs];
    for (const p of this.all) this.root.add(p.g);
    board.addUpdater((dt) => this.update(dt));
    board.setPickGroups(() => this.all.filter((p) => p.g.visible && p.idx >= 0).map((p) => p.g));
  }

  idxOf(pid) { return (pid === 'j' ? this.jag : this.dogs[pid]).idx; }

  // Sincroniza as peças com o estado. Retorna {moved, captured} p/ sons.
  sync(state, instant = false) {
    const ev = { moved: 0, captured: 0 };
    const place = (p, idx) => {
      if (idx === -2) {
        if (p.status !== 'dead') {
          p.status = 'dead'; p.idx = -2; ev.captured++;
          if (instant) p.g.visible = false; else p.anim = { kind: 'die', t: 0, y0: p.g.position.y };
        }
        return;
      }
      const to = idx >= 0 ? pointVec(idx) : handPos(p.pid);
      const revived = p.status === 'dead';
      p.g.visible = true;
      if (revived || instant || p.status === 'new') { p.g.scale.setScalar(p.base); p.g.position.copy(to); p.anim = null; p.face = Math.PI / 2; p.g.rotation.y = p.face; }
      else if (p.idx !== idx) {
        const from = p.g.position.clone(), d = to.clone().sub(from), dist = d.length();
        if (dist > 0.01) p.face = Math.atan2(-d.z, d.x);
        p.anim = { kind: 'move', t: 0, from, to, dur: dist > 2.2 ? 0.6 : 0.4, arc: dist > 2.2 || p.idx === -1 ? 0.9 : 0.18 };
        ev.moved++;
      }
      p.idx = idx; p.status = 'alive';
    };
    place(this.jag, state.j);
    state.dogs.forEach((pos, i) => place(this.dogs[i], pos));
    return ev;
  }

  update(dt) {
    for (const p of this.all) {
      const a = p.anim;
      if (a) {
        a.t += dt;
        if (a.kind === 'die') {
          const k = Math.min(1, Math.max(0, (a.t - 0.2) / 0.6));
          p.g.scale.setScalar(p.base * (1 - k)); p.g.position.y = a.y0 + k * 0.9; p.g.rotation.y += dt * 12;
          if (k >= 1) { p.g.visible = false; p.anim = null; }
          continue;
        }
        const k = Math.min(1, a.t / a.dur), e = k * k * (3 - 2 * k);
        p.g.position.lerpVectors(a.from, a.to, e);
        p.g.position.y += Math.sin(Math.PI * k) * a.arc;
        if (k >= 1) { p.g.position.copy(a.to); p.anim = null; }
      }
      if (p.status === 'alive') {
        let d = p.face - p.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d));
        p.g.rotation.y += d * Math.min(1, dt * 10);
      }
    }
  }
}
