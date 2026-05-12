import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'

interface Props {
  slug: string
  restaurantName: string
  baseUrl?: string
}

const FRAME_STYLES = [
  { id: 'minimal', label: 'Minimal', bg: '#18181b', fg: '#f97316', dot: '#f5f5f5' },
  { id: 'gold', label: 'Gold', bg: '#0a0700', fg: '#f59e0b', dot: '#fbbf24' },
  { id: 'ocean', label: 'Ocean', bg: '#0a0f1e', fg: '#3b82f6', dot: '#60a5fa' },
  { id: 'forest', label: 'Forest', bg: '#051a0e', fg: '#22c55e', dot: '#4ade80' },
]

export default function QRCodeGenerator({ slug, restaurantName, baseUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const downloadCanvasRef = useRef<HTMLCanvasElement>(null)
  const [style, setStyle] = useState(FRAME_STYLES[1])
  const [downloading, setDownloading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [size, setSize] = useState(280)

  const menuUrl = `${baseUrl ?? window.location.origin}/menu/${slug}`

  const generateQR = async (canvas: HTMLCanvasElement, px: number) => {
    await QRCode.toCanvas(canvas, menuUrl, {
      width: px,
      margin: 2,
      color: { dark: style.dot, light: style.bg },
      errorCorrectionLevel: 'H',
    })
  }

  useEffect(() => {
    if (canvasRef.current) generateQR(canvasRef.current, size)
  }, [style, size, menuUrl])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const px = 800
      const padding = 60
      const totalW = px + padding * 2
      const totalH = px + padding * 2 + 120

      const offscreen = document.createElement('canvas')
      offscreen.width = totalW
      offscreen.height = totalH
      const ctx = offscreen.getContext('2d')!

      // Background gradient
      const grad = ctx.createLinearGradient(0, 0, totalW, totalH)
      grad.addColorStop(0, style.bg)
      grad.addColorStop(1, style.bg + 'dd')
      ctx.fillStyle = grad
      roundRect(ctx, 0, 0, totalW, totalH, 24)
      ctx.fill()

      // Border glow
      ctx.strokeStyle = style.fg + '60'
      ctx.lineWidth = 2
      roundRect(ctx, 1, 1, totalW - 2, totalH - 2, 23)
      ctx.stroke()

      // QR into temp canvas
      const qrCanvas = document.createElement('canvas')
      await generateQR(qrCanvas, px)
      ctx.drawImage(qrCanvas, padding, padding)

      // Restaurant name
      ctx.fillStyle = style.fg
      ctx.font = 'bold 28px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(restaurantName, totalW / 2, px + padding + 52)

      // URL
      ctx.fillStyle = style.dot + '99'
      ctx.font = '16px system-ui, sans-serif'
      ctx.fillText(menuUrl, totalW / 2, px + padding + 82)

      const url = offscreen.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `${slug}-qr-menu.png`
      a.click()
    } finally {
      setDownloading(false)
    }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(menuUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-5">
      {/* Style selector */}
      <div className="flex gap-2">
        {FRAME_STYLES.map(s => (
          <button
            key={s.id}
            onClick={() => setStyle(s)}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium border transition-all duration-200 ${
              style.id === s.id ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'
            }`}
          >
            <div className="w-4 h-4 rounded-full mx-auto mb-1 ring-1 ring-white/20" style={{ background: s.fg }} />
            {s.label}
          </button>
        ))}
      </div>

      {/* QR Preview */}
      <div
        className="relative rounded-2xl p-8 flex flex-col items-center gap-4 transition-all duration-500 border"
        style={{ background: style.bg, borderColor: style.fg + '40' }}
      >
        {/* Corner decorations */}
        {['top-3 left-3', 'top-3 right-3', 'bottom-3 left-3', 'bottom-3 right-3'].map((pos, i) => (
          <div key={i} className={`absolute ${pos} w-4 h-4 border-2 rounded-sm`}
            style={{
              borderColor: style.fg,
              borderRight: i % 2 === 0 ? 'none' : undefined,
              borderLeft: i % 2 === 1 ? 'none' : undefined,
              borderBottom: i < 2 ? 'none' : undefined,
              borderTop: i >= 2 ? 'none' : undefined,
            }}
          />
        ))}

        <canvas ref={canvasRef} className="rounded-xl" style={{ imageRendering: 'pixelated' }} />

        <div className="text-center">
          <div className="font-bold text-sm" style={{ color: style.fg }}>{restaurantName}</div>
          <div className="text-xs mt-0.5 font-mono" style={{ color: style.dot + '80' }}>
            {menuUrl.replace('https://', '')}
          </div>
        </div>
      </div>

      {/* Size slider */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs text-zinc-500">
          <span>Preview size</span>
          <span>{size}px</span>
        </div>
        <input
          type="range" min={180} max={400} value={size} onChange={e => setSize(Number(e.target.value))}
          className="w-full accent-orange-500"
        />
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCopy}
          className={`py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 ${
            copied ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:border-zinc-500'
          }`}
        >
          {copied ? '✓ Copied!' : '🔗 Copy URL'}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="btn-primary py-2.5 rounded-xl flex items-center justify-center gap-2"
        >
          {downloading ? (
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : '↓'}
          {downloading ? 'Generating…' : 'Download PNG'}
        </button>
      </div>

      <p className="text-center text-xs text-zinc-600">High-res 800px PNG ready for print</p>
    </div>
  )
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}
