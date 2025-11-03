import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Mesh, Vector3 } from 'three';
import { Text } from '@react-three/drei';

interface BloodDrop3DProps {
  isAnimating?: boolean;
  onClick?: () => void;
  pulseIntensity?: number;
}

export const BloodDrop3D: React.FC<BloodDrop3DProps> = ({
  isAnimating = false,
  onClick,
  pulseIntensity = 0.3
}) => {
  const meshRef = useRef<Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Pulsing animation
    if (isAnimating) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * pulseIntensity;
      meshRef.current.scale.setScalar(scale);
    } else if (hovered) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * (pulseIntensity * 0.5);
      meshRef.current.scale.setScalar(scale);
    } else {
      meshRef.current.scale.setScalar(1);
    }

    // Gentle rotation
    meshRef.current.rotation.y += delta * 0.5;
    meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.1;

    // Bobbing motion
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;

    // Click animation
    if (clicked) {
      meshRef.current.rotation.z += delta * 5;
      if (state.clock.elapsedTime % 1 > 0.5) {
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

  // Blood drop shape (using a sphere for simplicity, can be replaced with custom geometry)
  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        position={[0, 0, 0]}
      >
        {/* Main blood drop body */}
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={hovered ? '#ff4444' : '#cc0000'}
          emissive={isAnimating ? '#ff0000' : '#000000'}
          emissiveIntensity={isAnimating ? 0.3 : 0.1}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Blood drop tip */}
      <mesh position={[0, -1.2, 0]}>
        <coneGeometry args={[0.3, 0.6, 8]} />
        <meshStandardMaterial
          color={hovered ? '#ff4444' : '#cc0000'}
          emissive={isAnimating ? '#ff0000' : '#000000'}
          emissiveIntensity={isAnimating ? 0.3 : 0.1}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>

      {/* Plus symbol for medical context */}
      {hovered && (
        <Text
          position={[0, 0, 1.1]}
          fontSize={0.8}
          color="white"
          anchorX="center"
          anchorY="middle"
          font="/fonts/inter-bold.woff"
        >
          +
        </Text>
      )}

      {/* Glowing effect when animating */}
      {isAnimating && (
        <mesh position={[0, 0, 0]} scale={1.2}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial
            color="#ff0000"
            transparent
            opacity={0.2}
          />
        </mesh>
      )}

      {/* Particle effects for dramatic animation */}
      {isAnimating && (
        <ParticleEffect />
      )}
    </group>
  );
};

// Particle effect component
const ParticleEffect: React.FC = () => {
  const particlesRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!particlesRef.current) return;

    // Animate particles
    const time = state.clock.elapsedTime;
    particlesRef.current.rotation.y = time * 2;
    particlesRef.current.rotation.x = Math.sin(time) * 0.2;
  });

  return (
    <mesh ref={particlesRef} position={[0, 0, 0]}>
      <octahedronGeometry args={[2, 0]} />
      <meshBasicMaterial
        color="#ff6666"
        wireframe
        transparent
        opacity={0.3}
      />
    </mesh>
  );
};

export default BloodDrop3D;