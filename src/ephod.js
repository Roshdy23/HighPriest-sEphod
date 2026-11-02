// ephod.js — procedural "ephod of the priest" for three.js (r152+)
// Free to use for anything. No external assets needed.
//
// Usage:
//   import { createEphod } from './ephod.js';
//   const ephod = createEphod({ breastplate: true });
//   scene.add(ephod);
//
// Based on Exodus 28: gold, blue, purple and scarlet thread on fine linen,
// two shoulder pieces each holding an onyx stone in a gold setting,
// a woven band (girdle), and an optional breastplate with 12 stones.

import * as THREE from 'three';

const COLORS = {
  gold: '#d4af37',
  blue: '#1f4fa3',
  purple: '#5b2a86',
  scarlet: '#b3202a',
  linen: '#efe6d0',
};

// The 12 breastplate stones (Exodus 28:17-20), in rows of three
const BREASTPLATE_STONES = [
  '#b01c2e', '#e8b923', '#c2182b', // sardius, topaz, carbuncle
  '#1c8a4a', '#1a3f9c', '#e9f4ff', // emerald, sapphire, diamond
  '#d98a3a', '#b9b3c9', '#7a3fb0', // ligure, agate, amethyst
  '#3fb59a', '#1b1b1f', '#4f8a3a', // beryl, onyx, jasper
];

export function makeWeaveTexture() {
  const size = 256;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');

  ctx.fillStyle = COLORS.linen;
  ctx.fillRect(0, 0, size, size);

  // Vertical bands of blue / purple / scarlet separated by gold threads
  const pattern = [COLORS.blue, COLORS.purple, COLORS.scarlet, COLORS.purple];
  const band = 28;
  let x = 0, i = 0;
  while (x < size) {
    ctx.fillStyle = pattern[i % pattern.length];
    ctx.fillRect(x, 0, band, size);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(x + band, 0, 4, size);
    x += band + 4;
    i++;
  }

  // Fine horizontal weft lines for a woven look
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#000';
  for (let y = 0; y < size; y += 3) ctx.fillRect(0, y, size, 1);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 3);
  tex.anisotropy = 8;
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createEphod({ breastplate = true } = {}) {
  const group = new THREE.Group();
  group.name = 'Ephod';

  const R = 0.28;            // torso radius
  const H = 0.9;             // ephod height
  const ARC = THREE.MathUtils.degToRad(100);

  const fabric = new THREE.MeshStandardMaterial({
    map: makeWeaveTexture(),
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: COLORS.gold, metalness: 0.85, roughness: 0.3,
  });

  // --- Front and back panels (curved to wrap a torso) ---
  const panel = (centerTheta) =>
    new THREE.Mesh(
      new THREE.CylinderGeometry(R, R, H, 48, 1, true, centerTheta - ARC / 2, ARC),
      fabric
    );
  const front = panel(0);
  const back = panel(Math.PI);
  front.name = 'EphodFront';
  back.name = 'EphodBack';
  group.add(front, back);

  // --- Shoulder pieces + onyx stones in gold settings ---
  const stoneMat = new THREE.MeshStandardMaterial({
    color: '#16161a', roughness: 0.15, metalness: 0.1,
  });
  const shoulderX = 0.15;
  const r = Math.sqrt(R * R - shoulderX * shoulderX);

  [-shoulderX, shoulderX].forEach((x, idx) => {
    const g = new THREE.CylinderGeometry(r, r, 0.1, 32, 1, true, 0, Math.PI);
    g.rotateZ(Math.PI / 2);
    const strap = new THREE.Mesh(g, fabric);
    strap.position.set(x, H / 2, 0);
    strap.scale.y = 0.3;
    strap.name = idx === 0 ? 'ShoulderLeft' : 'ShoulderRight';
    group.add(strap);

    const topY = H / 2 + 0.3 * r + 0.004;

    const stone = new THREE.Mesh(new THREE.SphereGeometry(0.035, 24, 16), stoneMat);
    stone.scale.y = 0.45;
    stone.position.set(x, topY, 0);
    stone.name = 'OnyxStone';

    const setting = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.009, 12, 32), goldMat);
    setting.rotation.x = Math.PI / 2;
    setting.position.set(x, topY, 0);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.008, 32), goldMat);
    base.position.set(x, topY - 0.006, 0);

    group.add(stone, setting, base);
  });

  // --- Woven band (girdle) ---
  const bandGeo = (centerTheta) =>
    new THREE.CylinderGeometry(R + 0.004, R + 0.004, 0.09, 48, 1, true, centerTheta - ARC / 2, ARC);
  const bandFront = new THREE.Mesh(bandGeo(0), fabric);
  const bandBack = new THREE.Mesh(bandGeo(Math.PI), fabric);
  bandFront.position.y = bandBack.position.y = -0.12;
  group.add(bandFront, bandBack);

  // --- Breastplate with 12 stones + gold chains ---
  if (breastplate) {
    const bp = new THREE.Group();
    bp.name = 'Breastplate';
    bp.position.set(0, 0.16, R + 0.014);

    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.27, 0.01), goldMat);
    bp.add(frame);

    BREASTPLATE_STONES.forEach((col, i) => {
      const cx = (i % 3 - 1) * 0.075;
      const cy = (1.5 - Math.floor(i / 3)) * 0.06;

      const mount = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.05, 0.012), goldMat);
      mount.position.set(cx, cy, 0.004);

      const gem = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 16, 12),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.2, metalness: 0.1 })
      );
      gem.scale.set(1.2, 0.95, 0.4);
      gem.position.set(cx, cy, 0.011);

      bp.add(mount, gem);
    });
    group.add(bp);

    // Chains from shoulder settings down to the breastplate's top corners
    [-1, 1].forEach((s) => {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * shoulderX, H / 2 + 0.3 * r, 0.04),
        new THREE.Vector3(s * 0.14, 0.42, r + 0.02),
        new THREE.Vector3(s * 0.12, 0.31, R + 0.02),
      ]);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, 0.005, 6, false), goldMat));
    });
  }

  group.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return group;
}