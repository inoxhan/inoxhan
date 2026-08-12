"use client";

import { useMemo } from "react";
import { ExtrudeGeometry, Path, Shape } from "three";

/**
 * Prosedürel bağlantı elemanları — GLB indirmesi YOK, toplam yük ~0 KB.
 * Fırçalanmış inox hissi: yüksek metalness + Lightformer yansımaları.
 */

const STEEL = {
  color: "#E2E7EC",
  metalness: 0.88,
  roughness: 0.22,
  envMapIntensity: 1.6,
};
const STEEL_DARK = {
  color: "#B9C2CA",
  metalness: 0.85,
  roughness: 0.34,
  envMapIntensity: 1.3,
};

function hexShape(radius: number, holeRadius?: number): Shape {
  const shape = new Shape();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 3;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  if (holeRadius) {
    const hole = new Path();
    hole.absarc(0, 0, holeRadius, 0, Math.PI * 2, true);
    shape.holes.push(hole);
  }
  return shape;
}

function useExtruded(radius: number, holeRadius: number | undefined, depth: number) {
  return useMemo(() => {
    const geo = new ExtrudeGeometry(hexShape(radius, holeRadius), {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.05,
      bevelSegments: 2,
      curveSegments: 24,
    });
    geo.center();
    return geo;
  }, [radius, holeRadius, depth]);
}

/** Altıköşe başlı cıvata — kahraman obje */
export function Bolt(props: React.ComponentProps<"group">) {
  const headGeo = useExtruded(0.85, undefined, 0.55);
  return (
    <group {...props}>
      <mesh geometry={headGeo} rotation-x={Math.PI / 2} position={[0, 1.2, 0]}>
        <meshPhysicalMaterial {...STEEL} />
      </mesh>
      {/* bilezik */}
      <mesh position={[0, 0.88, 0]}>
        <cylinderGeometry args={[0.58, 0.58, 0.1, 32]} />
        <meshPhysicalMaterial {...STEEL} />
      </mesh>
      {/* gövde */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 2.4, 32]} />
        <meshPhysicalMaterial {...STEEL_DARK} />
      </mesh>
      {/* diş bölgesi — hafif daralan uç */}
      <mesh position={[0, -1.62, 0]}>
        <cylinderGeometry args={[0.34, 0.28, 0.25, 32]} />
        <meshPhysicalMaterial {...STEEL_DARK} />
      </mesh>
    </group>
  );
}

/** Altıköşe somun */
export function Nut(props: React.ComponentProps<"group">) {
  const geo = useExtruded(0.8, 0.42, 0.55);
  return (
    <group {...props}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial {...STEEL} />
      </mesh>
    </group>
  );
}

/** Düz rondela (pul) */
export function Washer(props: React.ComponentProps<"group">) {
  const geo = useMemo(() => {
    const shape = new Shape();
    shape.absarc(0, 0, 0.75, 0, Math.PI * 2, false);
    const hole = new Path();
    hole.absarc(0, 0, 0.38, 0, Math.PI * 2, true);
    shape.holes.push(hole);
    const g = new ExtrudeGeometry(shape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
      curveSegments: 32,
    });
    g.center();
    return g;
  }, []);
  return (
    <group {...props}>
      <mesh geometry={geo}>
        <meshPhysicalMaterial {...STEEL} />
      </mesh>
    </group>
  );
}

/** Havşa başlı vida */
export function Screw(props: React.ComponentProps<"group">) {
  return (
    <group {...props}>
      {/* havşa baş */}
      <mesh position={[0, 0.62, 0]} rotation-x={Math.PI}>
        <coneGeometry args={[0.42, 0.35, 32]} />
        <meshPhysicalMaterial {...STEEL} />
      </mesh>
      {/* gövde */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 1.4, 24]} />
        <meshPhysicalMaterial {...STEEL_DARK} />
      </mesh>
      {/* sivri uç */}
      <mesh position={[0, -1.05, 0]} rotation-x={Math.PI}>
        <coneGeometry args={[0.18, 0.45, 24]} />
        <meshPhysicalMaterial {...STEEL_DARK} />
      </mesh>
    </group>
  );
}
