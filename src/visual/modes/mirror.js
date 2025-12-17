import { VisualizationMode } from './base.js'
import { FlowField } from '../flowfield.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

// Kaleidoscope/mirror mode - radial symmetry
// Particles are mirrored around center creating mandala-like patterns
export class MirrorMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'mirror'
    this.description = 'Kaleidoscope with radial symmetry'
    this.segments = 8  // Number of mirror segments
    this.flowField = null
    this.particles = []
    this.maxParticles = 1000
    this.centerX = 0
    this.centerY = 0
  }

  init() {
    this.centerX = this.width / 2
    this.centerY = this.height / 2
    this.flowField = new FlowField(this.width, this.height, 25)
    this.particles = []
  }

  resize(width, height) {
    super.resize(width, height)
    this.centerX = width / 2
    this.centerY = height / 2
    if (this.flowField) this.flowField.resize(width, height)
  }

  update(audioFeatures, beatInfo) {
    const { amplitude, centroid, bass, mid, high } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo, isSaturated } = beatInfo

    // Update flow field
    this.flowField.update(audioFeatures)

    // Spawn particles
    const spawnCount = Math.floor(3 + amplitude * 5)
    for (let i = 0; i < spawnCount; i++) {
      if (this.particles.length >= this.maxParticles) break

      // Spawn in one segment, will be mirrored
      const angle = Math.random() * (Math.PI * 2 / this.segments)
      const dist = 20 + Math.random() * Math.min(this.width, this.height) * 0.4

      this.particles.push({
        x: this.centerX + Math.cos(angle) * dist,
        y: this.centerY + Math.sin(angle) * dist,
        vx: 0,
        vy: 0,
        size: 1 + amplitude * 2,
        rgb: pitchTempoToRGB(centroid + (Math.random() - 0.5) * 0.2, normalizedTempo, amplitude),
        alpha: 0.6 + amplitude * 0.4,
        life: 1,
        trail: []
      })
    }

    // Extra burst on beat
    if (onBeat) {
      for (let i = 0; i < 10 * beatIntensity; i++) {
        const angle = Math.random() * (Math.PI * 2 / this.segments)
        const dist = 10 + Math.random() * 50

        this.particles.push({
          x: this.centerX + Math.cos(angle) * dist,
          y: this.centerY + Math.sin(angle) * dist,
          vx: Math.cos(angle) * beatIntensity * 3,
          vy: Math.sin(angle) * beatIntensity * 3,
          size: 2 + beatIntensity * 3,
          rgb: pitchTempoToRGB(centroid, normalizedTempo, amplitude),
          alpha: 0.8,
          life: 1,
          trail: []
        })
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]

      // Flow field influence
      const flow = this.flowField.getVector(p.x, p.y)
      p.vx = p.vx * 0.95 + flow.x * 0.3
      p.vy = p.vy * 0.95 + flow.y * 0.3

      // Store trail
      p.trail.push({ x: p.x, y: p.y })
      if (p.trail.length > 15) p.trail.shift()

      // Move
      p.x += p.vx
      p.y += p.vy

      // Fade
      p.life -= 0.005
      p.alpha = p.life * 0.8

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1)
      }
    }
  }

  draw() {
    // Fade
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.05)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw each particle mirrored across all segments
    const segmentAngle = (Math.PI * 2) / this.segments

    for (const p of this.particles) {
      // Get position relative to center
      const relX = p.x - this.centerX
      const relY = p.y - this.centerY
      const dist = Math.hypot(relX, relY)
      const angle = Math.atan2(relY, relX)

      // Draw in each segment
      for (let s = 0; s < this.segments; s++) {
        const segAngle = s * segmentAngle
        const mirror = s % 2 === 1  // Alternate mirror

        let drawAngle = mirror ? segAngle - angle : segAngle + angle
        const drawX = this.centerX + Math.cos(drawAngle) * dist
        const drawY = this.centerY + Math.sin(drawAngle) * dist

        // Draw trail
        if (p.trail.length > 1) {
          this.ctx.beginPath()
          for (let t = 0; t < p.trail.length; t++) {
            const tRelX = p.trail[t].x - this.centerX
            const tRelY = p.trail[t].y - this.centerY
            const tDist = Math.hypot(tRelX, tRelY)
            const tAngle = Math.atan2(tRelY, tRelX)
            const tDrawAngle = mirror ? segAngle - tAngle : segAngle + tAngle
            const tx = this.centerX + Math.cos(tDrawAngle) * tDist
            const ty = this.centerY + Math.sin(tDrawAngle) * tDist

            if (t === 0) this.ctx.moveTo(tx, ty)
            else this.ctx.lineTo(tx, ty)
          }
          this.ctx.strokeStyle = `rgba(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b}, ${p.alpha * 0.3})`
          this.ctx.lineWidth = p.size * 0.5
          this.ctx.stroke()
        }

        // Draw particle
        this.ctx.beginPath()
        this.ctx.arc(drawX, drawY, p.size, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(${p.rgb.r}, ${p.rgb.g}, ${p.rgb.b}, ${p.alpha})`
        this.ctx.fill()
      }
    }
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.particles = []
  }
}
