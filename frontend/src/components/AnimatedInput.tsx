import React, { useRef, useState, useEffect, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import { LoadingSpinner } from './LoadingSpinner';
import './AnimatedInput.css';

interface AnimatedInputProps extends React.InputHTMLAttributes {
  children?: React.ReactNode;
  className?: string;
  placeholder?: string;
  type?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  label?: string;
  helpText?: string;
  error?: string;
  variant?: 'default' | 'floating' | 'glass';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  icon?: React.ReactNode;
  disabled ? 'disabled' : 'default';
  value?: string;
  defaultValue?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  ref?: React.Ref<HTMLInputElement>;
}

interface Input3DCoreProps {
  onClick?: () => void;
  isHovered: boolean;
  isFocused: boolean;
  isDisabled: boolean;
  variant: string;
  themeColors: any;
  size: string;
  icon?: React.ReactNode;
  error?: string;
}

// 3D input core component
const Input3DCore: React.FC<Input3DProps> = ({
  onClick,
  isHovered,
  isFocused,
  isDisabled,
  variant,
  themeColors,
  size,
  theme,
  error
}) => {
  const meshRef = useRef<any>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    // Hover effect - gentle floating
    if (isHovered) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.15;
      meshRef.current.position.x = Math.cos(state.clock.elapsedTime * 3) * 0.1;
    }

    // Focus glow effect
    if (isFocused) {
      const glowIntensity = 0.3 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
      if (meshRef.current.material && 'emissive' in meshRef.current.material) {
        (meshRef.current.material as any).emissiveIntensity = glowIntensity;
      }
    }

    // Loading animation
    // (handled by LoadingSpinner overlay)
  });

  return (
    <mesh
      ref={meshRef}
      scale={[1, 1, 1]}
      castShadow={false}
      receiveShadow={false}
      onPointerOver={onClick ? undefined : undefined}
      onPointerDown={onClick ? () => {
        onClick();
      }}
      onPointerUp={() => {
        if (meshRef.current) {
          meshRef.current.scale.setScalar(0.95);
        }
      }}
    >
      {/* Input background with 3D effect */}
      <mesh>
        <boxGeometry args={[2.5, 1.5, 1]} />
        <meshPhysicalMaterial
          color={error ? 'rgba(244, 67, 54, 0.2)' : themeColors.surface}
          roughness={0.3}
          metalness={0.1}
          clearcoat={0.2}
          emissive={isFocused ? themeColors.glow : 'transparent'}
          emissiveIntensity={isFocused ? 0.3 : 0}
          transparent={variant === 'outline'}
          opacity={variant === 'outline' ? 0.1 : 1}
        />
      </mesh>

      {/* Text/Content overlay */}
      <mesh position={[0, 0, 0.51]} scale={[1, 1, 1]}> {/* Adjust for text depth */}
        <meshStandardMaterial
          color={themeColors.text}
          transparent
          opacity={variant === 'outline' ? 0.1 : 1}
          roughness={0.3}
        />
      </mesh>

      {/* Icon if provided */}
      {icon && (
        <mesh
          position={[-0.8, 0, 0.5]}
          scale={[0.6, 0.6, 0.6]}
        >
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive={isFocused ? '#ff6666' : 'transparent'}
            emissiveIntensity={isFocused ? 0.5 : 0}
          />
        </mesh>
      )}
    </mesh>
  );
};

