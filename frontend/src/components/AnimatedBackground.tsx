import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { useTheme } from '../contexts/ThemeContext';
import './AnimatedBackground.css';

interface ParticleProps {
  position: [number, number, number];
  velocity: [number, number, number];
  size: number;
  color: string;
  opacity: number;
}

interface FloatingShapeProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  shape: 'sphere' | 'box' | 'torus' | 'octahedron';
  color: string;
  opacity: number;
  speed: number;
}

// Blood cell particle
const BloodCell: React.FC<{ position: [number, number, number]; color: string; size: number }> = ({
  position,
  color,
  size
}) => {
  const meshRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle bobbing motion
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.2;
      // Gentle rotation
      meshRef.current.rotation.x += 0.01;
      meshRef.current.rotation.y += 0.015;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={size}>
      {/* Main blood cell shape */}
      <sphereGeometry args={[1, 16, 16]} />
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.6}
        roughness={0.3}
        metalness={0.1}
        emissive={color}
        emissiveIntensity={0.2}
      />

      {/* Nucleus */}
      <mesh position={[0, 0, 0.3]} scale={0.3}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshStandardMaterial
          color="#330000"
          emissive="#660000"
          emissiveIntensity={0.3}
          roughness={0.2}
        />
      </mesh>
    </mesh>
  );
};

// Floating DNA-like shape
const FloatingShape: React.FC<FloatingShapeProps> = ({
  position,
  rotation,
  scale,
  shape,
  color,
  opacity,
  speed
}) => {
  const meshRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const time = state.clock.elapsedTime;

      // Complex floating motion
      meshRef.current.position.x = position[0] + Math.sin(time * speed) * 0.5;
      meshRef.current.position.y = position[1] + Math.cos(time * speed * 0.7) * 0.3;
      meshRef.current.position.z = position[2] + Math.sin(time * speed * 0.5) * 0.2;

      // Rotation
      meshRef.current.rotation.x = rotation[0] + time * 0.2;
      meshRef.current.rotation.y = rotation[1] + time * 0.3;
      meshRef.current.rotation.z = rotation[2] + time * 0.1;

      // Breathing effect
      const breathe = 1 + Math.sin(time * 2) * 0.1;
      meshRef.current.scale.setScalar(scale * breathe);
    }
  });

  const getGeometry = () => {
    switch (shape) {
      case 'sphere':
        return <sphereGeometry args={[1, 16, 16]} />;
      case 'box':
        return <boxGeometry args={[1, 1, 1]} />;
      case 'torus':
        return <torusGeometry args={[0.7, 0.3, 8, 16]} />;
      case 'octahedron':
        return <octahedronGeometry args={[1, 0]} />;
      default:
        return <sphereGeometry args={[1, 16, 16]} />;
    }
  };

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      {getGeometry()}
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.2}
        metalness={0.3}
        transmission={0.1}
        thickness={0.5}
        clearcoat={0.2}
      />
    </mesh>
  );
};

// Connection lines between particles
const ConnectionLines: React.FC<{
  particles: ParticleProps[];
  themeColors: any;
}> = ({ particles, themeColors }) => {
  const linesRef = useRef<any>(null);

  useFrame((state) => {
    if (linesRef.current) {
      // Animate line opacity
      const opacity = 0.1 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
      if (linesRef.current.material) {
        (linesRef.current.material as any).opacity = opacity;
      }
    }
  });

  const linePositions = useMemo(() => {
    const positions = [];
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const distance = Math.sqrt(
          Math.pow(particles[i].position[0] - particles[j].position[0], 2) +
          Math.pow(particles[i].position[1] - particles[j].position[1], 2) +
          Math.pow(particles[i].position[2] - particles[j].position[2], 2)
        );

        if (distance < 3) { // Only connect nearby particles
          positions.push(
            ...particles[i].position,
            ...particles[j].position
          );
        }
      }
    }
    return positions;
  }, [particles]);

  return (
    <lineSegments ref={linesRef} args={[new Float32Array(linePositions), 2]}>
      <lineBasicMaterial
        color={themeColors.isDark ? '#ff6666' : '#ff9999'}
        transparent
        opacity={0.1}
      />
    </lineSegments>
  );
};

const AnimatedBackgroundScene: React.FC = () => {
  const { theme } = useTheme();

  // Generate particles
  const particles = useMemo(() => {
    return Array.from({ length: 15 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 20,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      ] as [number, number, number],
      velocity: [
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01,
        (Math.random() - 0.5) * 0.01
      ] as [number, number, number],
      size: Math.random() * 0.3 + 0.1,
      color: Math.random() > 0.5 ? '#ff6b9d' : '#ff9999',
      opacity: Math.random() * 0.3 + 0.1
    }));
  }, []);

  // Generate floating shapes
  const shapes = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => ({
      position: [
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * 15,
        (Math.random() - 0.5) * 15
      ] as [number, number, number],
      rotation: [
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI
      ] as [number, number, number],
      scale: Math.random() * 0.5 + 0.2,
      shape: ['sphere', 'box', 'torus', 'octahedron'][Math.floor(Math.random() * 4)] as any,
      color: theme.isDark ? '#ff6666' : '#ff9999',
      opacity: Math.random() * 0.3 + 0.1,
      speed: Math.random() * 0.5 + 0.2
    }));
  }, [theme.isDark]);

  return (
    <>
      {/* Blood cells */}
      {particles.map((particle, index) => (
        <BloodCell
          key={`bloodcell-${index}`}
          position={particle.position}
          color={particle.color}
          size={particle.size}
        />
      ))}

      {/* Floating geometric shapes */}
      {shapes.map((shape, index) => (
        <FloatingShape
          key={`shape-${index}`}
          position={shape.position}
          rotation={shape.rotation}
          scale={shape.scale}
          shape={shape.shape}
          color={shape.color}
          opacity={shape.opacity}
          speed={shape.speed}
        />
      ))}

      {/* Connection lines */}
      <ConnectionLines particles={particles} themeColors={theme} />

      {/* Background lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color={theme.isDark ? '#ff6666' : '#ff9999'} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color={theme.isDark ? '#9999ff' : '#ccccff'} />
    </>
  );
};

export const AnimatedBackground: React.FC = () => {
  const { theme } = useTheme();

  return (
    <div className={`animated-background ${theme.isDark ? 'dark' : 'light'}`}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 75 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0
        }}
      >
        <AnimatedBackgroundScene />
      </Canvas>

      {/* Gradient overlay for better text readability */}
      <div
        className="background-overlay"
        style={{
          background: theme.isDark
            ? 'radial-gradient(circle at center, transparent 0%, rgba(18, 18, 18, 0.3) 100%)'
            : 'radial-gradient(circle at center, transparent 0%, rgba(255, 255, 255, 0.3) 100%)'
        }}
      />
    </div>
  );
};

export default AnimatedBackground;