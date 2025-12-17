export { VisualizationMode } from './base.js'
export { FlowParticlesMode } from './flowParticles.js'
export { PixelSortMode } from './pixelSort.js'
export { MandalaMode } from './mandala.js'
export { LSystemMode } from './lsystem.js'
export { RingsMode } from './rings.js'
export { ConstellationMode } from './constellation.js'
export { TerrainMode } from './terrain.js'
export { MirrorMode } from './mirror.js'
export { PlotterMode } from './plotter.js'

// New modes
export { SpirographMode } from './spirograph.js'
export { AutomataMode } from './automata.js'
export { OrbitsMode } from './orbits.js'
export { VoronoiMode } from './voronoi.js'
export { MyceliumMode } from './mycelium.js'
export { ContoursMode } from './contours.js'
export { StainedGlassMode } from './stainedglass.js'
export { IsometricMode } from './isometric.js'
export { CymaticsMode } from './cymatics.js'
export { ReactionDiffusionMode } from './reactiondiffusion.js'

// Registry of all available modes
export const MODES = {
  flowParticles: {
    class: () => import('./flowParticles.js').then(m => m.FlowParticlesMode),
    name: 'Flow Particles',
    description: 'Particles following audio-reactive flow fields with stipple accumulation',
    icon: '〰️'
  },
  pixelSort: {
    class: () => import('./pixelSort.js').then(m => m.PixelSortMode),
    name: 'Pixel Sort',
    description: 'Glitchy pixel sorting triggered by amplitude',
    icon: '▦'
  },
  mandala: {
    class: () => import('./mandala.js').then(m => m.MandalaMode),
    name: 'Mandala',
    description: 'Radial slices on beats build tree-ring timeline',
    icon: '◎'
  },
  lsystem: {
    class: () => import('./lsystem.js').then(m => m.LSystemMode),
    name: 'L-System Tree',
    description: 'Fractal trees grow on beats, shaped by pitch',
    icon: '🌿'
  },
  rings: {
    class: () => import('./rings.js').then(m => m.RingsMode),
    name: 'Rings',
    description: 'Concentric rings pulse outward on beats',
    icon: '○'
  },
  constellation: {
    class: () => import('./constellation.js').then(m => m.ConstellationMode),
    name: 'Constellation',
    description: 'Stars spawn on beats and connect',
    icon: '✦'
  },
  terrain: {
    class: () => import('./terrain.js').then(m => m.TerrainMode),
    name: 'Terrain',
    description: 'Scrolling mountain range from waveform',
    icon: '⛰'
  },
  mirror: {
    class: () => import('./mirror.js').then(m => m.MirrorMode),
    name: 'Mirror',
    description: 'Kaleidoscope with radial symmetry',
    icon: '✧'
  },
  plotter: {
    class: () => import('./plotter.js').then(m => m.PlotterMode),
    name: 'Plotter',
    description: 'Single continuous line for pen plotters',
    icon: '✎',
    supportsSVG: true
  },

  // New visualization modes
  spirograph: {
    class: () => import('./spirograph.js').then(m => m.SpirographMode),
    name: 'Spirograph',
    description: 'Audio-modulated mathematical curves',
    icon: '❋',
    supportsSVG: true
  },
  automata: {
    class: () => import('./automata.js').then(m => m.AutomataMode),
    name: 'Cellular Automata',
    description: 'Game of Life with audio-modulated rules',
    icon: '▣'
  },
  orbits: {
    class: () => import('./orbits.js').then(m => m.OrbitsMode),
    name: 'Gravitational Orbits',
    description: 'Particles orbiting gravitational attractors',
    icon: '◉'
  },
  voronoi: {
    class: () => import('./voronoi.js').then(m => m.VoronoiMode),
    name: 'Voronoi Shatter',
    description: 'Cellular patterns that fracture on beats',
    icon: '⬡',
    supportsSVG: true
  },
  mycelium: {
    class: () => import('./mycelium.js').then(m => m.MyceliumMode),
    name: 'Neural Mycelium',
    description: 'Organic branching network growth',
    icon: '🌿',
    supportsSVG: true
  },
  contours: {
    class: () => import('./contours.js').then(m => m.ContoursMode),
    name: 'Topographic Contours',
    description: 'Audio height field with contour lines',
    icon: '≋',
    supportsSVG: true
  },
  stainedglass: {
    class: () => import('./stainedglass.js').then(m => m.StainedGlassMode),
    name: 'Stained Glass',
    description: 'Delaunay mosaic with rippling colors',
    icon: '◇',
    supportsSVG: true
  },
  isometric: {
    class: () => import('./isometric.js').then(m => m.IsometricMode),
    name: 'Isometric City',
    description: 'Procedural cityscapes that breathe with audio',
    icon: '🏙',
    supportsSVG: true
  },
  cymatics: {
    class: () => import('./cymatics.js').then(m => m.CymaticsMode),
    name: 'Cymatics',
    description: 'Chladni plate standing wave patterns',
    icon: '◎',
    supportsSVG: true
  },
  reactiondiffusion: {
    class: () => import('./reactiondiffusion.js').then(m => m.ReactionDiffusionMode),
    name: 'Reaction-Diffusion',
    description: 'Organic Gray-Scott chemical patterns',
    icon: '🧫'
  }
}

export const MODE_LIST = Object.keys(MODES)
