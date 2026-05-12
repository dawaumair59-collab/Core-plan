import { useState, useEffect, useRef, useCallback } from 'react'

export interface ReelItem {
  id: string
  videoUrl: string
  thumbnailUrl?: string | null
  title: string
  description?: string | null
  price?: number
  categoryName?: string
}

interface Props {
  items: ReelItem[]
  initialIndex?: number
  onClose: () => void
}

export default function ReelsViewer({ items, initialIndex = 0, onClose }: Props) {
  const [current, setCurrent] = useState(initialIndex)
  const [visible, setVisible] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({})
  const containerRef = useRef<HTMLDivElement>(null)
  const touchStartY = useRef<number | null>(null)
  const touchStartX = useRef<number | null>(null)

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
    document.body.style.overflow = 'hidden'
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'ArrowDown') goTo(current + 1)
      if (e.key === 'ArrowUp') goTo(current - 1)
    }
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [current])

  useEffect(() => {
    // Autoplay current, pause others
    Object.entries(videoRefs.current).forEach(([idx, video]) => {
      if (!video) return
      if (Number(idx) === current) {
        video.currentTime = 0
        video.play().catch(() => {})
      } else {
        video.pause()
      }
    })
  }, [current])

  const goTo = useCallback((idx: number) => {
    if (idx < 0 || idx >= items.length || transitioning) return
    setTransitioning(true)
    setTimeout(() => {
      setCurrent(idx)
      setTransitioning(false)
    }, 150)
  }, [items.length, transitioning])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  // Touch swipe
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return
    const dy = e.changedTouches[0].clientY - touchStartY.current
    const dx = e.changedTouches[0].clientX - (touchStartX.current ?? 0)
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 40) {
      if (dy < 0) goTo(current + 1)
      else goTo(current - 1)
    } else if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy)) {
      handleClose()
    }
    touchStartY.current = null
  }

  const item = items[current]

  return (
    <div
      className={`fixed inset-0 z-50 bg-black transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Video */}
      <div className={`absolute inset-0 transition-all duration-150 ${transitioning ? 'opacity-0 scale-[0.98]' : 'opacity-100 scale-100'}`}>
        {items.map((reel, idx) => (
          <video
            key={reel.id}
            ref={(el) => { videoRefs.current[idx] = el }}
            src={reel.videoUrl}
            poster={reel.thumbnailUrl ?? undefined}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${idx === current ? 'opacity-100' : 'opacity-0'}`}
            muted
            loop
            playsInline
            autoPlay={idx === 0}
          />
        ))}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/30 pointer-events-none" />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 p-4 flex items-center justify-between z-10">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          ✕
        </button>
        <div className="text-white/70 text-xs">
          {current + 1} / {items.length}
        </div>
      </div>

      {/* Progress dots */}
      <div className="absolute top-16 inset-x-0 flex justify-center gap-1.5 z-10">
        {items.map((_, idx) => (
          <button
            key={idx}
            onClick={() => goTo(idx)}
            className={`rounded-full transition-all duration-300 ${
              idx === current ? 'w-6 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/40'
            }`}
          />
        ))}
      </div>

      {/* Side nav arrows */}
      <div className="absolute inset-y-0 right-4 flex items-center z-10">
        <div className="flex flex-col gap-4">
          {current > 0 && (
            <button
              onClick={() => goTo(current - 1)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              ↑
            </button>
          )}
          {current < items.length - 1 && (
            <button
              onClick={() => goTo(current + 1)}
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur border border-white/20 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              ↓
            </button>
          )}
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-0 inset-x-0 p-6 z-10">
        {item.categoryName && (
          <div className="inline-block text-xs text-orange-400 bg-orange-400/10 border border-orange-400/30 rounded-full px-3 py-1 mb-2 backdrop-blur">
            {item.categoryName}
          </div>
        )}
        <h2 className="text-white text-2xl font-bold leading-tight">{item.title}</h2>
        {item.description && (
          <p className="text-white/70 text-sm mt-1 line-clamp-2">{item.description}</p>
        )}
        {item.price !== undefined && (
          <div className="mt-3 text-orange-400 text-xl font-bold">${item.price.toFixed(2)}</div>
        )}

        {/* Swipe hint */}
        <div className="mt-4 flex items-center gap-2 text-white/40 text-xs">
          <span>↑↓</span>
          <span>Swipe to browse</span>
          <span className="ml-auto">← Swipe to close</span>
        </div>
      </div>

      {/* Floating action buttons */}
      <div className="absolute right-4 bottom-32 flex flex-col gap-3 z-10">
        <FloatingBtn icon="❤️" label="Like" />
        <FloatingBtn icon="🔗" label="Share" />
        <FloatingBtn icon="🛒" label="Order" />
      </div>
    </div>
  )
}

function FloatingBtn({ icon, label }: { icon: string; label: string }) {
  const [active, setActive] = useState(false)
  return (
    <button
      onClick={() => setActive(a => !a)}
      className={`w-12 h-12 rounded-full backdrop-blur border transition-all duration-200 flex flex-col items-center justify-center gap-0.5 ${
        active
          ? 'bg-orange-500 border-orange-400 scale-110'
          : 'bg-white/10 border-white/20 hover:bg-white/20'
      }`}
    >
      <span className="text-lg leading-none">{icon}</span>
      <span className="text-[8px] text-white/80">{label}</span>
    </button>
  )
}
