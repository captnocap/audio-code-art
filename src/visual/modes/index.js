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

// Chemistry modes
export { MolecularMode } from './molecular.js'
export { CrystalMode } from './crystal.js'
export { OrbitalsMode } from './orbitals.js'
export { CombustionMode } from './combustion.js'
export { TitrationMode } from './titration.js'
export { PolymerMode } from './polymer.js'
export { ElectrochemistryMode } from './electrochemistry.js'

// Fractal modes
export { MandelbrotMode } from './mandelbrot.js'
export { PipesMode } from './pipes.js'

// Meta modes
export { JSXGenMode } from './jsxgen.js'
export { AIChatMode } from './aichat.js'

// Glitch modes
export { CorruptionMode } from './corruption.js'
export { FeedbackMode } from './feedback.js'
export { WrongAPIMode } from './wrongapi.js'
export { TimeDisplacementMode } from './timedisplacement.js'
export { AntiVizMode } from './antiviz.js'
export { SynesthesiaLiesMode } from './synesthesialies.js'

// Interactive modes
export { BulletHellMode } from './bullethell.js'
export { TetrisMode } from './tetris.js'
export { MinesweeperMode } from './minesweeper.js'
export { AudiosurfMode } from './audiosurf.js'

// Experimental physics modes
export { QuantumGravityMode } from './quantumgravity.js'

// Nature modes
export { BeachMode } from './beach.js'

// Data visualization modes
export { AudioGridMode } from './audiogrid.js'

// Particle modes
export { EdgeGravityMode } from './edgegravity.js'

