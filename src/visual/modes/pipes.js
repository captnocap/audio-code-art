import { VisualizationMode } from './base.js'
import { pitchTempoToRGB } from '../palette.js'

// Classic Windows 3D Pipes screensaver - audio reactive
// Pipes grow and turn at right angles, filling the space
export class PipesMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'pipes'
    this.description = 'Classic 3D pipes screensaver - audio controls growth and turns'
    this.pipes = []
    this.maxPipes = 8
    this.gridSize = 40
    this.jointRadius = 12
  }

  init() {
    this.pipes = []
    // Start with a few pipes
    for (let i = 0; i < 3; i++) {
      this.spawnPipe()
    }
  }

  spawnPipe() {
    // Random starting position on grid
    const x = Math.floor(Math.random() * (this.width / this.gridSize)) * this.gridSize + this.gridSize / 2
    const y = Math.floor(Math.random() * (this.height / this.gridSize)) * this.gridSize + this.gridSize / 2

    // Random direction: 0=right, 1=down, 2=left, 3=up
    const dir = Math.floor(Math.random() * 4)

    // Random color
    const hue = Math.random() * 360

    this.pipes.push({
      x,
      y,
      dir,
      hue,
      saturation: 70,
      lightness: 50,
      segments: [],
      length: 0,
      maxLength: 500 + Math.random() * 1000,
      thickness: 8 + Math.random() * 8,
      growing: true,
      lastJoint: { x, y }
    })
  }

  getDirection(dir) {
    const dirs = [
      { dx: 1, dy: 0 },   // right
      { dx: 0, dy: 1 },   // down
      { dx: -1, dy: 0 },  // left
      { dx: 0, dy: -1 }   // up
    ]
    return dirs[dir % 4]
  }

  update(audioFeatures, beatInfo) {
    const p = this.tunerParams
    const weighted = this.getWeightedAudio(audioFeatures)
    const { amplitude, centroid, bass, mid, high } = weighted
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    // Growth speed based on amplitude
    const growthSpeed = 2 + amplitude * 8

    // Turn probability based on beat and high frequencies
    const turnChance = onBeat ? 0.8 : (0.02 + high * 0.1)

    // Spawn new pipes on strong beats
    if (onBeat && beatIntensity > 0.5 && this.pipes.filter(p => p.growing).length < this.maxPipes) {
      this.spawnPipe()
    }

    // Update each pipe
    for (const pipe of this.pipes) {
      if (!pipe.growing) continue

      const { dx, dy } = this.getDirection(pipe.dir)

      // Move pipe head
      pipe.x += dx * growthSpeed
      pipe.y += dy * growthSpeed
      pipe.length += growthSpeed

      // Update color based on audio
      pipe.hue = (pipe.hue + centroid * 2) % 360
      pipe.saturation = 50 + amplitude * 50
      pipe.lightness = 40 + amplitude * 30

      // Check if should turn
      const distFromLastJoint = Math.hypot(pipe.x - pipe.lastJoint.x, pipe.y - pipe.lastJoint.y)

      if (distFromLastJoint >= this.gridSize && Math.random() < turnChance) {
        // Add joint
        pipe.segments.push({
          x1: pipe.lastJoint.x,
          y1: pipe.lastJoint.y,
          x2: pipe.x,
          y2: pipe.y,
          thickness: pipe.thickness,
          hue: pipe.hue,
          saturation: pipe.saturation,
          lightness: pipe.lightness
        })

        pipe.lastJoint = { x: pipe.x, y: pipe.y }

        // Turn 90 degrees (left or right)
        const turnDir = Math.random() < 0.5 ? 1 : -1
        pipe.dir = (pipe.dir + turnDir + 4) % 4

        // Audio affects turn direction preference
        if (bass > high) {
          pipe.dir = (pipe.dir + 2) % 4  // More likely to go opposite
        }
      }

      // Check bounds - bounce or stop
      if (pipe.x < 0 || pipe.x > this.width || pipe.y < 0 || pipe.y > this.height) {
        // Save final segment
        pipe.segments.push({
          x1: pipe.lastJoint.x,
          y1: pipe.lastJoint.y,
          x2: Math.max(0, Math.min(this.width, pipe.x)),
          y2: Math.max(0, Math.min(this.height, pipe.y)),
          thickness: pipe.thickness,
          hue: pipe.hue,
          saturation: pipe.saturation,
          lightness: pipe.lightness
        })

        // Respawn at new location
        pipe.x = Math.floor(Math.random() * (this.width / this.gridSize)) * this.gridSize + this.gridSize / 2
        pipe.y = Math.floor(Math.random() * (this.height / this.gridSize)) * this.gridSize + this.gridSize / 2
        pipe.lastJoint = { x: pipe.x, y: pipe.y }
        pipe.dir = Math.floor(Math.random() * 4)
      }

      // Check max length
      if (pipe.length > pipe.maxLength) {
        pipe.segments.push({
          x1: pipe.lastJoint.x,
          y1: pipe.lastJoint.y,
          x2: pipe.x,
          y2: pipe.y,
          thickness: pipe.thickness,
          hue: pipe.hue,
          saturation: pipe.saturation,
          lightness: pipe.lightness
        })
        pipe.growing = false
      }
    }

    // Remove dead pipes and spawn new ones
    this.pipes = this.pipes.filter(p => p.growing || p.segments.length > 0)

    while (this.pipes.filter(p => p.growing).length < 3) {
      this.spawnPipe()
    }
  }

  draw() {
    // Slight fade for trail effect
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.02)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw all pipe segments
    for (const pipe of this.pipes) {
      // Draw completed segments
      for (const seg of pipe.segments) {
        this.drawSegment(seg)
        this.drawJoint(seg.x1, seg.y1, seg.thickness, seg.hue, seg.saturation, seg.lightness)
        this.drawJoint(seg.x2, seg.y2, seg.thickness, seg.hue, seg.saturation, seg.lightness)
      }

      // Draw current growing segment
      if (pipe.growing) {
        this.drawSegment({
          x1: pipe.lastJoint.x,
          y1: pipe.lastJoint.y,
          x2: pipe.x,
          y2: pipe.y,
          thickness: pipe.thickness,
          hue: pipe.hue,
          saturation: pipe.saturation,
          lightness: pipe.lightness
        })
        this.drawJoint(pipe.lastJoint.x, pipe.lastJoint.y, pipe.thickness, pipe.hue, pipe.saturation, pipe.lightness)
        this.drawJoint(pipe.x, pipe.y, pipe.thickness, pipe.hue, pipe.saturation, pipe.lightness)
      }
    }
  }

  drawSegment(seg) {
    const { x1, y1, x2, y2, thickness, hue, saturation, lightness } = seg

    // Main pipe body
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.lineWidth = thickness
    this.ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`
    this.ctx.lineCap = 'round'
    this.ctx.stroke()

    // Highlight (3D effect)
    this.ctx.beginPath()
    this.ctx.moveTo(x1, y1)
    this.ctx.lineTo(x2, y2)
    this.ctx.lineWidth = thickness * 0.3
    this.ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness + 25}%)`
    this.ctx.stroke()

    // Shadow edge
    const offsetX = (y2 - y1) === 0 ? 0 : thickness * 0.3
    const offsetY = (x2 - x1) === 0 ? 0 : thickness * 0.3
    this.ctx.beginPath()
    this.ctx.moveTo(x1 + offsetX, y1 + offsetY)
    this.ctx.lineTo(x2 + offsetX, y2 + offsetY)
    this.ctx.lineWidth = thickness * 0.2
    this.ctx.strokeStyle = `hsl(${hue}, ${saturation}%, ${lightness - 15}%)`
    this.ctx.stroke()
  }

  drawJoint(x, y, thickness, hue, saturation, lightness) {
    // Ball joint at corners
    const radius = thickness * 0.7

    // Main sphere
    const gradient = this.ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.3, 0,
      x, y, radius
    )
    gradient.addColorStop(0, `hsl(${hue}, ${saturation}%, ${lightness + 30}%)`)
    gradient.addColorStop(0.5, `hsl(${hue}, ${saturation}%, ${lightness}%)`)
    gradient.addColorStop(1, `hsl(${hue}, ${saturation}%, ${lightness - 20}%)`)

    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, Math.PI * 2)
    this.ctx.fillStyle = gradient
    this.ctx.fill()
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.pipes = []
    this.init()
  }
}
