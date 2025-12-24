import * as THREE from 'three'
import { Visualization3DMode } from './base.js'

// Sonic Topography Mode - 3D terrain built from audio over time
// X-Axis: Frequency bins (low left, high right)
// Y-Axis: Amplitude (height)
// Z-Axis: Time history (depth - older data recedes into distance)
export class TopographyMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'topography3d'
    this.description = 'Audio terrain - frequency x amplitude x time'

    // Grid dimensions
    this.gridWidth = 128      // Frequency bins (X)
    this.gridDepth = 256      // Time history (Z)
    this.gridSpacing = 0.5
    this.heightScale = 12     // How tall peaks get

    // Terrain data - 2D array [z][x] storing heights
    this.heightMap = null
    this.geometry = null
    this.mesh = null
    this.wireframe = null

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Camera mode
    this.cameraMode = 'surfer'  // 'surfer' | 'overview' | 'walker' | 'flight'
    this.cameraAngle = 0

    // Surfer camera shake
    this.cameraShake = 0
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Initialize height map with zeros
    this.heightMap = []
    for (let z = 0; z < this.gridDepth; z++) {
      this.heightMap.push(new Float32Array(this.gridWidth))
    }

    // Create plane geometry
    this.geometry = new THREE.PlaneGeometry(
      this.gridWidth * this.gridSpacing,
      this.gridDepth * this.gridSpacing,
      this.gridWidth - 1,
      this.gridDepth - 1
    )
    // Rotate to lay flat (Y-up terrain)
    this.geometry.rotateX(-Math.PI / 2)

    // Set up vertex colors
    const colors = new Float32Array(this.gridWidth * this.gridDepth * 3)
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    // Solid material with vertex colors
    this.solidMaterial = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: true,
      shininess: 30
    })

    // Wireframe material
    this.wireMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    })

    // Create meshes
    this.mesh = new THREE.Mesh(this.geometry, this.solidMaterial)
    this.wireframe = new THREE.Mesh(this.geometry, this.wireMaterial)

    // Center the terrain
    const offsetZ = (this.gridDepth * this.gridSpacing) / 2
    this.mesh.position.z = -offsetZ
    this.wireframe.position.z = -offsetZ

    scene.add(this.mesh)
    scene.add(this.wireframe)

    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.6)
    scene.add(ambient)

    const directional = new THREE.DirectionalLight(0xffffff, 1)
    directional.position.set(30, 50, 20)
    scene.add(directional)

    const backLight = new THREE.DirectionalLight(0xff8844, 0.3)
    backLight.position.set(-30, 20, -50)
    scene.add(backLight)

    // Fog for depth
    scene.fog = new THREE.FogExp2(0x0a0a15, 0.008)
    scene.background = new THREE.Color(0x0a0a15)

    // Camera setup
    camera.position.set(0, 40, 80)
    camera.lookAt(0, 0, -30)
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    if (!audioFeatures) return

    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { frequencies, centroid } = audioFeatures
    const { bass, mid, high, amplitude } = weighted
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    // Smooth audio values
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Shift all rows backward (conveyor belt effect)
    // Row 0 is the front (newest), higher indices are older
    for (let z = this.gridDepth - 1; z > 0; z--) {
      this.heightMap[z] = this.heightMap[z - 1]
    }

    // Create new front row from current audio frequencies
    this.heightMap[0] = new Float32Array(this.gridWidth)

    // Map frequency bins to grid columns
    if (frequencies && frequencies.length > 0) {
      const binCount = Math.min(frequencies.length, 512)

      for (let x = 0; x < this.gridWidth; x++) {
        // Map grid position to frequency bin (use log scale for better distribution)
        const normalizedX = x / this.gridWidth
        // Logarithmic mapping - more bins for low frequencies
        const logPos = Math.pow(normalizedX, 0.7)
        const binIndex = Math.floor(logPos * binCount)

        if (binIndex < frequencies.length) {
          const magnitude = frequencies[binIndex] / 255
          // Apply height with some variation
          this.heightMap[0][x] = magnitude * this.heightScale * (0.8 + this.smoothAmplitude * 0.5)
        }
      }
    }

    // Update geometry vertices
    const positions = this.geometry.attributes.position.array
    const colors = this.geometry.attributes.color.array

    for (let z = 0; z < this.gridDepth; z++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const vertexIndex = z * this.gridWidth + x
        const posIndex = vertexIndex * 3

        // Update Y (height) component
        const height = this.heightMap[z] ? this.heightMap[z][x] : 0
        positions[posIndex + 1] = height

        // Color based on height and time (older = more faded)
        const normalizedHeight = height / this.heightScale
        const ageFactor = 1 - (z / this.gridDepth) * 0.5  // Fade older data

        // Height-based hue: blue (low) -> cyan -> green -> yellow -> red (high)
        const hue = 0.65 - normalizedHeight * 0.65
        const saturation = 0.8
        const lightness = (0.2 + normalizedHeight * 0.5) * ageFactor

        const color = new THREE.Color()
        color.setHSL(hue, saturation, lightness)

        colors[posIndex] = color.r
        colors[posIndex + 1] = color.g
        colors[posIndex + 2] = color.b
      }
    }

    this.geometry.attributes.position.needsUpdate = true
    this.geometry.attributes.color.needsUpdate = true
    this.geometry.computeVertexNormals()

    // Beat effects - intensify colors on beat
    if (onBeat && beatIntensity > 0.5) {
      this.wireMaterial.opacity = 0.3 + beatIntensity * 0.4
      this.wireMaterial.color.setHSL(centroid, 0.9, 0.6)
    } else {
      this.wireMaterial.opacity = Math.max(0.2, this.wireMaterial.opacity - delta * 2)
    }

    // Update camera based on mode
    this.updateCamera(elapsed, delta)
  }

  updateCamera(elapsed, delta) {
    if (!this.camera) return

    const terrainCenterZ = -(this.gridDepth * this.gridSpacing) / 2
    const terrainWidth = this.gridWidth * this.gridSpacing

    if (this.cameraMode === 'surfer') {
      // Head-on view - sitting at the front watching terrain come at you
      // Camera is in front of the terrain, looking back at incoming waves

      // Sample heights at the front edge for camera shake
      const frontHeights = this.heightMap[0] || new Float32Array(this.gridWidth)
      const avgHeight = Array.from(frontHeights).reduce((a, b) => a + b, 0) / this.gridWidth
      const maxHeight = Math.max(...frontHeights)

      // Camera shake based on audio intensity
      this.cameraShake = this.cameraShake * 0.9 + this.smoothAmplitude * 0.1
      const shakeX = Math.sin(elapsed * 15) * this.cameraShake * 2
      const shakeY = Math.cos(elapsed * 12) * this.cameraShake * 1.5

      // Position: in front of terrain, slightly elevated, looking back
      const baseHeight = 8 + this.smoothBass * 5
      this.camera.position.set(
        shakeX,
        baseHeight + shakeY + avgHeight * 0.3,
        25  // In front of the terrain (positive Z)
      )

      // Look at the center of the incoming terrain
      this.camera.lookAt(0, avgHeight * 0.5, -40)

      // Slight roll with high frequencies
      this.camera.rotation.z = Math.sin(elapsed * 3) * this.smoothHigh * 0.05

    } else if (this.cameraMode === 'overview') {
      // Slow orbit around the terrain
      this.cameraAngle += delta * 0.1
      const radius = 80
      const height = 50 + Math.sin(elapsed * 0.2) * 10

      this.camera.position.x = Math.sin(this.cameraAngle) * radius
      this.camera.position.y = height
      this.camera.position.z = Math.cos(this.cameraAngle) * radius + terrainCenterZ

      this.camera.lookAt(0, 5, terrainCenterZ)

    } else if (this.cameraMode === 'walker') {
      // Walk forward through the terrain
      const walkSpeed = 10
      const walkZ = (elapsed * walkSpeed) % (this.gridDepth * this.gridSpacing)

      // Sample height at current position
      const zIndex = Math.floor(walkZ / this.gridSpacing) % this.gridDepth
      const height = this.heightMap[zIndex] ? this.heightMap[zIndex][64] : 0

      this.camera.position.set(0, height + 5, -walkZ + 20)
      this.camera.lookAt(0, height + 2, -walkZ - 30)

    } else if (this.cameraMode === 'flight') {
      // Fly through the terrain canyon
      const flySpeed = 15
      const flyZ = (elapsed * flySpeed) % (this.gridDepth * this.gridSpacing)

      this.camera.position.set(
        Math.sin(elapsed * 0.5) * 20,
        20 + Math.sin(elapsed * 0.3) * 5,
        -flyZ + 30
      )
      this.camera.lookAt(0, 10, -flyZ - 50)
    }
  }

  // Cycle through camera modes (press C to cycle)
  nextCameraMode() {
    const modes = ['surfer', 'overview', 'walker', 'flight']
    const currentIndex = modes.indexOf(this.cameraMode)
    this.cameraMode = modes[(currentIndex + 1) % modes.length]
    console.log(`Camera mode: ${this.cameraMode}`)
  }

  // Handle keyboard input
  handleKeyPress(key) {
    if (key === 'c' || key === 'C') {
      this.nextCameraMode()
    }
  }

  resize(width, height) {
    // Camera aspect ratio is handled by Renderer3D
  }

  dispose() {
    if (this.geometry) this.geometry.dispose()
    if (this.solidMaterial) this.solidMaterial.dispose()
    if (this.wireMaterial) this.wireMaterial.dispose()
    if (this.mesh) this.scene.remove(this.mesh)
    if (this.wireframe) this.scene.remove(this.wireframe)
  }

  clear() {
    // Reset height map
    for (let z = 0; z < this.gridDepth; z++) {
      if (this.heightMap[z]) {
        this.heightMap[z].fill(0)
      }
    }
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
  }
}
