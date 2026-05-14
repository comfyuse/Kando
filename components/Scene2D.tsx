'use client'

import { useEffect, useRef, useCallback, useState, forwardRef, useImperativeHandle } from 'react'
import { Network, Cell, AxialCoord } from '@/lib/simulator'

interface Scene2DProps {
  network: Network
  onCellClick?: (cell: Cell) => void
  onCurveClick?: (fromCell: Cell, toCell: Cell) => void
}

function axialToPixel(q: number, r: number, size: number, cx: number, cy: number) {
  return {
    x: size * (3 / 2 * q) + cx,
    y: size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r) + cy,
  }
}

interface CurveData {
  fromKey: string
  toKey: string
  curvature: number
}

const Scene2D = forwardRef(function Scene2D({ network, onCellClick, onCurveClick }: Scene2DProps, ref: any) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const offsetRef = useRef({ x: 0, y: 0 })
  const dragRef = useRef(false)
  const hasDraggedRef = useRef(false)
  const lastMouseRef = useRef({ x: 0, y: 0 })
  const [size, setSize] = useState(22)
  const [showGraph, setShowGraph] = useState(true)
  const curvesRef = useRef<CurveData[]>([])
  const lastDayRef = useRef(-1)
  const curvesPixelCacheRef = useRef<{ curve: CurveData; fromX: number; fromY: number; toX: number; toY: number; cpX: number; cpY: number }[]>([])

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

    if (lastDayRef.current !== network.day) {
      const prevDay = lastDayRef.current
      lastDayRef.current = network.day

      curvesRef.current = curvesRef.current.filter(c => {
        const fromCell = network.cells.get(c.fromKey)
        const toCell = network.cells.get(c.toKey)
        if (!fromCell || !toCell) return false
        if (fromCell.status === 'dead' || toCell.status === 'dead') return false
        return true
      })

      const daysPassed = prevDay === -1 ? network.day : 1
      for (let d = 0; d < daysPassed; d++) {
        if (Math.random() < 0.3) {
          const citizens = [...network.cells.values()].filter(c => c.status === 'citizen')
          if (citizens.length >= 2) {
            const from = citizens[Math.floor(Math.random() * citizens.length)]
            const to = citizens[Math.floor(Math.random() * citizens.length)]
            if (from.coord.key() !== to.coord.key()) {
              const exists = curvesRef.current.some(
                c => (c.fromKey === from.coord.key() && c.toKey === to.coord.key()) ||
                     (c.fromKey === to.coord.key() && c.toKey === from.coord.key())
              )
              if (!exists) {
                curvesRef.current.push({
                  fromKey: from.coord.key(),
                  toKey: to.coord.key(),
                  curvature: (Math.random() - 0.5) * 1.5,
                })
              }
            }
          }
        }
      }
    }

    curvesPixelCacheRef.current = []

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

    if (showGraph) {
      for (const curve of curvesRef.current) {
        const [fq, fr] = curve.fromKey.split(',').map(Number)
        const [tq, tr] = curve.toKey.split(',').map(Number)

        const fromPixel = axialToPixel(fq, fr, size, cx, cy)
        const toPixel = axialToPixel(tq, tr, size, cx, cy)

        const fromX = fromPixel.x, fromY = fromPixel.y
        const toX = toPixel.x, toY = toPixel.y

        const midX = (fromX + toX) / 2, midY = (fromY + toY) / 2
        const dx = toX - fromX, dy = toY - fromY
        const dist = Math.sqrt(dx * dx + dy * dy) || 1

        const cpX = midX - (dy / dist) * dist * curve.curvature * 0.5
        const cpY = midY + (dx / dist) * dist * curve.curvature * 0.5

        curvesPixelCacheRef.current.push({ curve, fromX, fromY, toX, toY, cpX, cpY })

        ctx.beginPath()
        ctx.moveTo(fromX, fromY)
        ctx.quadraticCurveTo(cpX, cpY, toX, toY)

        const gradient = ctx.createLinearGradient(fromX, fromY, toX, toY)
        gradient.addColorStop(0, isDark ? 'rgba(212,168,67,0.1)' : 'rgba(184,134,11,0.15)')
        gradient.addColorStop(0.5, isDark ? 'rgba(212,168,67,0.3)' : 'rgba(184,134,11,0.35)')
        gradient.addColorStop(1, isDark ? 'rgba(212,168,67,0.1)' : 'rgba(184,134,11,0.15)')

        ctx.strokeStyle = gradient
        ctx.lineWidth = isDark ? 1.2 : 1.5
        ctx.stroke()

        for (const { x, y } of [{x: fromX, y: fromY}, {x: toX, y: toY}]) {
          ctx.beginPath()
          ctx.arc(x, y, 2.5, 0, Math.PI * 2)
          ctx.fillStyle = isDark ? 'rgba(212,168,67,0.6)' : 'rgba(184,134,11,0.7)'
          ctx.fill()
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, Math.PI * 2)
          ctx.fillStyle = isDark ? 'rgba(212,168,67,0.12)' : 'rgba(184,134,11,0.18)'
          ctx.fill()
        }
      }
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

      // Draw message icon (✉️) on cells that have sent a message
      if (cell.hasMessage && cell.status === 'citizen') {
        ctx.font = `${Math.max(14, size * 0.8)}px "Segoe UI Emoji"`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowBlur = 0
        ctx.fillStyle = '#ffd700'
        ctx.fillText('✉️', x, y - size * 0.6)
      }

      // Draw vote icon (✅ or 🚫) in the middle of the cell
      if (cell.vote && cell.status === 'citizen') {
        ctx.font = `${Math.max(16, size * 0.9)}px "Segoe UI Emoji"`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.shadowBlur = 0
        ctx.fillStyle = cell.vote === 'yes' ? '#4ade80' : '#ef4444'
        ctx.fillText(cell.vote === 'yes' ? '✅' : '🚫', x, y)
      }
    }
  }, [network, size, showGraph])

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

    const getCurveAtPixel = (px: number, py: number) => {
      const threshold = 8
      for (const item of curvesPixelCacheRef.current) {
        for (let t = 0; t <= 1; t += 0.05) {
          const x = (1-t)*(1-t)*item.fromX + 2*(1-t)*t*item.cpX + t*t*item.toX
          const y = (1-t)*(1-t)*item.fromY + 2*(1-t)*t*item.cpY + t*t*item.toY
          const dx = px - x, dy = py - y
          if (Math.sqrt(dx*dx + dy*dy) < threshold) {
            return item.curve
          }
        }
      }
      return null
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

        const clickedCurve = getCurveAtPixel(px, py)
        if (clickedCurve && onCurveClick) {
          const fromCell = network.cells.get(clickedCurve.fromKey)
          const toCell = network.cells.get(clickedCurve.toKey)
          if (fromCell && toCell) {
            onCurveClick(fromCell, toCell)
            dragRef.current = false
            return
          }
        }

        if (onCellClick) {
          const cell = getCellAtPixel(px, py)
          if (cell && cell.isAlive() && cell.status === 'citizen') onCellClick(cell)
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
  }, [render, size, network, onCellClick, onCurveClick])

  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.attributeName === 'class') render()
      }
    })
    observer.observe(document.documentElement, { attributes: true })
    return () => observer.disconnect()
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