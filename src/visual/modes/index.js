export { VisualizationMode } from './base.js'
export { FlowParticlesMode } from './flowParticles.js'
export { PixelSortMode } from './pixelSort.js'
export { MandalaMode } from './mandala.js'
export { LSystemMode } from './lsystem.js'
export { RingsMode } from './rings.js'
export { ConstellationMode } from './constellation.js'
export { TerrainMode } from './terrain.js'
export { MirrorMode } from './mirror.js'

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
  }
}

export const MODE_LIST = Object.keys(MODES)
