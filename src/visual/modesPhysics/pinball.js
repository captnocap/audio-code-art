import Matter from 'matter-js'
import { PhysicsMode } from './base.js'
import { tuner } from '../tuner.js'

// Pinball Pachinko - Balls drop through audio-reactive pegs and flippers
export class PinballMode extends PhysicsMode {
  constructor(ctx, width, height) {
    super(ctx, width, height)
    this.name = 'pinball'
    this.description = 'Pachinko chaos. Beats fire flippers. Bass shakes pegs.'

    this.balls = []
    this.pegs = []
    this.flippers = []
    this.bumpers = []
    this.maxBalls = 50

    this.score = 0
    this.multiplier = 1

    this.lastBeatTime = 0
  }

  init() {
    super.init()

    // Lower gravity for pachinko feel
    this.engine.gravity.y = 0.5

    // Create peg grid
    this.createPegs()

    // Create flippers at bottom
    this.createFlippers()

    // Create bumpers
    this.createBumpers()

    // Spawn initial balls
    for (let i = 0; i < 5; i++) {
      setTimeout(() => this.spawnBall(), i * 200)
    }
  }

  createPegs() {
    const rows = 8
    const cols = 10
    const pegRadius = 8
    const spacingX = this.width / (cols + 1)
    const spacingY = (this.height - 200) / (rows + 1)

    for (let row = 0; row < rows; row++) {
      const offset = (row % 2) * (spacingX / 2)

      for (let col = 0; col < cols; col++) {
        const x = spacingX * (col + 1) + offset
        const y = 80 + spacingY * (row + 1)

        // Skip some pegs randomly for variety
        if (Math.random() < 0.15) continue

        const peg = this.Bodies.circle(x, y, pegRadius, {
          isStatic: true,
          restitution: 1.2, // Extra bouncy!
          friction: 0,
          render: { visible: true }
        })

        // Store original position for shake effect
        peg.originalX = x
        peg.originalY = y
        peg.hue = (row * 30 + col * 20) % 360
        peg.hitTime = 0

        this.Composite.add(this.world, peg)
        this.pegs.push(peg)
      }
    }
  }

  createFlippers() {
    const flipperWidth = 80
    const flipperHeight = 15
    const flipperY = this.height - 80

    // Left flipper
    const leftFlipper = this.Bodies.rectangle(
      this.width * 0.3, flipperY,
      flipperWidth, flipperHeight,
      {
        isStatic: false,
        restitution: 0.8,
        friction: 0.5
      }
    )

    // Anchor for left flipper
    const leftAnchor = this.Constraint.create({
      bodyA: leftFlipper,
      pointA: { x: -flipperWidth/2 + 10, y: 0 },
      pointB: { x: this.width * 0.3 - flipperWidth/2 + 10, y: flipperY },
      stiffness: 0.9,
      length: 0
    })

    // Right flipper
    const rightFlipper = this.Bodies.rectangle(
      this.width * 0.7, flipperY,
      flipperWidth, flipperHeight,
      {
        isStatic: false,
        restitution: 0.8,
        friction: 0.5
      }
    )

    // Anchor for right flipper
    const rightAnchor = this.Constraint.create({
      bodyA: rightFlipper,
      pointA: { x: flipperWidth/2 - 10, y: 0 },
      pointB: { x: this.width * 0.7 + flipperWidth/2 - 10, y: flipperY },
      stiffness: 0.9,
      length: 0
    })

    this.Composite.add(this.world, [leftFlipper, rightFlipper, leftAnchor, rightAnchor])

    this.flippers = [
      { body: leftFlipper, anchor: leftAnchor, side: 'left', restAngle: 0.3 },
      { body: rightFlipper, anchor: rightAnchor, side: 'right', restAngle: -0.3 }
    ]
  }

