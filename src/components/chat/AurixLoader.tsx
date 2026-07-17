import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

const PHRASES = [
  "Preparing Aurix",
  "Encrypting conversations",
  "Building secure tunnel",
  "Syncing messages",
  "Almost ready",
];

const EMERALD = "#10b981";
const EMERALD_HEX = 0x10b981;

/* ---------------- 3D Figurine ---------------- */

function Figurine() {
  const root = useRef<THREE.Group>(null!);
  const torso = useRef<THREE.Group>(null!);
  const head = useRef<THREE.Mesh>(null!);
  const lShoulder = useRef<THREE.Group>(null!);
  const rShoulder = useRef<THREE.Group>(null!);
  const lHip = useRef<THREE.Group>(null!);
  const rHip = useRef<THREE.Group>(null!);
  const lFoot = useRef<THREE.Group>(null!);
  const rFoot = useRef<THREE.Group>(null!);

  // Matte soft-touch black material with subtle emerald rim via env
  const bodyMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: new THREE.Color("#0a0a0a"),
        roughness: 0.55,
        metalness: 0.15,
        clearcoat: 0.6,
        clearcoatRoughness: 0.35,
        sheen: 1,
        sheenColor: new THREE.Color(EMERALD_HEX),
        sheenRoughness: 0.6,
        envMapIntensity: 0.6,
      }),
    []
  );

  useFrame((state) => {
    const t = state.clock.getElapsedTime();

    // Breathing + subtle vertical bob
    if (root.current) {
      root.current.position.y = Math.sin(t * 1.4) * 0.02;
      root.current.rotation.y = Math.sin(t * 0.35) * 0.25;
    }
    if (torso.current) {
      const lean = Math.sin(t * 1.1) * 0.08;
      torso.current.rotation.z = lean;
      torso.current.rotation.x = Math.sin(t * 0.9) * 0.04;
      torso.current.scale.y = 1 + Math.sin(t * 1.6) * 0.012;
    }
    if (head.current) {
      head.current.rotation.y = Math.sin(t * 0.7) * 0.35;
      head.current.rotation.z = Math.sin(t * 1.1) * 0.06;
    }

    // Arm swings — offset phase for natural gait
    const armPhase = Math.sin(t * 2.0);
    if (lShoulder.current) lShoulder.current.rotation.x = armPhase * 0.55;
    if (rShoulder.current) rShoulder.current.rotation.x = -armPhase * 0.55;
    if (lShoulder.current) lShoulder.current.rotation.z = 0.15 + Math.sin(t * 1.3) * 0.05;
    if (rShoulder.current) rShoulder.current.rotation.z = -0.15 - Math.sin(t * 1.3) * 0.05;

    // Glide footwork — legs slide side-to-side, crossing over
    const glide = Math.sin(t * 2.0);
    const cross = Math.sin(t * 1.0);
    if (lHip.current) {
      lHip.current.position.x = -0.18 + cross * 0.12;
      lHip.current.position.z = glide * 0.15;
      lHip.current.rotation.x = -glide * 0.35;
    }
    if (rHip.current) {
      rHip.current.position.x = 0.18 - cross * 0.12;
      rHip.current.position.z = -glide * 0.15;
      rHip.current.rotation.x = glide * 0.35;
    }
    // Heel rotations
    if (lFoot.current) lFoot.current.rotation.y = Math.sin(t * 2.0) * 0.5;
    if (rFoot.current) rFoot.current.rotation.y = -Math.sin(t * 2.0) * 0.5;
  });

  return (
    <group ref={root} position={[0, -0.9, 0]}>
      {/* Legs */}
      <group ref={lHip} position={[-0.18, 0.05, 0]}>
        <mesh material={bodyMat} castShadow position={[0, -0.35, 0]}>
          <capsuleGeometry args={[0.11, 0.55, 8, 16]} />
        </mesh>
        <group ref={lFoot} position={[0, -0.72, 0.05]}>
          <mesh material={bodyMat} castShadow>
            <capsuleGeometry args={[0.1, 0.16, 6, 12]} />
          </mesh>
        </group>
      </group>
      <group ref={rHip} position={[0.18, 0.05, 0]}>
        <mesh material={bodyMat} castShadow position={[0, -0.35, 0]}>
          <capsuleGeometry args={[0.11, 0.55, 8, 16]} />
        </mesh>
        <group ref={rFoot} position={[0, -0.72, 0.05]}>
          <mesh material={bodyMat} castShadow>
            <capsuleGeometry args={[0.1, 0.16, 6, 12]} />
          </mesh>
        </group>
      </group>

      {/* Torso */}
      <group ref={torso} position={[0, 0.55, 0]}>
        <mesh material={bodyMat} castShadow>
          <capsuleGeometry args={[0.28, 0.55, 10, 20]} />
        </mesh>

        {/* Arms */}
        <group ref={lShoulder} position={[-0.34, 0.22, 0]}>
          <mesh material={bodyMat} castShadow position={[0, -0.32, 0]}>
            <capsuleGeometry args={[0.085, 0.52, 8, 16]} />
          </mesh>
          <mesh material={bodyMat} castShadow position={[0, -0.7, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
          </mesh>
        </group>
        <group ref={rShoulder} position={[0.34, 0.22, 0]}>
          <mesh material={bodyMat} castShadow position={[0, -0.32, 0]}>
            <capsuleGeometry args={[0.085, 0.52, 8, 16]} />
          </mesh>
          <mesh material={bodyMat} castShadow position={[0, -0.7, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
          </mesh>
        </group>

        {/* Head — smooth ovoid, no features */}
        <mesh ref={head} material={bodyMat} castShadow position={[0, 0.6, 0]}>
          <sphereGeometry args={[0.24, 32, 32]} />
        </mesh>
      </group>
    </group>
  );
}

/* Cinematic camera: slow push-in + micro float */
function CameraRig() {
  const { camera } = useThree();
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    const targetZ = 3.4 - Math.min(t * 0.02, 0.35);
    camera.position.x = Math.sin(t * 0.25) * 0.12;
    camera.position.y = 0.4 + Math.sin(t * 0.4) * 0.05;
    camera.position.z = targetZ;
    camera.lookAt(0, 0.1, 0);
  });
  return null;
}

/* Emerald floating particles inside 3D scene */
function Particles({ count = 60 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null!);
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 4;
      pos[i * 3 + 1] = Math.random() * 2.2 - 0.5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 2.5;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: EMERALD_HEX,
        size: 0.025,
        transparent: true,
        opacity: 0.7,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    []
  );
  useFrame((s) => {
    if (!ref.current) return;
    const t = s.clock.getElapsedTime();
    const arr = (ref.current.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += 0.0015 + Math.sin(t + i) * 0.0005;
      if (arr[i * 3 + 1] > 1.8) arr[i * 3 + 1] = -0.5;
    }
    (ref.current.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  });
  return <points ref={ref} geometry={geom} material={mat} />;
}

/* ---------------- Loader Shell ---------------- */

export function AurixLoader() {
  const [i, setI] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % PHRASES.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <motion.div
      data-aurix-loader
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.02, filter: "blur(10px)" }}
      transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        background: "#000",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Ambient emerald volumetric glow */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 45% at 50% 60%, rgba(16,185,129,0.22), transparent 70%), radial-gradient(30% 25% at 50% 85%, rgba(16,185,129,0.35), transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* 3D scene */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Canvas
          shadows
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0.4, 3.4], fov: 32 }}
          style={{ background: "transparent" }}
        >
          {/* 3-point lighting */}
          <ambientLight intensity={0.25} />
          <directionalLight
            position={[3, 4, 2]}
            intensity={1.1}
            color="#ffffff"
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <directionalLight position={[-3, 2, -2]} intensity={0.6} color={EMERALD} />
          <pointLight position={[0, -0.8, 1.5]} intensity={1.4} color={EMERALD} distance={4} />
          <spotLight
            position={[0, 3, 2]}
            angle={0.5}
            penumbra={1}
            intensity={0.8}
            color="#ffffff"
            castShadow
          />

          <Environment preset="studio" background={false} environmentIntensity={0.35} />

          {!reduce && <CameraRig />}
          <Figurine />
          <Particles />

          {/* Glossy reflective floor via contact shadow + soft plane */}
          <ContactShadows
            position={[0, -0.9, 0]}
            opacity={0.85}
            scale={5}
            blur={2.6}
            far={2}
            color={EMERALD}
          />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.902, 0]} receiveShadow>
            <circleGeometry args={[2.2, 64]} />
            <meshStandardMaterial
              color="#000"
              roughness={0.35}
              metalness={0.9}
              envMapIntensity={0.4}
            />
          </mesh>
        </Canvas>
      </div>

      {/* Loading UI */}
      <div
        style={{
          position: "absolute",
          bottom: "12%",
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
          pointerEvents: "none",
        }}
      >
        <div style={{ height: 22, position: "relative", width: "min(280px, 70vw)" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.45 }}
              style={{
                position: "absolute",
                inset: 0,
                textAlign: "center",
                fontSize: 13,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.72)",
                fontWeight: 500,
              }}
            >
              {PHRASES[i]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Energy line */}
        <div
          style={{
            width: "min(220px, 60vw)",
            height: 2,
            borderRadius: 999,
            background: "rgba(255,255,255,0.06)",
            overflow: "hidden",
            position: "relative",
            boxShadow: `0 0 24px ${EMERALD}55`,
          }}
        >
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(90deg, transparent, ${EMERALD}, #6ee7b7, ${EMERALD}, transparent)`,
              filter: "blur(0.5px)",
            }}
          />
        </div>

        <div
          style={{
            fontSize: 10,
            letterSpacing: "0.4em",
            color: "rgba(255,255,255,0.35)",
            fontWeight: 600,
          }}
        >
          AURIX
        </div>
      </div>
    </motion.div>
  );
}

export default AurixLoader;
