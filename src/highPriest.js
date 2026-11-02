// highPriest.js — the complete garments of the high priest (Exodus 28), procedural three.js (r152+)
//
// Layers, inside to outside:
//   linen breeches (hidden), checkered linen tunic (ketonet), blue robe of the ephod
//   with pomegranates and golden bells on the hem, woven sash, the ephod with its
//   two onyx shoulder stones, the breastplate with 12 stones, and on the head the
//   linen turban with the gold plate "Holy to the LORD" on a blue cord.
//
// Usage:
//   import { createHighPriest } from './highPriest.js';
//   scene.add(createHighPriest());

import * as THREE from 'three';
import { createEphod, makeWeaveTexture } from './ephod.js';

const C = {
  blue: '#1f4fa3',
  purple: '#5b2a86',
  scarlet: '#b3202a',
  gold: '#d4af37',
  linen: '#f3ecd9',
  skin: '#d9a77b',
};

function srgb(tex) {
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}

// Checkered linen for the tunic
function checkTexture(rx, ry) {
  const size = 256, n = 8, s = size / n;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  for (let r = 0; r < n; r++) {
    for (let q = 0; q < n; q++) {
      ctx.fillStyle = (r + q) % 2 ? '#f4eedc' : '#e6ddc2';
      ctx.fillRect(q * s, r * s, s, s);
    }
  }
  ctx.strokeStyle = '#cfc4a3';
  ctx.lineWidth = 1;
  for (let i = 0; i <= n; i++) {
    ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(size, i * s); ctx.stroke();
  }
  ctx.globalAlpha = 0.07;
  ctx.fillStyle = '#000';
  for (let y = 0; y < size; y += 2) ctx.fillRect(0, y, size, 1);
  const tex = srgb(new THREE.CanvasTexture(c));
  tex.repeat.set(rx, ry);
  return tex;
}

// Engraved gold plate: "Holy to the LORD" (Exodus 28:36)
function plateTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#f0d36a');
  g.addColorStop(0.5, '#d4af37');
  g.addColorStop(1, '#a8841f');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = '#3a2a00';
  ctx.font = 'bold 72px "Times New Roman", serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';
  ctx.fillText('קֹדֶשׁ לַיהוָה', 256, 68);
  return srgb(new THREE.CanvasTexture(c));
}

// Cylinder between two points; rA at point a, rB at point b
function limb(a, b, rA, rB, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rB, rA, len, 20), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  return m;
}

