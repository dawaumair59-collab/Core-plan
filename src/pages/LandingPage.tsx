import { useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import { AmbientParticles, GlowCard, GradientText, AnimatedCounter } from '../components/PremiumEffects'

interface Props {
  onGetStarted: () => void
  onViewDemo: () => void
  onSignIn?: () => void
  showAuth?: boolean
}

const FEATURES = [
  { icon: '🍽️', title: 'Smart Menu Builder', desc: 'Drag-and-drop menu management with categories, pricing, allergens, and beautiful card UI.' },
  { icon: '🎬', title: 'Cinematic Video Menus', desc: 'Attach food videos to items. Customers watch Instagram-style reels before ordering.' },
  { icon: '📊', title: 'Real-time Analytics', desc: 'Track views, engagement, popular dishes, and video plays with beautiful charts.' },
  { icon: '📱', title: 'QR Menu System', desc: 'Generate branded QR codes. Customers scan to see your live menu on any device.' },
  { icon: '🎨', title: 'Premium Themes', desc: 'Choose from 6 luxury themes — Ember, Ocean, Forest, Midnight, Sunset, Minimal.' },
  { icon: '💳', title: 'Subscription Plans', desc: 'Grow from free to enterprise. Razorpay-powered billing with instant upgrades.' },
]

const TESTIMONIALS = [
  { name: 'Priya Sharma', role: 'Owner, Spice Garden', avatar: '👩‍🍳', text: 'Our orders increased 40% after adding food videos. Customers love watching the dish before ordering!', rating: 5 },
  { name: 'Rohan Mehta', role: 'GM, The Urban Plate', avatar: '👨‍💼', text: 'The QR menu system completely replaced our physical menus. Setup took 20 minutes.', rating: 5 },
  { name: 'Aisha Patel', role: 'Chef-Owner, Saffron', avatar: '👩‍🦱', text: 'The analytics dashboard showed us our pasta section was invisible. Fixed it, sales doubled.', rating: 5 },
]

const STATS = [
  { value: 2400, suffix: '+', label: 'Restaurants' },
  { value: 98, suffix: 'K', label: 'Menu items live' },
  { value: 99, suffix: '.9%', label: 'Uptime SLA' },
  { value: 4, suffix: '.9★', label: 'Avg rating' },
]

const NAV_ITEMS = ['Features', 'Demo', 'Pricing', 'Testimonials', 'FAQ']

export default function LandingPage({ onGetStarted, onViewDemo, onSignIn, showAuth }: Props) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const { scrollYProgress } = useScroll()
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, 80])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 overflow-x-hidden">
      {/* Nav */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-500 ${scrolled ? 'bg-zinc-950/90 backdrop-blur-xl border-b border-zinc-800/60 py-3' : 'py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/30">R</div>
            <span className="font-black text-lg tracking-tight">RestaurantOS</span>
          </div>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onGetStarted} className="hidden md:block px-4 py-2 rounded-lg text-sm text-zinc-400 hover:text-white transition-colors">
              Sign in
            </button>
            <button onClick={onGetStarted}
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-orange-500/30 hover:scale-[1.02]">
              Get started free
            </button>
            <button onClick={() => setMobileMenu(m => !m)} className="md:hidden w-8 h-8 flex flex-col justify-center gap-1.5 items-center">
              <span className={`w-5 h-0.5 bg-white transition-all ${mobileMenu ? 'rotate-45 translate-y-2' : ''}`} />
              <span className={`w-5 h-0.5 bg-white transition-all ${mobileMenu ? 'opacity-0' : ''}`} />
              <span className={`w-5 h-0.5 bg-white transition-all ${mobileMenu ? '-rotate-45 -translate-y-2' : ''}`} />
            </button>
          </div>
        </div>
        {/* Mobile menu */}
        <AnimatePresence>
          {mobileMenu && (
            <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="md:hidden overflow-hidden bg-zinc-900 border-t border-zinc-800">
              {NAV_ITEMS.map(item => (
                <a key={item} href={`#${item.toLowerCase()}`} onClick={() => setMobileMenu(false)}
                  className="block px-6 py-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors">
                  {item}
                </a>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
        <AmbientParticles count={40} color="#f97316" />

        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)' }} />
        </div>

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 text-center max-w-5xl mx-auto px-6 space-y-8"
        >
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
            Now with Cloudinary video menus & Razorpay billing
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl lg:text-8xl font-black leading-[1.05] tracking-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            The restaurant<br />
            <GradientText>SaaS platform</GradientText><br />
            <span className="text-zinc-500">your guests deserve.</span>
          </motion.h1>

          <motion.p
            className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Create stunning digital menus, attach cinematic food videos, generate QR codes,
            and track every customer interaction — all from one beautiful dashboard.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <button
              onClick={onGetStarted}
              className="group px-8 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-lg transition-all hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-105 flex items-center justify-center gap-2"
            >
              Start for free
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </button>
            <button
              onClick={onViewDemo}
              className="px-8 py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-lg transition-all border border-zinc-700 hover:border-zinc-600 flex items-center justify-center gap-2"
            >
              🎬 Watch demo
            </button>
          </motion.div>

          <motion.p className="text-sm text-zinc-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
            No credit card required · Free forever on the basic plan
          </motion.p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="text-xs text-zinc-600">Scroll to explore</div>
          <div className="w-5 h-8 rounded-full border border-zinc-700 flex items-start justify-center pt-1.5">
            <motion.div className="w-1 h-2 bg-orange-500 rounded-full" animate={{ y: [0, 12, 0] }} transition={{ duration: 2, repeat: Infinity }} />
          </div>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="py-16 border-y border-zinc-800/50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {STATS.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="text-4xl font-black text-orange-400">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </div>
                <div className="text-sm text-zinc-500 mt-1">{s.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-3">
            <motion.h2 className="text-4xl font-black text-white" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
              Everything you need to <GradientText>dominate</GradientText>
            </motion.h2>
            <p className="text-zinc-400">Built for modern restaurants that want to stand out.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
                <GlowCard className="h-full" intensity="low">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 h-full hover:border-zinc-700 transition-colors">
                    <div className="text-3xl mb-3">{f.icon}</div>
                    <h3 className="font-bold text-white mb-2">{f.title}</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">{f.desc}</p>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Product demo */}
      <section id="demo" className="py-24 px-6 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <motion.h2 className="text-4xl font-black text-white" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
            See it in <GradientText>action</GradientText>
          </motion.h2>
          <motion.div
            className="relative rounded-3xl overflow-hidden border border-zinc-800 shadow-2xl shadow-black/50"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            {/* Fake browser chrome */}
            <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-green-500/60" />
              <div className="flex-1 bg-zinc-800 rounded-full h-5 mx-4" />
            </div>
            {/* Dashboard preview mockup */}
            <div className="bg-zinc-950 p-8 min-h-80 flex items-center justify-center">
              <div className="w-full max-w-2xl space-y-4">
                <div className="flex gap-3">
                  {['Dashboard', 'Menu Manager', 'Analytics', 'Pricing'].map(t => (
                    <div key={t} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${t === 'Dashboard' ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-400'}`}>{t}</div>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {[['👁️', '1,240', 'Views'], ['▶️', '389', 'Plays'], ['🖱️', '856', 'Clicks'], ['🧑', '201', 'Sessions']].map(([icon, val, label]) => (
                    <div key={label} className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                      <div className="text-lg">{icon}</div>
                      <div className="text-orange-400 font-black text-lg">{val}</div>
                      <div className="text-zinc-600 text-xs">{label}</div>
                    </div>
                  ))}
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex gap-4">
                  <div className="flex-1 space-y-2">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-2 bg-zinc-800 rounded-full" style={{ width: `${70 - i * 10}%`, background: i === 0 ? '#f97316' : undefined, opacity: i === 0 ? 1 : 0.4 }} />)}
                  </div>
                  <div className="text-4xl">📈</div>
                </div>
              </div>
            </div>
          </motion.div>
          <button onClick={onGetStarted}
            className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-400 rounded-xl text-white font-semibold text-sm transition-all hover:scale-105">
            Try the real dashboard →
          </button>
        </div>
      </section>

      {/* Pricing preview */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h2 className="text-4xl font-black text-white">Simple <GradientText>pricing</GradientText></h2>
          <p className="text-zinc-400">Start free. Upgrade when you grow.</p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: 'Free', price: '₹0', color: '#71717a', features: '1 restaurant, 20 items' },
              { name: 'Pro', price: '₹999/mo', color: '#3b82f6', features: '3 restaurants, videos, analytics', badge: 'Popular' },
              { name: 'Premium', price: '₹2,499/mo', color: '#f97316', features: 'Unlimited everything + API', badge: 'Best Value' },
            ].map((p, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-left hover:border-zinc-700 transition-colors relative">
                  {p.badge && <div className="absolute -top-2.5 left-4 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: p.color }}>{p.badge}</div>}
                  <div className="font-bold text-white">{p.name}</div>
                  <div className="text-2xl font-black mt-1" style={{ color: p.color }}>{p.price}</div>
                  <p className="text-zinc-500 text-xs mt-2">{p.features}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <button onClick={onGetStarted} className="inline-flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-400 rounded-xl text-white font-semibold transition-all hover:scale-105">
            See full pricing →
          </button>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-6 bg-zinc-900/30">
        <div className="max-w-5xl mx-auto space-y-12">
          <h2 className="text-4xl font-black text-white text-center">Loved by <GradientText>restaurants</GradientText></h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}>
                <GlowCard intensity="low">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <div className="flex text-orange-400 text-sm gap-0.5">{'★'.repeat(t.rating)}</div>
                    <p className="text-zinc-300 text-sm leading-relaxed">"{t.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">{t.avatar}</div>
                      <div>
                        <div className="font-semibold text-white text-sm">{t.name}</div>
                        <div className="text-zinc-500 text-xs">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </GlowCard>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 max-w-2xl mx-auto space-y-4">
        <h2 className="text-4xl font-black text-white text-center mb-10">Questions? <GradientText>Answered.</GradientText></h2>
        {[
          ['Do I need coding knowledge?', 'Zero. The entire platform is visual. Set up in under 30 minutes.'],
          ['Can customers order from the menu?', 'The public menu page shows your dishes beautifully. Order integration (Swiggy/Zomato) is on our roadmap.'],
          ['How do video menus work?', 'Upload any video to a menu item via Cloudinary. Customers see a play button and watch it fullscreen.'],
          ['Is my data secure?', 'All data is stored in Supabase with Row-Level Security. Only you can access your restaurant data.'],
          ['Can I use my own domain?', 'Yes, on the Premium plan. Point your domain to your public menu URL.'],
        ].map(([q, a], i) => (
          <motion.div key={i} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }}>
            <FAQRow question={q} answer={a} />
          </motion.div>
        ))}
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <motion.div
          className="relative max-w-3xl mx-auto text-center rounded-3xl overflow-hidden p-12 border border-orange-500/20"
          style={{ background: 'linear-gradient(135deg, rgba(249,115,22,0.12) 0%, rgba(0,0,0,0) 100%)' }}
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <AmbientParticles count={15} color="#f97316" />
          <div className="relative z-10 space-y-6">
            <h2 className="text-4xl md:text-5xl font-black text-white">
              Ready to <GradientText>transform</GradientText><br />your restaurant?
            </h2>
            <p className="text-zinc-400 text-lg">Join 2,400+ restaurants already using RestaurantOS.</p>
            <button
              onClick={onGetStarted}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-orange-500 hover:bg-orange-400 text-white font-bold text-lg transition-all hover:shadow-2xl hover:shadow-orange-500/30 hover:scale-105"
            >
              Start for free — no card needed
              <span>→</span>
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center text-white font-black text-xs">R</div>
            <span className="font-bold text-sm">RestaurantOS</span>
          </div>
          <div className="text-xs text-zinc-600">© 2026 RestaurantOS. Built with ♥ for restaurants.</div>
          <div className="flex gap-4 text-xs text-zinc-500">
            <a href="#features" className="hover:text-zinc-300">Features</a>
            <a href="#pricing" className="hover:text-zinc-300">Pricing</a>
            <a href="#faq" className="hover:text-zinc-300">FAQ</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FAQRow({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-3">
        <span className="font-medium text-zinc-200 text-sm">{question}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="text-zinc-500 flex-shrink-0">▾</motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <p className="px-5 pb-4 text-sm text-zinc-400 leading-relaxed">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
