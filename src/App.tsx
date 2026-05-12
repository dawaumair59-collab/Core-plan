import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from './lib/supabase'
import { CinematicLoader } from './components/PremiumEffects'
import type { Restaurant } from './types/database'
import type { User } from '@supabase/supabase-js'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const SchemaGuide = lazy(() => import('./pages/SchemaGuide'))
const RestaurantSetup = lazy(() => import('./pages/RestaurantSetup'))
const MenuManager = lazy(() => import('./pages/MenuManager'))
const PublicMenu = lazy(() => import('./pages/PublicMenu'))
const AnalyticsDashboard = lazy(() => import('./pages/AnalyticsDashboard'))
const Pricing = lazy(() => import('./pages/Pricing'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const AuthPage = lazy(() => import('./pages/AuthPage'))

type Page = 'landing' | 'auth' | 'dashboard' | 'schema' | 'setup' | 'menu' | 'public' | 'analytics' | 'pricing'

const NAV: { key: Page; label: string; icon: string }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { key: 'menu', label: 'Menu', icon: '🍽️' },
  { key: 'analytics', label: 'Analytics', icon: '📊' },
  { key: 'pricing', label: 'Pricing', icon: '💳' },
  { key: 'schema', label: 'Schema', icon: '🗄️' },
]

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-zinc-500 text-sm">Loading…</span>
      </div>
    </div>
  )
}

function FullPageLoader() {
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [page, setPage] = useState<Page>('dashboard')
  const [createdRestaurant, setCreatedRestaurant] = useState<Restaurant | null>(null)
  const [publicSlug, setPublicSlug] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const navigate = (p: Page) => {
    setLoading(true)
    setTimeout(() => { setPage(p); setLoading(false) }, 200)
  }

  const handleSetupComplete = (restaurant: Restaurant) => {
    setCreatedRestaurant(restaurant)
    navigate('dashboard')
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setPage('landing')
  }

  // Still resolving auth state
  if (user === undefined) {
    return <FullPageLoader />
  }

  // Public menu page — accessible without auth
  if (page === 'public' && publicSlug) {
    return (
      <Suspense fallback={<FullPageLoader />}>
        <PublicMenu slug={publicSlug} onBack={() => navigate(user ? 'dashboard' : 'landing')} />
      </Suspense>
    )
  }

  // Auth page — sign in / sign up
  if (page === 'auth' || (!user && page !== 'landing')) {
    return (
      <Suspense fallback={<FullPageLoader />}>
        <AuthPage
          onAuth={() => navigate('dashboard')}
          onBack={() => navigate('landing')}
        />
      </Suspense>
    )
  }

  // Landing page — show to unauthenticated visitors or when explicitly navigated
  if (page === 'landing' || !user) {
    return (
      <Suspense fallback={<FullPageLoader />}>
        <LandingPage
          onGetStarted={() => navigate('auth')}
          onViewDemo={() => navigate('auth')}
          onSignIn={() => navigate('auth')}
          showAuth={!user}
        />
      </Suspense>
    )
  }

  // Setup wizard — full-screen, no nav
  if (page === 'setup') {
    return (
      <Suspense fallback={<FullPageLoader />}>
        <RestaurantSetup onComplete={handleSetupComplete} onBack={() => navigate('dashboard')} />
      </Suspense>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <CinematicLoader visible={loading} label="Loading" />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/90 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
          {/* Logo */}
          <button onClick={() => navigate('dashboard')} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-orange-500/30 group-hover:shadow-orange-500/50 transition-shadow">R</div>
            <span className="font-black text-base tracking-tight">RestaurantOS</span>
          </button>

          {/* Nav */}
          <nav className="flex items-center gap-0.5">
            {NAV.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => navigate(key)}
                className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                  page === key
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                }`}
              >
                {page === key && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-orange-500 rounded-lg"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                  />
                )}
                <span className="hidden sm:inline">{icon}</span>
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{icon}</span>
              </button>
            ))}
            <div className="w-px h-5 bg-zinc-700 mx-1" />
            <button
              onClick={() => navigate('setup')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white transition-all border border-orange-500/30 hover:border-transparent flex items-center gap-1"
            >
              + <span className="hidden sm:inline">New</span>
            </button>
            <div className="w-px h-5 bg-zinc-700 mx-1" />
            {/* User menu */}
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
                <div className="w-5 h-5 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
                  <span className="text-orange-400 text-xs font-bold">{user.email?.[0]?.toUpperCase()}</span>
                </div>
                <span className="text-xs text-zinc-400 max-w-[100px] truncate">{user.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="px-2.5 py-1.5 rounded-lg text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-all border border-transparent hover:border-red-500/20"
                title="Sign out"
              >
                Sign out
              </button>
            </div>
          </nav>
        </div>
      </header>

      {/* Success banner */}
      <AnimatePresence>
        {createdRestaurant && page === 'dashboard' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-green-500/10 border-b border-green-500/20"
          >
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-3 text-sm text-green-400">
                <span>🎉</span>
                <span>
                  <strong>{createdRestaurant.name}</strong> created!{' '}
                  <button
                    onClick={() => { setPublicSlug(createdRestaurant.slug); navigate('public') }}
                    className="underline hover:text-green-300 transition-colors"
                  >
                    View public menu →
                  </button>
                </span>
              </div>
              <button onClick={() => setCreatedRestaurant(null)} className="text-green-700 hover:text-green-400 text-lg leading-none transition-colors">×</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Suspense fallback={<PageLoader />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {page === 'dashboard' && (
                <Dashboard
                  onNewRestaurant={() => navigate('setup')}
                  onViewMenu={(slug) => { setPublicSlug(slug); navigate('public') }}
                />
              )}
              {page === 'menu' && <MenuManager />}
              {page === 'analytics' && <AnalyticsDashboard />}
              {page === 'pricing' && <Pricing />}
              {page === 'schema' && <SchemaGuide />}
            </motion.div>
          </AnimatePresence>
        </Suspense>
      </main>
    </div>
  )
}
