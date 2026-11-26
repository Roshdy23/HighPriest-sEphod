import * as THREE from 'three';
import './style.css';
import { createRoad } from './road.js';
import { createViewer } from './viewer.js';

const canvas = document.getElementById('canvas');
const fade = document.getElementById('fade');

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const viewer = createViewer(renderer);
const road = createRoad(renderer, { onComplete: goToViewer });
let current = road;

document.getElementById('beginBtn').addEventListener('click', () => {
  document.getElementById('intro').hidden = true;
  road.begin();
});

// The gate opens -> fade out, switch to the high priest, fade in
function goToViewer() {
  fade.classList.add('show');
  setTimeout(() => {
    road.setActive(false);
    current = viewer;
    viewer.setActive(true);
    fade.classList.remove('show');
  }, 1000);
}

// testing shortcut: add ?viewer to the URL to jump straight to the high priest
if (new URLSearchParams(location.search).has('viewer')) {
  document.getElementById('intro').hidden = true;
  road.setActive(false);
  current = viewer;
  viewer.setActive(true);
}

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  road.resize(w, h);
  viewer.resize(w, h);
});

const clock = new THREE.Clock();
function animate() {
  const dt = Math.min(clock.getDelta(), 0.05);
  current.update(dt);
  renderer.render(current.scene, current.camera);
  requestAnimationFrame(animate);
}
animate();