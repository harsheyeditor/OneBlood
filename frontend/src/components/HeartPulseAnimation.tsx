import React from 'react';
import { motion } from 'framer-motion';
import './HeartPulseAnimation.css';

interface HeartPulseAnimationProps {
  size?: number;
  color?: string;
  isAnimating?: boolean;
}

export const HeartPulseAnimation: React.FC<HeartPulseAnimationProps> = ({
  size = 100,
  color = '#e91e63',
  isAnimating = true
}) => {
  return (
    <div className="heart-pulse-container" style={{ width: size, height: size }}>
      <motion.div
        className="heart-pulse"
        animate={isAnimating ? {
          scale: [1, 1.2, 1],
          opacity: [1, 0.8, 1],
        } : {}}
        transition={{
          duration: 1.5,
          repeat: isAnimating ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 100 100"
          className="heart-svg"
        >
          <motion.path
            d="M50,25 C40,10 20,10 20,30 C20,45 35,60 50,75 C65,60 80,45 80,30 C80,10 60,10 50,25 Z"
            fill={color}
            initial={{ pathLength: 0 }}
            animate={isAnimating ? {
              pathLength: [0, 1],
              fill: [color, '#ff6b9d', color]
            } : {}}
            transition={{
              duration: 2,
              repeat: isAnimating ? Infinity : 0,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
        </svg>

        {/* Pulse rings */}
        {isAnimating && (
          <>
            <motion.div
              className="pulse-ring pulse-ring-1"
              animate={{
                scale: [1, 2, 3],
                opacity: [0.6, 0.3, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut"
              }}
              style={{
                borderColor: color,
                width: size,
                height: size
              }}
            />
            <motion.div
              className="pulse-ring pulse-ring-2"
              animate={{
                scale: [1, 2, 3],
                opacity: [0.6, 0.3, 0]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeOut",
                delay: 0.5
              }}
              style={{
                borderColor: color,
                width: size,
                height: size
              }}
            />
          </>
        )}

        {/* Blood droplets */}
        {isAnimating && (
          <div className="blood-droplets">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                className="blood-droplet"
                animate={{
                  y: [0, 30, 60],
                  opacity: [1, 0.8, 0],
                  x: [0, (Math.random() - 0.5) * 20, (Math.random() - 0.5) * 30]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: i * 0.3,
                  ease: "easeIn"
                }}
                style={{
                  backgroundColor: color,
                  width: size * 0.08,
                  height: size * 0.12,
                  left: '50%',
                  top: '80%',
                  marginLeft: -size * 0.04
                }}
              />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
};

// Blood bag filling animation component
export const BloodBagFillingAnimation: React.FC<{
  size?: number;
  fillLevel?: number;
  isAnimating?: boolean;
}> = ({
  size = 120,
  fillLevel = 0,
  isAnimating = true
}) => {
  return (
    <div className="blood-bag-container" style={{ width: size, height: size * 1.5 }}>
      <svg
        width={size}
        height={size * 1.5}
        viewBox="0 0 100 150"
        className="blood-bag-svg"
      >
        {/* Bag outline */}
        <path
          d="M25,30 Q25,20 35,20 L65,20 Q75,20 75,30 L75,100 Q75,130 50,130 Q25,130 25,100 Z"
          fill="none"
          stroke="#333"
          strokeWidth="2"
        />

        {/* Blood fill */}
        <motion.path
          d="M30,35 Q30,25 38,25 L62,25 Q70,25 70,35 L70,95 Q70,120 50,120 Q30,120 30,95 Z"
          fill="#e91e63"
          initial={{ pathLength: 0 }}
          animate={isAnimating ? {
            pathLength: [0, fillLevel / 100]
          } : {
            pathLength: fillLevel / 100
          }}
          transition={{
            duration: 3,
            ease: "easeInOut"
          }}
        />

        {/* Tube */}
        <rect x="45" y="130" width="10" height="15" fill="#ddd" stroke="#333" strokeWidth="1" />
        <rect x="42" y="145" width="16" height="5" fill="#ddd" stroke="#333" strokeWidth="1" />

        {/* Label */}
        <text x="50" y="60" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold">
          BLOOD
        </text>
      </svg>

      {/* Filling bubbles */}
      {isAnimating && fillLevel > 0 && (
        <div className="filling-bubbles">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={i}
              className="bubble"
              animate={{
                y: [150, 20],
                opacity: [0, 1, 0],
                x: [30 + Math.random() * 40, 30 + Math.random() * 40, 30 + Math.random() * 40]
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeOut"
              }}
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                backgroundColor: '#ff6b9d',
                position: 'absolute'
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HeartPulseAnimation;