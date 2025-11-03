import React, { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { Text, Float, PresentationControls } from '@react-three/drei';

interface BloodDrop3DProps {
  isAnimating?: boolean;
  onClick?: () => void;
  pulseIntensity?: number;
  showFloatingDrops?: boolean;
}

export const BloodDrop3D: React.FC<BloodDrop3DProps> = ({
  isAnimating = false,
  onClick,
  pulseIntensity = 0.3,
  showFloatingDrops = true
}) => {
  const meshRef = useRef<Mesh>(null);
  const groupRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  // Generate floating droplet positions
  const floatingDrops = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * 6,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 2
      ] as [number, number, number],
      scale: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 0.5 + 0.5
    }));
  }, []);

  useFrame((state, delta) => {
    if (!meshRef.current || !groupRef.current) return;

    const time = state.clock.elapsedTime;

    // Enhanced pulsing animation with multiple harmonics
    let scale = 1;
    if (isAnimating) {
      scale = 1 +
        Math.sin(time * 3) * pulseIntensity * 0.6 +
        Math.sin(time * 5) * pulseIntensity * 0.3 +
        Math.sin(time * 7) * pulseIntensity * 0.1;
    } else if (hovered) {
      scale = 1 + Math.sin(time * 2) * (pulseIntensity * 0.5);
    }
    meshRef.current.scale.setScalar(scale);

    // Complex rotation pattern
    meshRef.current.rotation.y += delta * 0.3;
    meshRef.current.rotation.x = Math.sin(time * 0.8) * 0.15;
    meshRef.current.rotation.z = Math.sin(time * 1.2) * 0.05;

    // Enhanced bobbing motion with figure-8 pattern
    meshRef.current.position.y = Math.sin(time * 2) * 0.15 + Math.sin(time * 3.7) * 0.05;
    meshRef.current.position.x = Math.sin(time * 1.5) * 0.1;

    // Group rotation for dynamic presentation
    groupRef.current.rotation.y = Math.sin(time * 0.5) * 0.1;

    // Click animation with dramatic effect
    if (clicked) {
      meshRef.current.rotation.z += delta * 8;
      const wobbleScale = 1 + Math.sin(time * 20) * 0.1;
      meshRef.current.scale.multiplyScalar(wobbleScale);

      if (time % 2 > 1) {
        setClicked(false);
      }
    }
  });

  const handleClick = (event: any) => {
    event.stopPropagation();
    setClicked(true);
    if (onClick) {
      onClick();
    }
  };

  return (
    <group ref={groupRef}>
      {/* Lighting setup */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-5, 5, 5]} intensity={0.5} color="#ff6b6b" />
      <pointLight position={[5, -5, -5]} intensity={0.3} color="#4ecdc4" />

      {/* Main blood drop */}
      <Float
        speed={isAnimating ? 4 : 2}
        rotationIntensity={isAnimating ? 0.5 : 0.2}
        floatIntensity={isAnimating ? 0.3 : 0.1}
      >
        <PresentationControls
          global={false}
          rotation={[0, 0, 0]}
          polar={[-0.2, 0.2]}
          azimuth={[-0.2, 0.2]}
          config={{ mass: 1, tension: 100, friction: 20 }}
        >
          <mesh
            ref={meshRef}
            onClick={handleClick}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            position={[0, 0, 0]}
            castShadow
            receiveShadow
          >
            {/* Main blood drop body with enhanced geometry */}
            <sphereGeometry args={[1, 64, 64]} />
            <meshPhysicalMaterial
              color={hovered ? '#ff4444' : '#cc0000'}
              emissive={isAnimating ? '#ff0000' : '#330000'}
              emissiveIntensity={isAnimating ? 0.4 : 0.1}
              roughness={0.2}
              metalness={0.1}
              transmission={0.1}
              thickness={0.5}
              clearcoat={0.3}
              clearcoatRoughness={0.2}
            />
          </mesh>

          {/* Blood drop tip with better shape */}
          <mesh position={[0, -1.3, 0]} castShadow>
            <coneGeometry args={[0.35, 0.8, 16]} />
            <meshPhysicalMaterial
              color={hovered ? '#ff4444' : '#cc0000'}
              emissive={isAnimating ? '#ff0000' : '#330000'}
              emissiveIntensity={isAnimating ? 0.4 : 0.1}
              roughness={0.2}
              metalness={0.1}
              transmission={0.1}
            />
          </mesh>

          {/* Medical plus symbol */}
          {hovered && (
            <Text
              position={[0, 0.2, 1.2]}
              fontSize={1}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.05}
              outlineColor="#cc0000"
            >
              +
            </Text>
          )}
        </PresentationControls>
      </Float>

      {/* Floating blood droplets */}
      {showFloatingDrops && (
        <FloatingDroplets
          droplets={floatingDrops}
          isAnimating={isAnimating}
          hovered={hovered}
        />
      )}

      {/* Enhanced glow effects */}
      <GlowEffects isAnimating={isAnimating} clicked={clicked} />

      {/* Particle burst effects */}
      {isAnimating && <ParticleBurst />}
      {clicked && <ClickBurst />}
    </group>
  );
};

