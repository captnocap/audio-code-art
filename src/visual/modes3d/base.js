// Base class for 3D visualization modes
export class Visualization3DMode {
  constructor() {
    this.name = 'base3d'
    this.description = 'Base 3D visualization mode'
    this.scene = null
    this.camera = null
    this.renderer = null
  }

  // Called when mode is activated
  init(scene, camera, renderer) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
  }

  // Called every frame with audio data
  update(audioFeatures, beatInfo, delta, elapsed) {
    // Override in subclasses
  }

  // Called on window resize
  resize(width, height) {
    // Override if needed
  }

  // Called when switching modes
  dispose() {
    // Clean up resources
  }

  // Clear/reset the visualization
  clear() {
    // Override in subclasses
  }
}
