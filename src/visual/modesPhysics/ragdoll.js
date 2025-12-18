import Matter from 'matter-js'
import { PhysicsMode } from './base.js'
import { tuner } from '../tuner.js'

// Ragdoll Orchestra - Stick figures moshing and flailing to audio
export class RagdollMode extends PhysicsMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'ragdoll'
    this.description = 'Ragdoll mosh pit. Bass makes them heavy. Beats make them jump.'

    this.ragdolls = []
    this.maxRagdolls = 12
    this.spawnCooldown = 0

    // Colors for ragdolls
    this.colors = [
      '#ff6b6b', '#4ecdc4', '#45b7d1', '#f7dc6f',
      '#bb8fce', '#58d68d', '#f0b27a', '#85c1e9',
      '#ff9ff3', '#feca57', '#48dbfb', '#1dd1a1'
    ]
  }

  init() {
    super.init()

    // Start with some ragdolls
    for (let i = 0; i < 6; i++) {
      const x = 100 + Math.random() * (this.width - 200)
      const y = 100 + Math.random() * 200
      this.spawnRagdoll(x, y)
    }
  }

  spawnRagdoll(x, y) {
    if (this.ragdolls.length >= this.maxRagdolls) return

    const scale = 0.8 + Math.random() * 0.4
    const color = this.colors[this.ragdolls.length % this.colors.length]

    // Body parts dimensions
    const headRadius = 15 * scale
    const torsoW = 30 * scale
    const torsoH = 50 * scale
    const limbW = 10 * scale
    const upperLimbH = 30 * scale
    const lowerLimbH = 35 * scale

    // Create body parts
    const head = this.Bodies.circle(x, y - torsoH/2 - headRadius, headRadius, {
      friction: 0.5,
      restitution: 0.3,
      density: 0.001
    })

    const torso = this.Bodies.rectangle(x, y, torsoW, torsoH, {
      friction: 0.5,
      restitution: 0.2,
      density: 0.002
    })

    // Arms
    const leftUpperArm = this.Bodies.rectangle(x - torsoW/2 - limbW, y - torsoH/4, limbW, upperLimbH, {
      friction: 0.3,
      restitution: 0.2,
      density: 0.001
    })

    const leftLowerArm = this.Bodies.rectangle(x - torsoW/2 - limbW, y - torsoH/4 + upperLimbH, limbW, lowerLimbH, {
      friction: 0.3,
      restitution: 0.2,
      density: 0.001
    })

    const rightUpperArm = this.Bodies.rectangle(x + torsoW/2 + limbW, y - torsoH/4, limbW, upperLimbH, {
      friction: 0.3,
      restitution: 0.2,
      density: 0.001
    })

    const rightLowerArm = this.Bodies.rectangle(x + torsoW/2 + limbW, y - torsoH/4 + upperLimbH, limbW, lowerLimbH, {
      friction: 0.3,
      restitution: 0.2,
      density: 0.001
    })

    // Legs
    const leftUpperLeg = this.Bodies.rectangle(x - torsoW/4, y + torsoH/2 + upperLimbH/2, limbW, upperLimbH, {
      friction: 0.3,
      restitution: 0.2,
      density: 0.001
    })

    const leftLowerLeg = this.Bodies.rectangle(x - torsoW/4, y + torsoH/2 + upperLimbH + lowerLimbH/2, limbW, lowerLimbH, {
      friction: 0.3,
      restitution: 0.2,
      density: 0.001
    })

    const rightUpperLeg = this.Bodies.rectangle(x + torsoW/4, y + torsoH/2 + upperLimbH/2, limbW, upperLimbH, {
      friction: 0.3,
      restitution: 0.2,
      density: 0.001
    })

    const rightLowerLeg = this.Bodies.rectangle(x + torsoW/4, y + torsoH/2 + upperLimbH + lowerLimbH/2, limbW, lowerLimbH, {
      friction: 0.3,
      restitution: 0.2,
      density: 0.001
    })

    // Constraints (joints)
    const stiffness = 0.6
    const damping = 0.3

    const constraints = [
      // Head to torso
      this.Constraint.create({
        bodyA: head,
        bodyB: torso,
        pointA: { x: 0, y: headRadius },
        pointB: { x: 0, y: -torsoH/2 },
        stiffness: stiffness * 1.5,
        damping: damping,
        length: 0
      }),

      // Left arm
      this.Constraint.create({
        bodyA: torso,
        bodyB: leftUpperArm,
        pointA: { x: -torsoW/2, y: -torsoH/3 },
        pointB: { x: 0, y: -upperLimbH/2 },
        stiffness,
        damping,
        length: 0
      }),
      this.Constraint.create({
        bodyA: leftUpperArm,
        bodyB: leftLowerArm,
        pointA: { x: 0, y: upperLimbH/2 },
        pointB: { x: 0, y: -lowerLimbH/2 },
        stiffness,
        damping,
        length: 0
      }),

      // Right arm
      this.Constraint.create({
        bodyA: torso,
        bodyB: rightUpperArm,
        pointA: { x: torsoW/2, y: -torsoH/3 },
        pointB: { x: 0, y: -upperLimbH/2 },
        stiffness,
        damping,
        length: 0
      }),
      this.Constraint.create({
        bodyA: rightUpperArm,
        bodyB: rightLowerArm,
        pointA: { x: 0, y: upperLimbH/2 },
        pointB: { x: 0, y: -lowerLimbH/2 },
        stiffness,
        damping,
        length: 0
      }),

      // Left leg
      this.Constraint.create({
        bodyA: torso,
        bodyB: leftUpperLeg,
        pointA: { x: -torsoW/4, y: torsoH/2 },
        pointB: { x: 0, y: -upperLimbH/2 },
        stiffness,
        damping,
        length: 0
      }),
      this.Constraint.create({
        bodyA: leftUpperLeg,
        bodyB: leftLowerLeg,
        pointA: { x: 0, y: upperLimbH/2 },
        pointB: { x: 0, y: -lowerLimbH/2 },
        stiffness,
        damping,
        length: 0
      }),

      // Right leg
      this.Constraint.create({
        bodyA: torso,
        bodyB: rightUpperLeg,
        pointA: { x: torsoW/4, y: torsoH/2 },
        pointB: { x: 0, y: -upperLimbH/2 },
        stiffness,
        damping,
        length: 0
      }),
      this.Constraint.create({
        bodyA: rightUpperLeg,
        bodyB: rightLowerLeg,
        pointA: { x: 0, y: upperLimbH/2 },
        pointB: { x: 0, y: -lowerLimbH/2 },
        stiffness,
        damping,
        length: 0
      })
    ]

    const bodies = [head, torso, leftUpperArm, leftLowerArm, rightUpperArm, rightLowerArm,
                    leftUpperLeg, leftLowerLeg, rightUpperLeg, rightLowerLeg]

    // Add to world
    this.Composite.add(this.world, [...bodies, ...constraints])

    this.ragdolls.push({
      head, torso,
      leftUpperArm, leftLowerArm,
      rightUpperArm, rightLowerArm,
      leftUpperLeg, leftLowerLeg,
      rightUpperLeg, rightLowerLeg,
      constraints,
      bodies,
      color,
      scale,
      energy: 0
    })
  }

  update(audioFeatures, beatInfo) {
    if (!this.engine) return

    const params = tuner.getAll()
    this.smoothAudio(audioFeatures)

    const { onBeat, beatIntensity, normalizedTempo } = beatInfo
    const { centroid } = audioFeatures

    // CHAOS: Gravity constantly shifts - sometimes anti-gravity!
    const gravityWobble = Math.sin(Date.now() * 0.002) * 0.5
    const baseGravity = 0.5 + gravityWobble
    const bassEffect = this.smoothBass * params.bassWeight * 3
    this.engine.gravity.y = baseGravity + bassEffect

    // Occasional anti-gravity pulses
    if (Math.random() < 0.02 * params.chaos) {
      this.engine.gravity.y = -2
    }

    // CONSTANT CHAOS: Random explosions even without audio
    if (Math.random() < 0.03 + this.smoothAmplitude * 0.05) {
      const explosionX = Math.random() * this.width
      const explosionY = Math.random() * this.height
      const force = 0.02 + Math.random() * 0.03

      for (const ragdoll of this.ragdolls) {
        for (const body of ragdoll.bodies) {
          const dx = body.position.x - explosionX
          const dy = body.position.y - explosionY
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          this.Body.applyForce(body, body.position, {
            x: (dx / dist) * force,
            y: (dy / dist) * force
          })
        }
      }
    }

    // Update each ragdoll
    for (const ragdoll of this.ragdolls) {
      // Energy accumulates from audio
      ragdoll.energy = ragdoll.energy * 0.95 + this.smoothAmplitude * 0.1

      // CONSTANT MOVEMENT: Ragdolls are never still
      const baseUnrest = 0.003 * (1 + params.chaos)
      for (const body of ragdoll.bodies) {
        this.Body.applyForce(body, body.position, {
          x: (Math.random() - 0.5) * baseUnrest,
          y: (Math.random() - 0.5) * baseUnrest
        })
        // Spin!
        this.Body.setAngularVelocity(body, body.angularVelocity + (Math.random() - 0.5) * 0.05)
      }

      // BEATS MAKE THEM EXPLODE
      if (onBeat && beatIntensity > 0.2) {
        const jumpForce = beatIntensity * 0.08 * params.destruction

        // Apply VIOLENT force to ALL parts
        for (const body of ragdoll.bodies) {
          this.Body.applyForce(body, body.position, {
            x: (Math.random() - 0.5) * jumpForce * 2,
            y: -jumpForce * (1 + Math.random())
          })
          // Spin like crazy
          this.Body.setAngularVelocity(body, (Math.random() - 0.5) * beatIntensity * 30)
        }
      }

      // HIGH FREQUENCIES MAKE EVERYTHING TWITCH CONSTANTLY
      const twitch = (0.01 + this.smoothHigh * params.highWeight * 0.02)
      for (const body of ragdoll.bodies) {
        this.Body.applyForce(body, body.position, {
          x: (Math.random() - 0.5) * twitch,
          y: (Math.random() - 0.5) * twitch
        })
      }

      // MID FREQUENCIES CREATE SWIRLING PATTERNS
      const sway = (0.005 + this.smoothMid * params.midWeight * 0.01)
      const time = Date.now() * 0.003
      this.Body.applyForce(ragdoll.torso, ragdoll.torso.position, {
        x: Math.sin(time) * sway,
        y: Math.cos(time * 1.3) * sway
      })

      // BASS LAUNCHES THEM
      if (this.smoothBass > 0.4) {
        const launch = this.smoothBass * 0.04 * params.bassWeight
        this.Body.applyForce(ragdoll.torso, ragdoll.torso.position, {
          x: (Math.random() - 0.5) * launch,
          y: -launch * 2
        })
      }

      // Headbang ALWAYS when there's audio
      const headbang = this.smoothAmplitude * 0.02
      this.Body.applyForce(ragdoll.head, ragdoll.head.position, {
        x: Math.sin(Date.now() * 0.02) * headbang,
        y: Math.cos(Date.now() * 0.015) * headbang
      })
    }

    // Spawn new ragdoll on very strong beats
    this.spawnCooldown--
    if (onBeat && beatIntensity > 0.8 && this.spawnCooldown <= 0 && this.ragdolls.length < this.maxRagdolls) {
      this.spawnRagdoll(
        Math.random() * this.width,
        -100
      )
      this.spawnCooldown = 60
    }

    // Random collisions/pushing between ragdolls
    if (this.smoothAmplitude > 0.4 && Math.random() < 0.1) {
      const r1 = this.ragdolls[Math.floor(Math.random() * this.ragdolls.length)]
      const r2 = this.ragdolls[Math.floor(Math.random() * this.ragdolls.length)]
      if (r1 && r2 && r1 !== r2) {
        const dx = r2.torso.position.x - r1.torso.position.x
        const pushForce = 0.02 * this.smoothAmplitude
        this.Body.applyForce(r1.torso, r1.torso.position, {
          x: dx > 0 ? -pushForce : pushForce,
          y: 0
        })
      }
    }

    // Step physics
    this.Engine.update(this.engine, 1000 / 60)
  }

  draw() {
    // Clear with slight trail
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw floor line
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.lineWidth = 2
    this.ctx.beginPath()
    this.ctx.moveTo(0, this.height - 5)
    this.ctx.lineTo(this.width, this.height - 5)
    this.ctx.stroke()

    // Draw each ragdoll
    for (const ragdoll of this.ragdolls) {
      const energyGlow = ragdoll.energy * 0.5

      // Draw constraints (joints) first
      for (const constraint of ragdoll.constraints) {
        this.drawConstraint(constraint, ragdoll.color, 3)
      }

      // Draw body parts
      // Torso
      this.drawBody(ragdoll.torso, ragdoll.color)

      // Limbs
      this.drawBody(ragdoll.leftUpperArm, ragdoll.color)
      this.drawBody(ragdoll.leftLowerArm, ragdoll.color)
      this.drawBody(ragdoll.rightUpperArm, ragdoll.color)
      this.drawBody(ragdoll.rightLowerArm, ragdoll.color)
      this.drawBody(ragdoll.leftUpperLeg, ragdoll.color)
      this.drawBody(ragdoll.leftLowerLeg, ragdoll.color)
      this.drawBody(ragdoll.rightUpperLeg, ragdoll.color)
      this.drawBody(ragdoll.rightLowerLeg, ragdoll.color)

      // Head (circle)
      this.drawCircle(ragdoll.head, ragdoll.color)

      // Eyes (simple dots)
      const headPos = ragdoll.head.position
      const headAngle = ragdoll.head.angle
      const eyeOffset = 5 * ragdoll.scale

      this.ctx.fillStyle = '#000000'
      // Left eye
      this.ctx.beginPath()
      this.ctx.arc(
        headPos.x + Math.cos(headAngle - 0.3) * eyeOffset,
        headPos.y + Math.sin(headAngle - 0.3) * eyeOffset,
        2 * ragdoll.scale,
        0, Math.PI * 2
      )
      this.ctx.fill()

      // Right eye
      this.ctx.beginPath()
      this.ctx.arc(
        headPos.x + Math.cos(headAngle + 0.3) * eyeOffset,
        headPos.y + Math.sin(headAngle + 0.3) * eyeOffset,
        2 * ragdoll.scale,
        0, Math.PI * 2
      )
      this.ctx.fill()

      // Energy glow
      if (energyGlow > 0.1) {
        this.ctx.shadowColor = ragdoll.color
        this.ctx.shadowBlur = energyGlow * 20
        this.drawCircle(ragdoll.head, ragdoll.color)
        this.ctx.shadowBlur = 0
      }
    }

    // Draw title
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    this.ctx.font = '14px monospace'
    this.ctx.fillText(`MOSH PIT: ${this.ragdolls.length} ragdolls`, 10, 25)
  }

  clear() {
    this.ragdolls = []
    super.clear()
    this.init()
  }
}
