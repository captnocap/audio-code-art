// Isometric Architecture Mode - Procedural cityscapes that breathe with audio
// Buildings rise on kicks, creating a living sonic city

import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

class Building {
  constructor(gridX, gridY, baseHeight, color) {
    this.gridX = gridX
    this.gridY = gridY
    this.height = baseHeight
    this.targetHeight = baseHeight
    this.baseHeight = baseHeight
    this.color = color
    this.rgb = null

    // Animation
    this.pulsePhase = Math.random() * Math.PI * 2
    this.windowPhase = Math.random() * Math.PI * 2
  }

  update(audioMod, dt) {
    // Smooth height transition
    this.height += (this.targetHeight - this.height) * 0.15

    // Pulse phase
    this.pulsePhase += dt * 0.05
    this.windowPhase += dt * 0.1
  }
}

export class IsometricMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'isometric'
    this.description = 'Procedural cityscapes that breathe with audio'

    this.buildings = []
    this.gridSize = { x: 12, y: 12 }
    this.cellSize = 40

    // Isometric projection angles
    this.isoAngle = Math.PI / 6 // 30 degrees

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Time
    this.time = 0

    // Color mode
    this.isNeon = false
  }

  init() {
    this.clear()
    this.createCity()
  }

  createCity() {
    this.buildings = []

    for (let y = 0; y < this.gridSize.y; y++) {
      for (let x = 0; x < this.gridSize.x; x++) {
        // Create varied building heights
        const centerDist = Math.sqrt(
          Math.pow(x - this.gridSize.x / 2, 2) +
          Math.pow(y - this.gridSize.y / 2, 2)
        )

        // Taller buildings toward center
        const baseHeight = 30 + Math.random() * 80 * (1 - centerDist / (this.gridSize.x / 2) * 0.5)

        // Random gaps (parks/plazas)
        if (Math.random() < 0.15) continue

        const hue = (x / this.gridSize.x + y / this.gridSize.y) / 2
        const color = pitchTempoToColor(hue, 0.5, 0.6)

        this.buildings.push(new Building(x, y, baseHeight, color))
      }
    }

    // Sort buildings for correct draw order (back to front)
    this.sortBuildings()
  }

  sortBuildings() {
    this.buildings.sort((a, b) => {
      // Sort by sum of grid coordinates (back to front)
      return (a.gridX + a.gridY) - (b.gridX + b.gridY)
    })
  }

  // Convert grid coordinates to screen coordinates (isometric projection)
  gridToScreen(gridX, gridY, height = 0) {
    const cellW = this.cellSize
    const cellH = this.cellSize * 0.5

    // Center the grid
    const offsetX = this.width / 2
    const offsetY = this.height / 2 - (this.gridSize.y * cellH) / 2

    const screenX = offsetX + (gridX - gridY) * cellW / 2
    const screenY = offsetY + (gridX + gridY) * cellH / 2 - height

    return { x: screenX, y: screenY }
  }

  resize(width, height) {
    super.resize(width, height)

    // Adjust cell size based on screen
    const maxGridWidth = this.gridSize.x * this.cellSize
    const maxGridHeight = this.gridSize.y * this.cellSize

    if (maxGridWidth > this.width * 0.8) {
      this.cellSize = Math.floor(this.width * 0.8 / this.gridSize.x)
    }
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { bass, mid, high, amplitude, centroid, frequencies } = weighted
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio values
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    this.time += 1

    // Switch to neon mode at high tempo
    this.isNeon = normalizedTempo > 0.6

    // Map FFT to building heights
    const numFreqs = Math.min(frequencies.length / 4, this.buildings.length)

    for (let i = 0; i < this.buildings.length; i++) {
      const building = this.buildings[i]

      // Map building to frequency bin based on position
      const freqIdx = Math.floor((building.gridX + building.gridY * this.gridSize.x) /
        (this.gridSize.x * this.gridSize.y) * numFreqs)

      const freqMag = frequencies[freqIdx] / 255

      // Target height based on base + frequency contribution
      building.targetHeight = building.baseHeight * (0.3 + freqMag * 1.5)

      // Beat boost
      if (onBeat && beatIntensity > 0.4) {
        // Boost buildings based on their position and beat
        const centerX = this.gridSize.x / 2
        const centerY = this.gridSize.y / 2
        const dist = Math.sqrt(
          Math.pow(building.gridX - centerX, 2) +
          Math.pow(building.gridY - centerY, 2)
        )

        // Wave effect from center
        const wavePhase = dist * 0.3 + this.time * 0.1
        const wave = Math.sin(wavePhase) * 0.5 + 0.5

        building.targetHeight += beatIntensity * 50 * wave
      }

      // Update building color based on height and audio
      const heightRatio = building.height / 200
      building.color = pitchTempoToColor(
        centroid * 0.5 + heightRatio * 0.5,
        normalizedTempo,
        0.4 + heightRatio * 0.4
      )
      building.rgb = pitchTempoToRGB(
        centroid * 0.5 + heightRatio * 0.5,
        normalizedTempo,
        0.4 + heightRatio * 0.4
      )

      // Update building animation
      building.update(this.smoothAmplitude, 1)
    }
  }

  draw() {
    const ctx = this.ctx

    // Background
    if (this.isNeon) {
      ctx.fillStyle = 'rgb(5, 5, 15)'
    } else {
      ctx.fillStyle = 'rgb(20, 25, 35)'
    }
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw buildings back to front
    for (const building of this.buildings) {
      this.drawBuilding(ctx, building)
    }
  }

  drawBuilding(ctx, building) {
    const { gridX, gridY, height, color, rgb, pulsePhase, windowPhase } = building

    // Get screen coordinates for base corners
    const base = this.gridToScreen(gridX, gridY, 0)
    const top = this.gridToScreen(gridX, gridY, height)

    const cellW = this.cellSize
    const cellH = this.cellSize * 0.5

    // Building footprint
    const hw = cellW / 2 * 0.9 // Slight gap between buildings
    const hh = cellH / 2 * 0.9

    // Calculate all 8 vertices of the building box
    const vertices = {
      // Bottom face
      bl: { x: base.x - hw, y: base.y },
      br: { x: base.x, y: base.y + hh },
      bf: { x: base.x + hw, y: base.y },
      bb: { x: base.x, y: base.y - hh },
      // Top face
      tl: { x: top.x - hw, y: top.y },
      tr: { x: top.x, y: top.y + hh },
      tf: { x: top.x + hw, y: top.y },
      tb: { x: top.x, y: top.y - hh }
    }

    // Draw three visible faces

    // Left face
    ctx.beginPath()
    ctx.moveTo(vertices.bl.x, vertices.bl.y)
    ctx.lineTo(vertices.bb.x, vertices.bb.y)
    ctx.lineTo(vertices.tb.x, vertices.tb.y)
    ctx.lineTo(vertices.tl.x, vertices.tl.y)
    ctx.closePath()

    // Darker shade for left face
    if (rgb) {
      ctx.fillStyle = `rgb(${Math.floor(rgb.r * 0.6)}, ${Math.floor(rgb.g * 0.6)}, ${Math.floor(rgb.b * 0.6)})`
    } else {
      ctx.fillStyle = 'rgb(60, 60, 80)'
    }
    ctx.fill()
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    ctx.lineWidth = 1
    ctx.stroke()

    // Right face
    ctx.beginPath()
    ctx.moveTo(vertices.bf.x, vertices.bf.y)
    ctx.lineTo(vertices.br.x, vertices.br.y)
    ctx.lineTo(vertices.tr.x, vertices.tr.y)
    ctx.lineTo(vertices.tf.x, vertices.tf.y)
    ctx.closePath()

    // Medium shade for right face
    if (rgb) {
      ctx.fillStyle = `rgb(${Math.floor(rgb.r * 0.8)}, ${Math.floor(rgb.g * 0.8)}, ${Math.floor(rgb.b * 0.8)})`
    } else {
      ctx.fillStyle = 'rgb(80, 80, 100)'
    }
    ctx.fill()
    ctx.stroke()

    // Top face
    ctx.beginPath()
    ctx.moveTo(vertices.tl.x, vertices.tl.y)
    ctx.lineTo(vertices.tb.x, vertices.tb.y)
    ctx.lineTo(vertices.tf.x, vertices.tf.y)
    ctx.lineTo(vertices.tr.x, vertices.tr.y)
    ctx.closePath()

    // Brightest for top
    ctx.fillStyle = color
    ctx.fill()
    ctx.stroke()

    // Draw windows on right face
    if (this.isNeon && height > 40) {
      const windowRows = Math.floor(height / 15)
      const windowCols = 2

      for (let wy = 0; wy < windowRows; wy++) {
        for (let wx = 0; wx < windowCols; wx++) {
          // Check if window is "lit"
          const lit = Math.sin(windowPhase + wy * 0.5 + wx * 0.7) > 0.3

          if (lit) {
            const t = (wy + 0.5) / windowRows // Vertical position ratio
            const s = (wx + 0.5) / windowCols // Horizontal position ratio

            // Interpolate position on right face
            const windowX = vertices.bf.x + (vertices.br.x - vertices.bf.x) * s
            const windowBaseY = vertices.bf.y + (vertices.br.y - vertices.bf.y) * s
            const windowTopY = vertices.tf.y + (vertices.tr.y - vertices.tf.y) * s

            const windowY = windowBaseY + (windowTopY - windowBaseY) * (1 - t)

            // Draw glowing window
            const windowSize = 3

            const gradient = ctx.createRadialGradient(
              windowX, windowY, 0,
              windowX, windowY, windowSize * 2
            )
            gradient.addColorStop(0, 'rgba(255, 255, 200, 0.9)')
            gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.5)')
            gradient.addColorStop(1, 'transparent')

            ctx.fillStyle = gradient
            ctx.beginPath()
            ctx.arc(windowX, windowY, windowSize * 2, 0, Math.PI * 2)
            ctx.fill()
          }
        }
      }
    }

    // Antenna on tall buildings
    if (height > 100) {
      const antennaHeight = 15 + this.smoothHigh * 10
      const antennaBase = vertices.tb
      const antennaTop = { x: antennaBase.x, y: antennaBase.y - antennaHeight }

      ctx.beginPath()
      ctx.moveTo(antennaBase.x, antennaBase.y)
      ctx.lineTo(antennaTop.x, antennaTop.y)
      ctx.strokeStyle = 'rgba(100, 100, 100, 0.8)'
      ctx.lineWidth = 2
      ctx.stroke()

      // Blinking light
      if (Math.sin(pulsePhase * 3) > 0.5) {
        ctx.fillStyle = 'rgba(255, 50, 50, 0.9)'
        ctx.beginPath()
        ctx.arc(antennaTop.x, antennaTop.y, 3, 0, Math.PI * 2)
        ctx.fill()
      }
    }
  }

  clear() {
    this.time = 0
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
    this.ctx.fillStyle = 'rgb(20, 25, 35)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }

  // SVG export
  exportSVG(screenWidth, screenHeight) {
    const scaleX = screenWidth / this.width
    const scaleY = screenHeight / this.height

    let paths = ''

    // Draw buildings
    for (const building of this.buildings) {
      const { gridX, gridY, height, color } = building

      const base = this.gridToScreen(gridX, gridY, 0)
      const top = this.gridToScreen(gridX, gridY, height)

      const cellW = this.cellSize
      const cellH = this.cellSize * 0.5

      const hw = cellW / 2 * 0.9
      const hh = cellH / 2 * 0.9

      // Scale coordinates
      const scale = (p) => ({
        x: (p.x * scaleX).toFixed(2),
        y: (p.y * scaleY).toFixed(2)
      })

      const vertices = {
        bl: scale({ x: base.x - hw, y: base.y }),
        br: scale({ x: base.x, y: base.y + hh }),
        bf: scale({ x: base.x + hw, y: base.y }),
        bb: scale({ x: base.x, y: base.y - hh }),
        tl: scale({ x: top.x - hw, y: top.y }),
        tr: scale({ x: top.x, y: top.y + hh }),
        tf: scale({ x: top.x + hw, y: top.y }),
        tb: scale({ x: top.x, y: top.y - hh })
      }

      // Left face
      paths += `<polygon points="${vertices.bl.x},${vertices.bl.y} ${vertices.bb.x},${vertices.bb.y} ${vertices.tb.x},${vertices.tb.y} ${vertices.tl.x},${vertices.tl.y}" fill="rgb(60,60,80)" stroke="black" stroke-width="0.5"/>\n`

      // Right face
      paths += `<polygon points="${vertices.bf.x},${vertices.bf.y} ${vertices.br.x},${vertices.br.y} ${vertices.tr.x},${vertices.tr.y} ${vertices.tf.x},${vertices.tf.y}" fill="rgb(80,80,100)" stroke="black" stroke-width="0.5"/>\n`

      // Top face
      paths += `<polygon points="${vertices.tl.x},${vertices.tl.y} ${vertices.tb.x},${vertices.tb.y} ${vertices.tf.x},${vertices.tf.y} ${vertices.tr.x},${vertices.tr.y}" fill="rgb(100,100,120)" stroke="black" stroke-width="0.5"/>\n`
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${screenWidth} ${screenHeight}">
        <rect width="100%" height="100%" fill="#141923"/>
        ${paths}
      </svg>
    `.trim()
  }
}
