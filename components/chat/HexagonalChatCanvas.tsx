'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ChatUser } from '@/lib/chat-types';

interface HexagonalChatCanvasProps {
  network: { users: Map<string, ChatUser> };
  onUserClick?: (user: ChatUser) => void;
  currentUserId?: string;
  selectedUserId?: string;
  activeLayer: number;
  onLayerChange: (layer: number) => void;
}

function axialToPixel(q: number, r: number, size: number, cx: number, cy: number) {
  return {
    x: size * (3 / 2 * q) + cx,
    y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r) + cy,
  };
}

const HexagonalChatCanvas = forwardRef(function HexagonalChatCanvas(
  { network, onUserClick, currentUserId, selectedUserId, activeLayer, onLayerChange }: HexagonalChatCanvasProps,
  ref: any
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [size, setSize] = useState(28);
  const hoveredUserRef = useRef<ChatUser | null>(null);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const isDark = document.documentElement.classList.contains('dark');
    const cx = W / 2 + offsetRef.current.x;
    const cy = H / 2 + offsetRef.current.y;

    // Background
    ctx.fillStyle = isDark ? '#0a0a0f' : '#fafaf9';
    ctx.fillRect(0, 0, W, H);

    // Grid pattern
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)';
    ctx.lineWidth = 0.5;
    const gs = size * 1.5;
    for (let x = (offsetRef.current.x % gs + gs) % gs; x < W; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = (offsetRef.current.y % gs + gs) % gs; y < H; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Draw connection lines between users in same layer
    const users = Array.from(network.users.values()).filter(u => u.layer === activeLayer);
    
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const u1 = users[i];
        const u2 = users[j];
        const dist = Math.abs(u1.coord.q - u2.coord.q) + Math.abs(u1.coord.r - u2.coord.r);
        
        if (dist <= 2) {
          const p1 = axialToPixel(u1.coord.q, u1.coord.r, size, cx, cy);
          const p2 = axialToPixel(u2.coord.q, u2.coord.r, size, cx, cy);
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          
          const gradient = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
          gradient.addColorStop(0, isDark ? 'rgba(212,168,67,0.1)' : 'rgba(184,134,11,0.15)');
          gradient.addColorStop(1, isDark ? 'rgba(212,168,67,0.1)' : 'rgba(184,134,11,0.15)');
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = isDark ? 1 : 1.2;
          ctx.stroke();
        }
      }
    }

    // Draw users
    for (const user of users) {
      const { x, y } = axialToPixel(user.coord.q, user.coord.r, size, cx, cy);
      const isCurrent = user.id === currentUserId;
      const isSelected = user.id === selectedUserId;
      
      // Hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        const px = x + size * Math.cos(angle);
        const py = y + size * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      
      // Fill based on user layer
      const layerColors: Record<number, { fill: string; stroke: string }> = {
        1: {
          fill: isDark ? 'rgba(245, 158, 11, 0.35)' : 'rgba(245, 158, 11, 0.25)',
          stroke: isDark ? 'rgba(245, 158, 11, 0.7)' : 'rgba(245, 158, 11, 0.6)',
        },
        2: {
          fill: isDark ? 'rgba(56, 189, 248, 0.35)' : 'rgba(56, 189, 248, 0.25)',
          stroke: isDark ? 'rgba(56, 189, 248, 0.7)' : 'rgba(56, 189, 248, 0.6)',
        },
        3: {
          fill: isDark ? 'rgba(52, 211, 153, 0.35)' : 'rgba(52, 211, 153, 0.25)',
          stroke: isDark ? 'rgba(52, 211, 153, 0.7)' : 'rgba(52, 211, 153, 0.6)',
        },
        4: {
          fill: isDark ? 'rgba(167, 139, 250, 0.35)' : 'rgba(167, 139, 250, 0.25)',
          stroke: isDark ? 'rgba(167, 139, 250, 0.7)' : 'rgba(167, 139, 250, 0.6)',
        },
      };
      
      const colors = layerColors[user.layer];
      ctx.fillStyle = isCurrent ? 'rgba(212, 168, 67, 0.45)' : colors.fill;
      ctx.fill();
      ctx.strokeStyle = isSelected ? '#ffd700' : colors.stroke;
      ctx.lineWidth = isSelected ? 3 : (isCurrent ? 2 : 1.5);
      ctx.stroke();
      
      if (isCurrent) {
        ctx.save();
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
      }
      
      // Avatar circle
      ctx.beginPath();
      ctx.arc(x, y, size * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = user.avatarColor;
      ctx.fill();
      ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Initial
      ctx.font = `${Math.max(12, size * 0.3)}px "Segoe UI", Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(user.name.charAt(0), x, y);
      
      // Status indicator
      ctx.beginPath();
      ctx.arc(x + size * 0.4, y - size * 0.4, size * 0.1, 0, Math.PI * 2);
      ctx.fillStyle = user.status === 'online' ? '#3fb950' : (user.status === 'away' ? '#f0d68a' : '#8b949e');
      ctx.fill();
      ctx.strokeStyle = isDark ? '#0a0a0f' : '#fafaf9';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // Name label on hover
      if (hoveredUserRef.current?.id === user.id) {
        ctx.font = `11px "Segoe UI", Arial, sans-serif`;
        ctx.fillStyle = isDark ? '#ffffff' : '#000000';
        ctx.shadowBlur = 0;
        ctx.fillText(user.name, x, y - size * 0.7);
      }
    }
  }, [network, size, currentUserId, selectedUserId, activeLayer]);

  // Mouse event handlers for interaction
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getUserAtPixel = (px: number, py: number) => {
      const cx = canvas.clientWidth / 2 + offsetRef.current.x;
      const cy = canvas.clientHeight / 2 + offsetRef.current.y;
      const threshold = size * 0.6;
      
      for (const user of network.users.values()) {
        if (user.layer !== activeLayer) continue;
        const { x, y } = axialToPixel(user.coord.q, user.coord.r, size, cx, cy);
        const dx = px - x, dy = py - y;
        if (Math.sqrt(dx * dx + dy * dy) < threshold) {
          return user;
        }
      }
      return null;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDraggedRef.current = true;
        offsetRef.current.x += dx;
        offsetRef.current.y += dy;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        render();
      } else {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const user = getUserAtPixel(px, py);
        hoveredUserRef.current = user || null;
        render();
      }
    };

    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = true;
      hasDraggedRef.current = false;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e: MouseEvent) => {
      if (!hasDraggedRef.current && onUserClick) {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const user = getUserAtPixel(px, py);
        if (user && user.id !== currentUserId) {
          onUserClick(user);
        }
      }
      dragRef.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      setSize(s => Math.max(15, Math.min(50, s * (e.deltaY < 0 ? 1.05 : 0.95))));
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [render, size, network, onUserClick, currentUserId, activeLayer]);

  // Layer selector buttons
  const layerButtons = [
    { layer: 1, label: '👑 Queen\'s Court', color: 'amber' },
    { layer: 2, label: '🔹 Inner Circle', color: 'sky' },
    { layer: 3, label: '🔸 Middle Ring', color: 'emerald' },
    { layer: 4, label: '🌐 Outer Ring', color: 'purple' },
  ];

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-pointer"
        style={{ touchAction: 'none' }}
      />
      
      {/* Layer selector */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 pointer-events-auto">
        <div className="glass flex gap-1 p-1 rounded-lg">
          {layerButtons.map(({ layer, label, color }) => (
            <button
              key={layer}
              onClick={() => onLayerChange(layer)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeLayer === layer
                  ? `bg-${color}-500/20 text-${color}-400 border border-${color}-500/30`
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
});

export default HexagonalChatCanvas;