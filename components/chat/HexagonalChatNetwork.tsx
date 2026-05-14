'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { ChatNetwork as ChatNetworkType, ChatUser } from '@/lib/chat-network';

interface HexagonalChatNetworkProps {
  network: ChatNetworkType;
  onUserClick?: (user: ChatUser) => void;
  selectedUserId?: string | null;
  currentUserId?: string | null;
}

function axialToPixel(q: number, r: number, size: number, cx: number, cy: number) {
  return {
    x: cx + size * (3 / 2 * q),
    y: cy + size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r),
  };
}

export default function HexagonalChatNetwork({ 
  network, 
  onUserClick, 
  selectedUserId, 
  currentUserId 
}: HexagonalChatNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const offsetRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const [hoveredUser, setHoveredUser] = useState<ChatUser | null>(null);
  const cellSize = 32;

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
        
        const gradient = ctx.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, '#30363d');
        gradient.addColorStop(1, '#2ea88a30');
        
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    // رسم سلول‌ها (کاربران)
    for (const [, user] of network.users) {
      const { x, y } = axialToPixel(user.q, user.r, cellSize, cx, cy);
      const isSelected = selectedUserId === user.id;
      const isCurrent = currentUserId === user.id;
      const isHovered = hoveredUser?.id === user.id;
      const isQueen = user.layer === 1;
      
      // هاله برای سلول انتخاب شده
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, cellSize + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(46, 168, 138, 0.25)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, cellSize + 5, 0, Math.PI * 2);
        ctx.strokeStyle = '#2ea88a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      // هاله برای سلول هاور
      if (isHovered && !isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, cellSize + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(46, 168, 138, 0.15)';
        ctx.fill();
      }
      
      // دایره وضعیت آنلاین/آفلاین
      ctx.beginPath();
      ctx.arc(x + cellSize - 10, y - cellSize + 10, 7, 0, Math.PI * 2);
      ctx.fillStyle = user.status === 'online' ? '#3fb950' : user.status === 'away' ? '#f0d68a' : '#8b949e';
      ctx.fill();
      ctx.strokeStyle = '#0d1117';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // بدنه سلول شش ضلعی
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i);
        const px = x + cellSize * 0.9 * Math.cos(angle);
        const py = y + cellSize * 0.9 * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      
      if (isQueen) {
        const grad = ctx.createLinearGradient(x - 15, y - 15, x + 15, y + 15);
        grad.addColorStop(0, '#2ea88a');
        grad.addColorStop(1, '#3fb892');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        
        ctx.font = `bold ${cellSize * 0.55}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Q', x, y);
      } else if (isCurrent) {
        const grad = ctx.createLinearGradient(x - 15, y - 15, x + 15, y + 15);
        grad.addColorStop(0, '#58a6ff');
        grad.addColorStop(1, '#79c0ff');
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.font = `bold ${cellSize * 0.45}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('You', x, y);
      } else {
        ctx.fillStyle = user.avatarColor + '60';
        ctx.fill();
        ctx.strokeStyle = user.avatarColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        ctx.font = `${cellSize * 0.4}px monospace`;
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(user.name.charAt(0), x, y);
      }
      
      // نمایش لایه
      ctx.font = `${cellSize * 0.22}px monospace`;
      ctx.fillStyle = '#8b949e';
      ctx.textAlign = 'center';
      ctx.fillText(`Layer ${user.layer}`, x, y + cellSize - 5);
      
      // نمایش نام کاربر (هنگام هاور)
      if (isHovered) {
        ctx.font = `${cellSize * 0.3}px monospace`;
        ctx.fillStyle = '#2ea88a';
        ctx.textAlign = 'center';
        ctx.fillText(user.name, x, y - cellSize - 5);
      }
    }
  }, [network, cellSize, selectedUserId, currentUserId, hoveredUser]);

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

    const onMouseMove = (e: MouseEvent) => {
      if (dragRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        offsetRef.current.x += dx;
        offsetRef.current.y += dy;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        render();
      } else {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const user = getUserAtPixel(px, py);
        setHoveredUser(user || null);
      }
    };
    
    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };
    
    const onMouseUp = (e: MouseEvent) => {
      if (!dragRef.current && onUserClick) {
        const rect = canvas.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const py = e.clientY - rect.top;
        const user = getUserAtPixel(px, py);
        if (user) onUserClick(user);
      }
      dragRef.current = false;
      canvas.style.cursor = 'grab';
    };
    
    const onWheel = (e: MouseEvent) => {
      e.preventDefault();
    };

    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    canvas.addEventListener('wheel', onWheel as EventListener, { passive: false });
    canvas.style.cursor = 'grab';
    
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      canvas.removeEventListener('wheel', onWheel as EventListener);
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