// Floating droplets component
const FloatingDroplets: React.FC<{
  droplets: Array<{
    id: number;
    position: [number, number, number];
    scale: number;
    speed: number;
  }>;
  isAnimating: boolean;
  hovered: boolean;
}> = ({ droplets, isAnimating, hovered }) => {
  return (
    <>
      {droplets.map((droplet) => (
        <FloatingDroplet
          key={droplet.id}
          position={droplet.position}
          scale={droplet.scale}
          speed={droplet.speed}
          isAnimating={isAnimating}
          hovered={hovered}
        />
      ))}
    </>
  );
};

// Individual floating droplet
const FloatingDroplet: React.FC<{
  position: [number, number, number];
  scale: number;
  speed: number;
  isAnimating: boolean;
  hovered: boolean;
}> = ({ position, scale, speed, isAnimating, hovered }) => {
  const meshRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.elapsedTime;

    // Orbital motion around main drop
    const orbitRadius = 2 + scale;
    const orbitSpeed = speed * (isAnimating ? 2 : 1);

    meshRef.current.position.x = position[0] + Math.cos(time * orbitSpeed) * orbitRadius * 0.3;
    meshRef.current.position.y = position[1] + Math.sin(time * orbitSpeed * 0.7) * 0.5;
    meshRef.current.position.z = position[2] + Math.sin(time * orbitSpeed) * orbitRadius * 0.3;

    // Gentle rotation
    meshRef.current.rotation.x += 0.01;
    meshRef.current.rotation.y += 0.02;

    // Pulsing
    const pulseScale = scale * (1 + Math.sin(time * 3 + scale * 10) * 0.2);
    meshRef.current.scale.setScalar(pulseScale);
  });

  return (
    <mesh ref={meshRef} position={position} castShadow>
      <sphereGeometry args={[1, 16, 16]} />
      <meshPhysicalMaterial
        color={hovered ? '#ff6666' : '#ff3333'}
        emissive={isAnimating ? '#ff0000' : '#660000'}
        emissiveIntensity={isAnimating ? 0.3 : 0.1}
        roughness={0.1}
        metalness={0.2}
        transmission={0.2}
      />
    </mesh>
  );
};

// Glow effects component
const GlowEffects: React.FC<{
  isAnimating: boolean;
  clicked: boolean;
}> = ({ isAnimating, clicked }) => {
  return (
    <>
      {/* Outer glow */}
      <mesh position={[0, 0, 0]} scale={1.3}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial
          color={clicked ? "#ff6b6b" : "#ff0000"}
          transparent
          opacity={isAnimating ? 0.15 : 0.05}
        />
      </mesh>

      {/* Middle glow */}
      <mesh position={[0, 0, 0]} scale={1.1}>
        <sphereGeometry args={[1, 24, 24]} />
          <meshBasicMaterial
          color="#ff3333"
          transparent
          opacity={isAnimating ? 0.2 : 0.08}
        />
      </mesh>

      {/* Inner glow */}
      {isAnimating && (
        <mesh position={[0, 0, 0]} scale={1.05}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color="#ff6666"
            transparent
            opacity={0.3}
          />
        </mesh>
      )}
    </>
  );
};

// Particle burst effect
const ParticleBurst: React.FC = () => {
  const particlesRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!particlesRef.current) return;

    const time = state.clock.elapsedTime;

    // Complex rotation pattern
    particlesRef.current.rotation.x = time * 0.5;
    particlesRef.current.rotation.y = time * 0.8;
    particlesRef.current.rotation.z = time * 0.3;

    // Pulsing scale
    const scale = 1 + Math.sin(time * 4) * 0.2;
    particlesRef.current.scale.setScalar(3 * scale);
  });

  return (
    <mesh ref={particlesRef} position={[0, 0, 0]}>
      <octahedronGeometry args={[1, 0]} />
      <meshBasicMaterial
        color="#ff9999"
        wireframe
        transparent
        opacity={0.2}
      />
    </mesh>
  );
};

// Click burst effect
const ClickBurst: React.FC = () => {
  const burstRef = useRef<Mesh>(null);

  useFrame((state, delta) => {
    if (!burstRef.current) return;

    // Rapid expansion
    burstRef.current.scale.multiplyScalar(1.05);

    // Fade out
    if (burstRef.current.material && 'opacity' in burstRef.current.material) {
      (burstRef.current.material as any).opacity -= delta * 2;
    }
  });

  return (
    <mesh ref={burstRef} position={[0, 0, 0]}>
      <ringGeometry args={[1, 2, 32]} />
      <meshBasicMaterial
        color="#ff6b6b"
        transparent
        opacity={1}
        side={2}
      />
    </mesh>
  );
};

export default BloodDrop3D;