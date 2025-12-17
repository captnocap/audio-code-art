import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

// Concentric rings pulse outward on beats
// Creates hypnotic ripple patterns
export class RingsMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'rings'
    this.description = 'Concentric rings pulse outward on beats'
    this.rings = []
    this.centerX = 0
    this.centerY = 0
    this.maxRadius = 0
  }

  init() {
    this.centerX = this.width / 2
    this.centerY = this.height / 2
    this.maxRadius = Math.sqrt(this.width * this.width + this.height * this.height) / 2
    this.rings = []
  }

  resize(width, height) {
    super.resize(width, height)
    this.centerX = width / 2
    this.centerY = height / 2
    this.maxRadius = Math.sqrt(width * width + height * height) / 2
  }

  update(audioFeatures, beatInfo) {
    const { amplitude, centroid, bass, mid, high } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo, isSaturated } = beatInfo

    // Spawn ring on beat - bigger, more prominent
    if (onBeat) {
      this.rings.push({
        radius: 10,
        speed: 3 + beatIntensity * 5 + normalizedTempo * 3,
        thickness: 3 + beatIntensity * 10,
        rgb: pitchTempoToRGB(centroid, normalizedTempo, amplitude),
        color: pitchTempoToColor(centroid, normalizedTempo, amplitude),
        alpha: 0.9,
        birth: Date.now()
      })
    }

    // Continuous rapid-fire rings based on amplitude - MUCH more frequent
    // Spawn multiple rings per frame when loud
    const spawnRate = amplitude * 0.8  // Up to 80% chance per frame when loud
    const ringCount = isSaturated ? 3 : (amplitude > 0.5 ? 2 : 1)

    for (let i = 0; i < ringCount; i++) {
      if (Math.random() < spawnRate) {
        // Vary the frequency source for color variety
        const freqSource = i === 0 ? centroid : (i === 1 ? bass * 0.3 : high * 0.7 + 0.3)
        this.rings.push({
          radius: 5 + Math.random() * 10,
          speed: 1.5 + amplitude * 4 + Math.random() * 2,
          thickness: 0.5 + amplitude * 4,
          rgb: pitchTempoToRGB(freqSource, normalizedTempo, amplitude),
          color: pitchTempoToColor(freqSource, normalizedTempo, amplitude),
          alpha: 0.2 + amplitude * 0.5,
          birth: Date.now()
        })
      }
    }

    // Extra burst during saturation (blast beats)
    if (isSaturated && Math.random() < 0.5) {
      this.rings.push({
        radius: 3,
        speed: 2 + Math.random() * 3,
        thickness: 1 + Math.random() * 2,
        rgb: pitchTempoToRGB(centroid, normalizedTempo, 0.7),
        alpha: 0.4,
        birth: Date.now()
      })
    }

    // Update rings
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i]
      ring.radius += ring.speed
      ring.alpha *= 0.995  // Slow fade

      // Remove when too large or faded
      if (ring.radius > this.maxRadius || ring.alpha < 0.01) {
        this.rings.splice(i, 1)
      }
    }
  }

  draw() {
    // Fade background
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.03)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw rings
    for (const ring of this.rings) {
      this.ctx.beginPath()
      this.ctx.arc(this.centerX, this.centerY, ring.radius, 0, Math.PI * 2)
      this.ctx.strokeStyle = `rgba(${ring.rgb.r}, ${ring.rgb.g}, ${ring.rgb.b}, ${ring.alpha})`
      this.ctx.lineWidth = ring.thickness
      this.ctx.stroke()
    }
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.rings = []
  }
}
