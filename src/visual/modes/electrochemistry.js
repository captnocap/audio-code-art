// Electrochemistry Mode - Electron flow and redox reactions
// Visualizes electrochemical cells with audio-driven voltage

import { VisualizationMode } from './base.js'

class Electron {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.charge = -1
    this.trail = []
    this.maxTrail = 15
  }

  update(electricFieldX, electricFieldY) {
    // Store trail
    this.trail.push({ x: this.x, y: this.y })
    if (this.trail.length > this.maxTrail) {
      this.trail.shift()
    }

    // Accelerate in electric field (opposite to field direction due to negative charge)
    this.vx -= electricFieldX * 0.5
    this.vy -= electricFieldY * 0.1

    // Random thermal motion
    this.vx += (Math.random() - 0.5) * 0.5
    this.vy += (Math.random() - 0.5) * 0.5

    // Damping
    this.vx *= 0.95
    this.vy *= 0.95

    // Speed limit
    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy)
    if (speed > 8) {
      this.vx = (this.vx / speed) * 8
      this.vy = (this.vy / speed) * 8
    }

    this.x += this.vx
    this.y += this.vy
  }
}

class Ion {
  constructor(x, y, charge, element) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 2
    this.vy = (Math.random() - 0.5) * 2
    this.charge = charge // +1, +2, -1, -2
    this.element = element // 'Cu', 'Zn', 'Cl', etc
    this.radius = 8 + Math.abs(charge) * 2
    this.deposited = false
  }

  update(electricFieldX, electricFieldY) {
    if (this.deposited) return

    // Move in field direction based on charge
    this.vx += electricFieldX * this.charge * 0.02
    this.vy += electricFieldY * this.charge * 0.01

    // Brownian motion
    this.vx += (Math.random() - 0.5) * 0.3
    this.vy += (Math.random() - 0.5) * 0.3

    // Damping (viscosity)
    this.vx *= 0.97
    this.vy *= 0.97

    this.x += this.vx
    this.y += this.vy
  }

  getColor() {
    const colors = {
      'Cu': this.charge > 0 ? [100, 150, 255] : [184, 115, 51], // Cu2+ blue, Cu metal copper
      'Zn': this.charge > 0 ? [200, 200, 200] : [150, 150, 150], // Zn2+ gray
      'Cl': [150, 255, 150], // Cl- green
      'Na': [255, 200, 100], // Na+ yellow-orange
      'H': [255, 255, 255],  // H+ white
      'OH': [200, 200, 255]  // OH- light blue
    }
    return colors[this.element] || [200, 200, 200]
  }
}

class Bubble {
  constructor(x, y) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 0.5
    this.vy = -Math.random() * 2 - 1
    this.radius = 2 + Math.random() * 4
    this.life = 1
  }

  update() {
    this.vy -= 0.05 // Buoyancy
    this.vx += (Math.random() - 0.5) * 0.1
    this.x += this.vx
    this.y += this.vy
    this.life -= 0.01
    this.radius += 0.02 // Expand as it rises
  }
}

