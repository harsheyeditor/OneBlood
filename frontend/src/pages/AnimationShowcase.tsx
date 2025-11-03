import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BloodDrop3D } from '../components/BloodDrop3D';
import { HeartPulseAnimation, BloodBagFillingAnimation } from '../components/HeartPulseAnimation';
import { RequestHeatmap } from '../components/RequestHeatmap';
import './AnimationShowcase.css';

const AnimationShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'3d' | 'lottie' | 'canvas'>('3d');
  const [isAnimating, setIsAnimating] = useState(true);
  const [bloodBagFill, setBloodBagFill] = useState(0);

  // Sample data for heatmap
  const sampleRequests = [
    {
      id: '1',
      lat: 28.6139,
      lng: 77.2090,
      urgency: 'critical' as const,
      timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      requesterName: 'John Doe',
      bloodType: 'O+'
    },
    {
      id: '2',
      lat: 28.6239,
      lng: 77.2190,
      urgency: 'urgent' as const,
      timestamp: Date.now() - 1000 * 60 * 15, // 15 minutes ago
      requesterName: 'Jane Smith',
      bloodType: 'A+'
    },
    {
      id: '3',
      lat: 28.6039,
      lng: 77.1990,
      urgency: 'normal' as const,
      timestamp: Date.now() - 1000 * 60 * 25, // 25 minutes ago
      requesterName: 'Bob Johnson',
      bloodType: 'B-'
    }
  ];

  // Simulate blood bag filling
  React.useEffect(() => {
    const interval = setInterval(() => {
      setBloodBagFill(prev => (prev >= 100 ? 0 : prev + 5));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const tabs = [
    { id: '3d', label: '3D Blood Drop', icon: '🩸' },
    { id: 'lottie', label: 'Lottie Animations', icon: '💝' },
    { id: 'canvas', label: 'Canvas Heatmap', icon: '🗺️' }
  ];

  return (
    <div className="animation-showcase">
      <div className="showcase-header">
        <h1>OneBlood Animation Showcase</h1>
        <p>Advanced visualizations for blood donation platform</p>
      </div>

      <div className="tab-navigation">
        {tabs.map(tab => (
          <motion.button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id as any)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="animation-controls">
        <motion.button
          className={`control-btn ${isAnimating ? 'active' : ''}`}
          onClick={() => setIsAnimating(!isAnimating)}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {isAnimating ? '⏸️ Pause' : '▶️ Play'} Animations
        </motion.button>
      </div>

      <motion.div
        className="animation-content"
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 3D Blood Drop Animation */}
        {activeTab === '3d' && (
          <div className="animation-section">
            <h2>3D Blood Drop with React Three Fiber</h2>
            <p>Interactive 3D blood drop with floating droplets, glow effects, and click animations</p>

            <div className="animation-demo">
              <div className="canvas-wrapper">
                <BloodDrop3D
                  isAnimating={isAnimating}
                  showFloatingDrops={true}
                  pulseIntensity={0.4}
                />
              </div>

              <div className="animation-info">
                <h3>Features:</h3>
                <ul>
                  <li>🎯 Interactive click handling</li>
                  <li>✨ Multiple harmonic pulsing animations</li>
                  <li>🫧 8 floating blood droplets with orbital motion</li>
                  <li>💫 Multi-layer glow effects</li>
                  <li>🌟 Dynamic lighting and shadows</li>
                  <li>🔄 Complex rotation patterns</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Lottie Animations */}
        {activeTab === 'lottie' && (
          <div className="animation-section">
            <h2>Lottie SVG Animations</h2>
            <p>Heart pulse and blood bag filling animations using SVG and Framer Motion</p>

            <div className="lottie-showcase">
              <div className="lottie-item">
                <h3>Heart Pulse Animation</h3>
                <div className="animation-wrapper">
                  <HeartPulseAnimation
                    size={120}
                    isAnimating={isAnimating}
                    color="#e91e63"
                  />
                </div>
                <p>Pulsing heart with blood droplets and ring effects</p>
              </div>

              <div className="lottie-item">
                <h3>Blood Bag Filling</h3>
                <div className="animation-wrapper">
                  <BloodBagFillingAnimation
                    size={100}
                    fillLevel={bloodBagFill}
                    isAnimating={isAnimating}
                  />
                </div>
                <p>Dynamic blood bag with filling animation (0-100%)</p>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Heatmap */}
        {activeTab === 'canvas' && (
          <div className="animation-section">
            <h2>Canvas-based Request Heatmap</h2>
            <p>Real-time visualization of blood requests with urgency-based coloring</p>

            <div className="heatmap-demo">
              <RequestHeatmap
                requests={sampleRequests}
                center={{ lat: 28.6139, lng: 77.2090 }}
                zoom={13}
                width={600}
                height={400}
                interactive={true}
                onRequestClick={(request) => {
                  alert(`Clicked request: ${request.requesterName} - ${request.urgency}`);
                }}
              />

              <div className="heatmap-features">
                <h3>Heatmap Features:</h3>
                <ul>
                  <li>🗺️ Real-time request density visualization</li>
                  <li>🎨 Urgency-based color coding (Red/Orange/Green)</li>
                  <li>⏰ Time-based opacity decay (30-minute window)</li>
                  <li>🖱️ Interactive hover tooltips</li>
                  <li>📊 Live statistics overlay</li>
                  <li>✨ Animated pulsing request points</li>
                  <li>🌐 Geographic coordinate conversion</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <div className="showcase-footer">
        <div className="tech-stack">
          <h3>Technologies Used:</h3>
          <div className="tech-tags">
            <span className="tech-tag">React Three Fiber</span>
            <span className="tech-tag">Framer Motion</span>
            <span className="tech-tag">Canvas API</span>
            <span className="tech-tag">SVG Animations</span>
            <span className="tech-tag">TypeScript</span>
            <span className="tech-tag">WebGL</span>
          </div>
        </div>

        <div className="performance-info">
          <h3>Performance Optimized:</h3>
          <ul>
            <li>🚀 60fps animations on mobile devices</li>
            <li>⚡ Lightweight rendering with RAF optimization</li>
            <li>📱 PWA-ready for offline functionality</li>
            <li>♿ Accessibility-compliant with reduced motion support</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnimationShowcase;