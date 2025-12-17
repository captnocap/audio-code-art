import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// 3D Renderer using three.js
// Manages scene, camera, and 3D visualization modes
export class Renderer3D {
  constructor(container) {
    this.container = container
    this.width = window.innerWidth
    this.height = window.innerHeight

    // Three.js basics
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0a0a0a)

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.width / this.height,
      0.1,
      1000
    )
    this.camera.position.z = 5

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true  // Required for GIF/PNG capture
    })
    this.renderer.setSize(this.width, this.height)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.domElement.style.position = 'absolute'
    this.renderer.domElement.style.top = '0'
    this.renderer.domElement.style.left = '0'
    this.renderer.domElement.style.zIndex = '1'
    this.renderer.domElement.id = 'canvas3d'

    // Orbit controls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.controls.enableZoom = true
    this.controls.autoRotate = true
    this.controls.autoRotateSpeed = 0.5

    // Current mode
    this.currentMode = null
    this.currentModeName = null

    // Post-processing (bloom etc) can be added later
    this.clock = new THREE.Clock()

    // Handle resize
    window.addEventListener('resize', () => this.resize())
  }

  mount() {
    this.container.appendChild(this.renderer.domElement)
  }

  unmount() {
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }

  show() {
    this.renderer.domElement.style.display = 'block'
  }

  hide() {
    this.renderer.domElement.style.display = 'none'
  }

  resize() {
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.camera.aspect = this.width / this.height
    this.camera.updateProjectionMatrix()

    this.renderer.setSize(this.width, this.height)

    if (this.currentMode && this.currentMode.resize) {
      this.currentMode.resize(this.width, this.height)
    }
  }

  setMode(mode) {
    // Clear previous mode
    if (this.currentMode) {
      this.currentMode.dispose()
      // Clear scene
      while (this.scene.children.length > 0) {
        const obj = this.scene.children[0]
        this.scene.remove(obj)
        if (obj.geometry) obj.geometry.dispose()
        if (obj.material) {
          if (Array.isArray(obj.material)) {
            obj.material.forEach(m => m.dispose())
          } else {
            obj.material.dispose()
          }
        }
      }
    }

    this.currentMode = mode
    this.currentModeName = mode.name

    // Initialize the mode with our scene and camera
    mode.init(this.scene, this.camera, this.renderer)
  }

  update(audioFeatures, beatInfo) {
    const delta = this.clock.getDelta()
    const elapsed = this.clock.getElapsedTime()

    this.controls.update()

    if (this.currentMode) {
      this.currentMode.update(audioFeatures, beatInfo, delta, elapsed)
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }

  clear() {
    if (this.currentMode) {
      this.currentMode.clear()
    }
  }
}
