'use client';

import { useRef, useMemo, MutableRefObject } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─────────────────────────────────────────
   SHADERS  –  premium jade-only hex globe
───────────────────────────────────────── */

const VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv       = uv;
    vNormal   = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;

  uniform float uTime;
  uniform vec2  uMouseUV;
  uniform vec3  uJade;
  uniform float uHexScale;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPos;

  const float PI    = 3.14159265;
  const float SQRT3 = 1.73205081;

  float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  /* pointy-top hex grid */
  vec4 hexGrid(vec2 uv) {
    vec2 r = vec2(1.0, SQRT3);
    vec2 h = r * 0.5;
    vec2 a = mod(uv, r) - h;
    vec2 b = mod(uv - h, r) - h;
    if (dot(a,a) < dot(b,b)) return vec4(a, uv - a);
    return vec4(b, uv - b);
  }

  float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, SQRT3))), p.x);
  }

  void main() {
    /* ── hex grid ── */
    float u = vUv.x * uHexScale * 2.0;
    float v = vUv.y * uHexScale;
    vec4  hex   = hexGrid(vec2(u, v));
    vec2  local = hex.xy;
    float d     = hexDist(local);
    float cHash = hash21(floor(hex.zw * 5.0) * 0.2);

    /* ── cell animation ── */
    float cellPhase  = cHash * PI * 2.0 + uTime * 0.5;
    float cellWave   = sin(cellPhase) * 0.5 + 0.5;
    float isHot      = step(0.78, fract(cHash * 1.618 + uTime * 0.04)); /* slow state toggle */

    /* ── rotating directional light ── */
    vec3 lightDir = normalize(vec3(
      sin(uTime * 0.22) * 0.9,
      0.25 + sin(uTime * 0.11) * 0.15,
      cos(uTime * 0.22) * 0.9
    ));
    float diffuse = max(0.0, dot(vNormal, lightDir));

    /* ── view-dependent terms ── */
    vec3  viewDir = normalize(cameraPosition - vWorldPos);
    float NdotV   = max(0.0, dot(vNormal, viewDir));
    float fresnel = pow(1.0 - NdotV, 3.2);

    /* ── geometric masks ── */
    float border = smoothstep(0.42, 0.48, d);
    float fill   = 1.0 - smoothstep(0.28, 0.43, d);
    float edge   = border * (1.0 - fill);

    /* ── specular ── */
    vec3  halfV = normalize(lightDir + viewDir);
    float spec  = pow(max(0.0, dot(vNormal, halfV)), 48.0) * 0.45;

    /* ── cell fill brightness ── */
    float fillB = ( 0.035 + isHot * 0.04 * cellWave ) * (0.4 + diffuse * 0.6) * NdotV;

    /* ── edge brightness ── */
    float edgeB = ( 0.22 + isHot * 0.55 * (0.5 + cellWave * 0.5) )
                * (0.45 + diffuse * 0.55)
                * (0.5 + NdotV * 0.5);

    vec3 color = uJade * (fillB * fill + edgeB * edge);

    /* specular on edge only */
    color += uJade * spec * edge * (0.5 + isHot * 0.5);

    /* fresnel rim */
    color += uJade * fresnel * 0.45;

    /* slow scan-ring emanating from center */
    float ringT    = fract(uTime * 0.12);
    float ringDist = length(vUv - vec2(0.5));
    float ring     = exp(-pow((ringDist - ringT * 0.9) * 9.0, 2.0));
    color += uJade * ring * edge * 0.4;

    /* mouse hover spotlight */
    float mDist = length(vUv - uMouseUV);
    color += uJade * smoothstep(0.16, 0.0, mDist) * 0.55;

    /* pole fade */
    float pole = pow(abs(vUv.y - 0.5) * 2.0, 2.8);
    color *= 1.0 - pole * 0.55;

    gl_FragColor = vec4(color, 1.0);
  }
