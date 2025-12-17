import * as THREE from 'three'
import { Visualization3DMode } from './base.js'

// Protein Folding Mode - Amino acid chains that fold with audio
// Features alpha helices, beta sheets, and dynamic folding
export class ProteinMode extends Visualization3DMode {
  constructor() {
    super()
    this.name = 'protein3d'
    this.description = 'Protein chains folding and unfolding with audio'

    this.aminoAcids = []
    this.bonds = []
    this.backboneCurve = null
    this.ribbonMesh = null

    // Protein structure
    this.chainLength = 100
    this.foldingState = 0  // 0 = unfolded, 1 = fully folded

    // Audio smoothing
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0

    // Amino acid types with colors (simplified)
    this.aminoTypes = [
      { name: 'hydrophobic', color: 0xff6b6b, radius: 0.3 },  // Red - tends to fold inward
      { name: 'hydrophilic', color: 0x4ecdc4, radius: 0.25 }, // Cyan - on surface
      { name: 'positive', color: 0x45b7d1, radius: 0.28 },    // Blue - charged
      { name: 'negative', color: 0xf7dc6f, radius: 0.28 },    // Yellow - charged
      { name: 'special', color: 0xbb8fce, radius: 0.35 }      // Purple - proline, glycine
    ]

    // Secondary structure regions
    this.structures = []  // {type: 'helix'|'sheet'|'coil', start, end}
  }

  init(scene, camera, renderer) {
    super.init(scene, camera, renderer)

    // Generate random protein sequence
    this.generateProtein()

    // Create visual elements
    this.createAminoAcids(scene)
    this.createBackbone(scene)
    this.createSecondaryStructures()

    // Lighting for protein visualization
    const ambient = new THREE.AmbientLight(0x404040, 0.5)
    scene.add(ambient)

    const key = new THREE.DirectionalLight(0xffffff, 1)
    key.position.set(5, 5, 5)
    scene.add(key)

    const fill = new THREE.DirectionalLight(0x8888ff, 0.5)
    fill.position.set(-5, 0, -5)
    scene.add(fill)

    // Position camera
    camera.position.set(0, 10, 30)
    camera.lookAt(0, 0, 0)
  }

  generateProtein() {
    // Generate sequence with some structure tendency
    this.sequence = []

    for (let i = 0; i < this.chainLength; i++) {
      // Create regions of similar types (more realistic)
      const regionType = Math.floor(i / 10) % 5
      const variation = Math.random() < 0.3 ? Math.floor(Math.random() * 5) : regionType
      this.sequence.push(this.aminoTypes[variation])
    }

    // Define secondary structures
    this.structures = []
    let i = 0
    while (i < this.chainLength) {
      const roll = Math.random()
      if (roll < 0.3) {
        // Alpha helix (8-15 residues)
        const length = 8 + Math.floor(Math.random() * 8)
        this.structures.push({ type: 'helix', start: i, end: Math.min(i + length, this.chainLength) })
        i += length
      } else if (roll < 0.5) {
        // Beta sheet (5-8 residues)
        const length = 5 + Math.floor(Math.random() * 4)
        this.structures.push({ type: 'sheet', start: i, end: Math.min(i + length, this.chainLength) })
        i += length
      } else {
        // Random coil (3-6 residues)
        const length = 3 + Math.floor(Math.random() * 4)
        this.structures.push({ type: 'coil', start: i, end: Math.min(i + length, this.chainLength) })
        i += length
      }
    }
  }

  createAminoAcids(scene) {
    this.aminoAcids = []

    for (let i = 0; i < this.chainLength; i++) {
      const type = this.sequence[i]

      // Sphere for amino acid
      const geometry = new THREE.SphereGeometry(type.radius, 16, 16)
      const material = new THREE.MeshPhongMaterial({
        color: type.color,
        shininess: 80,
        transparent: true,
        opacity: 0.9
      })

      const sphere = new THREE.Mesh(geometry, material)

      // Initial unfolded position (extended chain)
      const unfoldedPos = new THREE.Vector3(
        (i - this.chainLength / 2) * 0.8,
        0,
        0
      )
      sphere.position.copy(unfoldedPos)

      scene.add(sphere)

      this.aminoAcids.push({
        mesh: sphere,
        type: type,
        index: i,
        unfoldedPosition: unfoldedPos.clone(),
        foldedPosition: new THREE.Vector3(),  // Will be calculated
        velocity: new THREE.Vector3()
      })
    }

    // Calculate folded positions
    this.calculateFoldedPositions()

    // Create bonds between consecutive amino acids
    this.createBonds(scene)
  }

  calculateFoldedPositions() {
    let currentPos = new THREE.Vector3(0, 0, 0)
    let direction = new THREE.Vector3(1, 0, 0)

    for (const structure of this.structures) {
      if (structure.type === 'helix') {
        // Alpha helix - spiral pattern
        const helixRadius = 2
        const helixPitch = 0.5
        const residuesPerTurn = 3.6

        for (let i = structure.start; i < structure.end && i < this.chainLength; i++) {
          const localIndex = i - structure.start
          const angle = (localIndex / residuesPerTurn) * Math.PI * 2

          this.aminoAcids[i].foldedPosition.set(
            currentPos.x + Math.cos(angle) * helixRadius,
            currentPos.y + localIndex * helixPitch,
            currentPos.z + Math.sin(angle) * helixRadius
          )
        }
        currentPos.y += (structure.end - structure.start) * helixPitch

      } else if (structure.type === 'sheet') {
        // Beta sheet - zigzag pattern
        const sheetWidth = 1.5
        const sheetSpacing = 0.8

        for (let i = structure.start; i < structure.end && i < this.chainLength; i++) {
          const localIndex = i - structure.start
          const zigzag = (localIndex % 2 === 0) ? -1 : 1

          this.aminoAcids[i].foldedPosition.set(
            currentPos.x + localIndex * sheetSpacing,
            currentPos.y + zigzag * 0.3,
            currentPos.z + zigzag * sheetWidth
          )
        }
        currentPos.x += (structure.end - structure.start) * sheetSpacing

      } else {
        // Random coil - organic random walk
        for (let i = structure.start; i < structure.end && i < this.chainLength; i++) {
          direction.applyAxisAngle(
            new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize(),
            (Math.random() - 0.5) * 1.5
          )
          currentPos.add(direction.clone().multiplyScalar(1.2))

          this.aminoAcids[i].foldedPosition.copy(currentPos)
        }
      }
    }

    // Center the protein
    const center = new THREE.Vector3()
    for (const aa of this.aminoAcids) {
      center.add(aa.foldedPosition)
    }
    center.divideScalar(this.chainLength)

    for (const aa of this.aminoAcids) {
      aa.foldedPosition.sub(center)
    }
  }

