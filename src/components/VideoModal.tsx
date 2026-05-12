import { useEffect, useRef, useState } from 'react'

interface Props {
  videoUrl: string
  thumbnailUrl?: string | null
  title: string
  description?: string | null
  onClose: () => void
}

export default function VideoModal({ videoUrl, thumbnailUrl, title, description, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [visible, setVisible] = useState(false)
  const [particles] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 3 + Math.random() * 4,
      size: 2 + Math.random() * 4,
    }))
  )

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose() }
    document.addEventListener('keydown', handleKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [])

  useEffect(() => {
    if (visible && videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }, [visible])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 350)
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-350 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleClose}
    >
      {/* Cinematic blur background */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />

      {/* Background video (blurred) */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        <video
          src={videoUrl}
          className="w-full h-full object-cover scale-110 blur-2xl"
          autoPlay
          muted
          loop
          playsInline
        />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-orange-400/30 animate-float"
            style={{
              left: `${p.x}%`,
              bottom: '-10px',
              width: p.size,
              height: p.size,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Steam overlay */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute bottom-0 w-px bg-gradient-to-t from-white/5 to-transparent animate-steam"
            style={{
              left: `${20 + i * 15}%`,
              height: '40%',
              animationDelay: `${i * 0.8}s`,
              animationDuration: '3s',
            }}
          />
        ))}
      </div>

      {/* Main video container */}
      <div
        className={`relative z-10 w-full max-w-4xl mx-4 transition-all duration-350 ${
          visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-8'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute -top-12 right-0 w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-20"
        >
          ✕
        </button>

        {/* Video */}
        <div className="rounded-2xl overflow-hidden shadow-2xl shadow-black/80 ring-1 ring-white/10">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={thumbnailUrl ?? undefined}
            className="w-full aspect-video object-cover"
            controls
            autoPlay
            playsInline
            loop
          />
        </div>

        {/* Info */}
        <div className="mt-4 px-1">
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          {description && <p className="text-zinc-400 text-sm mt-1">{description}</p>}
        </div>
      </div>
    </div>
  )
}