  createBumpers() {
    const bumperPositions = [
      { x: this.width * 0.2, y: 150 },
      { x: this.width * 0.5, y: 120 },
      { x: this.width * 0.8, y: 150 },
      { x: this.width * 0.35, y: 250 },
      { x: this.width * 0.65, y: 250 }
    ]

    for (const pos of bumperPositions) {
      const bumper = this.Bodies.circle(pos.x, pos.y, 25, {
        isStatic: true,
        restitution: 2.0, // Super bouncy!
        friction: 0
      })

      bumper.originalX = pos.x
      bumper.originalY = pos.y
      bumper.hitTime = 0
      bumper.isBumper = true

      this.Composite.add(this.world, bumper)
      this.bumpers.push(bumper)
    }
  }

  spawnBall() {
    if (this.balls.length >= this.maxBalls) {
      // Remove oldest ball
      const old = this.balls.shift()
      this.Composite.remove(this.world, old)
    }

    const ball = this.Bodies.circle(
      100 + Math.random() * (this.width - 200),
      -20,
      10 + Math.random() * 5,
      {
        restitution: 0.8,
        friction: 0.01,
        density: 0.001
      }
    )

    ball.hue = Math.random() * 360
    ball.trail = []

    this.Composite.add(this.world, ball)
    this.balls.push(ball)
  }

  update(audioFeatures, beatInfo) {
    if (!this.engine) return

    const params = tuner.getAll()
    this.smoothAudio(audioFeatures)

    const { onBeat, beatIntensity, normalizedTempo } = beatInfo
    const { centroid } = audioFeatures

    // GRAVITY CHAOS - constantly shifting
    const gravityAngle = Date.now() * 0.001
    this.engine.gravity.x = Math.sin(gravityAngle) * 0.3 * params.chaos
    this.engine.gravity.y = 0.3 + Math.cos(gravityAngle * 0.7) * 0.2

    // BASS MAKES PEGS GO CRAZY
    const baseShake = 2 * params.chaos
    const shake = baseShake + this.smoothBass * params.bassWeight * 10
    for (const peg of this.pegs) {
      this.Body.setPosition(peg, {
        x: peg.originalX + (Math.random() - 0.5) * shake,
        y: peg.originalY + (Math.random() - 0.5) * shake
      })
    }

    // CONSTANT BALL ENERGY - never still
    for (const ball of this.balls) {
      const unrest = 0.002 * (1 + params.chaos)
      this.Body.applyForce(ball, ball.position, {
        x: (Math.random() - 0.5) * unrest,
        y: (Math.random() - 0.5) * unrest
      })
    }

    // BEATS FIRE FLIPPERS VIOLENTLY
    if (onBeat && beatIntensity > 0.2) {
      const flipForce = beatIntensity * 0.3 * params.destruction

      for (const flipper of this.flippers) {
        const direction = flipper.side === 'left' ? -1 : 1
        this.Body.setAngularVelocity(flipper.body, direction * flipForce * 80)
      }

      // EXPLODE balls outward
      for (const ball of this.balls) {
        this.Body.applyForce(ball, ball.position, {
          x: (Math.random() - 0.5) * 0.05 * beatIntensity,
          y: -0.03 * beatIntensity
        })
      }
    }

    // BUMPERS CONSTANTLY PULSE AND LAUNCH
    for (const bumper of this.bumpers) {
      const timeSinceHit = Date.now() - bumper.hitTime
      if (timeSinceHit < 100) {
        bumper.circleRadius = 35
      } else {
        bumper.circleRadius = 25 + Math.sin(Date.now() * 0.01) * 5
      }

      // Bumpers randomly fire
      if (Math.random() < 0.01 * params.chaos) {
        bumper.hitTime = Date.now()
        // Launch nearby balls
        for (const ball of this.balls) {
          const dx = ball.position.x - bumper.position.x
          const dy = ball.position.y - bumper.position.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            this.Body.applyForce(ball, ball.position, {
              x: (dx / dist) * 0.02,
              y: (dy / dist) * 0.02 - 0.01
            })
          }
        }
      }
    }

