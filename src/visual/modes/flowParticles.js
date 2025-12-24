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
    const weighted = this.getWeightedAudio(audioFeatures)
    this.flowField.update(weighted)
    this.particleSystem.update(this.flowField, weighted, beatInfo)
  }

  draw() {
    // Semi-transparent overlay for trail effect
    this.clearBackground(0.02)
    this.particleSystem.draw(this.ctx)
  }

  clear() {
    this.clearBackground(1)
    if (this.particleSystem) this.particleSystem.clear()
  }

  exportData(scaleX, scaleY) {
    return {
      accumulated: this.particleSystem.accumulatedParticles,
      active: this.particleSystem.particles
    }
  }
}
