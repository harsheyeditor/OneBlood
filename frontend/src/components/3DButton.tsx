import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, PresentationControls } from '@react-three/drei';
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import './3DButton.css';

interface Button3DProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'outline';
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
}

// 3D button core component
const Button3DCore: React.FC<{
  onClick: () => void;
  isHovered: boolean;
  isPressed: boolean;
  isDisabled: boolean;
  variant: string;
  themeColors: any;
  children: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ onClick, isHovered, isPressed, isDisabled, variant, themeColors, children, icon }) => {
  const buttonRef = useRef<any>(null);

  useFrame((state) => {
    if (buttonRef.current) {
      const time = state.clock.elapsedTime;

      // Hover effect - gentle floating
      if (isHovered && !isDisabled) {
        buttonRef.current.position.y = Math.sin(time * 2) * 0.1;
        buttonRef.current.rotation.x = Math.sin(time * 1.5) * 0.05;
        buttonRef.current.rotation.z = Math.sin(time * 1.8) * 0.02;
      }

      // Pressed effect
      if (isPressed) {
        const pressScale = 0.95 + Math.sin(time * 10) * 0.02;
        buttonRef.current.scale.setScalar(pressScale);
      } else {
        buttonRef.current.scale.setScalar(1);
      }

      // Idle animation - very subtle breathing
      if (!isHovered && !isPressed) {
        const breathe = 1 + Math.sin(time * 0.5) * 0.02;
        buttonRef.current.scale.setScalar(breathe);
      }
    }
  });

  const getButtonColors = () => {
    const colors = {
      primary: {
        main: theme.colors.primary,
        hover: theme.colors.secondary,
        disabled: theme.colors.textSecondary,
        glow: theme.colors.primary
      },
      secondary: {
        main: theme.colors.surface,
        hover: theme.colors.background,
        disabled: theme.colors.textSecondary,
        glow: theme.colors.text
      },
      danger: {
        main: '#d32f2f',
        hover: '#f44336',
        disabled: theme.colors.textSecondary,
        glow: '#ff6b6b'
      },
      success: {
        main: '#4caf50',
        hover: '#66bb6a',
        disabled: theme.colors.textSecondary,
        glow: '#81c784'
      },
      outline: {
        main: 'transparent',
        hover: theme.colors.background,
        disabled: theme.colors.textSecondary,
        glow: theme.colors.text
      }
    };

    return colors[variant as keyof typeof colors] || colors.primary;
  };

  const colors = getButtonColors();

  return (
    <group ref={buttonRef}>
      {/* Button background with depth */}
      <mesh>
        <boxGeometry args={[3, 1.5, 0.8]} />
        <meshPhysicalMaterial
          color={isDisabled ? colors.disabled : colors.main}
          transparent={variant === 'outline'}
          opacity={variant === 'outline' ? 0.8 : 1}
          roughness={0.3}
          metalness={0.2}
          clearcoat={0.3}
          clearcoatRoughness={0.2}
          emissive={isHovered ? colors.glow : 'transparent'}
          emissiveIntensity={isHovered ? 0.2 : 0}
        />
      </mesh>

      {/* Top surface for text */}
      <mesh position={[0, 0, 0.41]}>
        <boxGeometry args={[3, 1.5, 0.01]} />
        <meshPhysicalMaterial
          color={isDisabled ? colors.disabled : colors.main}
          transparent={variant === 'outline'}
          opacity={variant === 'outline' ? 0.3 : 1}
          roughness={0.1}
          metalness={0.8}
          clearcoat={0.8}
        />
      </mesh>

      {/* Glow effect when hovered */}
      {isHovered && !isDisabled && (
        <mesh position={[0, 0, 0]} scale={1.1}>
          <boxGeometry args={[3.1, 1.6, 0.9]} />
          <meshBasicMaterial
            color={colors.glow}
            transparent
            opacity={0.3}
          />
        </mesh>
      )}

      {/* Click ripple effect */}
      {isPressed && (
        <mesh position={[0, 0, 0.5]} scale={0.8}>
          <ringGeometry args={[1, 2, 32]} />
          <meshBasicMaterial
            color={colors.glow}
            transparent
            opacity={0.6}
            side={2}
          />
        </mesh>
      )}

      {/* Icon if provided */}
      {icon && (
        <mesh position={[-0.8, 0, 0.5]} scale={0.3}>
          <boxGeometry args={[1, 1, 1]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      )}
    </group>
  );
};

export const Button3D: React.FC<Button3DProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  className = ''
}) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const getSizeClass = () => {
    const sizes = {
      small: 'button-3d-small',
      medium: 'button-3d-medium',
      large: 'button-3d-large',
      xlarge: 'button-3d-xlarge'
    };
    return sizes[size] || sizes.medium;
  };

  const getVariantClass = () => {
    return `button-3d-${variant}`;
  };

  return (
    <motion.button
      className={`button-3d ${getSizeClass()} ${getVariantClass()} ${className} ${
        disabled ? 'disabled' : ''
      } ${fullWidth ? 'full-width' : ''} ${theme.isDark ? 'dark' : 'light'}`}
      onClick={onClick}
      disabled={disabled || loading}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* 3D Canvas for the button */}
      <div className="button-3d-canvas">
        <Canvas
          camera={{ position: [0, 0, 5], fov: 50 }}
          style={{
            width: '100%',
            height: '60px'
          }}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1} />
          <Button3DCore
            onClick={onClick || (() => {})}
            isHovered={isHovered}
            isPressed={isPressed}
            isDisabled={disabled}
            variant={variant}
            themeColors={theme}
          >
            {icon}
            {children}
          </Button3DCore>
        </Canvas>
      </div>

      {/* Loading spinner overlay */}
      {loading && (
        <motion.div
          className="button-3d-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="spinner-3d" />
        </motion.div>
      )}

      {/* Button content (fallback for non-3D mode) */}
      <div className="button-3d-content">
        {icon && <span className="button-3d-icon">{icon}</span>}
        <span className="button-3d-text">{children}</span>
      </div>
    </motion.button>
  );
};

// Specialized button variants
export const EmergencyButton3D: React.FC<Omit<Button3DProps, 'variant'>> = (props) => (
  <Button3D {...props} variant="primary" size="xlarge" />
);

export const SecondaryButton3D: React.FC<Omit<Button3DProps, 'variant'>> = (props) => (
  <Button3D {...props} variant="secondary" size="large" />
);

export const DangerButton3D: React.FC<Omit<Button3DProps, 'variant'>> = (props) => (
  <Button3D {...props} variant="danger" />
);

export const SuccessButton3D: React.FC<Omit<Button3DProps, 'variant'>> = (props) => (
  <Button3D {...props} variant="success" />
);

export const OutlineButton3D: React.FC<Omit<Button3DProps, 'variant'>> = (props) => (
  <Button3D {...props} variant="outline" />
);

export default Button3D;