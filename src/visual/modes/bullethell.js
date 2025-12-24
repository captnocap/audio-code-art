import { VisualizationMode } from './base.js'
import { pitchTempoToRGB } from '../palette.js'

// Bullet Hell Mode - A choreography engine driven by sound
// You can't lose. Bullets are information. Movement is meaning.
// Collisions don't end - they transform.

export class BulletHellMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'bullethell'
    this.description = 'Navigate audio-generated bullet patterns. You cannot die, only transform.'

    // Player state
    this.player = {
      x: width / 2,
      y: height / 2,
      radius: 12,
      speed: 6,
      trail: [],
      maxTrail: 30,
      hitState: 0,        // 0-1, decays over time
      transformMode: 0,   // Which transformation is active
      graceMultiplier: 1  // Tracks "grace" of movement
    }

    // Input state
    this.keys = { up: false, down: false, left: false, right: false }

    // Bullets/patterns
    this.bullets = []
    this.emitters = []
    this.maxBullets = 2000

    // Enemies (audio-spawned entities)
    this.mobs = []
    this.maxMobs = 20

    // Visual state
    this.distortion = 0
    this.timeScale = 1
    this.screenShake = { x: 0, y: 0 }
    this.colorShift = 0

    // Physics mode (changes based on audio characteristics)
    this.physicsMode = 'standard'
    this.physicsModes = ['standard', 'orbital', 'branching', 'tunnel', 'contour']

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Stats (not for scoring, for flow tracking)
    this.stats = {
      bulletsNavigated: 0,
      transformations: 0,
      gracePeriods: 0,
      totalMovement: 0
    }

    this.setupInput()
  }

  setupInput() {
    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = true
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = true
    })

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') this.keys.left = false
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') this.keys.right = false
    })
  }

  init() {
    this.player.x = this.width / 2
    this.player.y = this.height / 2
    this.player.trail = []
    this.bullets = []
    this.emitters = []
    this.mobs = []
    this.distortion = 0
    this.timeScale = 1
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { amplitude, centroid, bass, mid, high } = weighted
    const { onBeat, beatIntensity, normalizedTempo, bpm } = beatInfo

    // Smooth audio values
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Determine physics mode based on audio character
    this.updatePhysicsMode(audioFeatures)

    // Update player
    this.updatePlayer()

    // Spawn patterns based on audio
    this.spawnFromAudio(audioFeatures, beatInfo)

    // Update bullets
    this.updateBullets()

    // Update mobs
    this.updateMobs(audioFeatures)

    // Check collisions (transform, don't kill)
    this.checkCollisions()

    // Decay transformation states
    this.player.hitState *= 0.95
    this.distortion *= 0.97
    this.screenShake.x *= 0.9
    this.screenShake.y *= 0.9
    this.colorShift *= 0.98
  }

  updatePhysicsMode(audioFeatures) {
    // Use smoothed values for more stable mode switching
    const bass = this.smoothBass
    const mid = this.smoothMid
    const high = this.smoothHigh
    const amplitude = this.smoothAmplitude

    // Mode selection based on dominant frequency character
    // Lower thresholds for black metal's compressed dynamics
    if (bass > 0.35 && bass > mid * 0.8 && bass > high * 0.8) {
      this.physicsMode = 'orbital'  // Heavy bass = gravitational, orbital bullets
    } else if (high > 0.3 && high > bass * 0.8) {
      this.physicsMode = 'branching'  // High freq (tremolo) = bullets that branch/multiply
    } else if (amplitude > 0.5) {
      this.physicsMode = 'tunnel'  // High intensity = everything accelerates forward
    } else if (amplitude < 0.1) {
      this.physicsMode = 'contour'  // Quiet = bullets define safe zones
    } else {
      this.physicsMode = 'standard'
    }
  }

  updatePlayer() {
    // Calculate movement
    let dx = 0, dy = 0
    if (this.keys.up) dy -= 1
    if (this.keys.down) dy += 1
    if (this.keys.left) dx -= 1
    if (this.keys.right) dx += 1

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      dx *= 0.707
      dy *= 0.707
    }

    // Apply transformation effects to movement
    let speed = this.player.speed * this.timeScale

    // Hit state can alter movement (slippery, inverted, etc.)
    if (this.player.transformMode === 1) {
      // Slippery
      speed *= 1.5
    } else if (this.player.transformMode === 2) {
      // Heavy
      speed *= 0.6
    } else if (this.player.transformMode === 3) {
      // Inverted
      dx *= -1
      dy *= -1
    }

    // Apply movement
    this.player.x += dx * speed
    this.player.y += dy * speed

    // Wrap around screen (infinite space)
    if (this.player.x < 0) this.player.x = this.width
    if (this.player.x > this.width) this.player.x = 0
    if (this.player.y < 0) this.player.y = this.height
    if (this.player.y > this.height) this.player.y = 0

    // Track movement for grace calculation
    const movement = Math.sqrt(dx * dx + dy * dy)
    this.stats.totalMovement += movement

    // Update trail
    this.player.trail.push({ x: this.player.x, y: this.player.y, age: 0 })
    if (this.player.trail.length > this.player.maxTrail) {
      this.player.trail.shift()
    }

    // Age trail
    this.player.trail.forEach(p => p.age++)

    // Update grace multiplier (smooth movement = higher grace)
    if (movement > 0) {
      this.player.graceMultiplier = Math.min(2, this.player.graceMultiplier + 0.01)
    } else {
      this.player.graceMultiplier = Math.max(0.5, this.player.graceMultiplier - 0.02)
    }
  }

  spawnFromAudio(audioFeatures, beatInfo) {
    const { amplitude, centroid, bass, mid, high } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo, isSaturated } = beatInfo

    // Black metal / high-energy continuous spawning
    // Use smoothed values for more consistent spawning
    const smoothBass = this.smoothBass
    const smoothMid = this.smoothMid
    const smoothHigh = this.smoothHigh
    const smoothAmp = this.smoothAmplitude

    // Bass spawns mass - slow gravitational enemies
    // Lower threshold, higher spawn rate for heavy music
    if (smoothBass > 0.25 && Math.random() < smoothBass * 0.3) {
      this.spawnMob('mass', smoothBass)
    }

    // High frequency spawns shrapnel - fast needle patterns
    // Tremolo picking in black metal = constant high freq
    if (smoothHigh > 0.2 && Math.random() < smoothHigh * 0.4) {
      this.spawnShrapnel(smoothHigh, centroid)
    }

    // Beats spawn radial bursts
    if (onBeat && beatIntensity > 0.15) {
      this.spawnBurst(beatIntensity, centroid, normalizedTempo)
    }

    // Blast beat mode - sustained intensity spawns continuous patterns
    if (isSaturated && smoothAmp > 0.3) {
      // Continuous bullet rain during blast beats
      if (Math.random() < 0.3) {
        this.spawnShrapnel(smoothAmp, centroid)
      }
      if (Math.random() < 0.15) {
        this.spawnBurst(smoothAmp * 0.5, centroid, normalizedTempo)
      }
    }

    // Mid frequencies spawn spirals
    if (smoothMid > 0.25 && Math.random() < 0.12) {
      this.spawnSpiral(smoothMid, centroid)
    }

    // Sustained amplitude creates streams
    if (smoothAmp > 0.2 && Math.random() < 0.08) {
      this.spawnStream(smoothAmp, centroid)
    }

    // Continuous energy spawning - black metal always has energy
    // Even if individual bands are low, total energy should spawn
    const totalEnergy = (smoothBass + smoothMid + smoothHigh) / 3
    if (totalEnergy > 0.15 && Math.random() < totalEnergy * 0.2) {
      // Random pattern type based on what's loudest
      if (smoothBass > smoothHigh) {
        this.spawnMob('mass', totalEnergy)
      } else {
        this.spawnShrapnel(totalEnergy, centroid)
      }
    }
  }

  spawnMob(type, intensity) {
    if (this.mobs.length >= this.maxMobs) return

    const side = Math.floor(Math.random() * 4)
    let x, y

    switch (side) {
      case 0: x = Math.random() * this.width; y = -50; break
      case 1: x = this.width + 50; y = Math.random() * this.height; break
      case 2: x = Math.random() * this.width; y = this.height + 50; break
      case 3: x = -50; y = Math.random() * this.height; break
    }

    this.mobs.push({
      x, y,
      type,
      radius: 30 + intensity * 40,
      speed: 0.5 + Math.random() * 0.5,
      angle: Math.atan2(this.height / 2 - y, this.width / 2 - x),
      life: 500,
      shootCooldown: 0,
      intensity
    })
  }

  spawnBurst(intensity, pitch, tempo) {
    const count = Math.floor(8 + intensity * 16)
    const cx = this.width / 2 + (Math.random() - 0.5) * this.width * 0.6
    const cy = this.height / 2 + (Math.random() - 0.5) * this.height * 0.6
    const speed = 2 + tempo * 4

    for (let i = 0; i < count; i++) {
      if (this.bullets.length >= this.maxBullets) break

      const angle = (i / count) * Math.PI * 2
      this.bullets.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4 + intensity * 4,
        hue: pitch * 360,
        life: 300,
        type: 'radial'
      })
    }
  }

  spawnShrapnel(intensity, pitch) {
    const count = Math.floor(3 + intensity * 5)
    const side = Math.floor(Math.random() * 4)
    let x, y, baseAngle

    switch (side) {
      case 0:
        x = Math.random() * this.width; y = 0
        baseAngle = Math.PI / 2
        break
      case 1:
        x = this.width; y = Math.random() * this.height
        baseAngle = Math.PI
        break
      case 2:
        x = Math.random() * this.width; y = this.height
        baseAngle = -Math.PI / 2
        break
      case 3:
        x = 0; y = Math.random() * this.height
        baseAngle = 0
        break
    }

    const speed = 5 + intensity * 5

    for (let i = 0; i < count; i++) {
      if (this.bullets.length >= this.maxBullets) break

      const spread = (Math.random() - 0.5) * 0.5
      const angle = baseAngle + spread
      this.bullets.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 2 + Math.random() * 2,
        hue: (pitch * 360 + 180) % 360,
        life: 200,
        type: 'needle'
      })
    }
  }

  spawnSpiral(intensity, pitch) {
    const cx = Math.random() * this.width
    const cy = Math.random() * this.height

    this.emitters.push({
      x: cx,
      y: cy,
      type: 'spiral',
      angle: 0,
      life: 100,
      intensity,
      pitch
    })
  }

  spawnStream(amplitude, pitch) {
    const startSide = Math.floor(Math.random() * 4)
    let x, y, angle

    switch (startSide) {
      case 0: x = Math.random() * this.width; y = 0; angle = Math.PI / 2; break
      case 1: x = this.width; y = Math.random() * this.height; angle = Math.PI; break
      case 2: x = Math.random() * this.width; y = this.height; angle = -Math.PI / 2; break
      case 3: x = 0; y = Math.random() * this.height; angle = 0; break
    }

    this.emitters.push({
      x, y,
      type: 'stream',
      angle,
      life: 60,
      intensity: amplitude,
      pitch
    })
  }

  updateBullets() {
    // Update emitters first
    this.emitters = this.emitters.filter(e => {
      e.life--

      if (e.type === 'spiral') {
        if (e.life % 3 === 0 && this.bullets.length < this.maxBullets) {
          const speed = 2 + e.intensity * 2
          this.bullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(e.angle) * speed,
            vy: Math.sin(e.angle) * speed,
            radius: 3,
            hue: e.pitch * 360,
            life: 250,
            type: 'spiral'
          })
          e.angle += 0.3
        }
      } else if (e.type === 'stream') {
        if (this.bullets.length < this.maxBullets) {
          const speed = 4 + e.intensity * 3
          const spread = (Math.random() - 0.5) * 0.2
          this.bullets.push({
            x: e.x,
            y: e.y,
            vx: Math.cos(e.angle + spread) * speed,
            vy: Math.sin(e.angle + spread) * speed,
            radius: 3 + Math.random() * 2,
            hue: e.pitch * 360,
            life: 200,
            type: 'stream'
          })
        }
      }

      return e.life > 0
    })

    // Update bullets based on physics mode
    this.bullets = this.bullets.filter(b => {
      b.life--
      if (b.life <= 0) {
        this.stats.bulletsNavigated++
        return false
      }

      // Physics mode effects
      switch (this.physicsMode) {
        case 'orbital':
          // Bullets curve toward/around player
          const dx = this.player.x - b.x
          const dy = this.player.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          const gravity = 50 / (dist * dist)
          // Perpendicular force for orbiting
          b.vx += (-dy / dist) * gravity * 0.5
          b.vy += (dx / dist) * gravity * 0.5
          break

        case 'branching':
          // Bullets can split
          if (b.life === 150 && Math.random() < 0.3 && this.bullets.length < this.maxBullets - 2) {
            const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy)
            const angle = Math.atan2(b.vy, b.vx)
            this.bullets.push({
              x: b.x, y: b.y,
              vx: Math.cos(angle + 0.5) * speed,
              vy: Math.sin(angle + 0.5) * speed,
              radius: b.radius * 0.7,
              hue: b.hue,
              life: 100,
              type: 'branch'
            })
            this.bullets.push({
              x: b.x, y: b.y,
              vx: Math.cos(angle - 0.5) * speed,
              vy: Math.sin(angle - 0.5) * speed,
              radius: b.radius * 0.7,
              hue: b.hue,
              life: 100,
              type: 'branch'
            })
          }
          break

        case 'tunnel':
          // Everything accelerates
          b.vx *= 1.02
          b.vy *= 1.02
          break

        case 'contour':
          // Bullets slow down and become safe zones
          b.vx *= 0.98
          b.vy *= 0.98
          b.radius = Math.max(b.radius, 8)  // Grow to show safe area
          break
      }

      // Apply velocity
      b.x += b.vx * this.timeScale
      b.y += b.vy * this.timeScale

      // Wrap or remove off-screen
      const margin = 100
      if (b.x < -margin || b.x > this.width + margin ||
          b.y < -margin || b.y > this.height + margin) {
        return false
      }

      return true
    })
  }

  updateMobs(audioFeatures) {
    this.mobs = this.mobs.filter(m => {
      m.life--
      if (m.life <= 0) return false

      // Move toward center slowly
      m.x += Math.cos(m.angle) * m.speed
      m.y += Math.sin(m.angle) * m.speed

      // Shoot patterns
      m.shootCooldown--
      if (m.shootCooldown <= 0) {
        this.mobShoot(m, audioFeatures)
        m.shootCooldown = 30 + Math.random() * 30
      }

      // Remove if off screen far
      if (m.x < -200 || m.x > this.width + 200 ||
          m.y < -200 || m.y > this.height + 200) {
        return false
      }

      return true
    })
  }

  mobShoot(mob, audioFeatures) {
    const count = Math.floor(4 + mob.intensity * 8)
    const angleToPlayer = Math.atan2(this.player.y - mob.y, this.player.x - mob.x)

    for (let i = 0; i < count; i++) {
      if (this.bullets.length >= this.maxBullets) break

      const spread = (i - count / 2) * 0.15
      const speed = 2 + mob.intensity * 2
      const angle = angleToPlayer + spread

      this.bullets.push({
        x: mob.x,
        y: mob.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 4,
        hue: (audioFeatures.centroid * 360 + 120) % 360,
        life: 300,
        type: 'aimed'
      })
    }
  }

  checkCollisions() {
    const px = this.player.x
    const py = this.player.y
    const pr = this.player.radius

    // Check bullets - in contour mode, bullets are safe zones
    if (this.physicsMode !== 'contour') {
      for (const b of this.bullets) {
        const dx = b.x - px
        const dy = b.y - py
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < pr + b.radius) {
          this.onHit(b)
        }
      }
    }

    // Check mobs
    for (const m of this.mobs) {
      const dx = m.x - px
      const dy = m.y - py
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < pr + m.radius) {
        this.onHit(m)
        m.life = 0  // Mob disappears on contact
      }
    }
  }

  onHit(source) {
    // No death - transformation instead
    this.stats.transformations++
    this.player.hitState = 1

    // Random transformation effect
    const effect = Math.floor(Math.random() * 6)

    switch (effect) {
      case 0:
        // Screen distortion
        this.distortion = 0.5 + Math.random() * 0.5
        break
      case 1:
        // Time dilation
        this.timeScale = 0.3 + Math.random() * 0.4
        setTimeout(() => this.timeScale = 1, 1000)
        break
      case 2:
        // Color shift
        this.colorShift = 180
        break
      case 3:
        // Movement transformation
        this.player.transformMode = Math.floor(Math.random() * 4)
        setTimeout(() => this.player.transformMode = 0, 2000)
        break
      case 4:
        // Screen shake
        this.screenShake = {
          x: (Math.random() - 0.5) * 30,
          y: (Math.random() - 0.5) * 30
        }
        break
      case 5:
        // Bullet clear (brief respite)
        this.bullets = this.bullets.slice(0, Math.floor(this.bullets.length / 2))
        this.stats.gracePeriods++
        break
    }
  }

  draw() {
    // Apply screen shake
    this.ctx.save()
    this.ctx.translate(this.screenShake.x, this.screenShake.y)

    // Apply distortion effect
    if (this.distortion > 0.1) {
      this.ctx.translate(
        Math.sin(Date.now() * 0.01) * this.distortion * 20,
        Math.cos(Date.now() * 0.013) * this.distortion * 20
      )
    }

    // Draw background (subtle grid showing physics mode)
    this.drawBackground()

    // Draw safe zones in contour mode
    if (this.physicsMode === 'contour') {
      this.drawContourZones()
    }

    // Draw bullets
    this.drawBullets()

    // Draw mobs
    this.drawMobs()

    // Draw player
    this.drawPlayer()

    // Draw UI
    this.drawUI()

    this.ctx.restore()
  }

  drawBackground() {
    // Subtle indication of physics mode
    this.ctx.globalAlpha = 0.1

    const modeColors = {
      standard: '#888',
      orbital: '#88f',
      branching: '#8f8',
      tunnel: '#f88',
      contour: '#ff8'
    }

    this.ctx.strokeStyle = modeColors[this.physicsMode]
    this.ctx.lineWidth = 1

    // Grid
    const gridSize = 80
    for (let x = 0; x < this.width; x += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(x, 0)
      this.ctx.lineTo(x, this.height)
      this.ctx.stroke()
    }
    for (let y = 0; y < this.height; y += gridSize) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, y)
      this.ctx.lineTo(this.width, y)
      this.ctx.stroke()
    }

    this.ctx.globalAlpha = 1
  }

  drawContourZones() {
    // In contour mode, bullets define safe zones
    this.ctx.globalAlpha = 0.1
    this.ctx.fillStyle = '#4f4'

    for (const b of this.bullets) {
      this.ctx.beginPath()
      this.ctx.arc(b.x, b.y, b.radius * 3, 0, Math.PI * 2)
      this.ctx.fill()
    }

    this.ctx.globalAlpha = 1
  }

  drawBullets() {
    for (const b of this.bullets) {
      const alpha = Math.min(1, b.life / 50)
      const hue = (b.hue + this.colorShift) % 360

      this.ctx.beginPath()
      this.ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)

      // Glow
      const gradient = this.ctx.createRadialGradient(
        b.x, b.y, 0,
        b.x, b.y, b.radius * 2
      )
      gradient.addColorStop(0, `hsla(${hue}, 80%, 70%, ${alpha})`)
      gradient.addColorStop(0.5, `hsla(${hue}, 80%, 50%, ${alpha * 0.5})`)
      gradient.addColorStop(1, `hsla(${hue}, 80%, 30%, 0)`)

      this.ctx.fillStyle = gradient
      this.ctx.fill()

      // Core
      this.ctx.fillStyle = `hsla(${hue}, 90%, 80%, ${alpha})`
      this.ctx.beginPath()
      this.ctx.arc(b.x, b.y, b.radius * 0.5, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  drawMobs() {
    for (const m of this.mobs) {
      const alpha = Math.min(1, m.life / 100)

      // Outer glow
      const gradient = this.ctx.createRadialGradient(
        m.x, m.y, 0,
        m.x, m.y, m.radius * 1.5
      )
      gradient.addColorStop(0, `rgba(255, 100, 100, ${alpha * 0.8})`)
      gradient.addColorStop(0.6, `rgba(255, 50, 50, ${alpha * 0.3})`)
      gradient.addColorStop(1, 'rgba(255, 0, 0, 0)')

      this.ctx.fillStyle = gradient
      this.ctx.beginPath()
      this.ctx.arc(m.x, m.y, m.radius * 1.5, 0, Math.PI * 2)
      this.ctx.fill()

      // Core
      this.ctx.fillStyle = `rgba(255, 200, 200, ${alpha})`
      this.ctx.beginPath()
      this.ctx.arc(m.x, m.y, m.radius * 0.3, 0, Math.PI * 2)
      this.ctx.fill()
    }
  }

  drawPlayer() {
    const p = this.player

    // Draw trail
    this.ctx.beginPath()
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i]
      const alpha = 1 - (t.age / p.maxTrail)

      if (i === 0) {
        this.ctx.moveTo(t.x, t.y)
      } else {
        this.ctx.lineTo(t.x, t.y)
      }
    }
    this.ctx.strokeStyle = `rgba(100, 200, 255, 0.3)`
    this.ctx.lineWidth = 2
    this.ctx.stroke()

    // Hit flash
    if (p.hitState > 0.1) {
      this.ctx.fillStyle = `rgba(255, 255, 255, ${p.hitState * 0.5})`
      this.ctx.beginPath()
      this.ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2)
      this.ctx.fill()
    }

    // Player glow
    const gradient = this.ctx.createRadialGradient(
      p.x, p.y, 0,
      p.x, p.y, p.radius * 2
    )
    gradient.addColorStop(0, 'rgba(100, 200, 255, 0.8)')
    gradient.addColorStop(0.5, 'rgba(50, 150, 255, 0.3)')
    gradient.addColorStop(1, 'rgba(0, 100, 255, 0)')

    this.ctx.fillStyle = gradient
    this.ctx.beginPath()
    this.ctx.arc(p.x, p.y, p.radius * 2, 0, Math.PI * 2)
    this.ctx.fill()

    // Player core
    this.ctx.fillStyle = '#fff'
    this.ctx.beginPath()
    this.ctx.arc(p.x, p.y, p.radius * 0.6, 0, Math.PI * 2)
    this.ctx.fill()

    // Grace indicator (outer ring)
    this.ctx.strokeStyle = `rgba(100, 255, 200, ${0.3 * p.graceMultiplier})`
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.arc(p.x, p.y, p.radius * (1 + p.graceMultiplier * 0.5), 0, Math.PI * 2)
    this.ctx.stroke()
  }

  drawUI() {
    this.ctx.font = '14px "SF Mono", Monaco, monospace'
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'

    // Physics mode indicator
    this.ctx.fillText(`mode: ${this.physicsMode}`, 20, 30)

    // Transformation indicator
    if (this.player.transformMode !== 0) {
      const modes = ['', 'SLIPPERY', 'HEAVY', 'INVERTED']
      this.ctx.fillStyle = 'rgba(255, 200, 100, 0.8)'
      this.ctx.fillText(modes[this.player.transformMode], 20, 50)
    }

    // Flow stats (not score - flow metrics)
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.fillText(`navigated: ${this.stats.bulletsNavigated}`, 20, this.height - 60)
    this.ctx.fillText(`transformations: ${this.stats.transformations}`, 20, this.height - 40)
    this.ctx.fillText(`grace: ${this.player.graceMultiplier.toFixed(2)}`, 20, this.height - 20)

    // Controls hint
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'
    this.ctx.fillText('WASD or arrows to move', this.width - 200, this.height - 20)
  }

  clear() {
    this.bullets = []
    this.emitters = []
    this.mobs = []
    this.player.x = this.width / 2
    this.player.y = this.height / 2
    this.player.trail = []
    this.player.hitState = 0
    this.distortion = 0
    this.stats = {
      bulletsNavigated: 0,
      transformations: 0,
      gracePeriods: 0,
      totalMovement: 0
    }
  }
}
