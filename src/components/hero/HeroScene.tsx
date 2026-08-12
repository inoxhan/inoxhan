"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Float, Lightformer } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { Bolt, Nut, Screw, Washer } from "@/components/hero/FastenerModels";

/**
 * "Asılı hırdavat" sahnesi — antrasit boşlukta süzülen paslanmaz parçalar.
 * Canvas pointer-events-none: parallax window mousemove ile izlenir,
 * böylece hero'daki buton ve metinler tıklanabilir kalır.
 */

const pointer = { x: 0, y: 0 };

function ParallaxGroup({ children }: { children: React.ReactNode }) {
  const ref = useRef<Group>(null);

  useFrame((_state, dt) => {
    const g = ref.current;
    if (!g) return;
    // ±4° hedefe yumuşak yaklaşım
    const targetY = pointer.x * 0.07;
    const targetX = -pointer.y * 0.05;
    const k = Math.min(1, dt * 2.5);
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
    // scroll'da grup hafifçe yukarı kayar ve geriye yatar
    const s = typeof window === "undefined" ? 0 : window.scrollY;
    const t = Math.min(1, s / 800);
    g.position.y = t * 1.6;
    g.rotation.z = t * 0.12;
  });

  return <group ref={ref}>{children}</group>;
}

export default function HeroScene() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("mousemove", onMove, { passive: true });

    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0,
    });
    if (wrapRef.current) io.observe(wrapRef.current);

    return () => {
      window.removeEventListener("mousemove", onMove);
      io.disconnect();
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className={`pointer-events-none absolute inset-0 transition-opacity duration-1000 ${
        ready ? "opacity-100" : "opacity-0"
      }`}
    >
      <Canvas
        camera={{ position: [0, 0, 9], fov: 38 }}
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={() => setReady(true)}
      >
        <AdaptiveDpr pixelated />
        <ambientLight intensity={0.25} />

        <ParallaxGroup>
          {/* Kahraman cıvata — başlığın sağında */}
          <Float speed={0.9} rotationIntensity={0.5} floatIntensity={0.7}>
            <Bolt position={[3.1, 0.2, 0]} rotation={[0.5, -0.4, -0.65]} scale={1.25} />
          </Float>
          <Float speed={0.7} rotationIntensity={0.6} floatIntensity={0.6}>
            <Nut position={[1.4, 1.75, -1.5]} rotation={[1.1, 0.3, 0.2]} scale={0.9} />
          </Float>
          <Float speed={0.6} rotationIntensity={0.7} floatIntensity={0.5}>
            <Washer position={[4.8, 1.9, -2.5]} rotation={[0.9, 0.5, 0]} scale={0.85} />
          </Float>
          <Float speed={0.8} rotationIntensity={0.5} floatIntensity={0.8}>
            <Washer position={[1.9, -1.9, -1]} rotation={[1.4, -0.2, 0.4]} scale={0.6} />
          </Float>
          <Float speed={0.75} rotationIntensity={0.6} floatIntensity={0.7}>
            <Screw position={[4.6, -1.3, -1.8]} rotation={[-0.5, 0.2, 0.9]} scale={1.05} />
          </Float>
          <Float speed={0.5} rotationIntensity={0.4} floatIntensity={0.5}>
            <Nut position={[-4.6, -2.1, -3]} rotation={[0.4, 0.8, 0.1]} scale={0.7} />
          </Float>
        </ParallaxGroup>

        {/* HDR dosyası yerine Lightformer'lı stüdyo ortamı — yük ~0 */}
        <Environment resolution={256}>
          <Lightformer intensity={2.2} position={[0, 4, 5]} scale={[9, 1.4, 1]} color="#E6EAEE" />
          <Lightformer intensity={1.1} position={[-6, -1, 3]} rotation-y={0.6} scale={[6, 2, 1]} color="#AEB6C0" />
          <Lightformer intensity={0.9} position={[6, 1, -3]} rotation-y={-0.7} scale={[6, 2.5, 1]} color="#7E8996" />
          <Lightformer intensity={0.5} position={[0, -5, 0]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} color="#39424C" />
        </Environment>
      </Canvas>
    </div>
  );
}
