import { VisualizationMode } from './base.js'
import { tuner } from '../tuner.js'

// Corruption Mode - Intentionally store audio data in wrong places
// Memory-like artifacts. The visualization "remembers" wrong.
// Audio from 30 seconds ago bleeds into now.

export class CorruptionMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'corruption'
    this.description = 'Memory artifacts. Past audio bleeds into present.'

    // Circular buffer for audio history (30 seconds at 60fps = 1800 frames)
    this.historyLength = 1800
    this.audioHistory = []
    this.historyIndex = 0

    // "Corrupted" memory - stores data at wrong indices
    this.corruptedMemory = new Array(256).fill(null)
    this.memoryDecay = new Array(256).fill(0)

    // Visual state
    this.particles = []
    this.glitchBands = []
    this.memoryGhosts = []

    // Time tracking
    this.frame = 0
    this.lastCorruption = 0
  }

  init() {
    this.audioHistory = []
    this.corruptedMemory = new Array(256).fill(null)
    this.memoryDecay = new Array(256).fill(0)
    this.particles = []
    this.glitchBands = []
    this.memoryGhosts = []
    this.frame = 0
  }

  update(audioFeatures, beatInfo) {
    this.frame++
    const params = tuner.getAll()

    // Store current audio in history
    this.audioHistory.push({ ...audioFeatures, frame: this.frame })
    if (this.audioHistory.length > this.historyLength) {
      this.audioHistory.shift()
    }

    // CORRUPTION: Store audio data at WRONG indices
    // Use current pitch to determine where to store bass
    // Use amplitude to determine where to store highs
    // Everything is misplaced
    const corruptIndex1 = Math.floor(audioFeatures.centroid * 255) % 256
    const corruptIndex2 = Math.floor(audioFeatures.amplitude * 255) % 256
    const corruptIndex3 = Math.floor((audioFeatures.bass + audioFeatures.high) * 127) % 256

    this.corruptedMemory[corruptIndex1] = {
      value: audioFeatures.bass,  // Bass stored at pitch location
      type: 'bass',
      age: 0
    }
    this.corruptedMemory[corruptIndex2] = {
      value: audioFeatures.high,  // High stored at amplitude location
      type: 'high',
      age: 0
    }
    this.corruptedMemory[corruptIndex3] = {
      value: audioFeatures.mid,   // Mid stored at bass+high location
      type: 'mid',
      age: 0
    }

    // Age and decay corrupted memory
    this.corruptedMemory.forEach((m, i) => {
      if (m) {
        m.age++
        this.memoryDecay[i] = Math.max(0, this.memoryDecay[i] - 0.01)
      }
    })

    // TIME BLEED: Pull audio from random point in history
    const timeBleed = params.timeBleed
    const pastFrameIndex = Math.floor(
      Math.random() * this.audioHistory.length * timeBleed
    )
    const pastAudio = this.audioHistory[pastFrameIndex] || audioFeatures

    // Mix current and past audio (WRONG)
    const blendedAudio = {
      bass: audioFeatures.bass * (1 - timeBleed) + pastAudio.bass * timeBleed,
      mid: pastAudio.mid * (1 - timeBleed) + audioFeatures.high * timeBleed, // MID from PAST, HIGH from NOW
      high: audioFeatures.mid * (1 - timeBleed) + pastAudio.high * timeBleed, // Swapped
      amplitude: (audioFeatures.amplitude + pastAudio.amplitude) / 2,
      centroid: pastAudio.centroid, // Always use past pitch
    }

    // Generate glitch artifacts
    if (beatInfo.onBeat || Math.random() < params.chaos * 0.1) {
      this.spawnGlitchBand(blendedAudio, params)
    }

    // Memory ghosts - visualize old data bleeding through
    if (Math.random() < timeBleed * 0.3) {
      const ghostIndex = Math.floor(Math.random() * this.audioHistory.length * 0.8)
      const ghostAudio = this.audioHistory[ghostIndex]
      if (ghostAudio) {
        this.spawnMemoryGhost(ghostAudio, params)
      }
    }

    // Spawn particles from CORRUPTED memory, not current audio
    this.corruptedMemory.forEach((m, i) => {
      if (m && m.age < 100 && Math.random() < 0.05 * params.sensitivity) {
        this.spawnCorruptedParticle(m, i, params)
      }
    })

    // Update particles
    this.particles = this.particles.filter(p => {
      p.life--
      p.x += p.vx
      p.y += p.vy
      p.vx *= 0.99
      p.vy *= 0.99

      // Corruption: particles sometimes teleport to wrong location
      if (Math.random() < params.chaos * 0.02) {
        p.x = Math.random() * this.width
        p.y = Math.random() * this.height
      }

      return p.life > 0
    })

    // Update glitch bands
    this.glitchBands = this.glitchBands.filter(g => {
      g.life--
      g.offset += g.speed
      return g.life > 0
    })

    // Update memory ghosts
    this.memoryGhosts = this.memoryGhosts.filter(g => {
      g.life--
      g.opacity *= 0.98
      return g.life > 0 && g.opacity > 0.01
    })
  }

  spawnGlitchBand(audio, params) {
    this.glitchBands.push({
      y: Math.random() * this.height,
      height: 5 + Math.random() * 30 * audio.amplitude,
      offset: 0,
      speed: (Math.random() - 0.5) * 20 * params.chaos,
      hue: audio.centroid * 360,
      life: 20 + Math.random() * 40,
      maxLife: 20 + Math.random() * 40,
      type: Math.random() > 0.5 ? 'shift' : 'invert'
    })
  }

  spawnMemoryGhost(pastAudio, params) {
    this.memoryGhosts.push({
      x: this.width / 2 + (Math.random() - 0.5) * this.width * 0.8,
      y: this.height / 2 + (Math.random() - 0.5) * this.height * 0.8,
      radius: 50 + pastAudio.amplitude * 200,
      hue: pastAudio.centroid * 360,
      opacity: 0.3 * params.timeBleed,
      life: 60 + Math.random() * 60,
      frameAge: this.frame - pastAudio.frame // How old is this memory
    })
  }

  spawnCorruptedParticle(memory, index, params) {
    // Position based on memory index (wrong place)
    const wrongX = (index / 256) * this.width
    const wrongY = memory.value * this.height

    // Color based on type (also wrong)
    const hueMap = { bass: 240, mid: 120, high: 0 } // Blues for bass? Greens for mid? Wrong!
    const hue = hueMap[memory.type] || 0

    this.particles.push({
      x: wrongX + (Math.random() - 0.5) * 50,
      y: wrongY + (Math.random() - 0.5) * 50,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      size: 2 + memory.value * 8,
      hue: hue + memory.age, // Hue drifts with age
      life: 50 + Math.random() * 50,
      maxLife: 50 + Math.random() * 50,
      type: memory.type,
      memoryAge: memory.age
    })

    if (this.particles.length > 1000) {
      this.particles.shift()
    }
  }

  draw() {
    const params = tuner.getAll()
    const decay = params.decay

    // Semi-transparent overlay for trails (decay effect)
    this.ctx.fillStyle = `rgba(10, 10, 10, ${1 - decay})`
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw memory ghosts first (background)
    this.drawMemoryGhosts()

    // Draw glitch bands
    this.drawGlitchBands()

    // Draw corrupted particles
    this.drawParticles()

    // Draw corrupted memory visualization
    this.drawMemoryMap()

    // Scanline effect
    if (params.chaos > 0.3) {
      this.drawScanlines()
    }
  }

  drawMemoryGhosts() {
    this.memoryGhosts.forEach(g => {
      const gradient = this.ctx.createRadialGradient(
        g.x, g.y, 0,
        g.x, g.y, g.radius
      )
      gradient.addColorStop(0, `hsla(${g.hue}, 50%, 50%, ${g.opacity})`)
      gradient.addColorStop(0.5, `hsla(${g.hue}, 50%, 30%, ${g.opacity * 0.5})`)
      gradient.addColorStop(1, `hsla(${g.hue}, 50%, 20%, 0)`)

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(g.x, g.y, g.radius, 0, Math.PI * 2)
      this.ctx.fill()

      // Label showing how old the memory is
      if (g.frameAge > 60) {
        this.ctx.font = '10px monospace'
        this.ctx.fillStyle = `rgba(255, 255, 255, ${g.opacity})`
        this.ctx.fillText(`-${(g.frameAge / 60).toFixed(1)}s`, g.x - 15, g.y)
      }
    })
  }

  drawGlitchBands() {
    this.glitchBands.forEach(g => {
      const alpha = (g.life / g.maxLife) * 0.6
      this.ctx.save()

      if (g.type === 'shift') {
        // Horizontal displacement
        this.ctx.fillStyle = `hsla(${g.hue}, 70%, 50%, ${alpha})`
        this.ctx.fillRect(g.offset, g.y, this.width, g.height)

        // RGB split
        this.ctx.globalCompositeOperation = 'screen'
        this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha * 0.3})`
        this.ctx.fillRect(g.offset + 5, g.y, this.width, g.height)
        this.ctx.fillStyle = `rgba(0, 255, 255, ${alpha * 0.3})`
        this.ctx.fillRect(g.offset - 5, g.y, this.width, g.height)
      } else {
        // Inversion band
        this.ctx.globalCompositeOperation = 'difference'
        this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`
        this.ctx.fillRect(0, g.y, this.width, g.height)
      }

      this.ctx.restore()
    })
  }

  drawParticles() {
    this.particles.forEach(p => {
      const alpha = (p.life / p.maxLife)
      const ageDistortion = Math.sin(p.memoryAge * 0.1) * 10

      this.ctx.fillStyle = `hsla(${p.hue}, 60%, 60%, ${alpha})`
      this.ctx.beginPath()
      this.ctx.arc(p.x + ageDistortion, p.y, p.size, 0, Math.PI * 2)
      this.ctx.fill()

      // Trail showing corruption
      if (alpha > 0.5) {
        this.ctx.strokeStyle = `hsla(${p.hue + 180}, 60%, 40%, ${alpha * 0.3})`
        this.ctx.lineWidth = 1
        this.ctx.beginPath()
        this.ctx.moveTo(p.x, p.y)
        this.ctx.lineTo(p.x - p.vx * 10, p.y - p.vy * 10)
        this.ctx.stroke()
      }
    })
  }

  drawMemoryMap() {
    // Small visualization of corrupted memory state
    const mapWidth = 256
    const mapHeight = 30
    const mapX = 20
    const mapY = this.height - 50

    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.fillRect(mapX - 2, mapY - 2, mapWidth + 4, mapHeight + 4)

    this.corruptedMemory.forEach((m, i) => {
      if (m && m.age < 200) {
        const alpha = Math.max(0, 1 - m.age / 200)
        const hueMap = { bass: 0, mid: 120, high: 240 }
        const hue = hueMap[m.type] || 0

        this.ctx.fillStyle = `hsla(${hue}, 70%, 50%, ${alpha})`
        this.ctx.fillRect(mapX + i, mapY, 1, m.value * mapHeight)
      }
    })

    this.ctx.font = '9px monospace'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fillText('CORRUPTED MEMORY', mapX, mapY - 5)
  }

  drawScanlines() {
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.03)'
    for (let y = 0; y < this.height; y += 2) {
      this.ctx.fillRect(0, y, this.width, 1)
    }
  }

  clear() {
    this.audioHistory = []
    this.corruptedMemory = new Array(256).fill(null)
    this.particles = []
    this.glitchBands = []
    this.memoryGhosts = []
  }
}
