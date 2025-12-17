// Combustion Mode - Realistic fire simulation with chemical basis
// Fuel + Oxygen → Heat + Light + Products

import { VisualizationMode } from './base.js'

class FireParticle {
  constructor(x, y, type) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 2
    this.vy = -Math.random() * 3 - 1
    this.type = type // 'fuel', 'flame', 'smoke', 'ember'
    this.life = 1
    this.maxLife = type === 'smoke' ? 200 : (type === 'flame' ? 60 : 100)
    this.temperature = type === 'flame' ? 1 : (type === 'ember' ? 0.8 : 0.3)
    this.size = type === 'smoke' ? 15 + Math.random() * 20 : 5 + Math.random() * 10
    this.age = 0
  }

  update(turbulence, oxygenLevel) {
    this.age++
    this.life = 1 - this.age / this.maxLife

    // Physics based on particle type
    switch (this.type) {
      case 'fuel':
        // Fuel rises slowly, waiting to ignite
        this.vy -= 0.02
        this.vx += (Math.random() - 0.5) * 0.1
        break

      case 'flame':
        // Flames rise faster, affected by turbulence
        this.vy -= 0.15 + turbulence * 0.1
        this.vx += (Math.random() - 0.5) * turbulence * 2
        // Temperature decreases as flame rises
        this.temperature = Math.max(0, this.temperature - 0.01)
        // Size decreases
        this.size *= 0.98
        break

      case 'smoke':
        // Smoke rises slowly, spreads out
        this.vy -= 0.05
        this.vx += (Math.random() - 0.5) * 0.3 * turbulence
        // Smoke expands
        this.size += 0.2
        break

      case 'ember':
        // Embers follow ballistic trajectory
        this.vy += 0.05 // Gravity
        this.vx *= 0.99
        this.temperature -= 0.005
        break
    }

    // Apply velocity
    this.x += this.vx
    this.y += this.vy

    // Damping
    this.vx *= 0.98
    this.vy *= 0.98
  }

  // Get color based on temperature (black body radiation)
  getColor() {
    const t = this.temperature

    if (this.type === 'smoke') {
      const gray = 30 + this.life * 20
      return `rgba(${gray}, ${gray}, ${gray}, ${this.life * 0.5})`
    }

    // Black body radiation colors
    let r, g, b
    if (t > 0.9) {
      // White hot
      r = 255
      g = 255
      b = 200 + (t - 0.9) * 550
    } else if (t > 0.7) {
      // Yellow
      r = 255
      g = 200 + (t - 0.7) * 275
      b = 50
    } else if (t > 0.5) {
      // Orange
      r = 255
      g = 100 + (t - 0.5) * 500
      b = 0
    } else if (t > 0.3) {
      // Red
      r = 200 + (t - 0.3) * 275
      g = (t - 0.3) * 500
      b = 0
    } else {
      // Dark red / black
      r = t * 666
      g = 0
      b = 0
    }

    const alpha = this.life * (this.type === 'ember' ? 1 : 0.8)
    return `rgba(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)}, ${alpha})`
  }
}