  createBonds(scene) {
    this.bonds = []

    const bondMaterial = new THREE.MeshBasicMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.6
    })

    for (let i = 0; i < this.chainLength - 1; i++) {
      const geometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8)
      geometry.rotateX(Math.PI / 2)

      const bond = new THREE.Mesh(geometry, bondMaterial.clone())
      scene.add(bond)

      this.bonds.push(bond)
    }
  }

  createBackbone(scene) {
    // Ribbon representation will be updated dynamically
    this.ribbonGeometry = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)]),
      this.chainLength * 2,
      0.15,
      8,
      false
    )

    this.ribbonMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    })

    this.ribbonMesh = new THREE.Mesh(this.ribbonGeometry, this.ribbonMaterial)
    scene.add(this.ribbonMesh)
  }

  updateBackbone() {
    // Create curve from current amino acid positions
    const points = this.aminoAcids.map(aa => aa.mesh.position.clone())

    if (points.length < 2) return

    const curve = new THREE.CatmullRomCurve3(points)

    // Dispose old geometry
    if (this.ribbonGeometry) {
      this.ribbonGeometry.dispose()
    }

    // Create new tube geometry
    this.ribbonGeometry = new THREE.TubeGeometry(
      curve,
      this.chainLength * 2,
      0.12,
      8,
      false
    )

    this.ribbonMesh.geometry = this.ribbonGeometry
  }

  update(audioFeatures, beatInfo, delta, elapsed) {
    const { bass, mid, high, amplitude, centroid } = audioFeatures
    const { onBeat, beatIntensity, normalizedTempo } = beatInfo

    // Smooth audio values
    const smoothing = 0.1
    this.smoothBass += (bass - this.smoothBass) * smoothing
    this.smoothMid += (mid - this.smoothMid) * smoothing
    this.smoothHigh += (high - this.smoothHigh) * smoothing
    this.smoothAmplitude += (amplitude - this.smoothAmplitude) * smoothing

    // Folding state driven by amplitude
    // High amplitude = more folded, low = unfolding
    const targetFold = this.smoothAmplitude
    this.foldingState += (targetFold - this.foldingState) * 0.05

    // Update amino acid positions
    for (const aa of this.aminoAcids) {
      // Interpolate between unfolded and folded positions
      const target = aa.unfoldedPosition.clone().lerp(aa.foldedPosition, this.foldingState)

      // Add some vibration based on audio
      const vibration = new THREE.Vector3(
        Math.sin(elapsed * 10 + aa.index) * this.smoothHigh * 0.2,
        Math.cos(elapsed * 8 + aa.index * 0.5) * this.smoothMid * 0.15,
        Math.sin(elapsed * 6 + aa.index * 0.7) * this.smoothBass * 0.1
      )

      target.add(vibration)

      // Smooth movement
      aa.mesh.position.lerp(target, 0.1)

      // Pulse size with bass
      const scale = 1 + this.smoothBass * 0.3
      aa.mesh.scale.setScalar(scale)

      // Color shift with pitch
      const hue = (centroid + aa.index / this.chainLength * 0.3) % 1
      const baseColor = new THREE.Color(aa.type.color)
      const shiftedColor = new THREE.Color().setHSL(
        hue,
        0.7,
        0.5 + this.smoothAmplitude * 0.3
      )
      aa.mesh.material.color.lerp(shiftedColor, 0.3)
      aa.mesh.material.emissive = shiftedColor.clone().multiplyScalar(this.smoothAmplitude * 0.3)
    }

    // Update bonds
    for (let i = 0; i < this.bonds.length; i++) {
      const aa1 = this.aminoAcids[i]
      const aa2 = this.aminoAcids[i + 1]

      // Position bond between amino acids
      const midpoint = aa1.mesh.position.clone().add(aa2.mesh.position).multiplyScalar(0.5)
      this.bonds[i].position.copy(midpoint)

      // Orient bond
      const direction = aa2.mesh.position.clone().sub(aa1.mesh.position)
      const length = direction.length()
      this.bonds[i].scale.set(1, 1, length)
      this.bonds[i].lookAt(aa2.mesh.position)

      // Color bonds
      this.bonds[i].material.opacity = 0.4 + this.smoothAmplitude * 0.4
    }

    // Update backbone ribbon
    this.updateBackbone()
    this.ribbonMaterial.opacity = 0.2 + this.smoothMid * 0.3

    // Color ribbon based on pitch
    const ribbonHue = centroid
    this.ribbonMaterial.color.setHSL(ribbonHue, 0.5, 0.6)

    // Beat effects - trigger refolding
    if (onBeat && beatIntensity > 0.7) {
      // Randomize some folded positions slightly
      for (const aa of this.aminoAcids) {
        aa.foldedPosition.add(new THREE.Vector3(
          (Math.random() - 0.5) * beatIntensity,
          (Math.random() - 0.5) * beatIntensity,
          (Math.random() - 0.5) * beatIntensity
        ))
      }
    }

    // Rotate whole protein slowly
    if (this.scene) {
      // Find protein center and rotate around it
      const rotationSpeed = 0.2 + normalizedTempo * 0.3
      for (const aa of this.aminoAcids) {
        aa.mesh.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed * delta)
        aa.unfoldedPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed * delta)
        aa.foldedPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationSpeed * delta)
      }
    }
  }

  dispose() {
    for (const aa of this.aminoAcids) {
      aa.mesh.geometry.dispose()
      aa.mesh.material.dispose()
    }
    for (const bond of this.bonds) {
      bond.geometry.dispose()
      bond.material.dispose()
    }
    if (this.ribbonGeometry) {
      this.ribbonGeometry.dispose()
    }
    if (this.ribbonMaterial) {
      this.ribbonMaterial.dispose()
    }
  }

  clear() {
    this.smoothBass = 0
    this.smoothMid = 0
    this.smoothHigh = 0
    this.smoothAmplitude = 0
    this.foldingState = 0
  }
}
