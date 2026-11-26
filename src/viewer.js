// viewer.js — inspect the high priest. Click any stone or garment to open an explanation.

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createHighPriest } from './highPriest.js';
import { STONES, STONE_BY_ID, PARTS, T } from './data.js';

const $ = (id) => document.getElementById(id);

const VIEWS = {
  start:     { pos: [0, 0.3, 2.9],   target: [0, 0.15, 0] },
  full:      { pos: [0, 0.2, 4.6],   target: [0, -0.1, 0] },
  head:      { pos: [0, 0.8, 1.5],   target: [0, 0.78, 0] },
  shoulders: { pos: [0, 1.0, 1.7],   target: [0, 0.5, 0] },
  chest:     { pos: [0, 0.3, 1.8],   target: [0, 0.2, 0.1] },
  hem:       { pos: [0, -0.5, 2.3],  target: [0, -0.75, 0] },
};

export function createViewer(renderer) {
  const canvas = renderer.domElement;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#15151c');

  const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.05, 100);
  camera.position.set(...VIEWS.start.pos);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
  key.position.set(2.5, 4, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -2; key.shadow.camera.right = 2;
  key.shadow.camera.top = 2.5; key.shadow.camera.bottom = -2;
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 15;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x8aa8ff, 1.0);
  rim.position.set(-3, 2, -3);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(6, 64),
    new THREE.MeshStandardMaterial({ color: '#101016', roughness: 0.9 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.126;
  floor.receiveShadow = true;
  scene.add(floor);

  const priest = createHighPriest({ breastplate: true, pedestal: true });
  scene.add(priest);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(...VIEWS.start.target);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.minDistance = 0.5;
  controls.maxDistance = 7;
  controls.enabled = false;
  controls.update();

  // ---------- camera presets ----------
  let tween = null;
  function goTo(name) {
    const v = VIEWS[name];
    if (!v) return;
    tween = {
      t: 0,
      p0: camera.position.clone(), t0: controls.target.clone(),
      p1: new THREE.Vector3(...v.pos), t1: new THREE.Vector3(...v.target),
    };
  }
  document.querySelectorAll('#presets button').forEach((b) => {
    b.addEventListener('click', () => goTo(b.dataset.view));
  });
  $('restartBtn').addEventListener('click', () => location.reload());

  // ---------- picking ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  // Small gems are hard to hit exactly, so a click near one counts as a click on it.
  const gemTargets = [];
  priest.traverse((o) => {
    const p = o.userData && o.userData.part;
    if (o.isMesh && o.geometry.type === 'SphereGeometry' && p && (STONE_BY_ID[p] || p === 'shoulder_onyx')) {
      gemTargets.push(o);
    }
  });
  const tmp = new THREE.Vector3();
  const ray2 = new THREE.Raycaster();

  function gemVisible(m) {
    m.getWorldPosition(tmp);
    const dir = tmp.clone().sub(camera.position);
    const dist = dir.length();
    ray2.set(camera.position, dir.normalize());
    const hits = ray2.intersectObject(priest, true);
    return !hits.length || hits[0].distance > dist - 0.04 || hits[0].object.userData.part === m.userData.part;
  }

  function nearestGem(e, maxPx) {
    const r = canvas.getBoundingClientRect();
    let best = null, bd = maxPx;
    for (const m of gemTargets) {
      m.getWorldPosition(tmp);
      tmp.project(camera);
      if (tmp.z > 1 || tmp.z < -1) continue;
      const sx = (tmp.x * 0.5 + 0.5) * r.width + r.left;
      const sy = (-tmp.y * 0.5 + 0.5) * r.height + r.top;
      const d = Math.hypot(sx - e.clientX, sy - e.clientY);
      if (d < bd && gemVisible(m)) { bd = d; best = m; }
    }
    return best ? best.userData.part : null;
  }

  function pick(e) {
    const assist = nearestGem(e, e.pointerType === 'touch' ? 26 : 14);
    if (assist) return assist;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObject(priest, true);
    if (!hits.length) return null;
    let o = hits[0].object;
    while (o) {
      if (o.userData && o.userData.part) return o.userData.part;
      o = o.parent;
    }
    return null;
  }

  function titleOf(part) {
    const st = STONE_BY_ID[part];
    if (st) return `${st.name} \u00B7 ${T.tribe(st.tribe)}`;
    return PARTS[part] ? PARTS[part].title : null;
  }

  // ---------- popup ----------
  const popup = $('popup');
  let openedAt = 0;
  function openPopup(part) {
    const st = STONE_BY_ID[part];
    const p = PARTS[part];
    let html = '';
    if (st) {
      const dot = st.color === '#1b1b24' ? '#6b6b80' : st.color;
      html =
        `<div class="pgem" style="--c:${dot}"></div>` +
        `<h2>${st.name} <span class="heb" dir="rtl" lang="he">${st.hebrew}</span></h2>` +
        `<p class="psub">${T.tribe(st.tribe)} \u00B7 ${T.row(st.row)} \u00B7 ${st.rowRef}</p>` +
        `<p>${st.about}</p>` +
        `<blockquote>\u00AB${st.verse}\u00BB<cite>${st.ref} (${T.version})</cite></blockquote>`;
    } else if (p) {
      html =
        `<h2>${p.title}</h2>` +
        `<p class="psub">${p.ref}</p>` +
        `<p>${p.body}</p>`;
    } else {
      return;
    }
    $('popupBody').innerHTML = html;
    popup.hidden = false;
    openedAt = performance.now();
    $('tip').classList.remove('show');
  }
  function closePopup() { popup.hidden = true; }
  // ignore the synthetic click a touch tap fires right after the popup opens
  popup.querySelector('.backdrop').addEventListener('click', () => {
    if (performance.now() - openedAt > 450) closePopup();
  });
  popup.querySelector('.close').addEventListener('click', closePopup);
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePopup(); });

  // ---------- list panel (a guaranteed way to open any explanation) ----------
  const listPanel = $('listPanel');
  listPanel.innerHTML =
    `<h3>${T.listTitleStones}</h3><div class="lst">` +
    STONES.map((st) => {
      const dot = st.color === '#1b1b24' ? '#6b6b80' : st.color;
      return `<button data-part="${st.id}"><i style="--c:${dot}"></i>${st.name}</button>`;
    }).join('') +
    `</div><h3>${T.listTitleParts}</h3><div class="lst">` +
    Object.keys(PARTS).map((k) => `<button data-part="${k}">${PARTS[k].title}</button>`).join('') +
    '</div>';
  $('listBtn').addEventListener('click', () => { listPanel.hidden = !listPanel.hidden; });
  listPanel.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-part]');
    if (b) { listPanel.hidden = true; openPopup(b.dataset.part); }
  });

  // ---------- pointer handling ----------
  let active = false, lastDown = null, dragging = false, hover = null, hoverPt = null, hoverQueued = false;
  const tip = $('tip');

  canvas.addEventListener('pointerdown', (e) => {
    if (!active) return;
    lastDown = { x: e.clientX, y: e.clientY };
    dragging = true;
    tip.classList.remove('show');
  });

  // A press that barely moves is a click, however long it took. Both pointerup and
  // click try to open the popup; whichever comes first wins (the other sees it open).
  function tryOpen(e) {
    if (!active || !popup.hidden) return;
    if (lastDown) {
      const limit = e.pointerType === 'touch' ? 14 : 8;
      if (Math.hypot(e.clientX - lastDown.x, e.clientY - lastDown.y) > limit) return;
    }
    const part = pick(e);
    if (part) openPopup(part);
  }
  canvas.addEventListener('pointerup', (e) => { dragging = false; tryOpen(e); });
  canvas.addEventListener('click', tryOpen);
  canvas.addEventListener('pointercancel', () => { dragging = false; });

  canvas.addEventListener('pointermove', (e) => {
    if (!active || dragging || !popup.hidden || e.pointerType === 'touch') return;
    hoverPt = { clientX: e.clientX, clientY: e.clientY, pointerType: e.pointerType };
    if (hoverQueued) return;
    hoverQueued = true;
    requestAnimationFrame(() => {
      hoverQueued = false;
      if (!active || dragging || !hoverPt) return;
      const part = pick(hoverPt);
      if (part !== hover) {
        hover = part;
        canvas.style.cursor = part ? 'pointer' : 'grab';
      }
      if (part) {
        tip.textContent = titleOf(part);
        tip.style.left = hoverPt.clientX + 16 + 'px';
        tip.style.top = hoverPt.clientY + 16 + 'px';
        tip.classList.add('show');
      } else {
        tip.classList.remove('show');
      }
    });
  });
  canvas.addEventListener('pointerleave', () => tip.classList.remove('show'));

  // ---------- public API ----------
  return {
    scene,
    camera,
    update(dt) {
      if (tween) {
        tween.t = Math.min(1, tween.t + dt / 0.9);
        const k = tween.t * tween.t * (3 - 2 * tween.t);
        camera.position.lerpVectors(tween.p0, tween.p1, k);
        controls.target.lerpVectors(tween.t0, tween.t1, k);
        if (tween.t >= 1) tween = null;
      }
      controls.update();
    },
    resize(w, h) {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    },
    setActive(v) {
      active = v;
      controls.enabled = v;
      $('viewerUI').hidden = !v;
      if (!v) listPanel.hidden = true;
      canvas.style.cursor = v ? 'grab' : '';
      if (v) {
        camera.position.set(...VIEWS.start.pos);
        controls.target.set(...VIEWS.start.target);
        controls.update();
      }
    },
  };
}