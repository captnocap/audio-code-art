import Matter from 'matter-js'
import { PhysicsMode } from './base.js'
import { tuner } from '../tuner.js'

// Chain Reaction - Pendulums, ropes, and chains swinging to audio
export class ChainMode extends PhysicsMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'chains'
    this.description = 'Chains swing with BPM. Bass breaks links. Chaos reigns.'

    this.chains = []
    this.pendulums = []
    this.bridges = []
    this.looseLinks = []

    this.maxLooseLinks = 100
  }

  init() {
    super.init()

    // Lower gravity for dramatic swinging
    this.engine.gravity.y = 0.8

    // Create pendulum array (Newton's cradle style)
    this.createNewtonsCradle()

    // Create hanging chains
    this.createHangingChains()

    // Create rope bridges
    this.createBridges()
  }

  createNewtonsCradle() {
    const numBalls = 7
    const ballRadius = 20
    const ropeLength = 200
    const startX = this.width / 2 - (numBalls * ballRadius)
    const anchorY = 80

    for (let i = 0; i < numBalls; i++) {
      const x = startX + i * ballRadius * 2
      const y = anchorY + ropeLength

      const ball = this.Bodies.circle(x, y, ballRadius, {
        restitution: 1.0,
        friction: 0,
        frictionAir: 0.001,
        density: 0.05
      })

      const constraint = this.Constraint.create({
        pointA: { x: x, y: anchorY },
        bodyB: ball,
        stiffness: 1,
        length: ropeLength,
        damping: 0
      })

      ball.hue = (i / numBalls) * 360
      ball.isNewton = true

      this.Composite.add(this.world, [ball, constraint])
      this.pendulums.push({ ball, constraint, anchorX: x, anchorY })
    }

    // Give first ball initial push
    this.Body.setVelocity(this.pendulums[0].ball, { x: -15, y: 0 })
  }

  createHangingChains() {
    const chainConfigs = [
      { x: 100, y: 50, links: 15, linkSize: 12 },
      { x: this.width - 100, y: 50, links: 15, linkSize: 12 },
      { x: this.width * 0.3, y: 30, links: 20, linkSize: 10 },
      { x: this.width * 0.7, y: 30, links: 20, linkSize: 10 }
    ]

    for (const config of chainConfigs) {
      const chain = this.createChain(config.x, config.y, config.links, config.linkSize)
      this.chains.push(chain)
    }
  }

  createChain(anchorX, anchorY, numLinks, linkSize) {
    const links = []
    const constraints = []
    let prevBody = null

    for (let i = 0; i < numLinks; i++) {
      const y = anchorY + i * linkSize * 1.5

      const link = this.Bodies.rectangle(
        anchorX + (Math.random() - 0.5) * 2,
        y,
        linkSize * 0.6,
        linkSize,
        {
          restitution: 0.3,
          friction: 0.1,
          frictionAir: 0.01,
          density: 0.01
        }
      )

      link.hue = (i / numLinks) * 120 + 180 // Blue to cyan
      link.chainIndex = i

      const constraint = this.Constraint.create({
        bodyA: prevBody,
        pointA: prevBody ? { x: 0, y: linkSize * 0.5 } : { x: anchorX, y: anchorY },
        bodyB: link,
        pointB: { x: 0, y: -linkSize * 0.5 },
        stiffness: 0.9,
        damping: 0.1,
        length: linkSize * 0.3
      })

      this.Composite.add(this.world, [link, constraint])
      links.push(link)
      constraints.push(constraint)
      prevBody = link
    }

    return { links, constraints, anchorX, anchorY }
  }

  createBridges() {
    // Create a rope bridge across the bottom third
    const bridgeY = this.height * 0.65
    const bridgeStartX = 50
    const bridgeEndX = this.width - 50
    const numSegments = 25
    const segmentWidth = (bridgeEndX - bridgeStartX) / numSegments

    const segments = []
    const bridgeConstraints = []
    let prevBody = null

    for (let i = 0; i <= numSegments; i++) {
      const x = bridgeStartX + i * segmentWidth
      const isEndpoint = i === 0 || i === numSegments

      const segment = this.Bodies.rectangle(
        x, bridgeY,
        segmentWidth * 0.9, 8,
        {
          isStatic: isEndpoint,
          restitution: 0.2,
          friction: 0.5,
          density: 0.005
        }
      )

      segment.hue = (i / numSegments) * 60 + 30 // Yellow to orange

      if (prevBody) {
        const constraint = this.Constraint.create({
          bodyA: prevBody,
          pointA: { x: segmentWidth * 0.4, y: 0 },
          bodyB: segment,
          pointB: { x: -segmentWidth * 0.4, y: 0 },
          stiffness: 0.8,
          damping: 0.1,
          length: segmentWidth * 0.2
        })
        bridgeConstraints.push(constraint)
        this.Composite.add(this.world, constraint)
      }

      this.Composite.add(this.world, segment)
      segments.push(segment)
      prevBody = segment
    }

    this.bridges.push({ segments, constraints: bridgeConstraints })
  }

  breakChainLink(chain, linkIndex) {
    if (linkIndex < 0 || linkIndex >= chain.constraints.length) return

    const constraint = chain.constraints[linkIndex]
    this.Composite.remove(this.world, constraint)
    chain.constraints[linkIndex] = null

    // Links below the break become loose
    for (let i = linkIndex; i < chain.links.length; i++) {
      const link = chain.links[i]
      if (link && !link.isLoose) {
        link.isLoose = true
        this.looseLinks.push(link)

        // Add some random velocity
        this.Body.setVelocity(link, {
          x: (Math.random() - 0.5) * 10,
          y: Math.random() * 5
        })
      }
    }

    // Trim chain
    chain.links = chain.links.slice(0, linkIndex)
    chain.constraints = chain.constraints.slice(0, linkIndex)
  }

  update(audioFeatures, beatInfo) {
    if (!this.engine) return

    const params = tuner.getAll()
    this.smoothAudio(audioFeatures)

    const { onBeat, beatIntensity, normalizedTempo, bpm } = beatInfo
    const { centroid } = audioFeatures

    // GRAVITY IS CHAOS
    const gravityAngle = Date.now() * 0.0008
    this.engine.gravity.x = Math.sin(gravityAngle) * 0.3 * params.chaos
    this.engine.gravity.y = 0.5 + Math.cos(gravityAngle * 1.3) * 0.3

    // PENDULUMS ARE CONSTANTLY IN MOTION
    const swingPeriod = bpm > 0 ? 60000 / bpm : 1000
    const phase = (Date.now() % swingPeriod) / swingPeriod * Math.PI * 2

    for (let i = 0; i < this.pendulums.length; i++) {
      const p = this.pendulums[i]

      // CONSTANT SWINGING FORCE
      const baseSwing = 0.002 * (1 + params.chaos)
      const targetX = p.anchorX + Math.sin(phase + i * 0.3) * (80 + this.smoothAmplitude * 50)
      const dx = targetX - p.ball.position.x

      this.Body.applyForce(p.ball, p.ball.position, {
        x: dx * 0.0002 + (Math.random() - 0.5) * baseSwing,
        y: (Math.random() - 0.5) * baseSwing
      })

      // Spin the balls
      this.Body.setAngularVelocity(p.ball, p.ball.angularVelocity + (Math.random() - 0.5) * 0.1)
    }

    // BEATS SLAM PENDULUMS
    if (onBeat && beatIntensity > 0.2) {
      const hitForce = beatIntensity * 0.03 * params.destruction

      // Slam ALL pendulums randomly
      for (const p of this.pendulums) {
        this.Body.applyForce(p.ball, p.ball.position, {
          x: (Math.random() - 0.5) * hitForce * 2,
          y: -hitForce
        })
      }
    }

    // CHAINS ARE NEVER STILL
    const baseChainForce = 0.003 * (1 + params.chaos)
    for (const chain of this.chains) {
      for (const link of chain.links) {
        this.Body.applyForce(link, link.position, {
          x: (Math.random() - 0.5) * baseChainForce,
          y: (Math.random() - 0.5) * baseChainForce
        })
        // Spin links
        this.Body.setAngularVelocity(link, link.angularVelocity + (Math.random() - 0.5) * 0.2)
      }
    }

    // BASS WHIPS CHAINS
    const whip = (0.003 + this.smoothBass * params.bassWeight * 0.02)
    for (const chain of this.chains) {
      for (const link of chain.links) {
        this.Body.applyForce(link, link.position, {
          x: (Math.random() - 0.5) * whip,
          y: (Math.random() - 0.5) * whip
        })
      }
    }

    // BREAK CHAINS MORE OFTEN
    if ((this.smoothBass > 0.5 || Math.random() < 0.005 * params.chaos) && Math.random() < 0.05 * params.destruction) {
      const chain = this.chains[Math.floor(Math.random() * this.chains.length)]
      if (chain && chain.links.length > 2) {
        const breakIndex = Math.floor(Math.random() * (chain.links.length - 1)) + 1
        this.breakChainLink(chain, breakIndex)
      }
    }

    // BRIDGE IS A TRAMPOLINE
    const bridgeEnergy = 0.002 + this.smoothHigh * params.highWeight * 0.005
    for (const bridge of this.bridges) {
      for (const segment of bridge.segments) {
        if (!segment.isStatic) {
          const waveOffset = Math.sin(Date.now() * 0.005 + segment.position.x * 0.1) * bridgeEnergy
          this.Body.applyForce(segment, segment.position, {
            x: (Math.random() - 0.5) * bridgeEnergy,
            y: waveOffset + (Math.random() - 0.5) * bridgeEnergy
          })
        }
      }
    }

    // BEATS LAUNCH BRIDGE SEGMENTS
    if (onBeat && beatIntensity > 0.3) {
      const stompForce = beatIntensity * 0.01 * params.destruction
      for (const bridge of this.bridges) {
        for (const segment of bridge.segments) {
          if (!segment.isStatic) {
            this.Body.applyForce(segment, segment.position, {
              x: (Math.random() - 0.5) * stompForce,
              y: -stompForce * (1 + Math.random())
            })
          }
        }
      }
    }

    // RANDOM EXPLOSIONS
    if (Math.random() < 0.02 * params.chaos) {
      const ex = Math.random() * this.width
      const ey = Math.random() * this.height
      const force = 0.01 + Math.random() * 0.02

      for (const chain of this.chains) {
        for (const link of chain.links) {
          const dx = link.position.x - ex
          const dy = link.position.y - ey
          const dist = Math.sqrt(dx * dx + dy * dy) + 1
          this.Body.applyForce(link, link.position, {
            x: (dx / dist) * force,
            y: (dy / dist) * force
          })
        }
      }
    }

    // Clean up loose links that fell off screen
    this.looseLinks = this.looseLinks.filter(link => {
      if (link.position.y > this.height + 100) {
        this.Composite.remove(this.world, link)
        return false
      }
      return true
    })

    // Limit loose links
    while (this.looseLinks.length > this.maxLooseLinks) {
      const old = this.looseLinks.shift()
      this.Composite.remove(this.world, old)
    }

    // Step physics
    this.Engine.update(this.engine, 1000 / 60)
  }

  draw() {
    // Clear with trail
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw pendulum ropes
    for (const p of this.pendulums) {
      this.ctx.beginPath()
      this.ctx.moveTo(p.anchorX, p.anchorY)
      this.ctx.lineTo(p.ball.position.x, p.ball.position.y)
      this.ctx.strokeStyle = `hsla(${p.ball.hue}, 60%, 50%, 0.5)`
      this.ctx.lineWidth = 2
      this.ctx.stroke()

      // Draw anchor point
      this.ctx.beginPath()
      this.ctx.arc(p.anchorX, p.anchorY, 5, 0, Math.PI * 2)
      this.ctx.fillStyle = '#888'
      this.ctx.fill()
    }

    // Draw pendulum balls
    for (const p of this.pendulums) {
      const speed = Math.sqrt(
        p.ball.velocity.x * p.ball.velocity.x +
        p.ball.velocity.y * p.ball.velocity.y
      )

      const glow = Math.min(1, speed / 15)

      if (glow > 0.2) {
        this.ctx.shadowColor = `hsl(${p.ball.hue}, 80%, 60%)`
        this.ctx.shadowBlur = glow * 25
      }

      const gradient = this.ctx.createRadialGradient(
        p.ball.position.x - 5, p.ball.position.y - 5, 0,
        p.ball.position.x, p.ball.position.y, 20
      )
      gradient.addColorStop(0, `hsl(${p.ball.hue}, 80%, 70%)`)
      gradient.addColorStop(1, `hsl(${p.ball.hue}, 80%, 40%)`)

      this.ctx.beginPath()
      this.ctx.arc(p.ball.position.x, p.ball.position.y, 20, 0, Math.PI * 2)
      this.ctx.fillStyle = gradient
      this.ctx.fill()

      this.ctx.shadowBlur = 0
    }

    // Draw chains
    for (const chain of this.chains) {
      // Draw anchor
      this.ctx.beginPath()
      this.ctx.arc(chain.anchorX, chain.anchorY, 8, 0, Math.PI * 2)
      this.ctx.fillStyle = '#666'
      this.ctx.fill()

      // Draw links and connections
      let prevPos = { x: chain.anchorX, y: chain.anchorY }

      for (let i = 0; i < chain.links.length; i++) {
        const link = chain.links[i]

        // Draw connection line
        this.ctx.beginPath()
        this.ctx.moveTo(prevPos.x, prevPos.y)
        this.ctx.lineTo(link.position.x, link.position.y)
        this.ctx.strokeStyle = `hsla(${link.hue}, 70%, 50%, 0.6)`
        this.ctx.lineWidth = 3
        this.ctx.stroke()

        // Draw link
        this.ctx.save()
        this.ctx.translate(link.position.x, link.position.y)
        this.ctx.rotate(link.angle)

        this.ctx.fillStyle = `hsl(${link.hue}, 70%, 50%)`
        this.ctx.fillRect(-4, -6, 8, 12)

        this.ctx.restore()

        prevPos = link.position
      }
    }

    // Draw bridges
    for (const bridge of this.bridges) {
      for (let i = 0; i < bridge.segments.length; i++) {
        const segment = bridge.segments[i]

        this.ctx.save()
        this.ctx.translate(segment.position.x, segment.position.y)
        this.ctx.rotate(segment.angle)

        const stress = segment.isStatic ? 0 : Math.abs(segment.angularVelocity) * 5
        const hue = segment.hue - stress * 30

        this.ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
        this.ctx.fillRect(-20, -4, 40, 8)

        // Planks
        this.ctx.fillStyle = `hsl(${hue}, 50%, 35%)`
        this.ctx.fillRect(-18, -3, 36, 6)

        this.ctx.restore()

        // Draw rope connections
        if (i > 0) {
          const prev = bridge.segments[i - 1]
          this.ctx.beginPath()
          this.ctx.moveTo(prev.position.x + 15, prev.position.y)
          this.ctx.lineTo(segment.position.x - 15, segment.position.y)
          this.ctx.strokeStyle = `hsla(30, 50%, 30%, 0.8)`
          this.ctx.lineWidth = 2
          this.ctx.stroke()
        }
      }
    }

    // Draw loose links
    for (const link of this.looseLinks) {
      this.ctx.save()
      this.ctx.translate(link.position.x, link.position.y)
      this.ctx.rotate(link.angle)

      this.ctx.fillStyle = `hsla(${link.hue || 200}, 70%, 50%, 0.7)`
      this.ctx.fillRect(-4, -6, 8, 12)

      this.ctx.restore()
    }

    // Title
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)'
    this.ctx.font = '14px monospace'
    this.ctx.fillText('CHAIN REACTION', 10, 25)
    this.ctx.fillText(`Loose: ${this.looseLinks.length}`, 10, 45)
  }

  clear() {
    this.chains = []
    this.pendulums = []
    this.bridges = []
    this.looseLinks = []
    super.clear()
    this.init()
  }
}
