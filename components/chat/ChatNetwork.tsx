'use client';

import { useEffect, useRef, useCallback } from 'react';
import { ChatNetwork, ChatUser } from '@/lib/chat-network';

interface ChatNetworkProps {
  network: ChatNetwork;
  onUserClick?: (user: ChatUser) => void;
  selectedUserId?: string | null;
}

function axialToPixel(q: number, r: number, size: number, cx: number, cy: number) {
  return {
    x: cx + size * (3 / 2 * q),
    y: cy + size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
  };
}

export default function ChatNetwork({ network, onUserClick, selectedUserId }: ChatNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const cellSize = 30;

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

    const cx = W / 2 + offsetRef.current.x;
    const cy = H / 2 + offsetRef.current.y;

    // پس‌زمینه
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, W, H);

    // رسم خطوط اتصال بین همسایه‌ها
    const drawnEdges = new Set<string>();
    for (const [, user] of network.users) {
      const from = axialToPixel(user.q, user.r, cellSize, cx, cy);
      const neighbors = network.getNeighbors(user.id);
      
      for (const neighbor of neighbors) {
        const pair = [user.id, neighbor.id].sort().join('-');
        if (drawnEdges.has(pair)) continue;
        drawnEdges.add(pair);
        
        const to = axialToPixel(neighbor.q, neighbor.r, cellSize, cx, cy);
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = '#30363d';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // رسم سلول‌ها (کاربران)
    for (const [, user] of network.users) {
      const { x, y } = axialToPixel(user.q, user.r, cellSize, cx, cy);
      const isSelected = selectedUserId === user.id;
      const isQueen = user.layer === 1;
      
      // هاله برای سلول انتخاب شده
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, cellSize + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(46, 168, 138, 0.2)';
        ctx.fill();
      }
      
      // دایره وضعیت آنلاین/آفلاین
      ctx.beginPath();
      ctx.arc(x + cellSize - 8, y - cellSize + 8, 6, 0, Math.PI * 2);
      ctx.fillStyle = user.status === 'online' ? '#3fb950' : user.status === 'away' ? '#f0d68a' : '#8b949e';
      ctx.fill();
      ctx.strokeStyle = '#0d1117';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      
      // بدنه سلول
      ctx.beginPath();
      ctx.arc(x, y, cellSize, 0, Math.PI * 2);
      
      if (isQueen) {
        const grad = ctx.createLinearGradient(x - 10, y - 10, x + 10, y + 10);
        grad.addColorStop(0, '#2ea88a');
        grad.addColorStop(1, '#3fb892');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = `bold ${cellSize * 0.6}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Q', x, y);
      } else {
        ctx.fillStyle = user.avatarColor + '40';
        ctx.fill();
        ctx.strokeStyle = user.avatarColor;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // حرف اول نام
        ctx.font = `${cellSize * 0.45}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(user.name.charAt(0), x, y);
      }
      
      // نمایش لایه
      ctx.font = `${cellSize * 0.25}px monospace`;
      ctx.fillStyle = '#8b949e';
      ctx.textAlign = 'center';
      ctx.fillText(`L${user.layer}`, x, y + cellSize - 8);
    }
  }, [network, cellSize, selectedUserId]);

  // Event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getUserAtPixel = (px: number, py: number) => {
      const cx = canvas.clientWidth / 2 + offsetRef.current.x;
      const cy = canvas.clientHeight / 2 + offsetRef.current.y;
      
      for (const [, user] of network.users) {
        const { x, y } = axialToPixel(user.q, user.r, cellSize, cx, cy);
        const dx = px - x;
        const dy = py - y;
        if (Math.sqrt(dx * dx + dy * dy) <= cellSize) {
          return user;
        }
      }
      return null;
    };

    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };
    
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      offsetRef.current.x += dx;
      offsetRef.current.y += dy;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      render();
    };
    
    const onMouseUp = (e: MouseEvent) => {
      if (onUserClick) {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const user = getUserAtPixel(px, py);
        if (user) onUserClick(user);
      }
      dragRef.current = false;
      canvas.style.cursor = 'grab';
    };
    
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.style.cursor = 'grab';
    
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [render, network, onUserClick, cellSize]);

  useEffect(() => { render(); }, [render]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full rounded-lg"
      style={{ touchAction: 'none', cursor: 'grab' }}
    />
  );
}