export class CombustionMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'combustion'
    this.description = 'Realistic fire simulation with chemistry'

    this.particles = []
    this.maxParticles = 2000

    // Fire parameters
    this.fuelRate = 0.5 // How much fuel is being added
    this.oxygenLevel = 1 // Oxygen availability
    this.turbulence = 0.5 // Air turbulence

    // Fire sources
    this.sources = []

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
  }

  init() {
    this.clear()

    // Create fire sources along bottom
    const numSources = 5
    for (let i = 0; i < numSources; i++) {
      this.sources.push({
        x: this.width * (i + 0.5) / numSources,
        y: this.height - 50,
        intensity: 0.5 + Math.random() * 0.5
      })
    }
  }

  spawnFuel(x, y, amount) {
    for (let i = 0; i < amount && this.particles.length < this.maxParticles; i++) {
      const offsetX = (Math.random() - 0.5) * 40
      const offsetY = Math.random() * 20

      this.particles.push(new FireParticle(
        x + offsetX,
        y + offsetY,
        'fuel'
      ))
    }
  }

  spawnFlame(x, y, temperature) {
    if (this.particles.length >= this.maxParticles) return

    const flame = new FireParticle(x, y, 'flame')
    flame.temperature = temperature
    flame.size = 8 + temperature * 15
    this.particles.push(flame)
  }

  spawnSmoke(x, y) {
    if (this.particles.length >= this.maxParticles) return

    this.particles.push(new FireParticle(x, y, 'smoke'))
  }

  spawnEmber(x, y) {
    if (this.particles.length >= this.maxParticles) return

    const ember = new FireParticle(x, y, 'ember')
    ember.vx = (Math.random() - 0.5) * 8
    ember.vy = -Math.random() * 8 - 2
    ember.size = 2 + Math.random() * 3
    this.particles.push(ember)
  }

  resize(width, height) {
    super.resize(width, height)
    // Reposition sources
    this.sources = []
    const numSources = 5
    for (let i = 0; i < numSources; i++) {
      this.sources.push({
        x: width * (i + 0.5) / numSources,
        y: height - 50,
        intensity: 0.5 + Math.random() * 0.5
      })
    }
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio
    const smoothing = 0.15
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    // Fire parameters from audio
    this.fuelRate = 0.3 + this.smoothBass * 1.5 // Bass = more fuel
    this.turbulence = 0.3 + this.smoothHigh * 1.5 // High = more turbulence
    this.oxygenLevel = 0.5 + this.smoothMid // Mid = oxygen

    // Spawn fuel from sources
    for (const source of this.sources) {
      source.intensity = 0.3 + this.smoothBass * 0.7 + (Math.random() * 0.2)

      const spawnCount = Math.floor(this.fuelRate * source.intensity * 3)
      this.spawnFuel(source.x, source.y, spawnCount)
    }

    // Beat causes flame burst
    if (onBeat && beatIntensity > 0.3) {
      for (const source of this.sources) {
        // Burst of flames
        for (let i = 0; i < beatIntensity * 10; i++) {
          this.spawnFlame(
            source.x + (Math.random() - 0.5) * 30,
            source.y - 20,
            0.7 + beatIntensity * 0.3
          )
        }

        // Embers on strong beats
        if (beatIntensity > 0.6) {
          for (let i = 0; i < beatIntensity * 5; i++) {
            this.spawnEmber(source.x, source.y - 30)
          }
        }
      }
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      p.update(this.turbulence, this.oxygenLevel)

      // Combustion: fuel → flame when conditions are right
      if (p.type === 'fuel' && p.age > 10) {
        // Check for nearby flames or hot particles
        let ignite = false
        for (const other of this.particles) {
          if (other === p) continue
          if (other.temperature < 0.5) continue

          const dx = other.x - p.x
          const dy = other.y - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 30) {
            ignite = true
            break
          }
        }

        // Also spontaneous ignition with oxygen
        if (!ignite && Math.random() < 0.02 * this.oxygenLevel) {
          ignite = true
        }

        if (ignite) {
          p.type = 'flame'
          p.temperature = 0.6 + this.oxygenLevel * 0.4
          p.maxLife = 60
          p.age = 0
        }
      }

      // Flames produce smoke when dying
      if (p.type === 'flame' && p.life < 0.3 && Math.random() < 0.1) {
        this.spawnSmoke(p.x, p.y)
      }

      // Remove dead particles
      if (p.life <= 0 || p.y < -50 || p.x < -50 || p.x > this.width + 50) {
        this.particles.splice(i, 1)
      }
    }

    // Saturation = explosive combustion
    if (isSaturated) {
      const centerSource = this.sources[Math.floor(this.sources.length / 2)]
      for (let i = 0; i < 10; i++) {
        this.spawnFlame(
          centerSource.x + (Math.random() - 0.5) * 100,
          centerSource.y - Math.random() * 50,
          0.9 + Math.random() * 0.1
        )
      }
    }
  }

  draw() {
    const ctx = this.ctx

    // Dark background with slight fade (for trail effect)
    ctx.fillStyle = 'rgba(5, 5, 10, 0.3)'
    ctx.fillRect(0, 0, this.width, this.height)

    // Sort particles by type for proper layering
    const smoke = this.particles.filter(p => p.type === 'smoke')
    const flames = this.particles.filter(p => p.type === 'flame' || p.type === 'fuel')
    const embers = this.particles.filter(p => p.type === 'ember')

    // Draw smoke (back)
    for (const p of smoke) {
      ctx.fillStyle = p.getColor()
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw flames with additive blending for glow
    ctx.globalCompositeOperation = 'lighter'

    for (const p of flames) {
      const color = p.getColor()

      // Inner core
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2)
      ctx.fill()

      // Outer glow
      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.size * 1.5
      )
      gradient.addColorStop(0, color)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * 1.5, 0, Math.PI * 2)
      ctx.fill()
    }

    // Draw embers
    for (const p of embers) {
      const color = p.getColor()

      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
      ctx.fill()

      // Ember trail
      ctx.strokeStyle = color.replace(/[\d.]+\)$/, '0.3)')
      ctx.lineWidth = p.size * 0.5
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3)
      ctx.stroke()
    }

    ctx.globalCompositeOperation = 'source-over'

    // Draw fire sources (emitters)
    for (const source of this.sources) {
      const gradient = ctx.createRadialGradient(
        source.x, source.y + 10, 0,
        source.x, source.y + 10, 30
      )
      gradient.addColorStop(0, `rgba(255, 100, 0, ${source.intensity * 0.5})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(source.x, source.y + 10, 30, 0, Math.PI * 2)
      ctx.fill()
    }

    // Info
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '12px monospace'
    ctx.fillText(`Particles: ${this.particles.length}  Fuel: ${this.fuelRate.toFixed(2)}  O₂: ${this.oxygenLevel.toFixed(2)}`, 10, 20)
  }

  clear() {
    this.particles = []
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.ctx.fillStyle = 'rgb(5, 5, 10)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
