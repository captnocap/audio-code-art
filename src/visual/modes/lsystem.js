import { VisualizationMode } from './base.js'
import { pitchTempoToColor, pitchTempoToRGB } from '../palette.js'

// L-system tree growth - branches extend on beats
// Angle and length determined by pitch, creating unique tree per song
export class LSystemMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'lsystem'
    this.description = 'Fractal trees grow on beats - angle/length from pitch creates unique forms'
    this.branches = []
    this.activeTips = []
    this.maxDepth = 12
    this.baseLength = 0
    this.growthQueue = []
  }

  init() {
    this.branches = []
    this.activeTips = []
    this.baseLength = Math.min(this.width, this.height) * 0.15

    // Start with a few root points
    const rootCount = 3
    for (let i = 0; i < rootCount; i++) {
      const x = this.width * (0.2 + i * 0.3)
      const y = this.height * 0.9

      this.activeTips.push({
        x,
        y,
        angle: -Math.PI / 2,  // Point upward
        depth: 0,
        length: this.baseLength,
        thickness: 8
      })
    }
  }

  resize(width, height) {
    super.resize(width, height)
    this.baseLength = Math.min(width, height) * 0.15
  }

  update(audioFeatures, beatInfo) {
    const { amplitude, centroid, bass, mid, high } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo, isSaturated } = beatInfo

    // Determine if we should grow - on beat OR during saturation OR high amplitude
    const shouldGrow = onBeat ||
                       (isSaturated && Math.random() < 0.15) ||
                       (amplitude > 0.5 && Math.random() < amplitude * 0.1)

    // Grow branches from active tips
    if (shouldGrow && this.activeTips.length > 0) {
      const intensity = onBeat ? beatIntensity : (isSaturated ? 0.6 : amplitude)
      const newTips = []

      // Process some tips (not all, to control growth rate)
      const tipsToGrow = Math.min(this.activeTips.length, 5 + Math.floor(intensity * 10))

      for (let i = 0; i < tipsToGrow; i++) {
        const tip = this.activeTips[i]
        if (tip.depth >= this.maxDepth) continue

        // Branch angle based on pitch (centroid)
        // Low pitch = wider angles, high pitch = tighter
        const baseAngle = 0.2 + (1 - centroid) * 0.5

        // Length based on depth and amplitude
        const lengthFactor = Math.pow(0.7, tip.depth) * (0.5 + amplitude)
        const branchLength = tip.length * lengthFactor

        // Color from current audio
        const rgb = pitchTempoToRGB(centroid, normalizedTempo, amplitude)
        const color = pitchTempoToColor(centroid, normalizedTempo, amplitude)

        // Number of branches (1-3)
        const branchCount = bass > 0.5 ? 3 : (mid > 0.5 ? 2 : 1)

        // Asymmetric branching based on frequency balance
        const asymmetry = (high - bass) * 0.3

        for (let b = 0; b < branchCount; b++) {
          let newAngle
          if (branchCount === 1) {
            newAngle = tip.angle + (Math.random() - 0.5) * baseAngle
          } else if (branchCount === 2) {
            newAngle = tip.angle + (b === 0 ? -baseAngle : baseAngle) + asymmetry
          } else {
            newAngle = tip.angle + (b - 1) * baseAngle + asymmetry
          }

          // Calculate end point
          const endX = tip.x + Math.cos(newAngle) * branchLength
          const endY = tip.y + Math.sin(newAngle) * branchLength

          // Create branch
          this.branches.push({
            x1: tip.x,
            y1: tip.y,
            x2: endX,
            y2: endY,
            thickness: tip.thickness * 0.7,
            rgb,
            color,
            depth: tip.depth,
            birth: Date.now()
          })

          // Add new tip
          newTips.push({
            x: endX,
            y: endY,
            angle: newAngle,
            depth: tip.depth + 1,
            length: branchLength,
            thickness: tip.thickness * 0.7
          })
        }
      }

      // Remove processed tips, add new ones
      this.activeTips = this.activeTips.slice(tipsToGrow).concat(newTips)

      // Limit total tips
      if (this.activeTips.length > 100) {
        this.activeTips = this.activeTips.slice(-100)
      }
    }

    // Continuous subtle leaf/particle growth at tips
    if (amplitude > 0.3 && this.activeTips.length > 0) {
      const tip = this.activeTips[Math.floor(Math.random() * this.activeTips.length)]
      const rgb = pitchTempoToRGB(centroid, normalizedTempo, amplitude)

      // Small leaf/particle
      this.branches.push({
        x1: tip.x,
        y1: tip.y,
        x2: tip.x + (Math.random() - 0.5) * 10,
        y2: tip.y + (Math.random() - 0.5) * 10,
        thickness: 2 + amplitude * 3,
        rgb,
        isLeaf: true,
        depth: tip.depth,
        birth: Date.now()
      })
    }
  }

  draw() {
    // Very subtle fade
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.008)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw all branches
    for (const branch of this.branches) {
      this.drawBranch(branch)
    }
  }

  drawBranch(branch) {
    const { x1, y1, x2, y2, thickness, rgb, isLeaf, depth } = branch

    if (isLeaf) {
      // Draw as a dot/circle for leaves
      this.ctx.beginPath()
      this.ctx.arc(x1, y1, thickness, 0, Math.PI * 2)
      this.ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.6)`
      this.ctx.fill()
    } else {
      // Draw as line for branches
      this.ctx.beginPath()
      this.ctx.moveTo(x1, y1)
      this.ctx.lineTo(x2, y2)

      // Thickness decreases with depth
      this.ctx.lineWidth = Math.max(thickness, 0.5)
      this.ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.8)`
      this.ctx.lineCap = 'round'
      this.ctx.stroke()
    }
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.branches = []
    this.init()
  }

  exportData() {
    return { branches: this.branches }
  }
}
