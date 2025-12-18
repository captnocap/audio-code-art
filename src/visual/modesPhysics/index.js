import { PhysicsMode } from './base.js'
import { RagdollMode } from './ragdoll.js'
import { PinballMode } from './pinball.js'
import { ChainMode } from './chains.js'

// Re-export classes
export { PhysicsMode, RagdollMode, PinballMode, ChainMode }

export const MODES_PHYSICS = {
  ragdoll: {
    class: RagdollMode,
    name: 'Ragdoll Mosh',
    description: 'Ragdoll mosh pit. Bass makes them heavy. Beats make them jump.',
    icon: '🤸'
  },
  pinball: {
    class: PinballMode,
    name: 'Pinball Pachinko',
    description: 'Pachinko chaos. Beats fire flippers. Bass shakes pegs.',
    icon: '🎰'
  },
  chains: {
    class: ChainMode,
    name: 'Chain Reaction',
    description: 'Chains swing with BPM. Bass breaks links. Chaos reigns.',
    icon: '⛓️'
  }
}

export const MODE_PHYSICS_LIST = Object.keys(MODES_PHYSICS)
