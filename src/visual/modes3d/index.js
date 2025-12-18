import { Visualization3DMode } from './base.js'
import { GeometryMode } from './geometry.js'
import { NebulaMode } from './nebula.js'
import { TunnelMode } from './tunnel.js'
import { ProteinMode } from './protein.js'
import { DemolitionMode } from './demolition.js'
import { SoftBodyMode } from './softbody.js'
import { DimensionalMode } from './dimensional.js'

// Re-export classes
export { Visualization3DMode, GeometryMode, NebulaMode, TunnelMode, ProteinMode, DemolitionMode, SoftBodyMode, DimensionalMode }

export const MODES_3D = {
  geometry3d: {
    class: GeometryMode,
    name: '3D Geometry',
    description: 'Pulsing icosahedron with audio-reactive morphing',
    icon: '💎'
  },
  nebula3d: {
    class: NebulaMode,
    name: '3D Nebula',
    description: 'Cosmic particle cloud that breathes with audio',
    icon: '🌌'
  },
  tunnel3d: {
    class: TunnelMode,
    name: '3D Tunnel',
    description: 'Infinite tunnel flying through audio-reactive space',
    icon: '🕳️'
  },
  protein3d: {
    class: ProteinMode,
    name: '3D Protein',
    description: 'Amino acid chains folding with audio',
    icon: '🧬'
  },
  demolition3d: {
    class: DemolitionMode,
    name: 'Audio Demolition',
    description: 'Physics structures destroyed by audio. Bass shakes. Beats explode.',
    icon: '💥'
  },
  softbody3d: {
    class: SoftBodyMode,
    name: 'Soft Body Mosh',
    description: 'Jelly blobs colliding. Bass squishes. Beats bounce.',
    icon: '🫧'
  },
  dimensional3d: {
    class: DimensionalMode,
    name: 'Dimensional Bleed',
    description: '2D bleeds into 3D. Portals tear open. Physics breaks.',
    icon: '🌀'
  }
}

export const MODE_3D_LIST = Object.keys(MODES_3D)
