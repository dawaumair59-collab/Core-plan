import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Ambient floating particles ───────────────────────────────────────────────
export function AmbientParticles({ count = 25, color = '#f97316' }: { count?: number; color?: string }) {
  const particles = Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 1 + Math.random() * 3,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 10,
    opacity: 0.1 + Math.random() * 0.25,
  }))

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full animate-float"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: color,
            opacity: p.opacity,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            filter: `blur(${p.size > 2 ? 1 : 0}px)`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Glow border card ─────────────────────────────────────────────────────────
export function GlowCard({
  children,
  className = '',
  glowColor = '#f97316',
  intensity = 'medium',
}: {
  children: React.ReactNode
  className?: string
  glowColor?: string
  intensity?: 'low' | 'medium' | 'high'
}) {
  const [hovered, setHovered] = useState(false)
  const glowOpacity = { low: 0.15, medium: 0.3, high: 0.5 }[intensity]

  return (
    <motion.div
      className={`relative ${className}`}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Glow halo */}
      <motion.div
        className="absolute inset-0 rounded-[inherit] pointer-events-none"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{ boxShadow: `0 0 40px 8px ${glowColor}${Math.round(glowOpacity * 255).toString(16).padStart(2, '0')}` }}
      />
      {children}
    </motion.div>
  )
}

// ─── Cinematic page loader ────────────────────────────────────────────────────
export function CinematicLoader({ visible, label = 'Loading' }: { visible: boolean; label?: string }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-zinc-950"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeInOut' } }}
        >
          <AmbientParticles count={30} />
          <motion.div
            className="relative flex flex-col items-center gap-6"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            {/* Spinning ring */}
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full border-2 border-orange-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-orange-500 animate-spin" />
              <div className="absolute inset-2 rounded-full border border-orange-500/10 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center text-2xl">🍽️</div>
            </div>

            <div className="text-center">
              <div className="text-white font-semibold text-lg">{label}</div>
              <div className="flex gap-1 mt-2 justify-center">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-orange-500"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// ─── Animated counter ─────────────────────────────────────────────────────────
export function AnimatedCounter({
  value,
  prefix = '',
  suffix = '',
  duration = 1.5,
  className = '',
}: {
  value: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const [display, setDisplay] = useState(0)
  const startRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    startRef.current = null
    const animate = (ts: number) => {
      if (!startRef.current) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / (duration * 1000), 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(eased * value))
      if (progress < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  return (
    <span className={className}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  )
}

// ─── Shimmer skeleton ─────────────────────────────────────────────────────────
export function ShimmerSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-zinc-800 rounded-lg ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  )
}

// ─── Premium badge ─────────────────────────────────────────────────────────────
export function PremiumBadge({ plan }: { plan: string }) {
  const styles: Record<string, { bg: string; text: string; icon: string }> = {
    free: { bg: 'bg-zinc-700/50 border-zinc-600', text: 'text-zinc-400', icon: '○' },
    pro: { bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', icon: '◆' },
    premium: { bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', icon: '★' },
    enterprise: { bg: 'bg-purple-500/10 border-purple-500/30', text: 'text-purple-400', icon: '♛' },
  }
  const s = styles[plan.toLowerCase()] ?? styles.free
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full border font-medium ${s.bg} ${s.text}`}>
      {s.icon} {plan.charAt(0).toUpperCase() + plan.slice(1)}
    </span>
  )
}

// ─── Gradient text ────────────────────────────────────────────────────────────
export function GradientText({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`bg-clip-text text-transparent ${className}`}
      style={{ backgroundImage: 'linear-gradient(135deg, #f97316 0%, #fbbf24 50%, #f97316 100%)' }}
    >
      {children}
    </span>
  )
}