`;

/* ── atmosphere shaders ── */
const ATMOS_V = /* glsl */ `
  varying vec3 vNormal; varying vec3 vWorldPos;
  void main() {
    vNormal   = normalize(normalMatrix * normal);
    vWorldPos = (modelMatrix * vec4(position,1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
  }
`;
const ATMOS_F = /* glsl */ `
  precision mediump float;
  uniform vec3  uColor;
  uniform float uTime;
  varying vec3 vNormal; varying vec3 vWorldPos;
  void main() {
    vec3  v   = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - max(0.0, dot(vNormal, v)), 1.9);
    float a   = rim * 0.6 * (0.8 + sin(uTime * 0.5) * 0.2);
    gl_FragColor = vec4(uColor * 1.2, a);
  }
`;

/* ─────────────────────────────────────────
   THREE.JS SCENE
───────────────────────────────────────── */
interface SceneProps { scrollProgressRef: MutableRefObject<number> }

function Scene({ scrollProgressRef }: SceneProps) {
  const meshRef  = useRef<THREE.Mesh>(null);
  const atRef    = useRef<THREE.Mesh>(null);
  const matRef   = useRef<THREE.ShaderMaterial>(null);
  const atMatRef = useRef<THREE.ShaderMaterial>(null);

  const drag    = useRef(false);
  const prev    = useRef({ x: 0, y: 0 });
  const vel     = useRef({ x: 0, y: 0 });
  const target  = useRef({ x: 0.15, y: 0 });
  const current = useRef({ x: 0.15, y: 0 });

  const jade = useMemo(() => new THREE.Color(0x2ea88a), []);

  const globeUniforms = useMemo(() => ({
    uTime:     { value: 0 },
    uMouseUV:  { value: new THREE.Vector2(-1, -1) },
    uJade:     { value: jade },
    uHexScale: { value: 13.0 },
  }), [jade]);

  const atmosUniforms = useMemo(() => ({
    uColor: { value: new THREE.Color(0x2ea88a) },
    uTime:  { value: 0 },
  }), []);

  useFrame((state) => {
    const t  = state.clock.elapsedTime;
    const sp = scrollProgressRef.current;

    if (matRef.current)   matRef.current.uniforms.uTime.value   = t;
    if (atMatRef.current) atMatRef.current.uniforms.uTime.value = t;

    if (!drag.current) {
      vel.current.x *= 0.93;
      vel.current.y *= 0.93;
      target.current.y += vel.current.x + 0.0015;
      target.current.x += vel.current.y;
    }

    current.current.x += (target.current.x - current.current.x) * 0.07;
    current.current.y += (target.current.y - current.current.y) * 0.07;

    const tilt = sp * 0.4;
    if (meshRef.current) {
      meshRef.current.rotation.x = current.current.x + tilt;
      meshRef.current.rotation.y = current.current.y;
    }
    if (atRef.current) {
      atRef.current.rotation.x = current.current.x + tilt;
      atRef.current.rotation.y = current.current.y;
    }
  });

  return (
    <>
      <mesh
        ref={meshRef}
        onPointerMove={(e) => {
          if (e.uv && matRef.current)
            matRef.current.uniforms.uMouseUV.value.set(e.uv.x, e.uv.y);
          if (!drag.current) return;
          const dx = e.clientX - prev.current.x;
          const dy = e.clientY - prev.current.y;
          vel.current = { x: dx * 0.006, y: dy * 0.006 };
          target.current.y += dx * 0.006;
          target.current.x += dy * 0.006;
          prev.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerLeave={() => {
          drag.current = false;
          if (matRef.current) matRef.current.uniforms.uMouseUV.value.set(-1, -1);
        }}
        onPointerDown={(e) => {
          drag.current = true;
          prev.current = { x: e.clientX, y: e.clientY };
          vel.current  = { x: 0, y: 0 };
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerUp={() => { drag.current = false; }}
      >
        <sphereGeometry args={[1.5, 96, 96]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={globeUniforms}
        />
      </mesh>

      {/* Atmospheric halo */}
      <mesh ref={atRef}>
        <sphereGeometry args={[1.75, 32, 32]} />
        <shaderMaterial
          ref={atMatRef}
          vertexShader={ATMOS_V}
          fragmentShader={ATMOS_F}
          uniforms={atmosUniforms}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Soft inner glow */}
      <mesh>
        <sphereGeometry args={[1.48, 24, 24]} />
        <meshBasicMaterial
          color={jade}
          transparent
          opacity={0.035}
          side={THREE.BackSide}
        />
      </mesh>
    </>
  );
}

/* ─────────────────────────────────────────
   PUBLIC COMPONENT
───────────────────────────────────────── */
export interface HexGlobeProps {
  scrollProgressRef: MutableRefObject<number>;
  className?: string;
}

export default function HexGlobe({ scrollProgressRef, className }: HexGlobeProps) {
  return (
    <div className={className} style={{ cursor: 'grab' }}>
      <Canvas
        camera={{ position: [0, 0, 3.8], fov: 44 }}
        dpr={[1, 2]}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        style={{ background: 'transparent' }}
      >
        <Scene scrollProgressRef={scrollProgressRef} />
      </Canvas>
    </div>
  );
}
