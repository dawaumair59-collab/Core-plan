import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { getRestaurants, getSubscription, createSubscription, updateSubscription } from '../lib/api'
import { GlowCard, GradientText, AmbientParticles, AnimatedCounter } from '../components/PremiumEffects'
import type { Restaurant, Subscription } from '../types/database'

const RAZORPAY_KEY = import.meta.env.VITE_RAZORPAY_KEY_ID ?? ''

interface Plan {
  id: string
  name: string
  price: number
  yearlyPrice: number
  icon: string
  color: string
  glow: string
  badge?: string
  features: string[]
  limits: Record<string, string>
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    yearlyPrice: 0,
    icon: '🌱',
    color: '#71717a',
    glow: '#71717a40',
    features: [
      '1 restaurant',
      'Up to 20 menu items',
      'Basic menu page',
      'QR code generation',
      'Supabase-powered',
    ],
    limits: { restaurants: '1', items: '20', videos: '0', analytics: '7 days' },
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 999,
    yearlyPrice: 9990,
    icon: '🚀',
    color: '#3b82f6',
    glow: '#3b82f640',
    badge: 'Popular',
    features: [
      '3 restaurants',
      'Unlimited menu items',
      'Video uploads (Cloudinary)',
      'Instagram Reels viewer',
      'Analytics dashboard',
      'Custom theme selection',
      'QR code download',
      '30-day analytics',
    ],
    limits: { restaurants: '3', items: 'Unlimited', videos: '50', analytics: '30 days' },
  },
  {
    id: 'premium',
    name: 'Premium',
    price: 2499,
    yearlyPrice: 24990,
    icon: '♛',
    color: '#f97316',
    glow: '#f9731640',
    badge: 'Best Value',
    features: [
      'Unlimited restaurants',
      'Unlimited everything',
      'Priority video processing',
      'Advanced analytics (90 days)',
      'Custom domain support',
      'White-label QR codes',
      'Priority support',
      'API access',
    ],
    limits: { restaurants: 'Unlimited', items: 'Unlimited', videos: 'Unlimited', analytics: '90 days' },
  },
]

