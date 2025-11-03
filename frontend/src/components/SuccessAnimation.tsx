import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import Lottie from 'react-lottie-player';
import successAnimationData from '../assets/animations/success.json';
import './SuccessAnimation.css';

interface SuccessAnimationProps {
  onComplete?: () => void;
  size?: number;
  autoPlay?: boolean;
}

export const SuccessAnimation: React.FC<SuccessAnimationProps> = ({
  onComplete,
  size = 200,
  autoPlay = true
}) => {
  const animationRef = useRef<any>(null);

  useEffect(() => {
    if (animationRef.current && autoPlay) {
      animationRef.current.play();
    }
  }, [autoPlay]);

  const handleAnimationComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <motion.div
      className="success-animation"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 20,
        delay: 0.1
      }}
    >
      <Lottie
        ref={animationRef}
        animationData={successAnimationData}
        style={{ width: size, height: size }}
        loop={false}
        onComplete={handleAnimationComplete}
      />

      {/* Floating checkmark overlay */}
      <motion.div
        className="success-checkmark"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{
          type: "spring",
          stiffness: 200,
          damping: 15,
          delay: 0.3
        }}
      >
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
          <motion.path
            d="M20 6L9 17l-5-5"
            stroke="#4caf50"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{
              duration: 0.5,
              delay: 0.5,
              ease: "easeInOut"
            }}
          />
        </svg>
      </motion.div>

      {/* Particle effects */}
      <div className="success-particles">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="particle"
            initial={{
              scale: 0,
              x: 0,
              y: 0,
              opacity: 1
            }}
            animate={{
              scale: [0, 1, 0],
              x: Math.cos((i * 60) * Math.PI / 180) * 100,
              y: Math.sin((i * 60) * Math.PI / 180) * 100,
              opacity: [1, 1, 0]
            }}
            transition={{
              duration: 1,
              delay: 0.6 + i * 0.1,
              ease: "easeOut"
            }}
            style={{
              backgroundColor: ['#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800'][i]
            }}
          />
        ))}
      </div>

      {/* Success ring animation */}
      <motion.div
        className="success-ring"
        initial={{ scale: 0, opacity: 0.8 }}
        animate={{ scale: 2, opacity: 0 }}
        transition={{
          duration: 1,
          delay: 0.4,
          ease: "easeOut"
        }}
      />
    </motion.div>
  );
};

export default SuccessAnimation;