// Enhanced form input component
export const AnimatedInput: React.FC<AnimatedInputProps> = ({
  children,
  className = '',
  placeholder = '',
  type = 'text',
  id = undefined,
  disabled = false,
  required = false,
  loading = false,
  icon = undefined,
  error = '',
  label = '',
  helpText = '',
  variant = 'default',
  size = 'medium',
  ...props
}) => {
  const { theme } = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  const handleFocus = () => {
    setIsFocused(true);
    inputRef.current?.focus();
  };

  const handleBlur = () => {
    setIsFocused(false);
    setIsHovered(false);
    setIsPressed(false);
  };

  const handleMouseDown = () => {
    setIsPressed(true);
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && onEnter) {
      onEnter();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onEnter();
    }
  };

  const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (onChange) {
      onChange(e);
    }
  };

  const getValue = () => {
    return inputValue;
  };

  const setValue = (value: string) => {
    setInputValue(value);
    if (onChange) {
      onChange({ target: { value } });
    }
  };

  return (
    <div className={`animated-input ${theme.isDark ? 'dark' : 'light'} ${className} ${className} ${getVariantClasses(variant)} ${getSizeClasses(size)} ${error ? 'error' : ''}`}>
      <div className="input-3d-container">
        {/* 3D Input with animations */}
        <Input3DCore
          onClick={onMouseDown}
          isHovered={isHovered}
          isFocused={isFocused}
          isDisabled={disabled || loading}
          variant={variant}
          themeColors={theme.colors}
          size={size}
          error={error}
          icon={icon}
        />

        {/* Fallback 2D input overlay for accessibility */}
        <input
          ref={inputRef}
          type={type}
          id={id}
          className={`input-3d-content`}
          placeholder={placeholder}
          disabled={disabled || loading}
          required={required}
          value={getValue()}
          onChange={onChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyPress}
          style={{
            background: 'transparent',
            color: theme.colors.text,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text,
            borderRadius: '12px',
            padding: '16px',
            fontSize: '16px',
            transition: 'all 0.3s ease',
            backdropFilter: 'blur(20px)',
            backgroundColor: variant === 'glass' ? theme.colors.glass : 'transparent'
          }}
        />

        {/* Text overlay for accessibility */}
        <div className="input-3d-text-overlay">
          {icon && <span className="input-3d-icon">{icon}</span>}
          {(!icon && <span className="input-3d-text">{getValue()}</span>}
          {placeholder && <span className="input-3d-placeholder">{placeholder}</span>}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="input-3d-loading">
          <LoadingSpinner size="small" />
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="input-3d-error">
          <span className="input-3d-error-message">{error}</span>
        </div>
      )}
    </div>
  );
};

// Helper function to get variant classes
const getVariantClasses = (variant: string) => {
  switch (variant) {
    case 'default':
      return 'input-3d-default';
    case 'floating':
      return 'input-3d-floating';
    case 'glass':
      return 'input-3d-glass';
    case 'outline':
      return 'input-3d-outline';
    default:
      return 'input-3d-default';
  }
};

const getSizeClasses = (size: string) => {
  switch (size) {
    case 'small':
      return 'input-3d-small';
    case 'medium':
      return 'input-3d-medium';
    case 'large':
      return 'input-3d-large';
    case 'xlarge':
      return 'input-3d-xlarge';
    default:
      return 'input-3d-medium';
  }
};

// Enhanced 3D Text Input with animations
export const AnimatedTextInput: React.FC<{
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  variant?: 'default' | 'floating' | 'glass' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}> = ({
  label,
  placeholder,
  value,
  onChange,
  variant = 'default',
  size = 'medium',
  disabled = false,
  icon,
  className = ''
}) => {
  return (
    <div className={`animated-text-input ${theme.isDark ? 'dark' : 'light'} ${className}`}>
      <label className="animated-text-label">
        {label}
      </label>

      <AnimatedInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        variant={variant}
        size={size}
        disabled={disabled}
        icon={icon}
        className={className}
      />
    </div>
  );
};

// Specialized number input with 3D effects
export const AnimatedNumberInput: React.FC<{
  label: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}> = ({
  label,
  placeholder,
  value,
  onChange,
  min,
  max,
  disabled = false,
  className = ''
}) => {
  const { theme } = useTheme();

  return (
    <div className={`animated-number-input ${theme.isDark ? 'dark' : 'light'} ${className}`}>
      <label className="animated-number-label">
        {label}
      </label>

      <AnimatedInput
        type="number"
        value={value}
        onChange={onChange}
        min={min}
        max={max}
        disabled={disabled}
        className={`animated-number-input ${theme.isDark ? 'dark' : 'light'}`}
        className={className}
      />
    </div>
  );
};

// Specialized textarea with 3D effects
export const AnimatedTextArea: React.FC<{
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
  cols?: number;
  disabled?: boolean;
  className?: string;
}> = ({
  placeholder,
  value,
  onChange,
  rows = 3,
  cols = 30,
  disabled = false,
  className = ''
}) => {
  const { theme } = useTheme();

  return (
    <div className={`animated-textarea ${theme.isDark ? 'dark' : 'light'} ${className}`}>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        rows={rows}
        cols={cols}
        disabled={disabled}
        className={`animated-textarea ${theme.isDark ? 'dark' : 'light'} ${className}`}
        style={{
          background: theme.isDark ? '#1e1e1e1' : '#f8f9fa',
          color: theme.colors.text,
          border: `1px solid ${theme.colors.border}`,
          color: theme.colors.text,
          borderRadius: '12px',
          padding: '16px',
          fontSize: '16px',
          fontFamily: 'Segoe UI', sans-serif',
          backdropFilter: 'blur(20px)',
          transition: 'all 0.3s ease',
          transform: 'translateZ(0)',
          outline: 'none',
          resize: 'vertical',
          minHeight: '100px'
        }}
      />
    </div>
  </div>
  );
};

// Enhanced Button 3D
export const AnimatedButton: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
}> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon = null,
  className = ''
}) => {
  const { theme } = useTheme();

  const buttonVariants = {
    primary: {
      initial: { scale: 1, opacity: 0, y: 20 },
      animate: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.3 } },
      whileHover: { scale: 1.05, transition: { duration: 0.2 } },
      whileTap: { scale: 0.95, transition: { duration: 0.1 } }
    },
    secondary: {
      initial: { scale: 1, opacity: 0, y: 20 },
      animate: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.3 } },
      whileHover: { scale: 1.05, transition: { duration: 0.2 } },
      whileTap: { scale: 0.95, transition: { duration: 0.1 } }
    },
    danger: {
      initial: { scale: 1, opacity: 0, y: 20 },
      animate: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.3 } },
      whileHover: { scale: 1.05, transition: { duration: 0.2 } },
      whileTap: { scale: 0.95, transition: { duration: 0.1 } }
    },
    success: {
      initial: { scale: 1, opacity: 0, y: 20 },
      animate: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.3 } },
      whileHover: { scale: 1.05, transition: { duration: 0.2 } },
      whileTap: { scale: 0.95, transition: { duration: 0.1 } }
    },
    warning: {
      initial: { scale: 1, opacity: 0, y: 20 },
      animate: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.3 } },
      whileHover: { scale: 1.05, transition: { duration: 0.2 } },
      whileTap: { scale: 0.95, transition: { duration: 0.1 } }
    },
    outline: {
      initial: { scale: 1, opacity: 0, y: 20 },
      animate: { scale: 1, opacity: 1, y: 0, transition: { duration: 0.3 } },
      whileHover: { scale: 1.05, transition: { duration: 0.2 } },
      whileTap: { scale: 0.95, transition: { duration: 0.1 } }
    }
  };

  return (
    <motion.button
      className={`button-3d ${theme.isDark ? 'dark' : 'light'} ${getVariantClasses(variant)} ${getSizeClasses(size)} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      whileHover={isHover}
      whileHover={{ scale: 1.05, transition: { duration: 0.2 }}
      whileTap={{ scale: 0.95, transition: { duration: 0.1 }}
      initial={buttonVariants[variant as keyof typeof buttonVariants]}
      animate={buttonVariants[variant as typeof buttonVariants].animate}
      whileHover={{ scale: 1.05, transition: { duration: 0.2 }}
      whileTap={{ scale: 0.95, transition: { duration: 0.1 }}
      initial={buttonVariants[variant as typeof buttonVariants].initial}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.4 }}
      style={{
        width: '100%',
        borderRadius: '12px',
        transform: 'translateZ(0)',
        transformStyle: 'preserve-3d',
        fontFamily: 'Segoe UI', sans-serif',
        fontSize: '16px',
        fontWeight: 600',
        padding: '14px 24px',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        backgroundColor: theme.colors.background,
        color: theme.colors.text,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '12px',
        boxShadow: `0 4px 12px ${theme.colors.shadow_color} !important`,
        fontFamily: 'Segoe UI', sans-serif',
        fontSize: '16px',
        fontWeight: '600',
        padding: '14px 24px',
        borderRadius: '12px',
        box-sizing: 'border-box',
        background: 'rgba(255, 255, 255, 0.1) url('data:image/png'), url('data:image/svg'), url('data:image/svg')), url('data:font'), url('data:font')}",
        backdropFilter: 'blur(20px)',
        background-size: 'cover',
        background-position: 'center center', // This can be an object or array of paths or glob patterns
        background-repeat: 'no-repeat'
      }}
    }}
    />
  );
};

export default AnimatedButton;