export default function Pricing() {
  const [yearly, setYearly] = useState(false)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [currentSub, setCurrentSub] = useState<Subscription | null>(null)
  const [processing, setProcessing] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getRestaurants().then(r => {
      setRestaurants(r)
      if (r.length > 0) setSelectedRestaurant(r[0].id)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (selectedRestaurant) {
      getSubscription(selectedRestaurant).then(setCurrentSub).catch(() => {})
    }
  }, [selectedRestaurant])

  const currentPlanId = currentSub?.plan ?? 'free'

  const handleSubscribe = async (plan: Plan) => {
    if (plan.id === 'free') {
      await handleDowngrade(plan)
      return
    }

    setProcessing(plan.id)
    setError(null)

    const amount = (yearly ? plan.yearlyPrice : plan.price) * 100 // paise

    // Load Razorpay
    const loadScript = () => new Promise<boolean>((resolve) => {
      if ((window as unknown as Record<string, unknown>)['Razorpay']) return resolve(true)
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.head.appendChild(script)
    })

    const loaded = await loadScript()
    if (!loaded) {
      setError('Razorpay failed to load. Please check your connection.')
      setProcessing(null)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'
    const restaurant = restaurants.find(r => r.id === selectedRestaurant)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const RazorpayClass = (window as unknown as Record<string, any>)['Razorpay']

    const options = {
      key: RAZORPAY_KEY || 'rzp_test_placeholder',
      amount,
      currency: 'INR',
      name: 'RestaurantOS',
      description: `${plan.name} Plan — ${yearly ? 'Yearly' : 'Monthly'}`,
      image: '/favicon.ico',
      prefill: {
        name: restaurant?.name ?? '',
        email: user?.email ?? '',
      },
      theme: { color: plan.color },
      handler: async (response: { razorpay_payment_id: string }) => {
        try {
          const now = new Date().toISOString()
          const periodEnd = new Date(Date.now() + (yearly ? 365 : 30) * 86400000).toISOString()

          if (currentSub) {
            await updateSubscription(currentSub.id, {
              plan: plan.id,
              status: 'active',
              current_period_start: now,
              current_period_end: periodEnd,
              stripe_subscription_id: response.razorpay_payment_id,
            })
          } else {
            await createSubscription({
              user_id: userId,
              restaurant_id: selectedRestaurant,
              plan: plan.id,
              status: 'active',
              current_period_start: now,
              current_period_end: periodEnd,
              stripe_subscription_id: response.razorpay_payment_id,
            })
          }

          setCurrentSub(await getSubscription(selectedRestaurant))
          setSuccess(`🎉 Successfully upgraded to ${plan.name}!`)
          setTimeout(() => setSuccess(null), 5000)
        } catch {
          setError('Payment succeeded but subscription update failed. Contact support.')
        }
        setProcessing(null)
      },
      modal: { ondismiss: () => setProcessing(null) },
    }

    try {
      const rzp = new RazorpayClass(options)
      rzp.on('payment.failed', () => {
        setError('Payment failed. Please try again.')
        setProcessing(null)
      })
      rzp.open()
    } catch {
      setError('Could not open payment. Add VITE_RAZORPAY_KEY_ID to your secrets.')
      setProcessing(null)
    }
  }

  const handleDowngrade = async (plan: Plan) => {
    setProcessing(plan.id)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'
      const now = new Date().toISOString()
      const periodEnd = new Date(Date.now() + 30 * 86400000).toISOString()

      if (currentSub) {
        await updateSubscription(currentSub.id, { plan: plan.id, status: 'active', current_period_start: now, current_period_end: periodEnd })
      } else {
        await createSubscription({ user_id: userId, restaurant_id: selectedRestaurant, plan: plan.id, status: 'active', current_period_start: now, current_period_end: periodEnd })
      }

      setCurrentSub(await getSubscription(selectedRestaurant))
      setSuccess(`Moved to ${plan.name} plan.`)
      setTimeout(() => setSuccess(null), 3000)
    } catch {
      setError('Failed to update plan.')
    }
    setProcessing(null)
  }

  return (
    <div className="relative min-h-screen pb-24 overflow-hidden">
      <AmbientParticles count={20} color="#f97316" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-12 space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm"
          >
            ✦ Simple, transparent pricing
          </motion.div>
          <motion.h1
            className="text-4xl md:text-5xl font-black text-white leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Choose your <GradientText>power level</GradientText>
          </motion.h1>
          <motion.p
            className="text-zinc-400 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            From first menu to empire — we scale with you.
          </motion.p>

          {/* Billing toggle */}
          <motion.div
            className="inline-flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full p-1.5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <button onClick={() => setYearly(false)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!yearly ? 'bg-orange-500 text-white' : 'text-zinc-400'}`}>
              Monthly
            </button>
            <button onClick={() => setYearly(true)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-1.5 ${yearly ? 'bg-orange-500 text-white' : 'text-zinc-400'}`}>
              Yearly
              <span className="text-xs bg-green-500 text-white px-1.5 py-0.5 rounded-full font-bold">-17%</span>
            </button>
          </motion.div>
        </div>

        {/* Restaurant selector */}
        {restaurants.length > 0 && (
          <div className="flex justify-center">
            <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-400">Manage subscription for:</span>
              <select value={selectedRestaurant} onChange={e => setSelectedRestaurant(e.target.value)} className="input text-sm py-1">
                {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
              {currentSub && (
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  currentPlanId === 'premium' ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                  currentPlanId === 'pro' ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' :
                  'bg-zinc-700/50 border-zinc-600 text-zinc-400'
                }`}>
                  Current: {currentPlanId}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Status banners */}
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-green-500/10 border border-green-500/30 rounded-xl px-4 py-3 text-green-400 text-sm text-center">
              {success}
            </motion.div>
          )}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-red-400 text-sm text-center">
              {error}
              <button onClick={() => setError(null)} className="ml-3 text-red-600 hover:text-red-400">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, i) => {
            const isCurrent = currentPlanId === plan.id
            const isUpgrade = PLANS.findIndex(p => p.id === currentPlanId) < i
            const price = yearly ? plan.yearlyPrice : plan.price

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className={plan.id === 'pro' ? 'md:-mt-4' : ''}
              >
                <GlowCard glowColor={plan.color} intensity={plan.id === 'premium' ? 'high' : 'medium'}>
                  <div className={`relative rounded-2xl border p-6 flex flex-col gap-5 transition-all ${
                    plan.id === 'premium' ? 'bg-gradient-to-b from-orange-500/10 to-zinc-900 border-orange-500/40' :
                    plan.id === 'pro' ? 'bg-zinc-900 border-blue-500/30' :
                    'bg-zinc-900 border-zinc-800'
                  }`}>
                    {/* Badge */}
                    {plan.badge && (
                      <div
                        className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full text-white"
                        style={{ background: plan.color }}
                      >
                        {plan.badge}
                      </div>
                    )}

                    {/* Plan header */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-2xl">{plan.icon}</span>
                        <span className="font-bold text-lg text-white">{plan.name}</span>
                        {isCurrent && (
                          <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/30 text-green-400">
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-black" style={{ color: plan.color }}>
                          {plan.price === 0 ? 'Free' : `₹${price}`}
                        </span>
                        {plan.price > 0 && (
                          <span className="text-zinc-500 text-sm mb-1">/{yearly ? 'yr' : 'mo'}</span>
                        )}
                      </div>
                      {plan.price > 0 && yearly && (
                        <div className="text-xs text-green-400 mt-1">Save ₹{(plan.price * 12 - plan.yearlyPrice).toLocaleString()}/year</div>
                      )}
                    </div>

                    {/* Features */}
                    <ul className="space-y-2.5 flex-1">
                      {plan.features.map((f, fi) => (
                        <li key={fi} className="flex items-start gap-2 text-sm text-zinc-300">
                          <span style={{ color: plan.color }} className="mt-0.5 flex-shrink-0">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>

                    {/* Limits */}
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(plan.limits).map(([k, v]) => (
                        <div key={k} className="bg-zinc-800/50 rounded-lg px-2 py-1.5 text-center">
                          <div className="text-xs text-zinc-500 capitalize">{k}</div>
                          <div className="text-xs font-bold mt-0.5" style={{ color: plan.color }}>{v}</div>
                        </div>
                      ))}
                    </div>

                    {/* CTA */}
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={isCurrent || processing !== null || !selectedRestaurant}
                      className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${
                        isCurrent
                          ? 'bg-green-500/10 border border-green-500/30 text-green-400 cursor-default'
                          : 'text-white hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                      style={isCurrent ? {} : { background: plan.color }}
                    >
                      {processing === plan.id ? (
                        <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Processing…</>
                      ) : isCurrent ? '✓ Current Plan'
                        : isUpgrade ? `Upgrade to ${plan.name}`
                        : plan.price === 0 ? 'Downgrade to Free'
                        : `Get ${plan.name}`}
                    </button>
                  </div>
                </GlowCard>
              </motion.div>
            )
          })}
        </div>

        {/* Feature comparison table */}
        <motion.div
          className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="p-6 border-b border-zinc-800">
            <h2 className="font-bold text-white text-lg">Full Comparison</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  <th className="text-left p-4 text-zinc-400 font-medium w-48">Feature</th>
                  {PLANS.map(p => (
                    <th key={p.id} className="p-4 text-center">
                      <span className="font-bold" style={{ color: p.color }}>{p.name}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Restaurants', '1', '3', 'Unlimited'],
                  ['Menu items', '20', 'Unlimited', 'Unlimited'],
                  ['Video uploads', '—', '50', 'Unlimited'],
                  ['Reels viewer', '—', '✓', '✓'],
                  ['Analytics', '—', '30 days', '90 days'],
                  ['Custom themes', '—', '✓', '✓'],
                  ['QR download', '✓', '✓', '✓'],
                  ['API access', '—', '—', '✓'],
                  ['Priority support', '—', '—', '✓'],
                ].map(([feature, ...vals], i) => (
                  <tr key={i} className={`border-b border-zinc-800/50 ${i % 2 === 0 ? 'bg-zinc-800/20' : ''}`}>
                    <td className="p-4 text-zinc-400">{feature}</td>
                    {vals.map((v, j) => (
                      <td key={j} className="p-4 text-center">
                        <span className={v === '—' ? 'text-zinc-700' : v === '✓' ? 'text-green-400' : 'text-zinc-300'}>
                          {v}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* FAQ */}
        <div className="space-y-3 max-w-2xl mx-auto">
          <h2 className="text-xl font-bold text-white text-center mb-6">Frequently Asked</h2>
          {[
            ['Can I cancel anytime?', 'Yes. Cancel anytime from your billing section. No hidden fees or lock-ins.'],
            ['Is Razorpay secure?', 'Razorpay is PCI-DSS compliant and trusted by 500,000+ businesses in India.'],
            ['What happens after I upgrade?', 'Your plan activates immediately and your limits increase right away.'],
            ['Do you offer refunds?', 'We offer a 7-day money-back guarantee on all paid plans.'],
          ].map(([q, a], i) => (
            <FAQItem key={i} question={q} answer={a} />
          ))}
        </div>
      </div>
    </div>
  )
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left px-5 py-4 flex items-center justify-between gap-3">
        <span className="font-medium text-zinc-200 text-sm">{question}</span>
        <span className={`text-zinc-500 transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <p className="px-5 pb-4 text-sm text-zinc-400">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
