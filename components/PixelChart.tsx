'use client'

import { useEffect, useRef } from 'react'

interface ChartData {
  date: string
  points: number
}

interface PixelChartProps {
  data: ChartData[]
}

export default function PixelChart({ data }: PixelChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size
    const width = canvas.width = canvas.offsetWidth * 2
    const height = canvas.height = canvas.offsetHeight * 2
    
    // Scale for retina displays
    ctx.scale(2, 2)

    // Clear canvas
    ctx.fillStyle = '#000000'
    ctx.fillRect(0, 0, width, height)

    if (data.length === 0) {
      // No data message
      ctx.fillStyle = '#6B7280'
      ctx.font = '16px monospace'
      ctx.textAlign = 'center'
      ctx.fillText('NO DATA', canvas.offsetWidth / 2, canvas.offsetHeight / 2)
      return
    }

    // Calculate dimensions
    const padding = 20
    const chartWidth = canvas.offsetWidth - (padding * 2)
    const chartHeight = canvas.offsetHeight - (padding * 3)
    const barWidth = Math.floor(chartWidth / data.length)
    const maxPoints = Math.max(...data.map(d => d.points), 1)

    // Draw bars
    data.forEach((item, index) => {
      const barHeight = (item.points / maxPoints) * chartHeight
      const x = padding + (index * barWidth) + (barWidth * 0.1)
      const y = canvas.offsetHeight - padding - barHeight
      const width = barWidth * 0.8

      // Create pixelated gradient effect
      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight)
      gradient.addColorStop(0, '#10B981')
      gradient.addColorStop(1, '#059669')

      // Draw bar with pixel effect
      for (let i = 0; i < barHeight; i += 4) {
        ctx.fillStyle = gradient
        ctx.fillRect(x, y + i, width, 3)
      }

      // Draw value on top
      if (item.points > 0) {
        ctx.fillStyle = '#10B981'
        ctx.font = 'bold 10px monospace'
        ctx.textAlign = 'center'
        ctx.fillText(
          item.points.toString(), 
          x + width / 2, 
          y - 5
        )
      }

      // Draw date label
      ctx.fillStyle = '#6B7280'
      ctx.font = '10px monospace'
      ctx.textAlign = 'center'
      const date = new Date(item.date)
      const label = date.toLocaleDateString('en', { weekday: 'short' })
      ctx.fillText(
        label, 
        x + width / 2, 
        canvas.offsetHeight - 5
      )
    })

    // Draw axis lines with pixel effect
    ctx.strokeStyle = '#374151'
    ctx.lineWidth = 2
    
    // Y-axis
    ctx.beginPath()
    ctx.moveTo(padding, padding)
    ctx.lineTo(padding, canvas.offsetHeight - padding)
    ctx.stroke()
    
    // X-axis
    ctx.beginPath()
    ctx.moveTo(padding, canvas.offsetHeight - padding)
    ctx.lineTo(canvas.offsetWidth - padding, canvas.offsetHeight - padding)
    ctx.stroke()

  }, [data])

  return (
    <div className="relative w-full h-48">
      <canvas 
        ref={canvasRef}
        className="w-full h-full pixel-canvas"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  )
} 