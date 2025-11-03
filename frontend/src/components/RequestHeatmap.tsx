import React, { useRef, useEffect, useState, useCallback } from 'react';
import './RequestHeatmap.css';

interface RequestPoint {
  id: string;
  lat: number;
  lng: number;
  urgency: 'critical' | 'urgent' | 'normal';
  timestamp: number;
  requesterName?: string;
  bloodType?: string;
}

interface RequestHeatmapProps {
  requests: RequestPoint[];
  center: { lat: number; lng: number };
  zoom: number;
  width?: number;
  height?: number;
  interactive?: boolean;
  onRequestClick?: (request: RequestPoint) => void;
}

export const RequestHeatmap: React.FC<RequestHeatmapProps> = ({
  requests,
  center,
  zoom,
  width = 800,
  height = 600,
  interactive = true,
  onRequestClick
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredRequest, setHoveredRequest] = useState<RequestPoint | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const animationFrameRef = useRef<number>();

  // Convert lat/lng to canvas coordinates
  const latLngToCanvas = useCallback((lat: number, lng: number) => {
    // Simple equirectangular projection
    const x = ((lng - center.lng) * Math.cos(center.lat * Math.PI / 180) * 100000) / zoom + width / 2;
    const y = ((center.lat - lat) * 111000) / zoom + height / 2;
    return { x, y };
  }, [center, zoom, width, height]);

  // Convert canvas coordinates to lat/lng
  const canvasToLatLng = useCallback((x: number, y: number) => {
    const lng = center.lng + ((x - width / 2) * zoom) / (Math.cos(center.lat * Math.PI / 180) * 100000);
    const lat = center.lat - ((y - height / 2) * zoom) / 111000;
    return { lat, lng };
  }, [center, zoom, width, height]);

  // Get color based on urgency
  const getUrgencyColor = useCallback((urgency: string, opacity: number = 1) => {
    const colors = {
      critical: `rgba(211, 47, 47, ${opacity})`,     // Red
      urgent: `rgba(245, 124, 0, ${opacity})`,         // Orange
      normal: `rgba(56, 142, 60, ${opacity})`          // Green
    };
    return colors[urgency as keyof typeof colors] || colors.normal;
  }, []);

  // Draw heatmap gradient
  const drawHeatmapGradient = useCallback((ctx: CanvasRenderingContext2D, requests: RequestPoint[]) => {
    const now = Date.now();
    const timeDecay = 30 * 60 * 1000; // 30 minutes decay

    requests.forEach(request => {
      const age = now - request.timestamp;
      const opacity = Math.max(0, 1 - (age / timeDecay)) * 0.6;

      if (opacity <= 0) return;

      const { x, y } = latLngToCanvas(request.lat, request.lng);

      // Create gradient for heat effect
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40);
      const baseColor = getUrgencyColor(request.urgency, opacity);

      gradient.addColorStop(0, baseColor);
      gradient.addColorStop(0.5, baseColor.replace(/[\d.]+\)$/, '0.3)'));
      gradient.addColorStop(1, baseColor.replace(/[\d.]+\)$/, '0)'));

      ctx.fillStyle = gradient;
      ctx.fillRect(x - 40, y - 40, 80, 80);
    });
  }, [latLngToCanvas, getUrgencyColor]);

  // Draw request points
  const drawRequestPoints = useCallback((ctx: CanvasRenderingContext2D, requests: RequestPoint[], time: number) => {
    const now = Date.now();
    const timeDecay = 30 * 60 * 1000; // 30 minutes decay

    requests.forEach(request => {
      const age = now - request.timestamp;
      const opacity = Math.max(0, 1 - (age / timeDecay));

      if (opacity <= 0) return;

      const { x, y } = latLngToCanvas(request.lat, request.lng);

      // Pulsing effect for active requests
      const pulseScale = 1 + Math.sin(time * 0.003 + request.id.charCodeAt(0)) * 0.2;
      const isHovered = hoveredRequest?.id === request.id;
      const scale = isHovered ? 1.5 : pulseScale;

      // Outer glow
      ctx.beginPath();
      ctx.arc(x, y, 12 * scale, 0, Math.PI * 2);
      ctx.fillStyle = getUrgencyColor(request.urgency, opacity * 0.2);
      ctx.fill();

      // Inner circle
      ctx.beginPath();
      ctx.arc(x, y, 6 * scale, 0, Math.PI * 2);
      ctx.fillStyle = getUrgencyColor(request.urgency, opacity);
      ctx.fill();

      // Center dot
      ctx.beginPath();
      ctx.arc(x, y, 2 * scale, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    });
  }, [latLngToCanvas, getUrgencyColor, hoveredRequest]);

  // Draw grid lines
  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(200, 200, 200, 0.3)';
    ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x < width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y < height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [width, height]);

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx);

    // Draw heatmap
    drawHeatmapGradient(ctx, requests);

    // Draw request points
    drawRequestPoints(ctx, requests, Date.now());

    // Draw hover tooltip
    if (hoveredRequest && interactive) {
      drawTooltip(ctx, hoveredRequest, mousePos);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [width, height, requests, hoveredRequest, mousePos, interactive, drawGrid, drawHeatmapGradient, drawRequestPoints]);

  // Draw tooltip
  const drawTooltip = (ctx: CanvasRenderingContext2D, request: RequestPoint, pos: { x: number; y: number }) => {
    const padding = 10;
    const lineHeight = 16;
    const lines = [
      `Urgency: ${request.urgency}`,
      request.bloodType ? `Blood Type: ${request.bloodType}` : '',
      request.requesterName ? `Requester: ${request.requesterName}` : ''
    ].filter(line => line);

    const boxHeight = lines.length * lineHeight + padding * 2;
    const boxWidth = 180;

    let tooltipX = pos.x + 15;
    let tooltipY = pos.y - boxHeight / 2;

    // Keep tooltip within canvas bounds
    if (tooltipX + boxWidth > width) {
      tooltipX = pos.x - boxWidth - 15;
    }
    if (tooltipY < 0) {
      tooltipY = 10;
    }
    if (tooltipY + boxHeight > height) {
      tooltipY = height - boxHeight - 10;
    }

    // Draw tooltip background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.fillRect(tooltipX, tooltipY, boxWidth, boxHeight);

    // Draw tooltip text
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Arial';
    lines.forEach((line, index) => {
      ctx.fillText(line, tooltipX + padding, tooltipY + padding + (index + 1) * lineHeight);
    });
  };

  // Handle mouse events
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    setMousePos({ x, y });

    // Find hovered request
    const hoveredReq = requests.find(request => {
      const { x: reqX, y: reqY } = latLngToCanvas(request.lat, request.lng);
      const distance = Math.sqrt(Math.pow(x - reqX, 2) + Math.pow(y - reqY, 2));
      return distance <= 15;
    });

    setHoveredRequest(hoveredReq || null);
    canvas.style.cursor = hoveredReq ? 'pointer' : 'crosshair';
  }, [interactive, requests, latLngToCanvas]);

  const handleMouseClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !onRequestClick || !hoveredRequest) return;

    onRequestClick(hoveredRequest);
  }, [interactive, onRequestClick, hoveredRequest]);

  // Start animation
  useEffect(() => {
    animate();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  // Clean up old requests
  const filteredRequests = requests.filter(request => {
    const age = Date.now() - request.timestamp;
    return age < 30 * 60 * 1000; // Only show requests from last 30 minutes
  });

  return (
    <div className="request-heatmap">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={`heatmap-canvas ${interactive ? 'interactive' : ''}`}
        onMouseMove={handleMouseMove}
        onClick={handleMouseClick}
        onMouseLeave={() => setHoveredRequest(null)}
      />

      {/* Legend */}
      <div className="heatmap-legend">
        <div className="legend-item">
          <div className="legend-color critical"></div>
          <span>Critical</span>
        </div>
        <div className="legend-item">
          <div className="legend-color urgent"></div>
          <span>Urgent</span>
        </div>
        <div className="legend-item">
          <div className="legend-color normal"></div>
          <span>Normal</span>
        </div>
      </div>

      {/* Stats overlay */}
      <div className="heatmap-stats">
        <div className="stat-item">
          <span className="stat-label">Active Requests:</span>
          <span className="stat-value">{filteredRequests.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Critical:</span>
          <span className="stat-value">{filteredRequests.filter(r => r.urgency === 'critical').length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Zoom:</span>
          <span className="stat-value">{zoom.toFixed(1)}x</span>
        </div>
      </div>
    </div>
  );
};

export default RequestHeatmap;