    // HIGH FREQUENCIES = TURBULENCE STORM
    const turbulence = 0.001 + this.smoothHigh * params.highWeight * 0.005
    for (const ball of this.balls) {
      this.Body.applyForce(ball, ball.position, {
        x: (Math.random() - 0.5) * turbulence,
        y: (Math.random() - 0.5) * turbulence
      })
    }

    // SPAWN BALLS FREQUENTLY
    if (this.balls.length < this.maxBalls) {
      if (onBeat && beatIntensity > 0.3) {
        this.spawnBall()
        this.spawnBall() // Double spawn on beats
      }
      if (Math.random() < 0.02) {
        this.spawnBall()
      }
    }

    // Update ball trails
    for (const ball of this.balls) {
      ball.trail.push({ x: ball.position.x, y: ball.position.y })
      if (ball.trail.length > 20) ball.trail.shift()

      // Remove balls that fall below
      if (ball.position.y > this.height + 50) {
        this.Composite.remove(this.world, ball)
        this.balls = this.balls.filter(b => b !== ball)
      }
    }

    // Check for collisions with bumpers/pegs for scoring
    for (const ball of this.balls) {
      for (const bumper of this.bumpers) {
        const dx = ball.position.x - bumper.position.x
        const dy = ball.position.y - bumper.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 40 && Date.now() - bumper.hitTime > 200) {
          bumper.hitTime = Date.now()
          this.score += 100 * this.multiplier
          this.multiplier = Math.min(10, this.multiplier + 0.5)

          // Extra bounce
          this.Body.applyForce(ball, ball.position, {
            x: dx * 0.01,
            y: dy * 0.01 - 0.005
          })
        }
      }