export class ElectrochemistryMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'electrochemistry'
    this.description = 'Electrochemical cells with electron flow'

    this.electrons = []
    this.ions = []
    this.bubbles = []

    // Electrodes
    this.anode = { x: 0, y: 0, width: 40, height: 0, material: 'Zn' }
    this.cathode = { x: 0, y: 0, width: 40, height: 0, material: 'Cu' }

    // Electrical properties
    this.voltage = 0 // -1 to 1
    this.current = 0

    // Metal deposits on cathode
    this.deposits = []

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
  }

  init() {
    this.clear()

    // Position electrodes
    this.anode.x = 80
    this.anode.y = 100
    this.anode.height = this.height - 200

    this.cathode.x = this.width - 120
    this.cathode.y = 100
    this.cathode.height = this.height - 200

    // Spawn initial ions
    this.spawnIons(100)
  }

  spawnIons(count) {
    const ionTypes = [
      { element: 'Cu', charge: 2 },
      { element: 'Zn', charge: 2 },
      { element: 'Cl', charge: -1 },
      { element: 'Na', charge: 1 }
    ]

    for (let i = 0; i < count; i++) {
      const type = ionTypes[Math.floor(Math.random() * ionTypes.length)]
      const x = 150 + Math.random() * (this.width - 300)
      const y = 100 + Math.random() * (this.height - 200)

      this.ions.push(new Ion(x, y, type.charge, type.element))
    }
  }

  spawnElectron(x, y) {
    if (this.electrons.length > 500) return
    this.electrons.push(new Electron(x, y))
  }

  spawnBubble(x, y) {
    if (this.bubbles.length > 100) return
    this.bubbles.push(new Bubble(x, y))
  }

  resize(width, height) {
    super.resize(width, height)
    this.init()
  }

  update(audioFeatures, beatInfo) {
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    // Voltage from audio (bass = negative/reducing, high = positive/oxidizing)
    this.voltage = (this.smoothBass - this.smoothHigh) * 2
    this.current = amplitude * Math.abs(this.voltage)

    // Electric field (simplified - just horizontal)
    const fieldX = this.voltage * 0.5
    const fieldY = 0

    // Emit electrons from anode when voltage is applied
    if (this.voltage < -0.2 && Math.random() < Math.abs(this.voltage) * 0.3) {
      this.spawnElectron(
        this.anode.x + this.anode.width,
        this.anode.y + Math.random() * this.anode.height
      )
    }

    // Update electrons
    for (let i = this.electrons.length - 1; i >= 0; i--) {
      const e = this.electrons[i]
      e.update(fieldX, fieldY)

      // Check if reached cathode
      if (e.x > this.cathode.x - 20) {
        // Electron absorbed - trigger reduction
        this.electrons.splice(i, 1)

        // Find nearby positive ion to reduce
        for (const ion of this.ions) {
          if (ion.deposited) continue
          if (ion.charge <= 0) continue

          const dx = ion.x - e.x
          const dy = ion.y - e.y
          if (Math.sqrt(dx * dx + dy * dy) < 50) {
            // Deposit metal
            ion.deposited = true
            ion.charge = 0
            ion.x = this.cathode.x - 10 - Math.random() * 20
            this.deposits.push({
              x: ion.x,
              y: ion.y,
              element: ion.element,
              size: 3 + Math.random() * 3
            })
            break
          }
        }

        continue
      }

      // Check if went off screen
      if (e.x < 0 || e.x > this.width || e.y < 50 || e.y > this.height - 50) {
        this.electrons.splice(i, 1)
      }
    }

    // Update ions
    for (const ion of this.ions) {
      if (ion.deposited) continue

      ion.update(fieldX, fieldY)

      // Boundary
      ion.x = Math.max(this.anode.x + this.anode.width + 20, Math.min(this.cathode.x - 20, ion.x))
      ion.y = Math.max(100, Math.min(this.height - 100, ion.y))
    }

    // Electrolysis bubbles on beat (H2/O2 evolution)
    if (onBeat && beatIntensity > 0.5 && Math.abs(this.voltage) > 0.5) {
      const numBubbles = Math.ceil(beatIntensity * 5)

      // Bubbles at cathode (H2) when reducing
      if (this.voltage < 0) {
        for (let i = 0; i < numBubbles; i++) {
          this.spawnBubble(
            this.cathode.x - 10,
            this.cathode.y + Math.random() * this.cathode.height
          )
        }
      }

      // Bubbles at anode (O2) when oxidizing
      if (this.voltage > 0) {
        for (let i = 0; i < numBubbles; i++) {
          this.spawnBubble(
            this.anode.x + this.anode.width + 10,
            this.anode.y + Math.random() * this.anode.height
          )
        }
      }
    }

    // Update bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i]
      b.update()

      if (b.life <= 0 || b.y < 50) {
        this.bubbles.splice(i, 1)
      }
    }

    // Spawn new ions to replace deposited ones
    const activeIons = this.ions.filter(i => !i.deposited).length
    if (activeIons < 50) {
      this.spawnIons(10)
    }

    // Saturation = rapid electrolysis
    if (isSaturated) {
      for (let i = 0; i < 5; i++) {
        this.spawnElectron(
          this.anode.x + this.anode.width,
          this.anode.y + Math.random() * this.anode.height
        )
      }
    }
  }

  draw() {
    const ctx = this.ctx

    // Solution background (electrolyte)
    const solutionGradient = ctx.createLinearGradient(0, 0, this.width, 0)
    solutionGradient.addColorStop(0, 'rgb(20, 30, 50)')
    solutionGradient.addColorStop(0.5, 'rgb(30, 40, 60)')
    solutionGradient.addColorStop(1, 'rgb(20, 30, 50)')
    ctx.fillStyle = solutionGradient
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw electrodes
    // Anode (oxidation - loses electrons)
    ctx.fillStyle = this.anode.material === 'Zn' ? 'rgb(150, 150, 170)' : 'rgb(180, 100, 50)'
    ctx.fillRect(this.anode.x, this.anode.y, this.anode.width, this.anode.height)

    // Anode label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = 'bold 14px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('ANODE', this.anode.x + this.anode.width / 2, this.anode.y - 10)
    ctx.fillText(`(${this.anode.material})`, this.anode.x + this.anode.width / 2, this.anode.y - 25)
    ctx.font = '12px monospace'
    ctx.fillText('Oxidation', this.anode.x + this.anode.width / 2, this.height - 70)

    // Cathode (reduction - gains electrons)
    ctx.fillStyle = this.cathode.material === 'Cu' ? 'rgb(184, 115, 51)' : 'rgb(150, 150, 170)'
    ctx.fillRect(this.cathode.x, this.cathode.y, this.cathode.width, this.cathode.height)

    // Draw deposits on cathode
    for (const dep of this.deposits) {
      const color = dep.element === 'Cu' ? 'rgb(184, 115, 51)' : 'rgb(150, 150, 170)'
      ctx.fillStyle = color
      ctx.beginPath()
      ctx.arc(dep.x, dep.y, dep.size, 0, Math.PI * 2)
      ctx.fill()
    }

    // Cathode label
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
    ctx.font = 'bold 14px monospace'
    ctx.fillText('CATHODE', this.cathode.x + this.cathode.width / 2, this.cathode.y - 10)
    ctx.fillText(`(${this.cathode.material})`, this.cathode.x + this.cathode.width / 2, this.cathode.y - 25)
    ctx.font = '12px monospace'
    ctx.fillText('Reduction', this.cathode.x + this.cathode.width / 2, this.height - 70)

    // Draw wire connecting electrodes (top)
    ctx.strokeStyle = 'rgb(100, 100, 100)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.moveTo(this.anode.x + this.anode.width / 2, this.anode.y)
    ctx.lineTo(this.anode.x + this.anode.width / 2, 50)
    ctx.lineTo(this.cathode.x + this.cathode.width / 2, 50)
    ctx.lineTo(this.cathode.x + this.cathode.width / 2, this.cathode.y)
    ctx.stroke()

    // Voltage meter
    this.drawVoltmeter(ctx, this.width / 2, 30)

    // Draw ions
    for (const ion of this.ions) {
      if (ion.deposited) continue

      const color = ion.getColor()
      const alpha = 0.8

      // Ion glow
      const gradient = ctx.createRadialGradient(
        ion.x, ion.y, 0,
        ion.x, ion.y, ion.radius * 2
      )
      gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, ${alpha})`)
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(ion.x, ion.y, ion.radius * 2, 0, Math.PI * 2)
      ctx.fill()

      // Ion core
      ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
      ctx.beginPath()
      ctx.arc(ion.x, ion.y, ion.radius, 0, Math.PI * 2)
      ctx.fill()

      // Charge indicator
      ctx.fillStyle = 'white'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const chargeStr = ion.charge > 0 ? '+'.repeat(ion.charge) : '-'.repeat(-ion.charge)
      ctx.fillText(ion.element + chargeStr, ion.x, ion.y)
    }

    // Draw electrons with trails
    ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)'
    ctx.lineWidth = 2

    for (const e of this.electrons) {
      // Trail
      if (e.trail.length > 1) {
        ctx.beginPath()
        ctx.moveTo(e.trail[0].x, e.trail[0].y)
        for (let i = 1; i < e.trail.length; i++) {
          ctx.lineTo(e.trail[i].x, e.trail[i].y)
        }
        ctx.stroke()
      }

      // Electron
      const gradient = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 6)
      gradient.addColorStop(0, 'rgba(150, 220, 255, 1)')
      gradient.addColorStop(0.5, 'rgba(100, 200, 255, 0.5)')
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(e.x, e.y, 6, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = 'white'
      ctx.font = '8px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('e⁻', e.x, e.y)
    }

    // Draw bubbles
    for (const b of this.bubbles) {
      ctx.strokeStyle = `rgba(200, 200, 255, ${b.life})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2)
      ctx.stroke()

      // Highlight
      ctx.fillStyle = `rgba(255, 255, 255, ${b.life * 0.3})`
      ctx.beginPath()
      ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.3, 0, Math.PI * 2)
      ctx.fill()
    }

    // Current flow indicator
    if (Math.abs(this.current) > 0.1) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
      ctx.font = '12px monospace'
      ctx.textAlign = 'center'
      const direction = this.voltage < 0 ? '→' : '←'
      ctx.fillText(`Current: ${direction} ${this.current.toFixed(2)} A`, this.width / 2, this.height - 30)
    }
  }

  drawVoltmeter(ctx, x, y) {
    // Meter background
    ctx.fillStyle = 'rgb(40, 40, 50)'
    ctx.fillRect(x - 50, y - 15, 100, 30)
    ctx.strokeStyle = 'rgb(80, 80, 90)'
    ctx.lineWidth = 2
    ctx.strokeRect(x - 50, y - 15, 100, 30)

    // Voltage bar
    const barWidth = 80
    const barHeight = 10
    const barX = x - barWidth / 2
    const barY = y - 5

    ctx.fillStyle = 'rgb(30, 30, 40)'
    ctx.fillRect(barX, barY, barWidth, barHeight)

    // Voltage indicator
    const voltagePos = (this.voltage + 1) / 2 * barWidth // Map -1..1 to 0..barWidth
    const voltageColor = this.voltage < 0 ? 'rgb(100, 150, 255)' : 'rgb(255, 150, 100)'

    ctx.fillStyle = voltageColor
    ctx.fillRect(barX + barWidth / 2, barY, voltagePos - barWidth / 2, barHeight)

    // Center line
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x, barY)
    ctx.lineTo(x, barY + barHeight)
    ctx.stroke()

    // Voltage text
    ctx.fillStyle = 'white'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(`${this.voltage.toFixed(2)} V`, x, y + 20)
  }

  clear() {
    this.electrons = []
    this.ions = []
    this.bubbles = []
    this.deposits = []
    this.voltage = 0
    this.current = 0
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.ctx.fillStyle = 'rgb(20, 30, 50)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
