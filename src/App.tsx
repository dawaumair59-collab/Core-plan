import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import SchemaGuide from './pages/SchemaGuide'
import RestaurantSetup from './pages/RestaurantSetup'
import MenuManager from './pages/MenuManager'
import PublicMenu from './pages/PublicMenu'
import type { Restaurant } from './types/database'

type Page = 'dashboard' | 'schema' | 'setup' | 'menu' | 'public'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [createdRestaurant, setCreatedRestaurant] = useState<Restaurant | null>(null)
  const [publicSlug, setPublicSlug] = useState<string>('')

  const handleSetupComplete = (restaurant: Restaurant) => {
    setCreatedRestaurant(restaurant)
    setPage('dashboard')
  }

  // Full-screen pages (no nav)
  if (page === 'setup') return <RestaurantSetup onComplete={handleSetupComplete} />
  if (page === 'public' && publicSlug) return <PublicMenu slug={publicSlug} onBack={() => setPage('dashboard')} />

  const navItems: { key: Page; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'menu', label: '🍽️ Menu Manager' },
    { key: 'schema', label: 'Schema & SQL' },
  ]

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">R</div>
            <span className="font-semibold text-lg tracking-tight">RestaurantOS</span>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full hidden sm:inline">SaaS</span>
          </div>
          <nav className="flex items-center gap-1">
            {navItems.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setPage(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  page === key ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                {label}
              </button>
            ))}
            <div className="w-px h-5 bg-zinc-700 mx-1" />
            <button
              onClick={() => setPage('setup')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-orange-500 hover:text-white transition-colors flex items-center gap-1"
            >
              + New
            </button>
          </nav>
        </div>
      </header>

      {/* Success banner */}
      {createdRestaurant && page === 'dashboard' && (
        <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-2.5">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-green-400">
              <span>🎉</span>
              <span>
                <strong>{createdRestaurant.name}</strong> created!{' '}
                <button
                  onClick={() => { setPublicSlug(createdRestaurant.slug); setPage('public') }}
                  className="underline hover:text-green-300 transition-colors"
                >
                  View public menu →
                </button>
              </span>
            </div>
            <button onClick={() => setCreatedRestaurant(null)} className="text-green-600 hover:text-green-400 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      <main className={`max-w-7xl mx-auto px-4 py-8 ${page === 'menu' ? 'flex flex-col h-[calc(100vh-64px)]' : ''}`}>
        {page === 'dashboard' && (
          <Dashboard
            onNewRestaurant={() => setPage('setup')}
            onViewMenu={(slug) => { setPublicSlug(slug); setPage('public') }}
          />
        )}
        {page === 'menu' && <MenuManager />}
        {page === 'schema' && <SchemaGuide />}
      </main>
    </div>
  )
}
