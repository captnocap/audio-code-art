// Electron Orbitals Mode - Quantum probability clouds
// Visualizes atomic orbitals (s, p, d shapes) with audio-driven excitation

import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

export class OrbitalsMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'orbitals'
    this.description = 'Quantum electron orbital probability clouds'

    // Current orbital configuration
    this.orbitalType = 's' // s, p, d, f
    this.principalQuantum = 1 // n = 1, 2, 3, 4
    this.magneticQuantum = 0 // m = -l to +l

    // Target for smooth transitions
    this.targetType = 's'
    this.transitionProgress = 1

    // Probability cloud particles
    this.cloudParticles = []
    this.maxParticles = 3000

    // Animation
    this.phase = 0
    this.rotationX = 0
    this.rotationY = 0
    this.rotationZ = 0

    // Nucleus
    this.nucleusX = 0
    this.nucleusY = 0

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Energy level (determines color)
    this.energyLevel = 0
  }

  init() {
    this.nucleusX = this.width / 2
    this.nucleusY = this.height / 2
    this.clear()
    this.generateCloud()
  }

  // Generate probability cloud based on orbital type
  generateCloud() {
    this.cloudParticles = []

    for (let i = 0; i < this.maxParticles; i++) {
      // Sample position from probability distribution
      const pos = this.sampleOrbitalPosition(this.orbitalType, this.principalQuantum, this.magneticQuantum)

      this.cloudParticles.push({
        x: pos.x,
        y: pos.y,
        z: pos.z,
        baseX: pos.x,
        baseY: pos.y,
        baseZ: pos.z,
        probability: pos.prob,
        phase: Math.random() * Math.PI * 2
      })
    }
  }

  // Sample position from orbital probability distribution
  sampleOrbitalPosition(type, n, m) {
    const scale = 50 + n * 30 // Larger orbitals for higher n

    // Use rejection sampling based on orbital shape
    let x, y, z, prob

    switch (type) {
      case 's': // Spherical
        // Gaussian distribution
        const r = this.randomGaussian() * scale * 0.5
        const theta = Math.random() * Math.PI * 2
        const phi = Math.acos(2 * Math.random() - 1)

        x = r * Math.sin(phi) * Math.cos(theta)
        y = r * Math.sin(phi) * Math.sin(theta)
        z = r * Math.cos(phi)
        prob = Math.exp(-r * r / (scale * scale))
        break

      case 'p': // Dumbbell shape
        // p orbital has lobes along an axis
        const pR = Math.abs(this.randomGaussian()) * scale * 0.4
        const pTheta = Math.random() * Math.PI * 2
        const pSign = Math.random() < 0.5 ? 1 : -1

        if (m === 0) { // pz - vertical
          x = pR * 0.3 * Math.cos(pTheta)
          z = pR * 0.3 * Math.sin(pTheta)
          y = pSign * pR
        } else if (m === 1) { // px
          y = pR * 0.3 * Math.cos(pTheta)
          z = pR * 0.3 * Math.sin(pTheta)
          x = pSign * pR
        } else { // py
          x = pR * 0.3 * Math.cos(pTheta)
          y = pR * 0.3 * Math.sin(pTheta)
          z = pSign * pR
        }
        prob = pR * Math.exp(-pR / scale)
        break

      case 'd': // Cloverleaf/donut shapes
        const dR = Math.abs(this.randomGaussian()) * scale * 0.5
        const dTheta = Math.random() * Math.PI * 2
        const dPhi = Math.random() * Math.PI * 2

        if (m === 0) { // dz2 - donut with lobes
          const rXY = dR * Math.abs(Math.sin(dPhi))
          x = rXY * Math.cos(dTheta)
          z = rXY * Math.sin(dTheta)
          y = dR * Math.cos(dPhi) * (Math.random() < 0.3 ? 1.5 : 0.5)
        } else { // Other d orbitals - cloverleaf
          const lobeAngle = dTheta + (m - 1) * Math.PI / 4
          const lobeMag = Math.abs(Math.sin(2 * lobeAngle))
          x = dR * lobeMag * Math.cos(lobeAngle)
          z = dR * lobeMag * Math.sin(lobeAngle)
          y = (Math.random() - 0.5) * dR * 0.3
        }
        prob = dR * dR * Math.exp(-dR / scale)
        break

      case 'f': // Complex multi-lobed
        const fR = Math.abs(this.randomGaussian()) * scale * 0.6
        const fTheta = Math.random() * Math.PI * 2
        const fPhi = Math.random() * Math.PI

        // f orbitals have complex angular dependence
        const fLobe = Math.abs(Math.sin(3 * fTheta) * Math.sin(fPhi))
        x = fR * fLobe * Math.sin(fPhi) * Math.cos(fTheta)
        z = fR * fLobe * Math.sin(fPhi) * Math.sin(fTheta)
        y = fR * fLobe * Math.cos(fPhi)
        prob = fR * fR * fR * Math.exp(-fR / scale)
        break

      default:
        x = y = z = 0
        prob = 0
    }

    return { x, y, z, prob: Math.min(1, prob) }
  }

  randomGaussian() {
    // Box-Muller transform
    const u1 = Math.random()
    const u2 = Math.random()
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  }

  resize(width, height) {
    super.resize(width, height)
    this.nucleusX = width / 2
    this.nucleusY = height / 2
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude, centroid, dominantFrequency } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Phase animation
    this.phase += 0.02 + normalizedTempo * 0.03

    // Rotation based on audio
    this.rotationY += 0.005 + this.smoothMid * 0.02
    this.rotationX = Math.sin(this.phase * 0.5) * 0.3 + this.smoothBass * 0.2
    this.rotationZ = Math.cos(this.phase * 0.3) * 0.1

    // Energy level affects glow
    this.energyLevel = this.smoothAmplitude

    // Change orbital type based on dominant frequency
    let newType = 's'
    if (dominantFrequency < 0.25) {
      newType = 's'
      this.principalQuantum = 1 + Math.floor(this.smoothBass * 3)
    } else if (dominantFrequency < 0.5) {
      newType = 'p'
      this.principalQuantum = 2
      this.magneticQuantum = Math.floor(centroid * 3) % 3
    } else if (dominantFrequency < 0.75) {
      newType = 'd'
      this.principalQuantum = 3
      this.magneticQuantum = Math.floor(centroid * 5) % 5
    } else {
      newType = 'f'
      this.principalQuantum = 4
      this.magneticQuantum = Math.floor(centroid * 7) % 7
    }

    // Transition to new orbital on beat
    if (onBeat && beatIntensity > 0.5 && newType !== this.orbitalType) {
      this.targetType = newType
      this.transitionProgress = 0
    }

    // Smooth transition
    if (this.transitionProgress < 1) {
      this.transitionProgress += 0.02

      if (this.transitionProgress >= 0.5 && this.orbitalType !== this.targetType) {
        this.orbitalType = this.targetType
        this.generateCloud()
      }
    }

    // Update particle positions (breathing/pulsing)
    const breathe = 1 + Math.sin(this.phase * 2) * 0.1 * this.smoothAmplitude
    const excitation = this.smoothHigh * 0.5

    for (const p of this.cloudParticles) {
      // Breathing effect
      p.x = p.baseX * breathe
      p.y = p.baseY * breathe
      p.z = p.baseZ * breathe

      // Excitation (particles move outward)
      if (excitation > 0.1) {
        const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) || 1
        const expand = 1 + excitation * Math.sin(p.phase + this.phase * 3) * 0.3
        p.x *= expand
        p.y *= expand
        p.z *= expand
      }

      // Individual phase for shimmer
      p.phase += 0.05
    }
  }

  // 3D rotation and projection
  project(x, y, z) {
    // Rotate around Y axis
    let x1 = x * Math.cos(this.rotationY) - z * Math.sin(this.rotationY)
    let z1 = x * Math.sin(this.rotationY) + z * Math.cos(this.rotationY)

    // Rotate around X axis
    let y1 = y * Math.cos(this.rotationX) - z1 * Math.sin(this.rotationX)
    let z2 = y * Math.sin(this.rotationX) + z1 * Math.cos(this.rotationX)

    // Simple perspective projection
    const perspective = 500
    const scale = perspective / (perspective + z2)

    return {
      x: this.nucleusX + x1 * scale,
      y: this.nucleusY + y1 * scale,
      z: z2,
      scale
    }
  }

  draw() {
    const ctx = this.ctx

    // Dark background
    ctx.fillStyle = 'rgb(5, 5, 15)'
    ctx.fillRect(0, 0, this.width, this.height)

    // Get orbital color based on energy
    const color = pitchTempoToRGB(this.energyLevel, 0.5, 0.8)

    // Sort particles by z for proper depth rendering
    const projected = this.cloudParticles.map(p => ({
      ...this.project(p.x, p.y, p.z),
      probability: p.probability,
      phase: p.phase
    }))
    projected.sort((a, b) => a.z - b.z)

    // Draw probability cloud
    for (const p of projected) {
      const shimmer = 0.5 + Math.sin(p.phase) * 0.3
      const alpha = p.probability * p.scale * shimmer * (0.3 + this.energyLevel * 0.5)
      const size = (1 + p.probability * 2) * p.scale

      // Particle with glow
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 3)
      gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`)
      gradient.addColorStop(0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha * 0.3})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x, p.y, size * 3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw nucleus
    const nucleusSize = 8 + this.smoothBass * 5
    const nucleusGradient = ctx.createRadialGradient(
      this.nucleusX, this.nucleusY, 0,
      this.nucleusX, this.nucleusY, nucleusSize * 2
    )
    nucleusGradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    nucleusGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.8)')
    nucleusGradient.addColorStop(0.6, 'rgba(255, 100, 50, 0.4)')
    nucleusGradient.addColorStop(1, 'transparent')

    ctx.fillStyle = nucleusGradient
    ctx.beginPath()
    ctx.arc(this.nucleusX, this.nucleusY, nucleusSize * 2, 0, Math.PI * 2)
    ctx.fill()

    // Orbital info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    ctx.font = '14px monospace'
    ctx.fillText(`Orbital: ${this.principalQuantum}${this.orbitalType}`, 10, 25)
    ctx.fillText(`m = ${this.magneticQuantum}`, 10, 45)
    ctx.fillText(`Energy: ${this.energyLevel.toFixed(2)}`, 10, 65)

    // Draw orbital diagram symbol
    this.drawOrbitalSymbol(ctx, this.width - 80, 50)
  }

  drawOrbitalSymbol(ctx, x, y) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.lineWidth = 2

    const size = 25

    switch (this.orbitalType) {
      case 's':
        ctx.beginPath()
        ctx.arc(x, y, size, 0, Math.PI * 2)
        ctx.stroke()
        break

      case 'p':
        // Dumbbell
        ctx.beginPath()
        ctx.ellipse(x, y - size * 0.6, size * 0.4, size * 0.8, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.beginPath()
        ctx.ellipse(x, y + size * 0.6, size * 0.4, size * 0.8, 0, 0, Math.PI * 2)
        ctx.stroke()
        break

      case 'd':
        // Cloverleaf
        for (let i = 0; i < 4; i++) {
          const angle = i * Math.PI / 2 + Math.PI / 4
          ctx.beginPath()
          ctx.ellipse(
            x + Math.cos(angle) * size * 0.5,
            y + Math.sin(angle) * size * 0.5,
            size * 0.4, size * 0.3, angle, 0, Math.PI * 2
          )
          ctx.stroke()
        }
        break

      case 'f':
        // Complex shape
        for (let i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3
          ctx.beginPath()
          ctx.ellipse(
            x + Math.cos(angle) * size * 0.4,
            y + Math.sin(angle) * size * 0.4,
            size * 0.3, size * 0.2, angle, 0, Math.PI * 2
          )
          ctx.stroke()
        }
        break
    }
  }

  clear() {
    this.cloudParticles = []
    this.orbitalType = 's'
    this.principalQuantum = 1
    this.magneticQuantum = 0
    this.phase = 0
    this.rotationX = 0
    this.rotationY = 0
    this.rotationZ = 0
    this.energyLevel = 0
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
    this.ctx.fillStyle = 'rgb(5, 5, 15)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
