"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { AdaptiveDpr, Environment, Float, Lightformer } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import type { Group } from "three";
import { Bolt, Nut, Screw, Washer } from "@/components/hero/FastenerModels";
import type { HeroMedia } from "@/lib/constants";

/**
 * Hero'nun 3D sahneleri — antrasit boşlukta süzülen paslanmaz parçalar.
 * Canvas pointer-events-none: parallax window mousemove ile izlenir,
 * böylece hero'daki buton ve metinler tıklanabilir kalır.
 *
 * Üç kompozisyon var; hangisinin çalışacağını HERO_SLIDES tablosu belirler.
 * Hepsi aynı prosedürel modelleri kullanır (FastenerModels) — GLB indirmesi yok.
 */

export type SahneAdi = Extract<HeroMedia, { kind: "3d" }>["scene"];

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

/** Kendi ekseninde sabit hızla dönen grup — vitrin sahnesinin kahraman objesi için. */
function DonenGrup({ hiz = 0.25, children }: { hiz?: number; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame((_state, dt) => {
    if (ref.current) ref.current.rotation.y += dt * hiz;
  });
  return <group ref={ref}>{children}</group>;
}

/** 1 — "Asılı": başlığın sağında dağınık süzülen parçalar (ilk sahne). */
function SahneAsili() {
  return (
    <>
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
        <Nut position={[-7.2, -3.6, -5]} rotation={[0.4, 0.8, 0.1]} scale={0.8} />
      </Float>
    </>
  );
}

/** 2 — "Vitrin": tek kahraman cıvata yavaşça döner, çevresinde halka hâlinde pullar. */
function SahneVitrin() {
  const halka = [0, 1, 2, 3, 4, 5];
  return (
    <>
      <DonenGrup hiz={0.32}>
        <Bolt position={[3.6, 0, 0]} rotation={[0.15, 0, -0.12]} scale={1.75} />
      </DonenGrup>

      {halka.map((i) => {
        const a = (i / halka.length) * Math.PI * 2;
        return (
          <Float key={i} speed={0.45 + i * 0.06} rotationIntensity={0.35} floatIntensity={0.45}>
            <Washer
              position={[3.6 + Math.cos(a) * 2.9, Math.sin(a) * 2.2, -1.6 + Math.sin(a * 2) * 0.9]}
              rotation={[1.3 + a * 0.2, a * 0.5, a]}
              scale={0.5}
            />
          </Float>
        );
      })}

      <Float speed={0.55} rotationIntensity={0.4} floatIntensity={0.6}>
        <Nut position={[-1.1, 2.3, -3.2]} rotation={[0.9, 0.4, 0.3]} scale={0.7} />
      </Float>
      <Float speed={0.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <Nut position={[-6.8, -3.2, -5]} rotation={[0.3, 0.9, 0.2]} scale={0.75} />
      </Float>
    </>
  );
}

/** 3 — "Akış": sol altından sağ üstüne uzanan çapraz parça akışı. */
function SahneAkis() {
  // Çapraz eksen üzerinde eşit aralıklı; tür ve ölçek sırayla değişiyor
  const parcalar = [-3, -2, -1, 0, 1, 2, 3, 4];
  return (
    <>
      {parcalar.map((k, i) => {
        const x = 1.1 + k * 1.35;
        const y = -2.6 + k * 0.95;
        const z = -2.4 + Math.sin(k) * 1.4;
        const scale = 0.55 + ((i * 7) % 5) * 0.11;
        const rot: [number, number, number] = [0.4 + i * 0.31, 0.7 + i * 0.24, -0.5 + i * 0.18];
        const tur = i % 3;
        return (
          <Float
            key={k}
            speed={0.5 + (i % 4) * 0.14}
            rotationIntensity={0.55}
            floatIntensity={0.5 + (i % 3) * 0.2}
          >
            {tur === 0 ? (
              <Nut position={[x, y, z]} rotation={rot} scale={scale} />
            ) : tur === 1 ? (
              <Washer position={[x, y, z]} rotation={rot} scale={scale * 1.1} />
            ) : (
              <Screw position={[x, y, z]} rotation={rot} scale={scale * 1.15} />
            )}
          </Float>
        );
      })}

      <Float speed={0.8} rotationIntensity={0.45} floatIntensity={0.7}>
        <Bolt position={[5.4, 1.6, -0.6]} rotation={[0.55, -0.35, -0.8]} scale={1.15} />
      </Float>
    </>
  );
}

const SAHNELER: Record<SahneAdi, () => React.ReactElement> = {
  asili: SahneAsili,
  vitrin: SahneVitrin,
  akis: SahneAkis,
};

/** Sahneye göre kamera — kompozisyonlar farklı derinlik istiyor. */
const KAMERA: Record<SahneAdi, { position: [number, number, number]; fov: number }> = {
  asili: { position: [0, 0, 9], fov: 38 },
  vitrin: { position: [0, 0, 10.5], fov: 36 },
  akis: { position: [0, 0, 11], fov: 42 },
};

export default function HeroScene({ scene = "asili" }: { scene?: SahneAdi }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const Sahne = SAHNELER[scene] ?? SahneAsili;
  const kamera = KAMERA[scene] ?? KAMERA.asili;

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
        camera={kamera}
        dpr={[1, 1.75]}
        frameloop={visible ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={() => setReady(true)}
      >
        <AdaptiveDpr pixelated />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 6, 6]} intensity={1.4} color="#F2F5F8" />
        <directionalLight position={[-6, -2, 4]} intensity={0.5} color="#8B97A3" />

        <ParallaxGroup>
          <Sahne />
        </ParallaxGroup>

        {/* HDR dosyası yerine Lightformer'lı stüdyo ortamı — yük ~0 */}
        <Environment resolution={256}>
          {/* tepe ışık şeridi — fırçalanmış metal parlaması */}
          <Lightformer intensity={6} position={[0, 4, 5]} scale={[10, 2, 1]} color="#FFFFFF" />
          {/* ön dolgu — kameradan gelen yumuşak yansıma */}
          <Lightformer intensity={3} position={[0, 0, 8]} scale={[12, 6, 1]} color="#DFE5EA" />
          <Lightformer intensity={2.5} position={[-6, -1, 3]} rotation-y={0.6} scale={[7, 3, 1]} color="#C7CFD7" />
          <Lightformer intensity={2} position={[6, 1, -3]} rotation-y={-0.7} scale={[7, 3.5, 1]} color="#9AA5B1" />
          <Lightformer intensity={1} position={[0, -5, 0]} rotation-x={Math.PI / 2} scale={[10, 5, 1]} color="#4A5561" />
        </Environment>
      </Canvas>
    </div>
  );
}
