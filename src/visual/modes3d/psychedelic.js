import * as THREE from 'three'
import { Visualization3DMode } from './base.js'

/**
 * PSYCHEDELIC MODE
 * 
 * A journey into the bizarre. 
 * Non-Euclidean geometry, melting colors, and entities that watch you.
 */
export class PsychedelicMode extends Visualization3DMode {
    constructor() {
        super()
        this.name = 'psychedelic3d'
        this.description = 'A journey into the bizarre. Non-Euclidean geometry and melting colors.'

        this.material = null
        this.mesh = null
        this.time = 0

        // Entities that appear
        this.entities = []
    }

    init(scene, camera, renderer) {
        super.init(scene, camera, renderer)
        this.threeRenderer = renderer

        // RESET SCENE STATE (Important!)
        scene.fog = null
        scene.background = new THREE.Color(0x000000)

        // Ensure we are rendering to screen
        renderer.setRenderTarget(null)

        // Create the main "Hyper-Object"
        const geometry = new THREE.IcosahedronGeometry(8, 64) // High detail

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uAudioBass: { value: 0 },
                uAudioMid: { value: 0 },
                uAudioHigh: { value: 0 },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
            },
            vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPos;
        varying float vDistortion;
        
        uniform float uTime;
        uniform float uAudioBass;
        uniform float uAudioMid;
        uniform float uAudioHigh;
        
        // Simple pseudo-random noise
        float hash(vec3 p) {
            p  = fract( p*0.3183099+.1 );
            p *= 17.0;
            return fract( p.x*p.y*p.z*(p.x+p.y+p.z) );
        }

        float noise( in vec3 x ) {
            vec3 i = floor(x);
            vec3 f = fract(x);
            f = f*f*(3.0-2.0*f);
            return mix(mix(mix( hash(i+vec3(0,0,0)), 
                                hash(i+vec3(1,0,0)),f.x),
                           mix( hash(i+vec3(0,1,0)), 
                                hash(i+vec3(1,1,0)),f.x),f.y),
                       mix(mix( hash(i+vec3(0,0,1)), 
                                hash(i+vec3(1,0,1)),f.x),
                           mix( hash(i+vec3(0,1,1)), 
                                hash(i+vec3(1,1,1)),f.x),f.y),f.z);
        }

        void main() {
          vUv = uv;
          vNormal = normal;
          
          // Twist effect
          float angle = position.y * 0.2 + uTime * 0.5;
          float s = sin(angle);
          float c = cos(angle);
          mat3 twist = mat3(
            c, 0, s,
            0, 1, 0,
            -s, 0, c
          );
          
          vec3 pos = position;
          pos = twist * pos;
          
          // Displacement
          float n = noise(pos * 0.2 + uTime);
          float bass = uAudioBass * 4.0;
          
          // Spikes
          float spike = 0.0;
          if (uAudioHigh > 0.2) {
             spike = pow(noise(pos * 1.5 + uTime * 5.0), 3.0) * uAudioHigh * 8.0;
          }
          
          // Breathing
          float breathe = sin(uTime) * 1.0;
          
          // Apply displacement along normal
          float displacement = n * 3.0 + bass + spike + breathe;
          pos += normal * displacement;
          
          vPos = pos;
          vDistortion = displacement;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
            fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        varying vec3 vPos;
        varying float vDistortion;
        
        uniform float uTime;
        uniform float uAudioBass;
        uniform float uAudioMid;
        uniform float uAudioHigh;
        
        // Color palette function
        vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
            return a + b*cos( 6.28318*(c*t+d) );
        }

        void main() {
          // Normal mapping
          vec3 norm = normalize(vNormal);
          vec3 viewDir = normalize(cameraPosition - vPos);
          float fresnel = pow(1.0 - dot(norm, viewDir), 2.0);
          
          // Psychedelic palette
          vec3 a = vec3(0.5, 0.5, 0.5);
          vec3 b = vec3(0.5, 0.5, 0.5);
          vec3 c = vec3(1.0, 1.0, 1.0);
          vec3 d = vec3(0.263, 0.416, 0.557);
          
          // Modulate palette with audio
          d.r += uAudioBass * 0.5;
          d.g += uAudioMid * 0.5;
          d.b += uAudioHigh * 0.5;
          
          float t = length(vPos) * 0.05 - uTime * 0.2 + vDistortion * 0.1;
          vec3 col = palette(t, a, b, c, d);
          
          // Add fresnel glow
          col += fresnel * vec3(0.2, 0.5, 1.0) * (1.0 + uAudioHigh);
          
          // Pattern overlay
          float pattern = sin(vPos.x * 10.0) * sin(vPos.y * 10.0) * sin(vPos.z * 10.0);
          if (pattern > 0.9) {
             col = vec3(1.0) - col; // Invert colors
          }
          
          gl_FragColor = vec4(col, 1.0);
        }
      `,
            side: THREE.DoubleSide
        })

        this.mesh = new THREE.Mesh(geometry, this.material)
        this.mesh.frustumCulled = false // Prevent culling when vertices are displaced
        scene.add(this.mesh)

        // Add some floating particles
        this.initParticles(scene)

        // Lighting
        const light = new THREE.PointLight(0xffffff, 1, 100)
        light.position.set(10, 10, 10)
        scene.add(light)

        const ambient = new THREE.AmbientLight(0x404040)
        scene.add(ambient)

        camera.position.z = 25
        camera.far = Math.max(camera.far, 2000)
        camera.updateProjectionMatrix()
    }

    initParticles(scene) {
        const geometry = new THREE.BufferGeometry();
        const count = 1000;
        const positions = new Float32Array(count * 3);

        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.5
        });

        this.particles = new THREE.Points(geometry, material);
        scene.add(this.particles);
    }

    update(audioFeatures = {}, beatInfo) {
        const bass = Number(audioFeatures.bass ?? 0)
        const mid = Number(audioFeatures.mid ?? 0)
        const high = Number(audioFeatures.high ?? 0)

        // If your pipeline doesn't provide energy, derive a reasonable one:
        let energy = Number(audioFeatures.energy)
        if (!Number.isFinite(energy)) energy = (bass + mid + high) / 3

        // Clamp in case your features are 0..255 or otherwise spicy
        const clamp01 = (v) => THREE.MathUtils.clamp(Number.isFinite(v) ? v : 0, 0, 1)

        const b = clamp01(bass)
        const m = clamp01(mid)
        const h = clamp01(high)
        const e = clamp01(energy)

        // Guard time from NaN contamination
        if (!Number.isFinite(this.time)) this.time = 0
        this.time += 0.01 + e * 0.05

        if (this.material && this.mesh) {
            this.material.uniforms.uTime.value = this.time
            this.material.uniforms.uAudioBass.value = b
            this.material.uniforms.uAudioMid.value = m
            this.material.uniforms.uAudioHigh.value = h

            this.mesh.rotation.x += 0.005 + b * 0.01
            this.mesh.rotation.y += 0.005 + m * 0.01
        }

        if (this.particles) {
            this.particles.rotation.y -= 0.002;
        }
    }
}
