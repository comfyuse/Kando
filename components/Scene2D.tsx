'use client'

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { Network, Cell, AxialCoord } from '@/lib/simulator'

interface Scene2DProps {
  network: Network
  onCellClick?: (cell: Cell) => void
  showMessageIcons?: boolean
  ghostCoords?: { q: number; r: number }[]
  onGhostClick?: (q: number, r: number) => void
}

function axialToPixel(q: number, r: number, size: number, cx: number, cy: number) {
  return {
    x: size * (3 / 2 * q) + cx,
    y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r) + cy,
  }
}

const Scene2D = forwardRef(function Scene2D({ network, onCellClick, showMessageIcons = false, ghostCoords, onGhostClick }: Scene2DProps, ref: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef(false)
  const hasDraggedRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const [size, setSize] = useState(22)
  const [showGraph, setShowGraph] = useState(false) // همیشه false - گراف خاموش

  useEffect(() => {
    const stored = localStorage.getItem('cando-show-graph')
    if (stored !== null) {
      setShowGraph(stored === 'true')
    }
    const handleToggleGraph = (e: CustomEvent) => {
      setShowGraph(e.detail)
    }
    window.addEventListener('toggleGraph', handleToggleGraph as EventListener)
    return () => {
      window.removeEventListener('toggleGraph', handleToggleGraph as EventListener)
    }
  }, [])

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    if (!network || !network.cells) return

    const W = canvas.clientWidth
    const H = canvas.clientHeight
    const dpr = window.devicePixelRatio || 1
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const isDark = document.documentElement.classList.contains('dark')
    const cx = W / 2 + offsetRef.current.x
    const cy = H / 2 + offsetRef.current.y

    ctx.fillStyle = isDark ? '#0a0a0f' : '#fafaf9'
    ctx.fillRect(0, 0, W, H)

    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.03)'
    ctx.lineWidth = 0.5
    const gs = size * 1.5
    for (let x = (offsetRef.current.x % gs + gs) % gs; x < W; x += gs) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
    }
    for (let y = (offsetRef.current.y % gs + gs) % gs; y < H; y += gs) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
    }

    const colors: Record<string, { fill: string; stroke: string }> = {
      citizen: {
        fill: isDark ? 'rgba(63, 185, 80, 0.4)' : 'rgba(34, 139, 34, 0.35)',
        stroke: isDark ? 'rgba(63, 185, 80, 0.8)' : 'rgba(34, 139, 34, 0.7)',
      },
      candidate: {
        fill: isDark ? 'rgba(88, 166, 255, 0.35)' : 'rgba(30, 144, 255, 0.3)',
        stroke: isDark ? 'rgba(88, 166, 255, 0.7)' : 'rgba(30, 144, 255, 0.6)',
      },
      temporary: {
        fill: isDark ? 'rgba(248, 81, 73, 0.3)' : 'rgba(220, 38, 38, 0.25)',
        stroke: isDark ? 'rgba(248, 81, 73, 0.65)' : 'rgba(220, 38, 38, 0.55)',
      },
      // RESERVED renders red — same as classic temporary (در حال ساخت)
      reserved: {
        fill: isDark ? 'rgba(248, 81, 73, 0.3)' : 'rgba(220, 38, 38, 0.25)',
        stroke: isDark ? 'rgba(248, 81, 73, 0.65)' : 'rgba(220, 38, 38, 0.55)',
      },
      dead: {
        fill: isDark ? 'rgba(33, 38, 45, 0.6)' : 'rgba(0, 0, 0, 0.2)',
        stroke: isDark ? 'rgba(100, 100, 100, 0.4)' : 'rgba(0, 0, 0, 0.25)',
      },
    }

    // Draw cells
    for (const [, cell] of network.cells) {
      if (!cell.isAlive()) continue
      const { x, y } = axialToPixel(cell.coord.q, cell.coord.r, size, cx, cy)
      if (x < -size * 2 || x > W + size * 2 || y < -size * 2 || y > H + size * 2) continue
      const isQueen = cell.coord.q === 0 && cell.coord.r === 0

      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 180) * (60 * i)
        const px = x + size * Math.cos(angle)
        const py = y + size * Math.sin(angle)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()

      const c = colors[cell.status] || colors.temporary
      ctx.fillStyle = isQueen ? 'rgba(255, 215, 0, 0.55)' : c.fill
      ctx.fill()
      ctx.strokeStyle = isQueen ? '#ffd700' : c.stroke
      ctx.lineWidth = isQueen ? 2.5 : 1
      ctx.stroke()

      if (isQueen) {
        ctx.save()
        ctx.shadowColor = '#ffd700'
        ctx.shadowBlur = 22
        ctx.strokeStyle = '#ffd700'
        ctx.lineWidth = 3
        ctx.stroke()
        ctx.restore()
      }

      // نمایش استیکرها فقط در Message Mode
      if (showMessageIcons) {
        // 1. سلول فرستنده پیام - ✉️
        if (cell.isSender && cell.hasMessage && cell.status === 'citizen') {
          ctx.font = `${Math.max(20, size * 1.0)}px "Segoe UI Emoji"`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.shadowBlur = 0
          ctx.fillStyle = '#ffd700'
          ctx.fillText('✉️', x, y - size * 0.5)
        }
        // 2. سلول‌هایی که در صف رای هستند - ✉️
        else if (cell.messageOriginKey && !cell.hasVoted && !cell.isSender && cell.status === 'citizen' && cell.vote === null) {
          ctx.font = `${Math.max(18, size * 0.9)}px "Segoe UI Emoji"`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.shadowBlur = 0
          ctx.fillStyle = '#f0d68a'
          ctx.fillText('✉️', x, y - size * 0.4)
        }
        // 3. بعد از رای دادن - ✅ یا ❌
        else if (cell.vote && cell.status === 'citizen') {
          ctx.font = `${Math.max(20, size * 1.0)}px "Segoe UI Emoji"`
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.shadowBlur = 0
          ctx.fillStyle = cell.vote === 'yes' ? '#4ade80' : '#ef4444'
          ctx.fillText(cell.vote === 'yes' ? '✅' : '❌', x, y)
        }
      }
    }

    // ghost (invite-able) empty slots — dashed outlines with a +
    if (ghostCoords && ghostCoords.length) {
      ctx.save()
      for (const g of ghostCoords) {
        if (network.cells.get(`${g.q},${g.r}`)) continue
        const { x, y } = axialToPixel(g.q, g.r, size, cx, cy)
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 180) * (60 * i)
          const px = x + size * Math.cos(a)
          const py = y + size * Math.sin(a)
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.28)' : 'rgba(0,0,0,0.22)'
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.setLineDash([])
        ctx.fillStyle = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)'
        ctx.font = `${Math.max(12, size * 0.6)}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('+', x, y)
      }
      ctx.restore()
    }
  }, [network, size, showMessageIcons, ghostCoords])

  useImperativeHandle(ref, () => ({
    render: () => render()
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    if (!network || !network.cells) return

    const getCellAtPixel = (px: number, py: number) => {
      const cx = canvas.clientWidth / 2 + offsetRef.current.x
      const cy = canvas.clientHeight / 2 + offsetRef.current.y
      const q = Math.round((2 / 3 * (px - cx)) / size)
      const r = Math.round((-1 / 3 * (px - cx) + Math.sqrt(3) / 3 * (py - cy)) / size)
      return network.getCell(new AxialCoord(q, r))
    }

    const onMouseDown = (e: MouseEvent) => {
      dragRef.current = true
      hasDraggedRef.current = false
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const dx = e.clientX - lastMouseRef.current.x
      const dy = e.clientY - lastMouseRef.current.y
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDraggedRef.current = true
      offsetRef.current.x += dx
      offsetRef.current.y += dy
      lastMouseRef.current = { x: e.clientX, y: e.clientY }
      render()
    }
    const onMouseUp = (e: MouseEvent) => {
      if (!hasDraggedRef.current) {
        const rect = canvas.getBoundingClientRect()
        const px = e.clientX - rect.left
        const py = e.clientY - rect.top

        const cell = getCellAtPixel(px, py)
        if (cell && cell.isAlive()) {
          onCellClick?.(cell)
        } else if (onGhostClick) {
          const gcx = canvas.clientWidth / 2 + offsetRef.current.x
          const gcy = canvas.clientHeight / 2 + offsetRef.current.y
          const q = Math.round((2 / 3 * (px - gcx)) / size)
          const r = Math.round((-1 / 3 * (px - gcx) + Math.sqrt(3) / 3 * (py - gcy)) / size)
          if ((ghostCoords || []).some((g) => g.q === q && g.r === r)) onGhostClick(q, r)
        }
      }
      dragRef.current = false
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setSize(s => Math.max(8, Math.min(60, s * (e.deltaY < 0 ? 1.08 : 0.92))))
    }

    canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      canvas.removeEventListener('wheel', onWheel)
    }
  }, [render, size, network, onCellClick, onGhostClick, ghostCoords])

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') render()
      }
    })
    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
  }, [render])

  // Redraw when the canvas is resized — otherwise the bitmap keeps its old
  // dimensions and the w-full/h-full CSS stretches it into a smeared image
  // until the next interaction. Coalesced to one redraw per frame.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => render())
    })
    observer.observe(canvas)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [render])

  useEffect(() => { render() }, [render])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair active:cursor-grabbing"
      style={{ touchAction: 'none' }}
    />
  )
})

export default Scene2D