      for (const peg of this.pegs) {
        const dx = ball.position.x - peg.position.x
        const dy = ball.position.y - peg.position.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 20 && Date.now() - peg.hitTime > 100) {
          peg.hitTime = Date.now()
          this.score += 10 * this.multiplier
        }
      }
    }

    // Multiplier decay
    this.multiplier = Math.max(1, this.multiplier - 0.01)

    // Step physics
    this.Engine.update(this.engine, 1000 / 60)
  }

  draw() {
    // Clear
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'
    this.ctx.fillRect(0, 0, this.width, this.height)

    // Draw ball trails
    for (const ball of this.balls) {
      if (ball.trail.length > 1) {
        this.ctx.beginPath()
        this.ctx.moveTo(ball.trail[0].x, ball.trail[0].y)

        for (let i = 1; i < ball.trail.length; i++) {
          this.ctx.lineTo(ball.trail[i].x, ball.trail[i].y)
        }

        const gradient = this.ctx.createLinearGradient(
          ball.trail[0].x, ball.trail[0].y,
          ball.position.x, ball.position.y
        )
        gradient.addColorStop(0, 'transparent')
        gradient.addColorStop(1, `hsla(${ball.hue}, 80%, 60%, 0.5)`)

        this.ctx.strokeStyle = gradient
        this.ctx.lineWidth = ball.circleRadius || 10
        this.ctx.lineCap = 'round'
        this.ctx.stroke()
      }
    }

    // Draw pegs
    for (const peg of this.pegs) {
      const timeSinceHit = Date.now() - peg.hitTime
      const glow = timeSinceHit < 200 ? 1 - timeSinceHit / 200 : 0

      if (glow > 0) {
        this.ctx.shadowColor = `hsl(${peg.hue}, 80%, 60%)`
        this.ctx.shadowBlur = glow * 20
      }

      this.ctx.beginPath()
      this.ctx.arc(peg.position.x, peg.position.y, 8, 0, Math.PI * 2)
      this.ctx.fillStyle = glow > 0
        ? `hsl(${peg.hue}, 80%, ${50 + glow * 30}%)`
        : `hsl(${peg.hue}, 40%, 40%)`
      this.ctx.fill()

      this.ctx.shadowBlur = 0
    }

    // Draw bumpers
    for (const bumper of this.bumpers) {
      const timeSinceHit = Date.now() - bumper.hitTime
      const glow = timeSinceHit < 200 ? 1 - timeSinceHit / 200 : 0
      const radius = glow > 0 ? 25 + glow * 10 : 25

      this.ctx.beginPath()
      this.ctx.arc(bumper.position.x, bumper.position.y, radius, 0, Math.PI * 2)

      const gradient = this.ctx.createRadialGradient(
        bumper.position.x, bumper.position.y, 0,
        bumper.position.x, bumper.position.y, radius
      )
      gradient.addColorStop(0, `hsla(${60 + glow * 60}, 100%, 70%, 1)`)
      gradient.addColorStop(0.7, `hsla(${30 + glow * 60}, 100%, 50%, 1)`)
      gradient.addColorStop(1, `hsla(${0 + glow * 60}, 100%, 30%, 0.5)`)

      this.ctx.fillStyle = gradient
      this.ctx.fill()

      if (glow > 0) {
        this.ctx.shadowColor = '#ffff00'
        this.ctx.shadowBlur = glow * 30
        this.ctx.fill()
        this.ctx.shadowBlur = 0
      }
    }

    // Draw flippers
    for (const flipper of this.flippers) {
      this.ctx.save()
      this.ctx.translate(flipper.body.position.x, flipper.body.position.y)
      this.ctx.rotate(flipper.body.angle)

      const gradient = this.ctx.createLinearGradient(-40, 0, 40, 0)
      gradient.addColorStop(0, '#ff4444')
      gradient.addColorStop(0.5, '#ff8844')
      gradient.addColorStop(1, '#ff4444')

      this.ctx.fillStyle = gradient
      this.ctx.fillRect(-40, -7.5, 80, 15)
      this.ctx.restore()
    }

    // Draw balls
    for (const ball of this.balls) {
      const speed = Math.sqrt(
        ball.velocity.x * ball.velocity.x +
        ball.velocity.y * ball.velocity.y
      )

      const glow = Math.min(1, speed / 10)

      if (glow > 0.3) {
        this.ctx.shadowColor = `hsl(${ball.hue}, 80%, 60%)`
        this.ctx.shadowBlur = glow * 15
      }

      this.ctx.beginPath()
      this.ctx.arc(ball.position.x, ball.position.y, ball.circleRadius || 10, 0, Math.PI * 2)

      const gradient = this.ctx.createRadialGradient(
        ball.position.x - 3, ball.position.y - 3, 0,
        ball.position.x, ball.position.y, ball.circleRadius || 10
      )
      gradient.addColorStop(0, `hsl(${ball.hue}, 80%, 80%)`)
      gradient.addColorStop(1, `hsl(${ball.hue}, 80%, 50%)`)

      this.ctx.fillStyle = gradient
      this.ctx.fill()

      this.ctx.shadowBlur = 0
    }

    // Draw score
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
    this.ctx.fillRect(10, 10, 180, 60)

    this.ctx.fillStyle = '#ffffff'
    this.ctx.font = 'bold 24px monospace'
    this.ctx.fillText(`${Math.floor(this.score).toLocaleString()}`, 20, 40)

    this.ctx.fillStyle = this.multiplier > 1 ? '#ffff00' : '#888888'
    this.ctx.font = '14px monospace'
    this.ctx.fillText(`x${this.multiplier.toFixed(1)} MULTIPLIER`, 20, 58)

    // Ball count
    this.ctx.fillStyle = '#4ecdc4'
    this.ctx.fillText(`${this.balls.length} BALLS`, 120, 40)
  }

  clear() {
    this.balls = []
    this.pegs = []
    this.flippers = []
    this.bumpers = []
    this.score = 0
    this.multiplier = 1
    super.clear()
    this.init()
  }
}
