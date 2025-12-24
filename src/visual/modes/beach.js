import { VisualizationMode } from './base.js'
import { tuner } from '../tuner.js'

// Beach Tides - Sound waves as ocean waves from above
// Sand remembers. Shells deposit. Tide pools form. Water is "wrong".
export class BeachMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'beach'
    this.description = 'Sound as ocean tides. Sand remembers wave patterns.'

    // Beach geometry
    this.shoreline = height * 0.3 // Where sand meets water
    this.maxTide = height * 0.7  // Maximum tide reach

    // Water state - multiple wave sources for stereo "wrongness"
    this.waveSources = []
    this.maxWaveSources = 5

    // The water layer - tracks where water currently is
    this.waterLevel = new Float32Array(width)
    this.waterVelocity = new Float32Array(width)
    this.waterOpacity = new Float32Array(width) // For fade effect

    // Sediment memory - layers of sand patterns
    this.sedimentLayers = []
    this.maxSedimentLayers = 20
    this.currentSediment = new Float32Array(width)

    // Shells and debris
    this.shells = []
    this.maxShells = 200
    this.debris = []

    // Tide pools - form from sustained sounds
    this.tidePools = []
    this.maxTidePools = 30
    this.sustainedEnergy = 0

    // Colors
    this.sandColors = ['#f4e4bc', '#e8d5a3', '#dcc68a', '#c9b477']
    this.waterColors = ['#1a5f7a', '#2980b9', '#3498db', '#5dade2']
    this.foamColor = '#ffffff'
    this.wetSandColor = '#b8a066'

    // Audio tracking
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothLeft = 0
    this.smoothRight = 0
    this.smoothAmplitude = 0

    // Time
    this.time = 0
  }

  init() {
    // Initialize water level to shoreline
    for (let x = 0; x < this.width; x++) {
      this.waterLevel[x] = this.shoreline
      this.waterOpacity[x] = 0
    }

    // Create initial sediment pattern
    this.generateBaseSediment()

    // Spawn some initial shells on the beach
    for (let i = 0; i < 50; i++) {
      this.spawnShell(Math.random() * this.width, this.shoreline + Math.random() * 100)
    }
  }

  generateBaseSediment() {
    for (let x = 0; x < this.width; x++) {
      // Natural sand ripple pattern
      this.currentSediment[x] = Math.sin(x * 0.05) * 5 + Math.sin(x * 0.02) * 10
    }
  }

  spawnWaveSource(x, angle, intensity, stereoSide) {
    if (this.waveSources.length >= this.maxWaveSources) {
      this.waveSources.shift()
    }

    this.waveSources.push({
      x: x,
      angle: angle, // Direction waves come from (radians)
      intensity: intensity,
      stereoSide: stereoSide, // 'left', 'right', or 'center'
      progress: 0, // 0 to 1, how far the wave has traveled
      width: 50 + Math.random() * 100,
      speed: 0.5 + intensity * 0.5,
      foam: [],
      birth: this.time
    })
  }

  spawnShell(x, y) {
    if (this.shells.length >= this.maxShells) return

    const types = ['spiral', 'clam', 'starfish', 'pebble', 'seaweed']
    this.shells.push({
      x: x,
      y: y,
      type: types[Math.floor(Math.random() * types.length)],
      size: 3 + Math.random() * 8,
      rotation: Math.random() * Math.PI * 2,
      color: `hsl(${30 + Math.random() * 30}, ${40 + Math.random() * 20}%, ${60 + Math.random() * 20}%)`,
      deposited: this.time,
      driftX: 0,
      driftY: 0
    })
  }

  spawnTidePool(x, y, size) {
    if (this.tidePools.length >= this.maxTidePools) {
      // Remove oldest pool
      this.tidePools.shift()
    }

    this.tidePools.push({
      x: x,
      y: y,
      size: size,
      depth: 0.5 + Math.random() * 0.5,
      life: 1,
      ripples: [],
      contents: [] // Small creatures, bubbles
    })
  }

  update(audioFeatures, beatInfo) {
    const params = tuner.getAll()
    const { bass, mid, high, amplitude, leftChannel, rightChannel, centroid } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo, bpm } = beatInfo

    this.time += 0.016

    // Smooth audio - handle stereo separately
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Stereo channels (simulate if not available)
    const left = leftChannel !== undefined ? leftChannel : amplitude * (0.5 + (Math.random() - 0.5) * 0.3)
    const right = rightChannel !== undefined ? rightChannel : amplitude * (0.5 + (Math.random() - 0.5) * 0.3)
    this.smoothLeft += (left - this.smoothLeft) * smoothing
    this.smoothRight += (right - this.smoothRight) * smoothing

    // Track sustained energy for tide pools
    this.sustainedEnergy = this.sustainedEnergy * 0.99 + amplitude * 0.01

    // BEATS SPAWN WAVES
    if (onBeat && beatIntensity > 0.2) {
      // Determine wave angle based on stereo
      const stereoBalance = this.smoothLeft - this.smoothRight
      let angle, stereoSide

      if (Math.abs(stereoBalance) < 0.1) {
        // Centered - wave comes straight up
        angle = Math.PI / 2
        stereoSide = 'center'
      } else if (stereoBalance > 0) {
        // Left dominant - wave comes from bottom-left
        angle = Math.PI / 2 + stereoBalance * Math.PI * 0.3
        stereoSide = 'left'
      } else {
        // Right dominant - wave comes from bottom-right
        angle = Math.PI / 2 + stereoBalance * Math.PI * 0.3
        stereoSide = 'right'
      }

      // Spawn wave at position based on stereo
      const waveX = this.width * (0.5 - stereoBalance * 0.4)
      this.spawnWaveSource(waveX, angle, beatIntensity, stereoSide)
    }

    // Update wave sources
    for (const wave of this.waveSources) {
      wave.progress += wave.speed * 0.02 * (1 + this.smoothAmplitude)

      // Wave creates water level changes
      const waveReach = this.shoreline + (this.maxTide - this.shoreline) * wave.progress * wave.intensity

      for (let x = 0; x < this.width; x++) {
        // Distance from wave center
        const dx = x - wave.x
        const waveInfluence = Math.exp(-(dx * dx) / (wave.width * wave.width * 2))

        // Offset based on wave angle
        const angleOffset = Math.sin(wave.angle) * dx * 0.1

        // Wave shape
        const waveShape = Math.sin(wave.progress * Math.PI) * waveInfluence

        if (waveShape > 0.1) {
          const targetLevel = waveReach + angleOffset + Math.sin(x * 0.1 + this.time * 2) * 5
          const currentLevel = this.waterLevel[x]

          // Water moves toward target but with inertia
          const force = (targetLevel - currentLevel) * 0.1 * waveShape
          this.waterVelocity[x] += force
          this.waterOpacity[x] = Math.min(1, this.waterOpacity[x] + waveShape * 0.2)
        }
      }

      // Spawn foam at wave front
      if (wave.progress < 0.8 && Math.random() < 0.3) {
        wave.foam.push({
          x: wave.x + (Math.random() - 0.5) * wave.width,
          y: waveReach,
          size: 2 + Math.random() * 4,
          life: 1
        })
      }
    }

    // Update water physics
    for (let x = 0; x < this.width; x++) {
      // Apply velocity with damping
      this.waterLevel[x] += this.waterVelocity[x]
      this.waterVelocity[x] *= 0.95

      // Gravity pulls water back toward shoreline (tide going out)
      const pullBack = (this.waterLevel[x] - this.shoreline) * 0.002
      this.waterVelocity[x] -= pullBack

      // Clamp water level
      this.waterLevel[x] = Math.max(this.shoreline, Math.min(this.maxTide, this.waterLevel[x]))

      // Water opacity fades like water soaking into sand
      if (this.waterLevel[x] < this.shoreline + 10) {
        this.waterOpacity[x] *= 0.98 // Slow fade at shore
      } else {
        this.waterOpacity[x] *= 0.995 // Very slow fade inland
      }

      // Record sediment pattern where water reaches
      if (this.waterLevel[x] > this.shoreline + 5) {
        this.currentSediment[x] += (this.waterLevel[x] - this.shoreline) * 0.001
      }
    }

    // Save sediment layer on strong beats
    if (onBeat && beatIntensity > 0.7) {
      this.saveSedimentLayer()
    }

    // SUSTAINED SOUNDS CREATE TIDE POOLS
    if (this.sustainedEnergy > 0.3 && Math.random() < 0.01 * params.chaos) {
      // Find a spot where water has been
      const x = Math.random() * this.width
      const y = this.shoreline + Math.random() * (this.maxTide - this.shoreline) * 0.5
      this.spawnTidePool(x, y, 10 + this.sustainedEnergy * 30)
    }

    // Update tide pools
    for (const pool of this.tidePools) {
      pool.life -= 0.0005 // Very slow drain

      // Add ripples occasionally
      if (Math.random() < 0.02) {
        pool.ripples.push({
          radius: 0,
          maxRadius: pool.size * 0.8,
          life: 1
        })
      }

      // Update ripples
      pool.ripples = pool.ripples.filter(r => {
        r.radius += 0.5
        r.life -= 0.02
        return r.life > 0
      })

      // Bass disturbs pools
      if (this.smoothBass > 0.5) {
        pool.ripples.push({
          radius: 0,
          maxRadius: pool.size,
          life: 0.5
        })
      }
    }

    // Filter dead pools
    this.tidePools = this.tidePools.filter(p => p.life > 0)

    // Remove old waves
    this.waveSources = this.waveSources.filter(w => w.progress < 1.5)

    // Update foam
    for (const wave of this.waveSources) {
      wave.foam = wave.foam.filter(f => {
        f.life -= 0.02
        f.y += (Math.random() - 0.5) * 2
        f.x += (Math.random() - 0.5) * 1
        return f.life > 0
      })
    }

    // DEPOSIT SHELLS at tide marks
    if (onBeat && beatIntensity > 0.5 && Math.random() < 0.3) {
      // Find current tide line
      let avgTide = 0
      for (let x = 0; x < this.width; x++) {
        avgTide += this.waterLevel[x]
      }
      avgTide /= this.width

      this.spawnShell(
        Math.random() * this.width,
        avgTide + (Math.random() - 0.5) * 30
      )
    }

    // Drift shells with water
    for (const shell of this.shells) {
      const xi = Math.floor(shell.x)
      if (xi >= 0 && xi < this.width) {
        if (this.waterLevel[xi] > shell.y - 5) {
          // Shell is in water - drift
          shell.driftX += (Math.random() - 0.5) * 0.5
          shell.driftY += this.waterVelocity[xi] * 0.3
          shell.x += shell.driftX
          shell.y += shell.driftY
          shell.rotation += 0.02
        }
        shell.driftX *= 0.95
        shell.driftY *= 0.95
      }

      // Keep shells on beach
      shell.y = Math.max(this.shoreline - 20, Math.min(this.maxTide + 50, shell.y))
      shell.x = Math.max(0, Math.min(this.width, shell.x))
    }
  }

  saveSedimentLayer() {
    if (this.sedimentLayers.length >= this.maxSedimentLayers) {
      this.sedimentLayers.shift()
    }

    // Copy current sediment pattern
    this.sedimentLayers.push({
      pattern: new Float32Array(this.currentSediment),
      time: this.time,
      color: `hsla(40, ${30 + Math.random() * 20}%, ${50 + Math.random() * 15}%, 0.3)`
    })
  }

  draw() {
    // Sky gradient at top
    const skyGradient = this.ctx.createLinearGradient(0, 0, 0, this.shoreline)
    skyGradient.addColorStop(0, '#87ceeb')
    skyGradient.addColorStop(1, '#e0f0ff')
    this.ctx.fillStyle = skyGradient
    this.ctx.fillRect(0, 0, this.width, this.shoreline)

    // Deep water
    const waterGradient = this.ctx.createLinearGradient(0, 0, 0, this.shoreline)
    waterGradient.addColorStop(0, '#0a2f4a')
    waterGradient.addColorStop(0.5, '#1a5f7a')
    waterGradient.addColorStop(1, '#2980b9')
    this.ctx.fillStyle = waterGradient
    this.ctx.fillRect(0, 0, this.width, this.shoreline)

    // Draw sand base
    const sandGradient = this.ctx.createLinearGradient(0, this.shoreline, 0, this.height)
    sandGradient.addColorStop(0, '#c9b477')
    sandGradient.addColorStop(0.3, '#e8d5a3')
    sandGradient.addColorStop(1, '#f4e4bc')
    this.ctx.fillStyle = sandGradient
    this.ctx.fillRect(0, this.shoreline, this.width, this.height - this.shoreline)

    // Draw sediment layers (sand memory)
    for (const layer of this.sedimentLayers) {
      this.ctx.beginPath()
      this.ctx.moveTo(0, this.height)

      for (let x = 0; x < this.width; x += 3) {
        const sedimentHeight = layer.pattern[x] * 0.5
        this.ctx.lineTo(x, this.shoreline + sedimentHeight + 50)
      }

      this.ctx.lineTo(this.width, this.height)
      this.ctx.closePath()
      this.ctx.fillStyle = layer.color
      this.ctx.fill()
    }

    // Draw current sediment ripples
    this.ctx.strokeStyle = 'rgba(180, 160, 120, 0.3)'
    this.ctx.lineWidth = 1
    for (let y = this.shoreline; y < this.height; y += 15) {
      this.ctx.beginPath()
      for (let x = 0; x < this.width; x += 2) {
        const ripple = this.currentSediment[x] * 0.3 + Math.sin(x * 0.03 + y * 0.02) * 3
        if (x === 0) {
          this.ctx.moveTo(x, y + ripple)
        } else {
          this.ctx.lineTo(x, y + ripple)
        }
      }
      this.ctx.stroke()
    }

    // Draw tide pools
    for (const pool of this.tidePools) {
      // Pool shadow
      this.ctx.beginPath()
      this.ctx.ellipse(pool.x + 3, pool.y + 3, pool.size, pool.size * 0.6, 0, 0, Math.PI * 2)
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
      this.ctx.fill()

      // Pool water
      const poolGradient = this.ctx.createRadialGradient(
        pool.x, pool.y, 0,
        pool.x, pool.y, pool.size
      )
      poolGradient.addColorStop(0, `rgba(30, 80, 120, ${pool.life * pool.depth})`)
      poolGradient.addColorStop(0.7, `rgba(50, 120, 160, ${pool.life * 0.7})`)
      poolGradient.addColorStop(1, `rgba(80, 140, 180, ${pool.life * 0.3})`)

      this.ctx.beginPath()
      this.ctx.ellipse(pool.x, pool.y, pool.size, pool.size * 0.6, 0, 0, Math.PI * 2)
      this.ctx.fillStyle = poolGradient
      this.ctx.fill()

      // Pool ripples
      for (const ripple of pool.ripples) {
        this.ctx.beginPath()
        this.ctx.ellipse(pool.x, pool.y, ripple.radius, ripple.radius * 0.6, 0, 0, Math.PI * 2)
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${ripple.life * 0.3})`
        this.ctx.lineWidth = 1
        this.ctx.stroke()
      }
    }

    // Draw water/wave layer
    this.ctx.beginPath()
    this.ctx.moveTo(0, 0)
    this.ctx.lineTo(0, this.shoreline)

    for (let x = 0; x < this.width; x += 2) {
      const level = this.waterLevel[x]
      const waveDetail = Math.sin(x * 0.05 + this.time * 3) * 3 +
                         Math.sin(x * 0.02 + this.time * 2) * 5
      this.ctx.lineTo(x, level + waveDetail)
    }

    this.ctx.lineTo(this.width, this.shoreline)
    this.ctx.lineTo(this.width, 0)
    this.ctx.closePath()

    const waveGradient = this.ctx.createLinearGradient(0, 0, 0, this.maxTide)
    waveGradient.addColorStop(0, 'rgba(10, 47, 74, 0.95)')
    waveGradient.addColorStop(0.5, 'rgba(41, 128, 185, 0.85)')
    waveGradient.addColorStop(0.8, 'rgba(93, 173, 226, 0.7)')
    waveGradient.addColorStop(1, 'rgba(174, 214, 241, 0.4)')
    this.ctx.fillStyle = waveGradient
    this.ctx.fill()

    // Draw wet sand (water opacity layer)
    for (let x = 0; x < this.width; x += 3) {
      const opacity = this.waterOpacity[x]
      if (opacity > 0.05 && this.waterLevel[x] < this.maxTide - 10) {
        const y = this.waterLevel[x]
        const fadeHeight = 30

        const wetGradient = this.ctx.createLinearGradient(0, y, 0, y + fadeHeight)
        wetGradient.addColorStop(0, `rgba(140, 120, 80, ${opacity * 0.6})`)
        wetGradient.addColorStop(1, 'rgba(140, 120, 80, 0)')

        this.ctx.fillStyle = wetGradient
        this.ctx.fillRect(x, y, 4, fadeHeight)
      }
    }

    // Draw foam
    for (const wave of this.waveSources) {
      for (const foam of wave.foam) {
        this.ctx.beginPath()
        this.ctx.arc(foam.x, foam.y, foam.size, 0, Math.PI * 2)
        this.ctx.fillStyle = `rgba(255, 255, 255, ${foam.life * 0.7})`
        this.ctx.fill()
      }
    }

    // Draw wave crests (foam lines)
    for (const wave of this.waveSources) {
      if (wave.progress < 1) {
        const crestY = this.shoreline + (this.maxTide - this.shoreline) * wave.progress * wave.intensity

        this.ctx.beginPath()
        for (let x = wave.x - wave.width; x < wave.x + wave.width; x += 3) {
          const dx = x - wave.x
          const influence = Math.exp(-(dx * dx) / (wave.width * wave.width))
          const y = crestY + Math.sin(x * 0.2 + this.time * 5) * 3 * influence

          if (x === wave.x - wave.width) {
            this.ctx.moveTo(x, y)
          } else {
            this.ctx.lineTo(x, y)
          }
        }
        this.ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - wave.progress) * 0.6})`
        this.ctx.lineWidth = 3
        this.ctx.stroke()
      }
    }

    // Draw shells
    for (const shell of this.shells) {
      this.ctx.save()
      this.ctx.translate(shell.x, shell.y)
      this.ctx.rotate(shell.rotation)

      this.ctx.fillStyle = shell.color
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
      this.ctx.lineWidth = 0.5

      switch (shell.type) {
        case 'spiral':
          this.ctx.beginPath()
          for (let t = 0; t < Math.PI * 4; t += 0.2) {
            const r = t * shell.size * 0.15
            const x = Math.cos(t) * r
            const y = Math.sin(t) * r
            if (t === 0) this.ctx.moveTo(x, y)
            else this.ctx.lineTo(x, y)
          }
          this.ctx.stroke()
          this.ctx.fill()
          break

        case 'clam':
          this.ctx.beginPath()
          this.ctx.ellipse(0, 0, shell.size, shell.size * 0.7, 0, 0, Math.PI * 2)
          this.ctx.fill()
          this.ctx.stroke()
          // Ridges
          for (let i = 0; i < 5; i++) {
            this.ctx.beginPath()
            this.ctx.ellipse(0, 0, shell.size * (0.2 + i * 0.15), shell.size * 0.7 * (0.2 + i * 0.15), 0, 0, Math.PI * 2)
            this.ctx.stroke()
          }
          break

        case 'starfish':
          this.ctx.beginPath()
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2
            const outerX = Math.cos(angle) * shell.size
            const outerY = Math.sin(angle) * shell.size
            const innerAngle = angle + Math.PI / 5
            const innerX = Math.cos(innerAngle) * shell.size * 0.4
            const innerY = Math.sin(innerAngle) * shell.size * 0.4

            if (i === 0) this.ctx.moveTo(outerX, outerY)
            else this.ctx.lineTo(outerX, outerY)
            this.ctx.lineTo(innerX, innerY)
          }
          this.ctx.closePath()
          this.ctx.fill()
          this.ctx.stroke()
          break

        case 'pebble':
          this.ctx.beginPath()
          this.ctx.ellipse(0, 0, shell.size, shell.size * 0.7, 0, 0, Math.PI * 2)
          this.ctx.fill()
          break

        case 'seaweed':
          this.ctx.strokeStyle = shell.color
          this.ctx.lineWidth = 2
          this.ctx.beginPath()
          this.ctx.moveTo(0, 0)
          for (let t = 0; t < shell.size; t += 2) {
            this.ctx.lineTo(Math.sin(t * 0.5 + this.time) * 3, -t)
          }
          this.ctx.stroke()
          break
      }

      this.ctx.restore()
    }

    // Draw stereo indicator
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    this.ctx.font = '12px monospace'
    this.ctx.fillText(`L: ${this.smoothLeft.toFixed(2)} | R: ${this.smoothRight.toFixed(2)}`, 10, 20)
    this.ctx.fillText(`Tide pools: ${this.tidePools.length} | Shells: ${this.shells.length}`, 10, 35)
    this.ctx.fillText(`Sediment layers: ${this.sedimentLayers.length}`, 10, 50)
  }

  resize(width, height) {
    super.resize(width, height)
    this.shoreline = height * 0.3
    this.maxTide = height * 0.7
    this.waterLevel = new Float32Array(width)
    this.waterVelocity = new Float32Array(width)
    this.waterOpacity = new Float32Array(width)
    this.currentSediment = new Float32Array(width)
    this.init()
  }

  clear() {
    this.waveSources = []
    this.shells = []
    this.tidePools = []
    this.sedimentLayers = []
    this.sustainedEnergy = 0
    for (let x = 0; x < this.width; x++) {
      this.waterLevel[x] = this.shoreline
      this.waterOpacity[x] = 0
      this.waterVelocity[x] = 0
    }
    this.generateBaseSediment()
  }
}
