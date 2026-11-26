// road.js — walk a road, read the signs, collect the 12 stones, open the gate.

import * as THREE from 'three';
import { STONES, T, num } from './data.js';

const SPACING = 16;
const FIRST_Z = -22;
const DOOR_Z = FIRST_Z - (STONES.length - 1) * SPACING - 20;
const SKY = '#bfdcf0';
const $ = (id) => document.getElementById(id);
const AR_FONT = '"Amiri", "Traditional Arabic", "Noto Naskh Arabic", "Segoe UI", Tahoma, serif';

function seeded(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function srgb(tex) {
  if ('colorSpace' in tex) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ---------- textures ----------
function roadTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#b99d6c';
  g.fillRect(0, 0, 256, 256);
  const r = seeded(7);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(${r() > 0.5 ? '255,240,200' : '80,60,30'},${0.05 + r() * 0.12})`;
    g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 2 + r() * 3);
  }
  g.strokeStyle = '#8f7647';
  g.lineWidth = 3;
  for (let row = 0; row < 2; row++) {
    const y = row * 128;
    g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    for (let x = row * 64; x <= 256; x += 128) {
      g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 128); g.stroke();
    }
  }
  const t = srgb(new THREE.CanvasTexture(c));
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 70);
  return t;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.35)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function portalTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 128, 5, 64, 128, 140);
  grad.addColorStop(0, '#fffbe8');
  grad.addColorStop(0.5, '#ffe49a');
  grad.addColorStop(1, '#d9a22e');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 256);
  return srgb(new THREE.CanvasTexture(c));
}

function wrapLines(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; }
    else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function makeSignTexture({ title, gemColor, text, ref }) {
  const W = 1024, H = 640;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  ctx.fillStyle = '#f1e4c3';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#7a5530'; ctx.lineWidth = 14; ctx.strokeRect(7, 7, W - 14, H - 14);
  ctx.strokeStyle = '#b8925a'; ctx.lineWidth = 3; ctx.strokeRect(28, 28, W - 56, H - 56);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.direction = 'rtl';

  ctx.font = `bold 58px ${AR_FONT}`;
  const tw = ctx.measureText(title).width;
  if (gemColor) {
    ctx.fillStyle = gemColor;
    ctx.strokeStyle = '#5b3a14';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(W / 2 - tw / 2 - 40, 85, 22, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
  ctx.fillStyle = '#5b3a14';
  ctx.fillText(title, W / 2, 85);
  ctx.fillStyle = '#b8925a';
  ctx.fillRect(W / 2 - 140, 128, 280, 3);

  const maxW = W - 150, top = 150, bottom = ref ? H - 110 : H - 50;
  let size = 58, lines = [];
  ctx.fillStyle = '#2b1d0e';
  for (; size >= 26; size -= 2) {
    ctx.font = `${size}px ${AR_FONT}`;
    lines = wrapLines(ctx, text, maxW);
    if (lines.length * size * 1.3 <= bottom - top) break;
  }
  const lh = size * 1.3;
  const startY = top + (bottom - top - lines.length * lh) / 2 + lh / 2;
  lines.forEach((l, i) => ctx.fillText(l, W / 2, startY + i * lh));

  if (ref) {
    ctx.fillStyle = '#7a5530';
    ctx.font = `bold 42px ${AR_FONT}`;
    ctx.fillText(ref, W / 2, H - 70);
  }
  return srgb(new THREE.CanvasTexture(c));
}

function buildSign(opts) {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#6b4423', roughness: 0.9 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.2, 2.9, 0.2), wood);
  post.position.set(0, 1.45, -0.15);
  const board = new THREE.Mesh(new THREE.BoxGeometry(4.1, 2.6, 0.14), wood);
  board.position.y = 2.9;
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(3.9, 2.4),
    new THREE.MeshBasicMaterial({ map: makeSignTexture(opts) })
  );
  face.position.set(0, 2.9, 0.075);
  g.add(post, board, face);
  return g;
}

// ---------- scenery ----------
function addScenery(scene) {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: '#d8c690', roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = -110;
  scene.add(ground);

  const road = new THREE.Mesh(
    new THREE.PlaneGeometry(8, 280),
    new THREE.MeshStandardMaterial({ map: roadTexture(), roughness: 1 })
  );
  road.rotation.x = -Math.PI / 2;
  road.position.set(0, 0.02, -105);
  scene.add(road);

  const curbMat = new THREE.MeshStandardMaterial({ color: '#8c7a55', roughness: 1 });
  [-4.15, 4.15].forEach((x) => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 280), curbMat);
    curb.position.set(x, 0.1, -105);
    scene.add(curb);
  });

  const rnd = seeded(42);
  const rockGeo = new THREE.DodecahedronGeometry(1, 0);
  const rockMat = new THREE.MeshStandardMaterial({ color: '#a99a7a', roughness: 1, flatShading: true });
  for (let i = 0; i < 150; i++) {
    const m = new THREE.Mesh(rockGeo, rockMat);
    const s = 0.4 + rnd() * 1.1;
    m.scale.set(s, s * 0.6, s);
    m.position.set((rnd() < 0.5 ? -1 : 1) * (6.5 + rnd() * 45), s * 0.25, 15 - rnd() * 260);
    m.rotation.set(rnd() * 3, rnd() * 3, rnd() * 3);
    scene.add(m);
  }

  const trunkGeo = new THREE.CylinderGeometry(0.15, 0.25, 1, 8);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#7a5a38', roughness: 1 });
  const leafGeo = new THREE.SphereGeometry(1, 10, 8);
  const leafMat = new THREE.MeshStandardMaterial({ color: '#5d8a3a', roughness: 1 });
  for (let i = 0; i < 50; i++) {
    const h = 3 + rnd() * 3;
    const x = (rnd() < 0.5 ? -1 : 1) * (9 + rnd() * 40);
    const z = 15 - rnd() * 260;
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.scale.y = h;
    trunk.position.set(x, h / 2, z);
    const leaves = new THREE.Mesh(leafGeo, leafMat);
    leaves.scale.set(1.8 + rnd(), 0.8, 1.8 + rnd());
    leaves.position.set(x, h + 0.3, z);
    scene.add(trunk, leaves);
  }
}

// ---------- the gate ----------
function buildGate(scene) {
  const g = new THREE.Group();
  g.position.z = DOOR_Z;
  scene.add(g);

  const stone = new THREE.MeshStandardMaterial({ color: '#cdbb92', roughness: 0.95 });
  const wood = new THREE.MeshStandardMaterial({ color: '#5a3a1f', roughness: 0.8 });
  const gold = new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.85, roughness: 0.3 });

  [-1, 1].forEach((s) => {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 2), stone);
    wall.position.set(s * 19.4, 4, 0);
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.6, 8.2, 2.4), stone);
    pillar.position.set(s * 3.8, 4.1, 0);
    g.add(wall, pillar);
  });
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(9.2, 1.8, 2.4), stone);
  lintel.position.set(0, 7.3, 0);
  g.add(lintel);

  const bar = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.6, 0.1), gold);
  bar.position.set(0, 7.3, 1.22);
  g.add(bar);

  const sockets = STONES.map((st, i) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.17, 16, 12),
      new THREE.MeshStandardMaterial({ color: '#2a2a2a', roughness: 0.4, emissive: '#000000' })
    );
    m.position.set(-3.3 + i * 0.6, 7.3, 1.3);
    g.add(m);
    return m;
  });

  const leaves = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    pivot.position.set(s * 3, 0, 0);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(3, 6.2, 0.35), wood);
    leaf.position.set(-s * 1.5, 3.1, 0);
    pivot.add(leaf);
    [1.5, 4.7].forEach((y) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(3, 0.18, 0.4), gold);
      band.position.set(-s * 1.5, y, 0);
      pivot.add(band);
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.05, 8, 20), gold);
    ring.position.set(-s * 2.5, 2.8, 0.25);
    pivot.add(ring);
    g.add(pivot);
    return { pivot, s };
  });

  const portal = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6.2),
    new THREE.MeshBasicMaterial({ map: portalTexture(), fog: false })
  );
  portal.position.set(0, 3.1, -1.2);
  g.add(portal);

  const light = new THREE.PointLight('#ffd98a', 0, 45);
  light.position.set(0, 3.5, 2);
  g.add(light);

  return { sockets, leaves, light };
}

// ---------- main ----------
export function createRoad(renderer, { onComplete }) {
  const canvas = renderer.domElement;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY);
  scene.fog = new THREE.Fog(SKY, 30, 150);

  const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.rotation.order = 'YXZ';

  scene.add(new THREE.HemisphereLight('#ffffff', '#c2a878', 1.1));
  const sun = new THREE.DirectionalLight('#fff2d0', 2.2);
  sun.position.set(30, 50, 20);
  scene.add(sun);

  addScenery(scene);
  const gate = buildGate(scene);

  // Door sign
  const gateSign = buildSign({
    title: T.gateSignTitle,
    text: T.gateSignText,
    ref: '',
  });
  gateSign.position.set(-6.4, 0, DOOR_Z + 10);
  gateSign.rotation.y = 0.45;
  scene.add(gateSign);

  // Stones + signs
  const glowTex = glowTexture();
  const goldMat = new THREE.MeshStandardMaterial({ color: '#d4af37', metalness: 0.8, roughness: 0.35 });
  const stones = STONES.map((st, i) => {
    const z = FIRST_Z - i * SPACING;
    const side = i % 2 === 0 ? -1 : 1;

    const sign = buildSign({
      title: `${st.name} \u00B7 ${T.tribe(st.tribe)}`,
      gemColor: st.color,
      text: `\u00AB${st.verse}\u00BB`,
      ref: st.ref,
    });
    sign.position.set(side * 6.4, 0, z + 8);
    sign.rotation.y = -side * 0.45;
    scene.add(sign);

    const x = -side * 1.6;
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.38),
      new THREE.MeshStandardMaterial({
        color: st.color, emissive: st.color, emissiveIntensity: 0.55,
        roughness: 0.15, metalness: 0.2, flatShading: true,
      })
    );
    gem.scale.set(1, 1.4, 1);
    gem.position.set(x, 1.5, z);

    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 0.7, 12), goldMat);
    base.position.set(x, 0.35, z);

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex,
      color: new THREE.Color(st.color).lerp(new THREE.Color('#ffffff'), 0.35),
      transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    glow.scale.set(2.6, 2.6, 1);
    glow.position.copy(gem.position);

    scene.add(gem, base, glow);
    return { st, i, x, z, gem, base, glow, collected: false, t: 1 };
  });

  // ---------- HUD ----------
  const gemsEl = $('gems');
  gemsEl.innerHTML = '';
  const dots = STONES.map((st) => {
    const d = document.createElement('span');
    d.className = 'dot';
    d.style.setProperty('--c', st.color === '#1b1b24' ? '#6b6b80' : st.color);
    d.title = st.name;
    gemsEl.appendChild(d);
    return d;
  });

  let toastTimer = 0;
  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  let verseShown = null;
  function showVerse(s) {
    const el = $('verse');
    const id = s ? s.st.id : null;
    if (id === verseShown) return;
    verseShown = id;
    if (!s) { el.hidden = true; return; }
    el.innerHTML =
      `<div class="vt">${s.st.name} \u00B7 ${T.tribe(s.st.tribe)}</div>` +
      `<div class="vb">\u00AB${s.st.verse}\u00BB</div>` +
      `<div class="vr">${s.st.ref} (${T.version})</div>`;
    el.hidden = false;
  }

  // ---------- audio ----------
  let actx = null;
  const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24, 26];
  function chime(i) {
    if (!actx) return;
    try {
      const f = 392 * Math.pow(2, SCALE[i] / 12);
      const now = actx.currentTime;
      [1, 2].forEach((mult, k) => {
        const o = actx.createOscillator();
        const g = actx.createGain();
        o.type = 'sine';
        o.frequency.value = f * mult;
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.18 / (k + 1), now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
        o.connect(g).connect(actx.destination);
        o.start(now);
        o.stop(now + 1.2);
      });
    } catch (e) { /* audio is optional */ }
  }

  // ---------- state ----------
  let active = true, started = false, finished = false;
  let count = 0, unlocked = false, doorOpen = 0, opening = false;
  let time = 0, walkPhase = 0;
  const player = { x: 0, z: 6, yaw: 0, pitch: 0 };
  const keys = { fw: false, back: false, left: false, right: false, run: false };

  function collect(s, silent = false) {
    if (s.collected) return;
    s.collected = true;
    s.t = 0;
    count++;
    $('count').textContent = num(count);
    dots[s.i].classList.add('on');
    const sock = gate.sockets[s.i];
    sock.material.color.set(s.st.color);
    sock.material.emissive.set(s.st.color);
    sock.material.emissiveIntensity = 0.8;
    if (!silent) {
      chime(s.i);
      toast(T.collected(s.st.name, count, STONES.length));
    }
    if (count === STONES.length) {
      unlocked = true;
      if (!silent) setTimeout(() => toast(T.allGathered), 2900);
    }
  }

  // ---------- input ----------
  const KEYMAP = {
    KeyW: 'fw', ArrowUp: 'fw', KeyS: 'back', ArrowDown: 'back',
    KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    ShiftLeft: 'run', ShiftRight: 'run',
  };
  window.addEventListener('keydown', (e) => {
    if (!active || !started) return;
    const k = KEYMAP[e.code];
    if (k) { keys[k] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => {
    const k = KEYMAP[e.code];
    if (k) keys[k] = false;
  });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });

  let dragging = false, lastX = 0, lastY = 0;
  canvas.addEventListener('pointerdown', (e) => {
    if (!active || !started) return;
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || !active) return;
    player.yaw -= (e.clientX - lastX) * 0.0035;
    player.pitch = THREE.MathUtils.clamp(player.pitch - (e.clientY - lastY) * 0.0035, -0.7, 0.7);
    lastX = e.clientX; lastY = e.clientY;
  });
  const stopDrag = () => { dragging = false; };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);

  document.querySelectorAll('#touch button').forEach((b) => {
    const dir = b.dataset.dir;
    const on = (e) => { keys[dir] = true; e.preventDefault(); };
    const off = () => { keys[dir] = false; };
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('pointercancel', off);
  });

  // ---------- update ----------
  const ease = (t) => t * t * (3 - 2 * t);

  function update(dt) {
    time += dt;

    // stones: bob, spin, or collect animation
    for (const s of stones) {
      if (!s.collected) {
        s.gem.rotation.y += dt * 1.5;
        s.gem.position.y = 1.5 + Math.sin(time * 2 + s.i) * 0.12;
        s.glow.position.y = s.gem.position.y;
        s.glow.material.opacity = 0.6 + 0.15 * Math.sin(time * 3 + s.i);
      } else if (s.t < 1) {
        s.t = Math.min(1, s.t + dt * 1.6);
        const k = 1 - s.t;
        s.gem.scale.set(k, k * 1.4, k);
        s.gem.position.y += dt * 3;
        s.gem.rotation.y += dt * 12;
        s.glow.position.y = s.gem.position.y;
        s.glow.scale.setScalar(2.6 + s.t * 3);
        s.glow.material.opacity = 0.7 * k;
        if (s.t >= 1) { s.gem.visible = false; s.glow.visible = false; }
      }
    }

    if (started && active && !finished) {
      // movement
      const speed = keys.run ? 8.5 : 5;
      const fw = (keys.fw ? 1 : 0) - (keys.back ? 1 : 0);
      const st = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      const sin = Math.sin(player.yaw), cos = Math.cos(player.yaw);
      const dx = (-sin * fw + cos * st) * speed * dt;
      const dz = (-cos * fw - sin * st) * speed * dt;
      player.x += dx;
      player.z += dz;
      if (fw || st) walkPhase += speed * dt * 1.3;

      const nearGate = player.z < DOOR_Z + 3;
      const xLimit = nearGate ? 2.6 : 3.7;
      player.x = THREE.MathUtils.clamp(player.x, -xLimit, xLimit);
      const gateClear = unlocked && doorOpen > 0.85;
      const minZ = gateClear ? DOOR_Z - 4 : DOOR_Z + 2.2;
      player.z = THREE.MathUtils.clamp(player.z, minZ, 8);

      // pickups
      for (const s of stones) {
        if (!s.collected && Math.hypot(player.x - s.x, player.z - s.z) < 1.6) collect(s);
      }

      // verse panel for the nearest uncollected stone ahead
      let near = null;
      for (const s of stones) {
        const ahead = player.z - s.z;
        if (!s.collected && ahead > -2 && ahead < 16) { near = s; break; }
      }
      showVerse(near);

      // gate
      if (unlocked && Math.abs(player.z - DOOR_Z) < 45) opening = true;
      const hint = $('hint');
      if (!unlocked && player.z < DOOR_Z + 16) {
        hint.textContent = T.gateSealed(count, STONES.length);
        hint.classList.add('show');
      } else if (unlocked && !gateClear && opening) {
        hint.textContent = T.gateOpening;
        hint.classList.add('show');
      } else {
        hint.classList.remove('show');
      }

      if (gateClear && player.z < DOOR_Z + 1.2) {
        finished = true;
        hint.classList.remove('show');
        onComplete();
      }
    }

    // gate animation
    if (opening && doorOpen < 1) doorOpen = Math.min(1, doorOpen + dt * 0.4);
    const open = ease(doorOpen) * Math.PI / 2 * 0.94;
    for (const l of gate.leaves) l.pivot.rotation.y = -l.s * open;
    gate.light.intensity = doorOpen * 60;

    // camera
    const bob = Math.sin(walkPhase) * 0.05;
    camera.position.set(player.x, 1.7 + bob, player.z);
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
  }

  // ---------- public API ----------
  const params = new URLSearchParams(location.search);

  return {
    scene,
    camera,
    update,
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    begin() {
      started = true;
      $('hud').hidden = false;
      if (window.matchMedia('(pointer: coarse)').matches) $('touch').hidden = false;
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { actx = null; }
      // testing shortcut: add ?all to the URL to start with every stone collected
      if (params.has('all')) {
        stones.forEach((s) => collect(s, true));
        player.z = DOOR_Z + 40;
      }
    },
    setActive(v) {
      active = v;
      if (!v) {
        $('hud').hidden = true;
        $('verse').hidden = true;
        $('touch').hidden = true;
        $('hint').classList.remove('show');
        $('toast').classList.remove('show');
      }
    },
  };
}