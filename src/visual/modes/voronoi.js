// Voronoi Shatter Mode - Cellular patterns that fracture on beats
// Sites explode outward and reconverge, creating satisfying visual impact

import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

class VoronoiSite {
  constructor(x, y, color, rgb) {
    this.x = x
    this.y = y
    this.homeX = x
    this.homeY = y
    this.vx = 0
    this.vy = 0
    this.color = color
    this.rgb = rgb
  }

  update(attractStrength) {
    // Spring back to home position
    const dx = this.homeX - this.x
    const dy = this.homeY - this.y

    this.vx += dx * attractStrength
    this.vy += dy * attractStrength

    // Damping
    this.vx *= 0.92
    this.vy *= 0.92

    this.x += this.vx
    this.y += this.vy
  }

  explode(centerX, centerY, force) {
    const dx = this.x - centerX
    const dy = this.y - centerY
    const dist = Math.sqrt(dx * dx + dy * dy) || 1

    this.vx += (dx / dist) * force
    this.vy += (dy / dist) * force
  }
}

export class VoronoiMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'voronoi'
    this.description = 'Cellular patterns that fracture on beats'

    this.sites = []
    this.numSites = 60 // Fewer but larger cells look better

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Cached rendering
    this.offscreenCanvas = null
    this.offscreenCtx = null
  }

  init() {
    this.clear()
    this.createSites()

    // Create offscreen canvas for Voronoi rendering
    this.offscreenCanvas = document.createElement('canvas')
    this.offscreenCanvas.width = this.width
    this.offscreenCanvas.height = this.height
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')
  }

  createSites() {
    this.sites = []

    // Use Poisson disk sampling for better distribution
    const minDist = Math.sqrt((this.width * this.height) / this.numSites) * 0.8
    const candidates = []

    // Start with random point
    candidates.push({
      x: Math.random() * this.width,
      y: Math.random() * this.height
    })

    while (this.sites.length < this.numSites && candidates.length > 0) {
      const idx = Math.floor(Math.random() * candidates.length)
      const candidate = candidates[idx]

      // Check distance to existing sites
      let valid = true
      for (const site of this.sites) {
        const dx = site.x - candidate.x
        const dy = site.y - candidate.y
        if (dx * dx + dy * dy < minDist * minDist * 0.5) {
          valid = false
          break
        }
      }

      if (valid) {
        const hue = (candidate.x / this.width + candidate.y / this.height) / 2
        const color = pitchTempoToColor(hue, 0.5, 0.7)
        const rgb = pitchTempoToRGB(hue, 0.5, 0.7)

        this.sites.push(new VoronoiSite(
          candidate.x, candidate.y,
          color, rgb
        ))

        // Add new candidates around this point
        for (let i = 0; i < 10; i++) {
          const angle = Math.random() * Math.PI * 2
          const dist = minDist + Math.random() * minDist
          candidates.push({
            x: candidate.x + Math.cos(angle) * dist,
            y: candidate.y + Math.sin(angle) * dist
          })
        }
      }

      candidates.splice(idx, 1)
    }

    // Fill remaining with random
    while (this.sites.length < this.numSites) {
      const x = Math.random() * this.width
      const y = Math.random() * this.height
      const hue = (x / this.width + y / this.height) / 2
      const color = pitchTempoToColor(hue, 0.5, 0.7)
      const rgb = pitchTempoToRGB(hue, 0.5, 0.7)
      this.sites.push(new VoronoiSite(x, y, color, rgb))
    }
  }

  resize(width, height) {
    super.resize(width, height)
    this.init()
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { bass, mid, high, amplitude, centroid } = weighted
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Shatter on beat (chaos increases force, sensitivity lowers threshold)
    if (onBeat && beatIntensity > (0.5 - p.sensitivity * 0.4)) {
      const force = beatIntensity * (15 + p.chaos * 30)
      const centerX = this.width / 2
      const centerY = this.height / 2

      for (const site of this.sites) {
        site.explode(centerX, centerY, force)
      }
    }

    // Continuous disturbance during saturation (chaos amplifies)
    if (isSaturated) {
      const disturbance = 2 + p.chaos * 6
      for (const site of this.sites) {
        site.vx += (Math.random() - 0.5) * disturbance
        site.vy += (Math.random() - 0.5) * disturbance
      }
    }

    // High frequency adds jitter
    if (this.smoothHigh > 0.4) {
      const jitter = (this.smoothHigh - 0.4) * 8
      for (const site of this.sites) {
        site.x += (Math.random() - 0.5) * jitter
        site.y += (Math.random() - 0.5) * jitter
      }
    }

    // Attraction strength based on bass (heavy bass = slower return)
    const attractStrength = 0.02 + (1 - this.smoothBass) * 0.05

    // Update site colors based on current audio
    for (let i = 0; i < this.sites.length; i++) {
      const site = this.sites[i]
      site.update(attractStrength)

      // Gradually shift colors based on audio
      const localPitch = (site.x / this.width * 0.5 + centroid * 0.5)
      site.color = pitchTempoToColor(localPitch, normalizedTempo, this.smoothAmplitude)
      site.rgb = pitchTempoToRGB(localPitch, normalizedTempo, this.smoothAmplitude)
    }
  }

  draw() {
    const ctx = this.ctx

    // Draw Voronoi cells using brute force nearest-neighbor
    // (More efficient algorithms exist but this works for ~100 sites)
    this.renderVoronoi()

    // Draw the cached result
    ctx.drawImage(this.offscreenCanvas, 0, 0)

    // Draw cell edges with dark lines
    this.drawEdges(ctx)

    // Draw site centers as small dots
    for (const site of this.sites) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
      ctx.beginPath()
      ctx.arc(site.x, site.y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  renderVoronoi() {
    // Guard: need sites to render
    if (!this.sites || this.sites.length === 0) {
      this.createSites()
      if (this.sites.length === 0) return
    }

    const ctx = this.offscreenCtx
    if (!ctx) return

    const imageData = ctx.createImageData(this.width, this.height)
    const data = imageData.data

    // For each pixel, find nearest site
    // Use step=1 for full quality (was 2)
    const step = 1
    for (let y = 0; y < this.height; y += step) {
      for (let x = 0; x < this.width; x += step) {
        let minDist = Infinity
        let nearestSite = this.sites[0]

        for (const site of this.sites) {
          const dx = x - site.x
          const dy = y - site.y
          const dist = dx * dx + dy * dy

          if (dist < minDist) {
            minDist = dist
            nearestSite = site
          }
        }

        // Fill the block with nearest site's color
        for (let dy = 0; dy < step && y + dy < this.height; dy++) {
          for (let dx = 0; dx < step && x + dx < this.width; dx++) {
            const idx = ((y + dy) * this.width + (x + dx)) * 4
            data[idx] = nearestSite.rgb.r
            data[idx + 1] = nearestSite.rgb.g
            data[idx + 2] = nearestSite.rgb.b
            data[idx + 3] = 255
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0)
  }

  drawEdges(ctx) {
    // Draw cell boundaries by detecting color changes
    // Much cleaner than perpendicular bisectors
    const imageData = ctx.getImageData(0, 0, this.width, this.height)
    const data = imageData.data

    ctx.strokeStyle = 'rgba(20, 20, 30, 0.9)'
    ctx.lineWidth = 2
    ctx.beginPath()

    // Scan for edges (where adjacent pixels have different colors)
    for (let y = 1; y < this.height - 1; y += 2) {
      for (let x = 1; x < this.width - 1; x += 2) {
        const idx = (y * this.width + x) * 4
        const r = data[idx]
        const g = data[idx + 1]
        const b = data[idx + 2]

        // Check right neighbor
        const rightIdx = (y * this.width + x + 1) * 4
        const rightR = data[rightIdx]
        const rightG = data[rightIdx + 1]
        const rightB = data[rightIdx + 2]

        // Check bottom neighbor
        const bottomIdx = ((y + 1) * this.width + x) * 4
        const bottomR = data[bottomIdx]
        const bottomG = data[bottomIdx + 1]
        const bottomB = data[bottomIdx + 2]

        // If color differs significantly, it's an edge
        const diffRight = Math.abs(r - rightR) + Math.abs(g - rightG) + Math.abs(b - rightB)
        const diffBottom = Math.abs(r - bottomR) + Math.abs(g - bottomG) + Math.abs(b - bottomB)

        if (diffRight > 30) {
          ctx.moveTo(x + 0.5, y - 1)
          ctx.lineTo(x + 0.5, y + 2)
        }
        if (diffBottom > 30) {
          ctx.moveTo(x - 1, y + 0.5)
          ctx.lineTo(x + 2, y + 0.5)
        }
      }
    }
    ctx.stroke()
  }

  clear() {
    this.sites = []
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
    this.ctx.fillStyle = 'rgb(10, 10, 10)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  // SVG export for plotters
  exportSVG(screenWidth, screenHeight) {
    const scaleX = screenWidth / this.width
    const scaleY = screenHeight / this.height

    // Generate Voronoi polygons for SVG
    let paths = ''

    // Draw sites as circles
    for (const site of this.sites) {
      const x = site.x * scaleX
      const y = site.y * scaleY
      paths += `<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="3" fill="white"/>\n`
    }

    // Draw edges
    for (let i = 0; i < this.sites.length; i++) {
      for (let j = i + 1; j < this.sites.length; j++) {
        const s1 = this.sites[i]
        const s2 = this.sites[j]

        const dx = s2.x - s1.x
        const dy = s2.y - s1.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 200) {
          const midX = ((s1.x + s2.x) / 2) * scaleX
          const midY = ((s1.y + s2.y) / 2) * scaleY

          const px = -dy / dist
          const py = dx / dist

          const len = 100 * Math.min(scaleX, scaleY)

          paths += `<line x1="${(midX - px * len).toFixed(2)}" y1="${(midY - py * len).toFixed(2)}" x2="${(midX + px * len).toFixed(2)}" y2="${(midY + py * len).toFixed(2)}" stroke="white" stroke-width="1"/>\n`
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${screenWidth} ${screenHeight}">
        <rect width="100%" height="100%" fill="#0a0a0a"/>
        ${paths}
      </svg>
    `.trim()
  }
}
