// Canvas: the WebGL canvas that Three.js renders into.
//         Think of it as the <canvas> HTML element, but managed by React.
import { Canvas, useFrame } from '@react-three/fiber'

// Stars: pre-built starfield component from drei (helper library for R3F)
// OrbitControls: lets user drag to rotate — we'll disable this (auto-rotate instead)
import { Stars, Float } from '@react-three/drei'

// useRef: like a Python class attribute — persists across renders
//         without triggering a re-render when it changes.
//         useRef is specifically for accessing DOM elements and animation state.
import { useRef } from 'react'

// THREE is the underlying Three.js library — we use it for math (Vector3, Color)
import * as THREE from 'three'

// ── One glowing orb ──────────────────────────────────────────────
// This is a Three.js mesh: a shape (geometry) + a material (how it looks)
function GlowOrb({ position, color, scale = 1 }) {
  const meshRef = useRef()

  // useFrame runs every animation frame (~60 times/second).
  // It's the Three.js equivalent of requestAnimationFrame.
  // `clock` gives elapsed time in seconds — used to create smooth oscillation.
  useFrame((state) => {
    if (!meshRef.current) return
    // Math.sin creates a smooth -1 to 1 wave.
    // Multiply by 0.2 to get a gentle 0.2 unit vertical float.
    meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.3
    // Slowly rotate the orb on its Y axis
    meshRef.current.rotation.y += 0.005
  })

  return (
    // <Float> from drei adds a gentle floating animation automatically
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} position={position} scale={scale}>
        {/* sphereGeometry: a 3D sphere shape
            args={[radius, widthSegments, heightSegments]}
            More segments = smoother sphere, but heavier to render */}
        <sphereGeometry args={[1, 32, 32]} />

        {/* meshStandardMaterial: responds to light (unlike basic material)
            emissive: color the object glows (self-illumination)
            emissiveIntensity: how bright the glow is */}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          transparent
          opacity={0.15}
          wireframe={false}
        />
      </mesh>
    </Float>
  )
}

// ── Spinning ring ────────────────────────────────────────────────
function SpinningRing() {
  const ringRef = useRef()

  useFrame((state) => {
    if (!ringRef.current) return
    ringRef.current.rotation.x = state.clock.elapsedTime * 0.2
    ringRef.current.rotation.z = state.clock.elapsedTime * 0.15
  })

  return (
    <mesh ref={ringRef} position={[0, 0, 0]}>
      {/* torusGeometry = a ring/donut shape
          args=[radius, tube, radialSegments, tubularSegments] */}
      <torusGeometry args={[3, 0.04, 16, 100]} />
      <meshStandardMaterial
        color="#7c3aed"
        emissive="#7c3aed"
        emissiveIntensity={0.8}
        transparent
        opacity={0.6}
      />
    </mesh>
  )
}

// ── The full 3D scene ────────────────────────────────────────────
function HeroCanvas() {
  return (
    // Canvas fills its parent container (we set height on the parent div in Landing.jsx)
    // camera: position of the viewer in 3D space [x, y, z]
    // fov: field of view in degrees (like camera zoom — lower = more zoomed in)
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      style={{ background: 'transparent' }}
      // dpr: device pixel ratio — matches screen resolution for sharpness
      dpr={[1, 2]}
    >
      {/* ── Lighting ── */}
      {/* ambientLight: illuminates everything equally (like sunlight bounced off sky) */}
      <ambientLight intensity={0.3} />

      {/* pointLight: like a lightbulb — illuminates from one point
          position: where the light is in 3D space */}
      <pointLight position={[10, 10, 10]} color="#7c3aed" intensity={2} />
      <pointLight position={[-10, -10, -10]} color="#f59e0b" intensity={1} />

      {/* ── Stars background ── */}
      {/* Stars from drei: generates thousands of random star particles
          radius: how far stars extend from center
          depth: how deep the star field goes (Z axis)
          count: number of stars
          factor: size of stars
          saturation: color intensity
          fade: stars fade at the edges */}
      <Stars
        radius={100}
        depth={50}
        count={5000}
        factor={4}
        saturation={0}
        fade
        speed={1}
      />

      {/* ── Glowing orbs ── */}
      <GlowOrb position={[-4, 2, -2]}  color="#7c3aed" scale={2} />
      <GlowOrb position={[4, -1, -3]}  color="#f59e0b" scale={1.5} />
      <GlowOrb position={[0, -3, -1]}  color="#10b981" scale={1.2} />
      <GlowOrb position={[-3, -2, -4]} color="#7c3aed" scale={0.8} />
      <GlowOrb position={[5, 3, -5]}   color="#a78bfa" scale={1} />

      {/* ── The spinning ring in the center ── */}
      <SpinningRing />

      {/* Second ring at a different angle */}
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[4.5, 0.02, 16, 100]} />
        <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.6} transparent opacity={0.3} />
      </mesh>
    </Canvas>
  )
}

export default HeroCanvas
