import { VisualizationMode } from './base.js'
import { pitchTempoToRGB } from '../palette.js'

// Audiosurf-style mode - Ride the waveform highway
// 3D track generated from audio, collect orbs, feel the music
export class AudiosurfMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'audiosurf'
    this.description = 'Ride a highway generated from audio. Collect orbs, feel the flow.'

    // Track properties
    this.trackWidth = 400
    this.laneCount = 3
    this.laneWidth = this.trackWidth / this.laneCount
    this.trackSegments = []
    this.maxSegments = 100
    this.segmentLength = 40

    // Player
    this.player = {
      lane: 1, // 0, 1, 2 (left, center, right)
      targetLane: 1,
      x: 0,
      tilt: 0,
      trail: []
    }

    // Collectibles
    this.orbs = []
    this.maxOrbs = 50

    // Obstacles
    this.obstacles = []

    // Score and combo
    this.score = 0
    this.combo = 0
    this.maxCombo = 0
    this.collected = 0

    // Visual
    this.speed = 5
    this.baseSpeed = 5
    this.cameraHeight = 150
    this.cameraDistance = 300
    this.horizonY = this.height * 0.35

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
    this.currentHue = 0

    // Track height (waveform)
    this.waveformHistory = []
    this.maxWaveformHistory = this.maxSegments

    // Effects
    this.particles = []
    this.streaks = []

    this.setupInput()
  }

  setupInput() {
    this.keyHandler = (e) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          this.player.targetLane = Math.max(0, this.player.targetLane - 1)
          break
        case 'ArrowRight':
        case 'd':
        case 'D':
          this.player.targetLane = Math.min(this.laneCount - 1, this.player.targetLane + 1)
          break
      }
    }
    window.addEventListener('keydown', this.keyHandler)
  }

  init() {
    this.trackSegments = []
    this.orbs = []
    this.obstacles = []
    this.score = 0
    this.combo = 0
    this.maxCombo = 0
    this.collected = 0
    this.waveformHistory = []
    this.particles = []
    this.streaks = []
    this.player.lane = 1
    this.player.targetLane = 1
    this.player.trail = []

    // Initialize track
    for (let i = 0; i < this.maxSegments; i++) {
      this.trackSegments.push({
        z: i * this.segmentLength,
        height: 0,
        curve: 0,
        hue: 200
      })
    }
  }

  update(audioFeatures, beatInfo) {
    const { amplitude, centroid, bass, mid, high, waveform } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    // Smooth audio
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    this.currentHue = centroid * 360

    // Speed based on tempo and amplitude
    this.speed = this.baseSpeed + normalizedTempo * 8 + this.smoothAmplitude * 5

    // Update waveform history for track height
    const avgWaveform = waveform ? waveform.reduce((a, b) => a + b, 0) / waveform.length : 0
    this.waveformHistory.push(avgWaveform)
    if (this.waveformHistory.length > this.maxWaveformHistory) {
      this.waveformHistory.shift()
    }

    // Update track segments
    this.updateTrack(audioFeatures)

    // Move player between lanes smoothly
    this.player.lane += (this.player.targetLane - this.player.lane) * 0.2
    this.player.tilt = (this.player.targetLane - this.player.lane) * 0.5

    // Calculate player X position
    const centerX = this.width / 2
    this.player.x = centerX + (this.player.lane - 1) * this.laneWidth * 0.8

    // Update player trail
    this.player.trail.push({ x: this.player.x, y: this.height - 100 })
    if (this.player.trail.length > 20) {
      this.player.trail.shift()
    }

    // Spawn orbs on beats
    if (onBeat && beatIntensity > 0.3) {
      this.spawnOrb(beatIntensity, centroid)
    }

    // Spawn orbs based on frequency bands
    if (this.smoothHigh > 0.5 && Math.random() < 0.1) {
      this.spawnOrb(0.5, centroid)
    }

    // Update orbs
    this.updateOrbs()

    // Check collisions
    this.checkCollisions()

    // Update particles
    this.updateParticles()

    // Update streaks
    this.updateStreaks()

    // Spawn speed streaks
    if (this.speed > 10) {
      this.spawnStreak()
    }
  }

  updateTrack(audioFeatures) {
    // Shift track forward
    for (const seg of this.trackSegments) {
      seg.z -= this.speed
    }

    // Remove segments behind camera
    while (this.trackSegments.length > 0 && this.trackSegments[0].z < -this.segmentLength) {
      this.trackSegments.shift()
    }

    // Add new segments at the end
    while (this.trackSegments.length < this.maxSegments) {
      const lastZ = this.trackSegments.length > 0
        ? this.trackSegments[this.trackSegments.length - 1].z
        : 0

      // Height from waveform/amplitude
      const height = this.smoothAmplitude * 100 + Math.sin(Date.now() * 0.002) * 20

      // Curve based on mid frequencies
      const curve = Math.sin(Date.now() * 0.001) * this.smoothMid * 100

      this.trackSegments.push({
        z: lastZ + this.segmentLength,
        height,
        curve,
        hue: this.currentHue
      })
    }
  }

  spawnOrb(intensity, pitch) {
    if (this.orbs.length >= this.maxOrbs) return

    const lane = Math.floor(Math.random() * this.laneCount)
    const z = this.trackSegments[this.trackSegments.length - 1]?.z || 1000

    // Orb type based on intensity
    let type = 'normal'
    if (intensity > 0.8) type = 'gold'
    else if (intensity > 0.5) type = 'silver'

    this.orbs.push({
      lane,
      z,
      type,
      hue: pitch * 360,
      collected: false,
      scale: 1
    })
  }

  updateOrbs() {
    this.orbs = this.orbs.filter(orb => {
      orb.z -= this.speed

      // Pulse animation
      orb.scale = 1 + Math.sin(Date.now() * 0.01 + orb.z * 0.1) * 0.2

      // Remove if past camera
      return orb.z > -100
    })
  }

  checkCollisions() {
    const playerZ = 50 // Player's Z position (near camera)
    const collisionRadius = this.laneWidth * 0.6

    for (const orb of this.orbs) {
      if (orb.collected) continue

      // Check if in collection range
      if (Math.abs(orb.z - playerZ) < this.segmentLength) {
        // Check lane match
        const orbLane = orb.lane
        const playerLane = Math.round(this.player.lane)

        if (orbLane === playerLane) {
          orb.collected = true
          this.collectOrb(orb)
        }
      }
    }
  }

  collectOrb(orb) {
    this.collected++
    this.combo++
    this.maxCombo = Math.max(this.maxCombo, this.combo)

    // Score based on type and combo
    let points = 100
    if (orb.type === 'gold') points = 500
    else if (orb.type === 'silver') points = 250

    points *= (1 + this.combo * 0.1)
    this.score += Math.floor(points)

    // Spawn particles
    const centerX = this.width / 2
    const orbX = centerX + (orb.lane - 1) * this.laneWidth * 0.8
    const orbY = this.height - 120

    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: orbX,
        y: orbY,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10 - 5,
        life: 1,
        hue: orb.hue,
        size: 3 + Math.random() * 5
      })
    }
  }

  updateParticles() {
    this.particles = this.particles.filter(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += 0.3 // Gravity
      p.life -= 0.03
      return p.life > 0
    })
  }

  spawnStreak() {
    if (Math.random() > 0.3) return

    const side = Math.random() < 0.5 ? -1 : 1
    this.streaks.push({
      x: this.width / 2 + side * (200 + Math.random() * 200),
      y: this.horizonY + Math.random() * 100,
      length: 50 + Math.random() * 100,
      speed: this.speed * 2,
      alpha: 0.5 + Math.random() * 0.5
    })
  }

  updateStreaks() {
    this.streaks = this.streaks.filter(s => {
      s.y += s.speed
      s.alpha -= 0.02
      return s.y < this.height && s.alpha > 0
    })
  }

  draw() {
    // Sky gradient
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.horizonY)
    skyGradient.addColorStop(0, `hsl(${(this.currentHue + 180) % 360}, 30%, 10%)`)
    skyGradient.addColorStop(1, `hsl(${this.currentHue}, 50%, 20%)`)
    this.ctx.fillStyle = skyGradient
    this.ctx.fillRect(0, 0, this.width, this.horizonY)

    // Ground
    this.ctx.fillStyle = `hsl(${this.currentHue}, 20%, 8%)`
    this.ctx.fillRect(0, this.horizonY, this.width, this.height - this.horizonY)

    // Draw speed streaks
    for (const streak of this.streaks) {
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${streak.alpha})`
      this.ctx.lineWidth = 2
      this.ctx.beginPath()
      this.ctx.moveTo(streak.x, streak.y)
      this.ctx.lineTo(streak.x, streak.y + streak.length)
      this.ctx.stroke()
    }

    // Draw track
    this.drawTrack()

    // Draw orbs
    this.drawOrbs()

    // Draw player
    this.drawPlayer()

    // Draw particles
    this.drawParticles()

    // Draw UI
    this.drawUI()
  }

  drawTrack() {
    const centerX = this.width / 2

    // Draw from back to front
    for (let i = this.trackSegments.length - 1; i >= 1; i--) {
      const seg = this.trackSegments[i]
      const prevSeg = this.trackSegments[i - 1]

      if (seg.z < 0) continue

      // Project to 2D
      const proj = this.project(0, seg.height, seg.z)
      const prevProj = this.project(0, prevSeg.height, prevSeg.z)

      if (proj.scale <= 0 || prevProj.scale <= 0) continue

      const width = this.trackWidth * proj.scale
      const prevWidth = this.trackWidth * prevProj.scale

      const x = centerX + seg.curve * proj.scale
      const prevX = centerX + prevSeg.curve * prevProj.scale

      // Track surface
      const alpha = Math.min(1, proj.scale * 2)
      const hue = seg.hue

      this.ctx.beginPath()
      this.ctx.moveTo(prevX - prevWidth / 2, prevProj.y)
      this.ctx.lineTo(prevX + prevWidth / 2, prevProj.y)
      this.ctx.lineTo(x + width / 2, proj.y)
      this.ctx.lineTo(x - width / 2, proj.y)
      this.ctx.closePath()

      const gradient = this.ctx.createLinearGradient(x - width/2, proj.y, x + width/2, proj.y)
      gradient.addColorStop(0, `hsla(${hue}, 60%, 20%, ${alpha})`)
      gradient.addColorStop(0.5, `hsla(${hue}, 60%, 30%, ${alpha})`)
      gradient.addColorStop(1, `hsla(${hue}, 60%, 20%, ${alpha})`)

      this.ctx.fillStyle = gradient
      this.ctx.fill()

      // Lane dividers
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.3})`
      this.ctx.lineWidth = 1

      for (let lane = 1; lane < this.laneCount; lane++) {
        const laneX = x - width/2 + (width / this.laneCount) * lane
        const prevLaneX = prevX - prevWidth/2 + (prevWidth / this.laneCount) * lane

        this.ctx.beginPath()
        this.ctx.moveTo(prevLaneX, prevProj.y)
        this.ctx.lineTo(laneX, proj.y)
        this.ctx.stroke()
      }

      // Edge glow
      this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, ${alpha * 0.5})`
      this.ctx.lineWidth = 3

      this.ctx.beginPath()
      this.ctx.moveTo(prevX - prevWidth / 2, prevProj.y)
      this.ctx.lineTo(x - width / 2, proj.y)
      this.ctx.stroke()

      this.ctx.beginPath()
      this.ctx.moveTo(prevX + prevWidth / 2, prevProj.y)
      this.ctx.lineTo(x + width / 2, proj.y)
      this.ctx.stroke()
    }
  }

  project(x, y, z) {
    const scale = this.cameraDistance / (z + this.cameraDistance)
    return {
      x: this.width / 2 + x * scale,
      y: this.horizonY + (this.height - this.horizonY - y) * scale,
      scale
    }
  }

  drawOrbs() {
    const centerX = this.width / 2

    for (const orb of this.orbs) {
      if (orb.collected || orb.z < 0) continue

      const proj = this.project(0, 30, orb.z)
      if (proj.scale <= 0) continue

      const laneOffset = (orb.lane - 1) * this.laneWidth * 0.8
      const x = centerX + laneOffset * proj.scale
      const y = proj.y - 20 * proj.scale
      const size = 15 * proj.scale * orb.scale

      // Glow
      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, size * 2)

      if (orb.type === 'gold') {
        gradient.addColorStop(0, 'rgba(255, 215, 0, 0.8)')
        gradient.addColorStop(0.5, 'rgba(255, 180, 0, 0.4)')
        gradient.addColorStop(1, 'rgba(255, 150, 0, 0)')
      } else if (orb.type === 'silver') {
        gradient.addColorStop(0, 'rgba(200, 200, 255, 0.8)')
        gradient.addColorStop(0.5, 'rgba(150, 150, 200, 0.4)')
        gradient.addColorStop(1, 'rgba(100, 100, 150, 0)')
      } else {
        gradient.addColorStop(0, `hsla(${orb.hue}, 80%, 60%, 0.8)`)
        gradient.addColorStop(0.5, `hsla(${orb.hue}, 80%, 40%, 0.4)`)
        gradient.addColorStop(1, `hsla(${orb.hue}, 80%, 30%, 0)`)
      }

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(x, y, size * 2, 0, Math.PI * 2)
      this.ctx.fill()

      // Core
      this.ctx.fillStyle = orb.type === 'gold' ? '#ffd700' :
                           orb.type === 'silver' ? '#c0c0ff' :
                           `hsl(${orb.hue}, 80%, 70%)`
      this.ctx.beginPath()
      this.ctx.arc(x, y, size, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  drawPlayer() {
    const x = this.player.x
    const y = this.height - 100

    // Trail
    this.ctx.beginPath()
    for (let i = 0; i < this.player.trail.length; i++) {
      const t = this.player.trail[i]
      const alpha = i / this.player.trail.length
      if (i === 0) {
        this.ctx.moveTo(t.x, t.y)
      } else {
        this.ctx.lineTo(t.x, t.y)
      }
    }
    this.ctx.strokeStyle = `rgba(100, 200, 255, 0.3)`
    this.ctx.lineWidth = 10
    this.ctx.stroke()

    // Ship glow
    const glowGradient = this.ctx.createRadialGradient(x, y, 0, x, y, 60)
    glowGradient.addColorStop(0, 'rgba(100, 200, 255, 0.5)')
    glowGradient.addColorStop(0.5, 'rgba(50, 150, 255, 0.2)')
    glowGradient.addColorStop(1, 'rgba(0, 100, 255, 0)')

    this.ctx.fillStyle = glowGradient
    this.ctx.beginPath()
    this.ctx.arc(x, y, 60, 0, Math.PI * 2)
    this.ctx.fill()

    // Ship body
    this.ctx.save()
    this.ctx.translate(x, y)
    this.ctx.rotate(this.player.tilt)

    // Main body
    this.ctx.fillStyle = '#4af'
    this.ctx.beginPath()
    this.ctx.moveTo(0, -25)
    this.ctx.lineTo(20, 15)
    this.ctx.lineTo(0, 5)
    this.ctx.lineTo(-20, 15)
    this.ctx.closePath()
    this.ctx.fill()

    // Cockpit
    this.ctx.fillStyle = '#fff'
    this.ctx.beginPath()
    this.ctx.arc(0, -5, 8, 0, Math.PI * 2)
    this.ctx.fill()

    // Engine glow
    this.ctx.fillStyle = `rgba(255, 150, 50, ${0.5 + this.smoothAmplitude * 0.5})`
    this.ctx.beginPath()
    this.ctx.arc(0, 15, 5 + this.smoothAmplitude * 5, 0, Math.PI * 2)
    this.ctx.fill()

    this.ctx.restore()
  }

  drawParticles() {
    for (const p of this.particles) {
      this.ctx.fillStyle = `hsla(${p.hue}, 80%, 60%, ${p.life})`
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  drawUI() {
    // Score
    this.ctx.fillStyle = '#fff'
    this.ctx.font = 'bold 32px "SF Mono", Monaco, monospace'
    this.ctx.fillText(this.score.toLocaleString(), 30, 50)

    // Combo
    if (this.combo > 1) {
      this.ctx.fillStyle = `hsl(${this.currentHue}, 80%, 60%)`
      this.ctx.font = 'bold 24px "SF Mono", Monaco, monospace'
      this.ctx.fillText(`${this.combo}x COMBO`, 30, 85)
    }

    // Speed indicator
    this.ctx.fillStyle = '#888'
    this.ctx.font = '14px "SF Mono", Monaco, monospace'
    this.ctx.fillText(`Speed: ${this.speed.toFixed(1)}`, this.width - 120, 30)

    // Collected
    this.ctx.fillText(`Orbs: ${this.collected}`, this.width - 120, 50)

    // Controls hint
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.font = '12px "SF Mono", Monaco, monospace'
    this.ctx.fillText('← → or A/D to move', 30, this.height - 20)
  }

  clear() {
    this.init()
  }

  dispose() {
    window.removeEventListener('keydown', this.keyHandler)
  }
}
