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

  // Helper for background - use transparent when video is behind
  clearBackground(opacity = 1) {
    if (this.transparentBackground) {
      // Semi-transparent clear for trail effect over video
      this.ctx.fillStyle = `rgba(0, 0, 0, ${opacity * 0.3})`
      this.ctx.fillRect(0, 0, this.width, this.height)
    } else {
      this.ctx.fillStyle = `rgba(10, 10, 10, ${opacity})`
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
