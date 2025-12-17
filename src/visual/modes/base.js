// Base class for visualization modes
export class VisualizationMode {
  constructor(ctx, width, height) {
    this.ctx = ctx
    this.width = width
    this.height = height
    this.name = 'base'
    this.description = 'Base visualization mode'
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
