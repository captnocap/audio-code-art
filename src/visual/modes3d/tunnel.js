import * as THREE from 'three'
import { Visualization3DMode } from './base.js'

// Tunnel Mode - Infinite tunnel you fly through
// Classic VJ visual with audio-reactive walls
export class TunnelMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'tunnel3d'
    this.description = 'Infinite tunnel flying through audio-reactive space'

    this.tunnelSegments = []
    this.segmentCount = 50
    this.segmentLength = 2
    this.tunnelRadius = 5
    this.speed = 0

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Create tunnel segments
    for (let i = 0; i < this.segmentCount; i++) {
      this.createSegment(scene, i)
    }

    // Fog for depth
    scene.fog = new THREE.FogExp2(0x0a0a0a, 0.03)

    // Position camera at tunnel entrance looking in
    camera.position.set(0, 0, 0)
    camera.lookAt(0, 0, -10)

    // Disable orbit controls auto-rotate for this mode
    // (camera should stay fixed looking forward)
  }

  createSegment(scene, index) {
    const geometry = new THREE.TorusGeometry(
      this.tunnelRadius,
      0.1 + Math.random() * 0.1,
      8,
      32
    )

    // Rotate to face forward (tunnel axis along Z)
    geometry.rotateX(Math.PI / 2)

    const hue = (index / this.segmentCount) % 1
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(hue, 0.8, 0.5),
      transparent: true,
      opacity: 0.8,
      wireframe: index % 3 !== 0
    })

    const ring = new THREE.Mesh(geometry, material)
    ring.position.z = -index * this.segmentLength

    scene.add(ring)

    this.tunnelSegments.push({
      mesh: ring,
      baseHue: hue,
      index: index
    })

    // Add cross beams for some segments
    if (index % 5 === 0) {
      this.addCrossBeams(scene, ring.position.z)
    }
  }

  addCrossBeams(scene, zPos) {
    const beamCount = 4
    for (let i = 0; i < beamCount; i++) {
      const angle = (i / beamCount) * Math.PI * 2

      const geometry = new THREE.BoxGeometry(0.1, 0.1, this.segmentLength * 5)
      const material = new THREE.MeshBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.5
      })

      const beam = new THREE.Mesh(geometry, material)
      beam.position.set(
        Math.cos(angle) * this.tunnelRadius * 0.9,
        Math.sin(angle) * this.tunnelRadius * 0.9,
        zPos
      )

      scene.add(beam)
      this.tunnelSegments.push({
        mesh: beam,
        isBeam: true,
        angle: angle
      })
    }
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { bass, mid, high, amplitude, centroid } = weighted
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    // Smooth audio values
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Speed based on tempo and amplitude
    this.speed = 0.2 + normalizedTempo * 0.5 + this.smoothAmplitude * 0.3

    // Beat boost
    if (onBeat) {
      this.speed += beatIntensity * 0.5
    }

    // Move camera forward (or move tunnel backward)
    for (const segment of this.tunnelSegments) {
      segment.mesh.position.z += this.speed

      // Recycle segments that pass the camera
      if (segment.mesh.position.z > this.segmentLength) {
        segment.mesh.position.z -= this.segmentCount * this.segmentLength

        // New random properties
        if (!segment.isBeam) {
          segment.baseHue = Math.random()
        }
      }

      // Update ring properties
      if (!segment.isBeam) {
        // Radius pulse with bass
        const radiusFactor = 1 + this.smoothBass * 0.3
        segment.mesh.scale.set(radiusFactor, radiusFactor, 1)

        // Color based on audio + position
        const distFromCamera = -segment.mesh.position.z
        const hue = (segment.baseHue + centroid + elapsed * 0.1) % 1
        const lightness = 0.4 + this.smoothAmplitude * 0.3
        segment.mesh.material.color.setHSL(hue, 0.8, lightness)

        // Rotation
        segment.mesh.rotation.z += (this.smoothMid * 0.02) * (segment.index % 2 === 0 ? 1 : -1)

        // Opacity based on distance
        const opacity = Math.max(0.2, 1 - distFromCamera / (this.segmentCount * this.segmentLength))
        segment.mesh.material.opacity = opacity * (0.6 + this.smoothHigh * 0.4)
      } else {
        // Beams
        segment.mesh.rotation.z = segment.angle + elapsed * 0.5
        segment.mesh.material.opacity = 0.3 + this.smoothHigh * 0.5
        segment.mesh.material.color.setHSL(centroid, 0.8, 0.6)
      }
    }

    // Shake camera slightly with bass
    if (this.camera) {
      this.camera.position.x = Math.sin(elapsed * 5) * this.smoothBass * 0.2
      this.camera.position.y = Math.cos(elapsed * 3) * this.smoothBass * 0.2
      this.camera.rotation.z = Math.sin(elapsed * 2) * this.smoothHigh * 0.05
    }
  }

  dispose() {
    for (const segment of this.tunnelSegments) {
      segment.mesh.geometry.dispose()
      segment.mesh.material.dispose()
    }
  }

  clear() {
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
    this.speed = 0
  }
}
