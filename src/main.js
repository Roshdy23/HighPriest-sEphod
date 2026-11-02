import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import './style.css'
import { createHighPriest } from './highPriest.js'

const canvas = document.getElementById('canvas')

const scene = new THREE.Scene()
scene.background = new THREE.Color('#1a1a20')

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 0.2, 4.2)

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true

const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture

scene.add(new THREE.AmbientLight(0xffffff, 0.4))
const key = new THREE.DirectionalLight(0xffffff, 2)
key.position.set(2, 3, 4)
key.castShadow = true
scene.add(key)

const priest = createHighPriest({ breastplate: true, pedestal: true })
scene.add(priest)

const controls = new OrbitControls(camera, canvas)
controls.target.set(0, -0.1, 0)
controls.enableDamping = true
controls.autoRotate = true
controls.autoRotateSpeed = 1.5

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

function animate() {
  controls.update()
  renderer.render(scene, camera)
  requestAnimationFrame(animate)
}
animate()