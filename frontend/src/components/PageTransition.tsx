import React, { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';
import './PageTransition.css';

interface PageTransitionProps {
  children: ReactNode;
  isEntering?: boolean;
  direction?: 'left' | 'right' | 'up' | 'down' | 'center' | 'scale';
  duration?: number;
}

const pageVariants = {
  enter: (direction: string) => ({
    opacity: 0,
    ...(direction === 'left' && { x: -100, scale: 0.8 }),
    ...(direction === 'right' && { x: 100, scale: 0.8 }),
    ...(direction === 'up' && { y: -100, scale: 0.8 }),
    ...(direction === 'down' && { y: 100, scale: 0.8 }),
    ...(direction === 'center' && { scale: 0.8, opacity: 0 }),
    ...(direction === 'scale' && { scale: 0, opacity: 0 })
  }),
  center: {
    opacity: 1,
    x: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: [0.25, 0.1, 0.25, 1],
      opacity: { duration: 0.4 },
      scale: { duration: 0.5 }
    }
  },
  exit: (direction: string) => ({
    opacity: 0,
    ...(direction === 'left' && { x: 100, scale: 0.8 }),
    ...(direction === 'right' && { x: -100, scale: 0.8 }),
    ...(direction === 'up' && { y: 100, scale: 0.8 }),
    ...(direction === 'down' && { y: -100, scale: 0.8 }),
    ...(direction === 'center' && { scale: 0.8, opacity: 0 }),
    ...(direction === 'scale' && { scale: 0, opacity: 0 }),
    transition: {
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1],
      opacity: { duration: 0.3 },
      scale: { duration: 0.4 }
    }
  })
};

export const PageTransition: React.FC<PageTransitionProps> = ({
  children,
  isEntering = true,
  direction = 'center',
  duration = 0.5
}) => {
  const { theme } = useTheme();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        className={`page-transition ${theme.isDark ? 'dark' : 'light'}`}
        initial="enter"
        animate="center"
        exit="exit"
        custom={direction}
        variants={pageVariants}
        transition={{
          duration,
          ease: "easeInOut"
        }}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%'
        }}
      >
        {/* Transition particles effect */}
        {isEntering && (
          <div className="transition-particles">
            {Array.from({ length: 12 }, (_, i) => (
              <motion.div
                key={i}
                className="transition-particle"
                initial={{
                  scale: 0,
                  opacity: 0,
                  x: '50%',
                  y: '50%'
                }}
                animate={{
                  scale: [0, 1.5, 1],
                  opacity: [0, 1, 0],
                  x: [
                    '50%',
                    `${50 + Math.cos((i * Math.PI * 2) / 12) * 30}%`,
                    `${50 + Math.cos((i * Math.PI * 2) / 12) * 60}%`
                  ],
                  y: [
                    '50%',
                    `${50 + Math.sin((i * Math.PI * 2) / 12) * 30}%`,
                    `${50 + Math.sin((i * Math.PI * 2) / 12) * 60}%`
                  ]
                }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.1,
                  ease: "easeOut"
                }}
                style={{
                  backgroundColor: theme.isDark ? '#ff6666' : '#ff9999',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  position: 'absolute',
                  transform: 'translate(-50%, -50%)',
                  boxShadow: `0 0 10px ${theme.isDark ? '#ff6666' : '#ff9999'}`
                }}
              />
            ))}
          </div>
        )}

        {/* Page content */}
        <div className="page-content">
          {children}
        </div>

        {/* Overlay effect */}
        <motion.div
          className="transition-overlay"
          initial={{ opacity: 0.8 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0.8 }}
          transition={{ duration: 0.8 }}
          style={{
            background: theme.isDark
              ? 'radial-gradient(circle, rgba(255, 102, 102, 0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(255, 153, 153, 0.2) 0%, transparent 70%)'
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
};

// Specific transition types
export const FadeInTransition: React.FC<{ children: ReactNode }> = ({ children }) => (
  <PageTransition direction="center" duration={0.3}>
    {children}
  </PageTransition>
);

export const SlideTransition: React.FC<{
  children: ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
}> = ({ children, direction = 'right' }) => (
  <PageTransition direction={direction} duration={0.4}>
    {children}
  </PageTransition>
);

export const ScaleTransition: React.FC<{ children: ReactNode }> = ({ children }) => (
  <PageTransition direction="scale" duration={0.4}>
    {children}
  </PageTransition>
);

export const VerticalTransition: React.FC<{
  children: ReactNode;
  direction?: 'up' | 'down';
}> = ({ children, direction = 'up' }) => (
  <PageTransition direction={direction} duration={0.5}>
    {children}
  </PageTransition>
);

// Loading transition with skeleton effect
export const LoadingTransition: React.FC<{
  children: ReactNode;
  isLoading?: boolean;
}> = ({ children, isLoading = true }) => {
  const { theme } = useTheme();

  if (isLoading) {
    return (
      <motion.div
        className={`loading-transition ${theme.isDark ? 'dark' : 'light'}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'relative',
          width: '100%',
          height: '100%'
        }}
      >
        {/* Skeleton loading effect */}
        <div className="skeleton-container">
          {Array.from({ length: 5 }, (_, i) => (
            <motion.div
              key={i}
              className="skeleton-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: i * 0.1,
                duration: 0.5
              }}
              style={{
                background: theme.isDark
                  ? 'linear-gradient(90deg, rgba(255, 255, 255, 0.1) 25%, rgba(255, 255, 255, 0.05) 50%, rgba(255, 255, 255, 0.1) 75%)'
                  : 'linear-gradient(90deg, rgba(0, 0, 0, 0.1) 25%, rgba(0, 0, 0, 0.05) 50%, rgba(0, 0, 0, 0.1) 75%)',
                height: '20px',
                marginBottom: '15px',
                borderRadius: '10px',
                animation: `shimmer 2s infinite ${i * 0.2}s`
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <FadeInTransition>
      {children}
    </FadeInTransition>
  );
};

export default PageTransition;