import { tuner } from '../tuner.js'

// Base class for visualization modes
export class VisualizationMode {
  constructor(ctx, width, height) {
    this.ctx = ctx
    this.width = width
    this.height = height
    this.name = 'base'
    this.description = 'Base visualization mode'
    this.transparentBackground = false
  }

  // Getter for tuner parameters - all modes automatically have access
  get tunerParams() {
    return tuner.getAll()
  }

  // Helper for weighted audio based on tuner frequency sliders
  getWeightedAudio(audioFeatures) {
    const p = this.tunerParams
    return {
      ...audioFeatures,
      bass: audioFeatures.bass * (0.5 + p.bassWeight),
      mid: audioFeatures.mid * (0.5 + p.midWeight),
      high: audioFeatures.high * (0.5 + p.highWeight)
    }
  }

  // Helper for background - use transparent when video is behind
  // Decay param: 0 = fast fade (no trails), 1 = slow fade (long trails)
  clearBackground(opacity = 1) {
    const decay = this.tunerParams.decay
    // Apply decay: higher decay = lower effective opacity = longer trails
    let effectiveOpacity = opacity * (1 - decay * 0.95)

    // In painter mode, use very subtle clearing (2% of normal) for gradual blending
    // This prevents complete saturation while allowing accumulation
    if (this.renderer?.painterMode) {
      effectiveOpacity *= 0.02
    }

    if (this.transparentBackground) {
      // Semi-transparent clear for trail effect over video
      this.ctx.fillStyle = `rgba(0, 0, 0, ${effectiveOpacity * 0.3})`
      this.ctx.fillRect(0, 0, this.width, this.height)
    } else {
      this.ctx.fillStyle = `rgba(10, 10, 10, ${effectiveOpacity})`
      this.ctx.fillRect(0, 0, this.width, this.height)
    }
  }

  // Called when mode is activated
  init() {}

  // Called when canvas resizes
  resize(width, height) {
    this.width = width
    this.height = height
  }

  // Called every frame with audio data
  update(audioFeatures, beatInfo) {}

  // Called every frame to render
  draw() {}

  // Clear/reset the visualization
  clear() {}

  // Export high-res version
  exportData(scaleX, scaleY) {
    return null
  }
}