export function createHighPriest({ breastplate = true, pedestal = true } = {}) {
  const root = new THREE.Group();
  root.name = 'HighPriest';

  // ---------- Materials ----------
  const skin = new THREE.MeshStandardMaterial({ color: C.skin, roughness: 0.7 });
  const tunicMat = new THREE.MeshStandardMaterial({
    map: checkTexture(6, 5), roughness: 0.9, side: THREE.DoubleSide,
  });
  const sleeveMat = new THREE.MeshStandardMaterial({
    map: checkTexture(1, 2.5), roughness: 0.9, side: THREE.DoubleSide,
  });
  const robeMat = new THREE.MeshStandardMaterial({
    color: C.blue, roughness: 0.8, side: THREE.DoubleSide,
  });
  const linenMat = new THREE.MeshStandardMaterial({
    color: C.linen, roughness: 0.9, side: THREE.DoubleSide,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: C.gold, metalness: 0.85, roughness: 0.3,
  });
  const sashTex = makeWeaveTexture();
  sashTex.repeat.set(6, 1);
  const sashMat = new THREE.MeshStandardMaterial({
    map: sashTex, roughness: 0.85, side: THREE.DoubleSide,
  });

  // ---------- Body (mostly hidden under the garments) ----------
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.16, 16), skin);
  neck.position.y = 0.53;
  root.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 32, 24), skin);
  head.scale.set(0.92, 1.1, 1);
  head.position.y = 0.72;
  root.add(head);

  const eyeMat = new THREE.MeshStandardMaterial({ color: '#15110e', roughness: 0.4 });
  [-1, 1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 10, 8), eyeMat);
    eye.position.set(s * 0.04, 0.735, 0.1);
    root.add(eye);
  });

  const beard = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshStandardMaterial({ color: '#cfcac0', roughness: 1 })
  );
  beard.scale.set(0.08, 0.1, 0.06);
  beard.position.set(0, 0.635, 0.075);
  root.add(beard);

  // Legs and bare feet (priests served barefoot)
  [-1, 1].forEach((s) => {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.2, 14), skin);
    leg.position.set(s * 0.09, -0.95, 0);
    root.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), skin);
    foot.scale.set(1, 0.4, 2.2);
    foot.position.set(s * 0.09, -1.057, 0.05);
    root.add(foot);
  });

  // ---------- Tunic (checkered linen, to the ankles) ----------
  const tunic = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.3, 1.38, 64, 1, true), tunicMat);
  tunic.position.y = 0.4 - 0.69;
  root.add(tunic);

  const tunicDome = new THREE.Mesh(new THREE.SphereGeometry(0.235, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), tunicMat);
  tunicDome.scale.y = 0.3;
  tunicDome.position.y = 0.4;
  root.add(tunicDome);

  // Arms: long tunic sleeves to the wrist, short robe sleeves over the top
  [-1, 1].forEach((s) => {
    const S = new THREE.Vector3(s * 0.27, 0.36, 0);
    const W = new THREE.Vector3(s * 0.33, -0.4, 0.06);
    root.add(limb(S, W, 0.07, 0.052, sleeveMat));

    const mid = new THREE.Vector3().lerpVectors(S, W, 0.38);
    root.add(limb(S, mid, 0.085, 0.08, robeMat));

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), skin);
    hand.scale.set(1, 1.3, 0.7);
    hand.position.copy(W).add(new THREE.Vector3(0, -0.04, 0));
    root.add(hand);
  });

  // ---------- Robe of the ephod (all blue) ----------
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.255, 0.33, 1.15, 64, 1, true), robeMat);
  robe.position.y = 0.4 - 0.575;
  root.add(robe);

  const robeDome = new THREE.Mesh(new THREE.SphereGeometry(0.255, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), robeMat);
  robeDome.scale.y = 0.3;
  robeDome.position.y = 0.4;
  root.add(robeDome);

  // Reinforced neck opening
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.01, 10, 32), goldMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.482;
  root.add(collar);

  // Hem trim, then pomegranates and golden bells alternating
  const hemY = -0.75;
  const hem = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.006, 8, 64), goldMat);
  hem.rotation.x = Math.PI / 2;
  hem.position.y = hemY;
  root.add(hem);

  const pomColors = [C.blue, C.purple, C.scarlet];
  const COUNT = 36;
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2;
    const x = Math.sin(a) * 0.33;
    const z = Math.cos(a) * 0.33;

    if (i % 2 === 0) {
      const pom = new THREE.Group();
      const fruit = new THREE.Mesh(
        new THREE.SphereGeometry(0.027, 14, 12),
        new THREE.MeshStandardMaterial({ color: pomColors[(i / 2) % 3], roughness: 0.6 })
      );
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.014, 0.012, 8), goldMat);
      crown.position.y = 0.028;
      pom.add(fruit, crown);
      pom.position.set(x, hemY - 0.028, z);
      root.add(pom);
    } else {
      const bell = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.026, 0.04, 14), goldMat);
      const clapper = new THREE.Mesh(new THREE.SphereGeometry(0.008, 8, 6), goldMat);
      clapper.position.y = -0.024;
      bell.add(body, clapper);
      bell.position.set(x, hemY - 0.026, z);
      root.add(bell);
    }
  }

  // ---------- Sash (visible at the sides, between the ephod's own band) ----------
  const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.09, 64, 1, true), sashMat);
  sash.position.y = -0.12;
  root.add(sash);

  // ---------- The ephod, with shoulder stones and breastplate ----------
  root.add(createEphod({ breastplate }));

  // ---------- Turban (linen) with the gold plate ----------
  const pts = [];
  const y0 = 0.775, span = 0.165, N = 48;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    let r = 0.122 + 0.006 * Math.sin(t * Math.PI * 10); // wrapped-cloth ripples
    if (t > 0.7) {
      const k = (t - 0.7) / 0.3;
      r *= Math.sqrt(Math.max(0, 1 - k * k));          // rounded crown
    }
    pts.push(new THREE.Vector2(r, y0 + span * t));
  }
  const turban = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), linenMat);
  turban.name = 'Turban';
  root.add(turban);

  const plateMat = new THREE.MeshStandardMaterial({
    map: plateTexture(), color: '#ffffff', metalness: 0.8, roughness: 0.35, side: THREE.DoubleSide,
  });
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.132, 0.132, 0.035, 24, 1, true, -0.45, 0.9),
    plateMat
  );
  plate.position.y = 0.815;
  plate.name = 'GoldPlate';
  root.add(plate);

  // Blue cord tying the plate on
  const cordMat = new THREE.MeshStandardMaterial({ color: C.blue, roughness: 0.7 });
  [0.797, 0.833].forEach((y) => {
    const cord = new THREE.Mesh(new THREE.TorusGeometry(0.131, 0.004, 8, 48), cordMat);
    cord.rotation.x = Math.PI / 2;
    cord.position.y = y;
    root.add(cord);
  });

  // ---------- Pedestal ----------
  if (pedestal) {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.6, 0.65, 0.05, 64),
      new THREE.MeshStandardMaterial({ color: '#2a2a33', roughness: 0.6 })
    );
    base.position.y = -1.1;
    root.add(base);
  }

  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return root;
}