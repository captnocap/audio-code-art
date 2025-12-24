// Molecular Dynamics Mode - Atoms forming and breaking bonds
// Simulates atomic interactions with audio-driven chemistry

import { VisualizationMode } from './base.js'
import { pitchTempoToRGB } from '../palette.js'

// Element types with properties
const ELEMENTS = {
  hydrogen: { symbol: 'H', color: [255, 255, 255], radius: 8, maxBonds: 1, mass: 1 },
  carbon: { symbol: 'C', color: [80, 80, 80], radius: 14, maxBonds: 4, mass: 12 },
  nitrogen: { symbol: 'N', color: [50, 50, 255], radius: 13, maxBonds: 3, mass: 14 },
  oxygen: { symbol: 'O', color: [255, 50, 50], radius: 12, maxBonds: 2, mass: 16 },
  sulfur: { symbol: 'S', color: [255, 255, 50], radius: 16, maxBonds: 2, mass: 32 },
  phosphorus: { symbol: 'P', color: [255, 150, 50], radius: 15, maxBonds: 5, mass: 31 }
}

class Atom {
  constructor(x, y, element) {
    this.x = x
    this.y = y
    this.vx = (Math.random() - 0.5) * 2
    this.vy = (Math.random() - 0.5) * 2
    this.element = element
    this.props = ELEMENTS[element]
    this.bonds = []
    this.vibration = 0
    this.excited = false
  }

  get bondCount() {
    return this.bonds.length
  }

  canBond() {
    return this.bondCount < this.props.maxBonds
  }
}

class Bond {
  constructor(atom1, atom2, order = 1) {
    this.atom1 = atom1
    this.atom2 = atom2
    this.order = order // 1 = single, 2 = double, 3 = triple
    this.strength = 1
    this.age = 0
  }

  get length() {
    const dx = this.atom2.x - this.atom1.x
    const dy = this.atom2.y - this.atom1.y
    return Math.sqrt(dx * dx + dy * dy)
  }

  get idealLength() {
    return (this.atom1.props.radius + this.atom2.props.radius) * 2.5
  }
}