// Design system modes
export { UIKitMode } from './uikit.js'

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
  },

  // Chemistry visualization modes
  molecular: {
    class: () => import('./molecular.js').then(m => m.MolecularMode),
    name: 'Molecular Dynamics',
    description: 'Atoms forming and breaking chemical bonds',
    icon: '⚛'
  },
  crystal: {
    class: () => import('./crystal.js').then(m => m.CrystalMode),
    name: 'Crystal Growth',
    description: 'Dendritic crystal nucleation and growth',
    icon: '❄'
  },
  orbitals: {
    class: () => import('./orbitals.js').then(m => m.OrbitalsMode),
    name: 'Electron Orbitals',
    description: 'Quantum probability clouds (s, p, d, f)',
    icon: '☢'
  },
  combustion: {
    class: () => import('./combustion.js').then(m => m.CombustionMode),
    name: 'Combustion',
    description: 'Realistic fire with chemical reactions',
    icon: '🔥'
  },
  titration: {
    class: () => import('./titration.js').then(m => m.TitrationMode),
    name: 'pH Titration',
    description: 'Color-changing pH indicator solution',
    icon: '🧪'
  },
  polymer: {
    class: () => import('./polymer.js').then(m => m.PolymerMode),
    name: 'Polymerization',
    description: 'Chain reactions building polymer structures',
    icon: '🔗'
  },
  electrochemistry: {
    class: () => import('./electrochemistry.js').then(m => m.ElectrochemistryMode),
    name: 'Electrochemistry',
    description: 'Electrochemical cells with electron flow',
    icon: '⚡'
  },
  pipes: {
    class: () => import('./pipes.js').then(m => m.PipesMode),
    name: '3D Pipes',
    description: 'Classic Windows screensaver - pipes grow and turn',
    icon: '🔧'
  },

  // Fractal modes
  mandelbrot: {
    class: () => import('./mandelbrot.js').then(m => m.MandelbrotMode),
    name: 'Mandelbrot',
    description: 'Audio-reactive fractal exploration with Julia morphing',
    icon: '🌀'
  },

  // Meta modes
  jsxgen: {
    class: () => import('./jsxgen.js').then(m => m.JSXGenMode),
    name: 'JSX Generator',
    description: 'Generate React components from audio - songs become design systems',
    icon: '⚛️'
  },
  aichat: {
    class: () => import('./aichat.js').then(m => m.AIChatMode),
    name: 'AI Chat',
    description: 'Chat interface where responses become multi-mode visual chaos',
    icon: '🧠'
  },

  // Glitch modes
  corruption: {
    class: () => import('./corruption.js').then(m => m.CorruptionMode),
    name: 'Corruption',
    description: 'Memory artifacts. Audio from 30 seconds ago bleeds into now.',
    icon: '💾'
  },
  feedback: {
    class: () => import('./feedback.js').then(m => m.FeedbackMode),
    name: 'Feedback Loop',
    description: 'Canvas becomes audio input. Recursive chaos until crash.',
    icon: '♾️'
  },
  wrongapi: {
    class: () => import('./wrongapi.js').then(m => m.WrongAPIMode),
    name: 'Wrong API',
    description: 'Audio controls impossible things. Errors become art.',
    icon: '⚠️'
  },
  timedisplacement: {
    class: () => import('./timedisplacement.js').then(m => m.TimeDisplacementMode),
    name: 'Time Displacement',
    description: 'Past, present, future rendered out of order.',
    icon: '⏳'
  },
  antiviz: {
    class: () => import('./antiviz.js').then(m => m.AntiVizMode),
    name: 'Anti-Visualization',
    description: 'Sound destroys. Silence preserves. Negative space portrait.',
    icon: '🕳️'
  },
  synesthesialies: {
    class: () => import('./synesthesialies.js').then(m => m.SynesthesiaLiesMode),
    name: 'Synesthesia Lies',
    description: 'Audio becomes smell, taste, texture. Impossible sensations.',
    icon: '👃'
  },

  // Interactive modes
  bullethell: {
    class: () => import('./bullethell.js').then(m => m.BulletHellMode),
    name: 'Bullet Hell',
    description: 'Navigate audio-generated patterns. You cannot die, only transform.',
    icon: '👾'
  },
  tetris: {
    class: () => import('./tetris.js').then(m => m.TetrisMode),
    name: 'Audio Tetris',
    description: 'Tetris where pieces are chosen by audio. Bass = heavy, highs = light.',
    icon: '🧱'
  },
  minesweeper: {
    class: () => import('./minesweeper.js').then(m => m.MinesweeperMode),
    name: 'Audio Minesweeper',
    description: 'Beats spawn mines. Clear between the chaos.',
    icon: '💣'
  },
  audiosurf: {
    class: () => import('./audiosurf.js').then(m => m.AudiosurfMode),
    name: 'Audiosurf',
    description: 'Ride a highway generated from audio. Collect orbs, feel the flow.',
    icon: '🏄'
  },

  // Experimental physics
  quantumgravity: {
    class: () => import('./quantumgravity.js').then(m => m.QuantumGravityMode),
    name: 'Quantum Gravity',
    description: 'Sound IS gravity. Bass warps spacetime. Beats collapse wave functions. The unified theory of audio.',
    icon: '🌌'
  },

  // Nature
  beach: {
    class: () => import('./beach.js').then(m => m.BeachMode),
    name: 'Beach Tides',
    description: 'Sound as ocean waves. Sand remembers. Shells deposit. Tide pools form.',
    icon: '🏖️'
  },

  // Data visualization
  audiogrid: {
    class: () => import('./audiogrid.js').then(m => m.AudioGridMode),
    name: 'Audio Commit Grid',
    description: 'GitHub-style grid where each cell is a musical note. Chords create lightning.',
    icon: '📊'
  },

  // Particle modes
  edgegravity: {
    class: () => import('./edgegravity.js').then(m => m.EdgeGravityMode),
    name: 'Edge Gravity',
    description: 'Edges pull particles to the void. Sound pushes them back. Light trails in darkness.',
    icon: '🌑'
  },

  // Design system modes
  uikit: {
    class: () => import('./uikit.js').then(m => m.UIKitMode),
    name: 'UI Kit Generator',
    description: 'Albums become design systems. CSS variables, colors, spacing from audio.',
    icon: '🎨'
  }
}

export const MODE_LIST = Object.keys(MODES)
