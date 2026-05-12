import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import SchemaGuide from './pages/SchemaGuide'
import RestaurantSetup from './pages/RestaurantSetup'
import type { Restaurant } from './types/database'

type Page = 'dashboard' | 'schema' | 'setup'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const [createdRestaurant, setCreatedRestaurant] = useState<Restaurant | null>(null)

  const handleSetupComplete = (restaurant: Restaurant) => {
    setCreatedRestaurant(restaurant)
    setPage('dashboard')
  }

  // Setup page gets full screen, no nav
  if (page === 'setup') {
    return <RestaurantSetup onComplete={handleSetupComplete} />
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm">R</div>
            <span className="font-semibold text-lg tracking-tight">RestaurantOS</span>
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">SaaS Platform</span>
          </div>
          <nav className="flex gap-1">
            <button
              onClick={() => setPage('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                page === 'dashboard' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setPage('schema')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                page === 'schema' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              }`}
            >
              Schema & SQL
            </button>
            <button
              onClick={() => setPage('setup')}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-zinc-800 text-zinc-300 hover:bg-orange-500 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>+</span> New Restaurant
            </button>
          </nav>
        </div>
      </header>

      {/* Success banner after creation */}
      {createdRestaurant && page === 'dashboard' && (
        <div className="bg-green-500/10 border-b border-green-500/20 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-green-400">
              <span className="text-lg">🎉</span>
              <span>
                <strong>{createdRestaurant.name}</strong> was created successfully!
                {' '}Your slug: <code className="font-mono bg-green-500/10 px-1 rounded">/{createdRestaurant.slug}</code>
              </span>
            </div>
            <button onClick={() => setCreatedRestaurant(null)} className="text-green-600 hover:text-green-400 text-lg leading-none">×</button>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 py-8">
        {page === 'dashboard' && <Dashboard onNewRestaurant={() => setPage('setup')} />}
        {page === 'schema' && <SchemaGuide />}
      </main>
    </div>
  )
}