export class MolecularMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'molecular'
    this.description = 'Atomic bonding simulation driven by audio'

    this.atoms = []
    this.bonds = []
    this.maxAtoms = 150

    // Temperature (kinetic energy)
    this.temperature = 0.5

    // Smoothed audio
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
  }

  init() {
    this.clear()
    // Spawn initial atoms
    this.spawnAtoms(50)
  }

  spawnAtoms(count, preferredElement = null) {
    const elements = Object.keys(ELEMENTS)

    for (let i = 0; i < count && this.atoms.length < this.maxAtoms; i++) {
      let element = preferredElement

      if (!element) {
        // Weight toward carbon and hydrogen for organic chemistry feel
        const rand = Math.random()
        if (rand < 0.4) element = 'carbon'
        else if (rand < 0.7) element = 'hydrogen'
        else if (rand < 0.85) element = 'oxygen'
        else if (rand < 0.95) element = 'nitrogen'
        else element = elements[Math.floor(Math.random() * elements.length)]
      }

      const margin = 50
      this.atoms.push(new Atom(
        margin + Math.random() * (this.width - margin * 2),
        margin + Math.random() * (this.height - margin * 2),
        element
      ))
    }
  }

  resize(width, height) {
    super.resize(width, height)
  }

  tryFormBond(atom1, atom2) {
    // Check if bond already exists
    for (const bond of this.bonds) {
      if ((bond.atom1 === atom1 && bond.atom2 === atom2) ||
          (bond.atom1 === atom2 && bond.atom2 === atom1)) {
        return false
      }
    }

    // Check if both can form more bonds
    if (!atom1.canBond() || !atom2.canBond()) return false

    // Create bond
    const bond = new Bond(atom1, atom2)
    this.bonds.push(bond)
    atom1.bonds.push(bond)
    atom2.bonds.push(bond)

    return true
  }

  breakBond(bond) {
    // Remove from atoms
    bond.atom1.bonds = bond.atom1.bonds.filter(b => b !== bond)
    bond.atom2.bonds = bond.atom2.bonds.filter(b => b !== bond)

    // Remove from global list
    this.bonds = this.bonds.filter(b => b !== bond)
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { bass, mid, high, amplitude, centroid } = weighted
    const { normalizedTempo, onBeat, beatIntensity, isSaturated } = beatInfo

    // Smooth audio
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing

    // Temperature from high frequencies (molecular vibration)
    this.temperature = 0.3 + this.smoothHigh * 1.5

    // Spawn atoms on beat
    if (onBeat && beatIntensity > 0.4) {
      const numSpawn = Math.ceil(beatIntensity * 5)
      this.spawnAtoms(numSpawn)
    }

    // Physics update
    const bondingDistance = 60 + this.smoothBass * 40 // Bass brings atoms closer
    const repulsionStrength = 0.5
    const bondStrength = 0.03
    const friction = 0.98

    // Atom-atom interactions
    for (let i = 0; i < this.atoms.length; i++) {
      const a1 = this.atoms[i]

      // Apply vibration
      a1.vibration = this.temperature * (0.5 + Math.random() * 0.5)
      a1.vx += (Math.random() - 0.5) * a1.vibration
      a1.vy += (Math.random() - 0.5) * a1.vibration

      for (let j = i + 1; j < this.atoms.length; j++) {
        const a2 = this.atoms[j]

        const dx = a2.x - a1.x
        const dy = a2.y - a1.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 1
        const nx = dx / dist
        const ny = dy / dist

        const minDist = a1.props.radius + a2.props.radius

        // Repulsion when too close
        if (dist < minDist * 2) {
          const force = repulsionStrength * (1 - dist / (minDist * 2))
          a1.vx -= nx * force
          a1.vy -= ny * force
          a2.vx += nx * force
          a2.vy += ny * force
        }

        // Potential bonding (bass increases bonding tendency)
        if (dist < bondingDistance && this.smoothBass > 0.3) {
          // Bonding probability based on mid frequencies
          const bondProb = 0.01 + this.smoothMid * 0.05
          if (Math.random() < bondProb) {
            this.tryFormBond(a1, a2)
          }
        }
      }

      // Boundary forces
      const margin = 30
      const boundaryForce = 0.5
      if (a1.x < margin) a1.vx += boundaryForce
      if (a1.x > this.width - margin) a1.vx -= boundaryForce
      if (a1.y < margin) a1.vy += boundaryForce
      if (a1.y > this.height - margin) a1.vy -= boundaryForce

      // Friction
      a1.vx *= friction
      a1.vy *= friction

      // Update position
      a1.x += a1.vx
      a1.y += a1.vy
    }

    // Bond physics
    for (const bond of this.bonds) {
      const dx = bond.atom2.x - bond.atom1.x
      const dy = bond.atom2.y - bond.atom1.y
      const dist = bond.length
      const idealDist = bond.idealLength

      // Spring force to maintain bond length
      const stretch = dist - idealDist
      const force = stretch * bondStrength

      const nx = dx / dist
      const ny = dy / dist

      bond.atom1.vx += nx * force
      bond.atom1.vy += ny * force
      bond.atom2.vx -= nx * force
      bond.atom2.vy -= ny * force

      bond.age++

      // High temperature can break bonds
      if (this.temperature > 1.2 && Math.random() < (this.temperature - 1.2) * 0.02) {
        this.breakBond(bond)
      }
    }

    // Saturation causes molecular chaos
    if (isSaturated) {
      // Break random bonds
      if (this.bonds.length > 0 && Math.random() < 0.1) {
        const idx = Math.floor(Math.random() * this.bonds.length)
        this.breakBond(this.bonds[idx])
      }

      // Excite random atoms
      for (const atom of this.atoms) {
        if (Math.random() < 0.1) {
          atom.excited = true
          atom.vx += (Math.random() - 0.5) * 10
          atom.vy += (Math.random() - 0.5) * 10
        }
      }
    }

    // Decay excitement
    for (const atom of this.atoms) {
      if (atom.excited && Math.random() < 0.05) {
        atom.excited = false
      }
    }
  }

  draw() {
    const ctx = this.ctx

    // Dark background
    ctx.fillStyle = 'rgb(5, 5, 15)'
    ctx.fillRect(0, 0, this.width, this.height)

    // Draw bonds first (behind atoms)
    for (const bond of this.bonds) {
      const { atom1, atom2 } = bond

      // Bond color - blend of atom colors
      const r = (atom1.props.color[0] + atom2.props.color[0]) / 2
      const g = (atom1.props.color[1] + atom2.props.color[1]) / 2
      const b = (atom1.props.color[2] + atom2.props.color[2]) / 2

      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`
      ctx.lineWidth = 3 * bond.order

      ctx.beginPath()
      ctx.moveTo(atom1.x, atom1.y)
      ctx.lineTo(atom2.x, atom2.y)
      ctx.stroke()

      // Draw multiple lines for double/triple bonds
      if (bond.order > 1) {
        const dx = atom2.x - atom1.x
        const dy = atom2.y - atom1.y
        const len = Math.sqrt(dx * dx + dy * dy)
        const px = -dy / len * 4
        const py = dx / len * 4

        ctx.lineWidth = 2
        for (let i = 1; i < bond.order; i++) {
          const offset = (i - (bond.order - 1) / 2) * 2
          ctx.beginPath()
          ctx.moveTo(atom1.x + px * offset, atom1.y + py * offset)
          ctx.lineTo(atom2.x + px * offset, atom2.y + py * offset)
          ctx.stroke()
        }
      }
    }

    // Draw atoms
    for (const atom of this.atoms) {
      const { props, excited } = atom

      // Atom glow
      const glowSize = props.radius * (excited ? 3 : 2)
      const gradient = ctx.createRadialGradient(
        atom.x, atom.y, 0,
        atom.x, atom.y, glowSize
      )

      if (excited) {
        gradient.addColorStop(0, `rgba(255, 255, 255, 0.8)`)
        gradient.addColorStop(0.3, `rgba(${props.color[0]}, ${props.color[1]}, ${props.color[2]}, 0.5)`)
      } else {
        gradient.addColorStop(0, `rgba(${props.color[0]}, ${props.color[1]}, ${props.color[2]}, 0.8)`)
      }
      gradient.addColorStop(1, 'transparent')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(atom.x, atom.y, glowSize, 0, Math.PI * 2)
      ctx.fill()

      // Atom core
      ctx.fillStyle = `rgb(${props.color[0]}, ${props.color[1]}, ${props.color[2]})`
      ctx.beginPath()
      ctx.arc(atom.x, atom.y, props.radius, 0, Math.PI * 2)
      ctx.fill()

      // Highlight
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
      ctx.beginPath()
      ctx.arc(atom.x - props.radius * 0.3, atom.y - props.radius * 0.3, props.radius * 0.4, 0, Math.PI * 2)
      ctx.fill()

      // Element symbol
      ctx.fillStyle = props.color[0] + props.color[1] + props.color[2] > 400 ? '#000' : '#fff'
      ctx.font = `${props.radius}px Arial`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(props.symbol, atom.x, atom.y)
    }

    // Stats
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.font = '12px monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`Atoms: ${this.atoms.length}  Bonds: ${this.bonds.length}  Temp: ${this.temperature.toFixed(2)}`, 10, 20)
  }

  clear() {
    this.atoms = []
    this.bonds = []
    this.temperature = 0.5
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.ctx.fillStyle = 'rgb(5, 5, 15)'
    this.ctx.fillRect(0, 0, this.width, this.height)
  }
}
