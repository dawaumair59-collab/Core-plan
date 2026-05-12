import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import SchemaGuide from './pages/SchemaGuide'

type Page = 'dashboard' | 'schema'

export default function App() {
  const [page, setPage] = useState<Page>('dashboard')

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
            {(['dashboard', 'schema'] as Page[]).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                  page === p
                    ? 'bg-orange-500 text-white'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
                }`}
              >
                {p === 'schema' ? 'Schema & SQL' : 'Dashboard'}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {page === 'dashboard' && <Dashboard />}
        {page === 'schema' && <SchemaGuide />}
      </main>
    </div>
  )
}
