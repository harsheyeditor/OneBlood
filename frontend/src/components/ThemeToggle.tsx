import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Canvas } from '@react-three/fiber';
import { Float, PresentationControls } from '@react-three/drei';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import './ThemeToggle.css';

interface ThemeToggle3DProps {
  isDark: boolean;
  onClick: () => void;
}

// Sun component for light theme
const Sun: React.FC = () => {
  const meshRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.z = state.clock.elapsedTime * 0.5;
      // Pulsing effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={meshRef}>
      {/* Sun core */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffaa00"
          emissiveIntensity={0.8}
          roughness={0.2}
          metalness={0.6}
        />
      </mesh>

      {/* Sun rays */}
      {Array.from({ length: 8 }, (_, i) => (
        <mesh
          key={i}
          rotation={[0, 0, (i * Math.PI) / 4]}
          position={[0, 0, 0]}
        >
          <boxGeometry args={[0.1, 0.4, 0.1]} />
          <meshStandardMaterial
            color="#ffd700"
            emissive="#ffaa00"
            emissiveIntensity={0.6}
          />
        </mesh>
      ))}

      {/* Glow effect */}
      <mesh scale={1.3}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#ffaa00"
          transparent
          opacity={0.3}
        />
      </mesh>
    </group>
  );
};

// Moon component for dark theme
const Moon: React.FC = () => {
  const meshRef = useRef<any>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3;
      // Gentle pulsing
      const scale = 1 + Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
      meshRef.current.scale.setScalar(scale);
    }
  });

  return (
    <group ref={meshRef}>
      {/* Moon core */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#e0e0e0"
          emissive="#b0b0b0"
          emissiveIntensity={0.3}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>

      {/* Moon craters */}
      <mesh position={[0.3, 0.2, 0.5]}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshStandardMaterial
          color="#c0c0c0"
          roughness={0.9}
        />
      </mesh>
      <mesh position={[-0.2, -0.3, 0.4]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshStandardMaterial
          color="#b8b8b8"
          roughness={0.9}
        />
      </mesh>
      <mesh position={[0.1, 0.4, -0.3]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color="#d0d0d0"
          roughness={0.9}
        />
      </mesh>

      {/* Moon glow */}
      <mesh scale={1.2}>
        <sphereGeometry args={[1, 16, 16]} />
        <meshBasicMaterial
          color="#b0b0ff"
          transparent
          opacity={0.2}
        />
      </mesh>

      {/* Stars around moon */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          position={[
            Math.cos((i * Math.PI * 2) / 6) * 1.8,
            Math.sin((i * Math.PI * 2) / 6) * 1.8,
            (Math.random() - 0.5) * 0.5
          ]}
        >
          <sphereGeometry args={[0.05, 4, 4]} />
          <meshBasicMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={1}
          />
        </mesh>
      ))}
    </group>
  );
};

const ThemeToggle3D: React.FC<ThemeToggle3DProps> = ({ isDark, onClick }) => {
  return (
    <Float
      speed={2}
      rotationIntensity={0.1}
      floatIntensity={0.2}
    >
      <PresentationControls
        global={false}
        rotation={[0, 0, 0]}
        polar={[-0.1, 0.1]}
        azimuth={[-0.1, 0.1]}
        config={{ mass: 1, tension: 100, friction: 20 }}
      >
        <group onClick={onClick}>
          {/* Theme icon */}
          {isDark ? <Sun /> : <Moon />}

          {/* Rotating ring */}
          <mesh scale={1.5}>
            <torusGeometry args={[1.2, 0.05, 16, 32]} />
            <meshStandardMaterial
              color={isDark ? "#ffd700" : "#b0b0ff"}
              emissive={isDark ? "#ffaa00" : "#8080ff"}
              emissiveIntensity={0.5}
              roughness={0.3}
              metalness={0.7}
            />
          </mesh>

          {/* Particles */}
          {Array.from({ length: 12 }, (_, i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i * Math.PI * 2) / 12) * 2,
                Math.sin((i * Math.PI * 2) / 12) * 2,
                (Math.random() - 0.5) * 0.5
              ]}
            >
              <sphereGeometry args={[0.03, 4, 4]} />
              <meshBasicMaterial
                color={isDark ? "#ffd700" : "#b0b0ff"}
                emissive={isDark ? "#ffaa00" : "#8080ff"}
                emissiveIntensity={0.8}
              />
            </mesh>
          ))}
        </group>
      </PresentationControls>
    </Float>
  );
};

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={`theme-toggle ${theme.isDark ? 'dark' : 'light'}`}
      onClick={toggleTheme}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        style={{
          width: '100%',
          height: '100%'
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <ThemeToggle3D isDark={theme.isDark} onClick={toggleTheme} />
      </Canvas>

      {/* Theme label */}
      <motion.div
        className="theme-label"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
        transition={{ duration: 0.2 }}
      >
        {theme.isDark ? 'Light Mode' : 'Dark Mode'}
      </motion.div>

      {/* Glowing border effect */}
      <motion.div
        className="theme-toggle-glow"
        animate={{
          opacity: isHovered ? [0.4, 0.8, 0.4] : 0,
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
        style={{
          borderColor: theme.isDark ? '#ffd700' : '#b0b0ff'
        }}
      />
    </motion.div>
  );
};

export default ThemeToggle;