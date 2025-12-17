import { VisualizationMode } from './base.js'
import { FlowField } from '../flowfield.js'
import { ParticleSystem } from '../particles.js'

export class FlowParticlesMode extends VisualizationMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'flowParticles'
    this.description = 'Particles following audio-reactive flow fields with stipple accumulation'
    this.flowField = null
    this.particleSystem = null
  }

  init() {
    this.flowField = new FlowField(this.width, this.height, 20)
    this.particleSystem = new ParticleSystem(this.width, this.height)
  }

  resize(width, height) {
    super.resize(width, height)
    if (this.flowField) this.flowField.resize(width, height)
    if (this.particleSystem) this.particleSystem.resize(width, height)
  }

  update(audioFeatures, beatInfo) {
    this.flowField.update(audioFeatures)
    this.particleSystem.update(this.flowField, audioFeatures, beatInfo)
  }

  draw() {
    // Semi-transparent overlay for trail effect
    this.ctx.fillStyle = 'rgba(10, 10, 10, 0.02)'
    this.ctx.fillRect(0, 0, this.width, this.height)
    this.particleSystem.draw(this.ctx)
  }

  clear() {
    this.ctx.fillStyle = '#0a0a0a'
    this.ctx.fillRect(0, 0, this.width, this.height)
    if (this.particleSystem) this.particleSystem.clear()
  }

  exportData(scaleX, scaleY) {
    return {
      accumulated: this.particleSystem.accumulatedParticles,
      active: this.particleSystem.particles
    }
  }
}
