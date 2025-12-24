import { tuner } from '../tuner.js'

// Base class for 3D visualization modes
export class Visualization3DMode {
  constructor() {
    this.name = 'base3d'
    this.description = 'Base 3D visualization mode'
    this.scene = null
    this.camera = null
    this.renderer = null
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
