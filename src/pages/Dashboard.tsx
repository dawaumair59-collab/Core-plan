import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  getRestaurants, createRestaurant, deleteRestaurant,
  getMenuCategories, createMenuCategory,
  getMenuItems, createMenuItem,
  getVideos, createVideo,
  getAnalyticsSummary, trackEvent,
  getSubscription, createSubscription,
} from '../lib/api'
import type { Restaurant, MenuCategory, MenuItem, Video } from '../types/database'

type Tab = 'restaurants' | 'menu' | 'videos' | 'analytics' | 'subscriptions'

export default function Dashboard({ onNewRestaurant }: { onNewRestaurant?: () => void }) {
  const [tab, setTab] = useState<Tab>('restaurants')
  const [connected, setConnected] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase.from('restaurants').select('count', { count: 'exact', head: true })
      .then(({ error }) => {
        if (error) {
          setConnected(false)
          if (error.message.includes('does not exist') || error.code === '42P01') {
            setError('Tables not found — paste the SQL from the "Schema & SQL" tab into your Supabase SQL Editor and run it.')
          } else {
            setError(error.message)
          }
        } else {
          setConnected(true)
        }
      })
  }, [])

  const tabs: { key: Tab; label: string; icon: string }[] = [
    { key: 'restaurants', label: 'Restaurants', icon: '🏪' },
    { key: 'menu', label: 'Menu', icon: '🍽️' },
    { key: 'videos', label: 'Videos', icon: '🎥' },
    { key: 'analytics', label: 'Analytics', icon: '📊' },
    { key: 'subscriptions', label: 'Subscriptions', icon: '💳' },
  ]

  return (
    <div className="space-y-6">
      {/* Connection status */}
      <div className={`rounded-xl px-4 py-3 flex items-center gap-3 text-sm border ${
        connected === null
          ? 'bg-zinc-800/50 border-zinc-700 text-zinc-400'
          : connected
            ? 'bg-green-500/10 border-green-500/30 text-green-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          connected === null ? 'bg-zinc-500 animate-pulse' : connected ? 'bg-green-500' : 'bg-red-500'
        }`} />
        {connected === null && 'Connecting to Supabase…'}
        {connected === true && 'Connected to Supabase — all tables ready'}
        {connected === false && (error ?? 'Supabase connection failed — check your credentials and run the schema SQL')}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-orange-500 text-white'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            <span className="hidden sm:inline">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'restaurants' && <RestaurantsTab onNewRestaurant={onNewRestaurant} />}
      {tab === 'menu' && <MenuTab />}
      {tab === 'videos' && <VideosTab />}
      {tab === 'analytics' && <AnalyticsTab />}
      {tab === 'subscriptions' && <SubscriptionsTab />}
    </div>
  )
}

// ─── Restaurants Tab ─────────────────────────────────────────────────────────

function RestaurantsTab({ onNewRestaurant }: { onNewRestaurant?: () => void }) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: '', slug: '', cuisine_type: '' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setRestaurants(await getRestaurants())
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.slug) return
    setSaving(true)
    setErr(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'
      await createRestaurant({ ...form, user_id: userId })
      setForm({ name: '', slug: '', cuisine_type: '' })
      await load()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteRestaurant(id)
      await load()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to delete')
    }
  }

  return (
    <SectionLayout
      title="Restaurants"
      description="Manage your restaurant profiles."
      action={onNewRestaurant && (
        <button onClick={onNewRestaurant} className="btn-primary flex items-center gap-1.5">
          <span>+</span> New Restaurant
        </button>
      )}
    >
      {err && <ErrorBanner message={err} />}

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {restaurants.length === 0 && (
            <div className="text-center py-16 space-y-4">
              <div className="text-5xl">🏪</div>
              <div>
                <p className="font-medium text-zinc-300">No restaurants yet</p>
                <p className="text-sm text-zinc-500 mt-1">Set up your first restaurant with the guided wizard.</p>
              </div>
              {onNewRestaurant && (
                <button onClick={onNewRestaurant} className="btn-primary mx-auto inline-flex items-center gap-1.5 px-6">
                  <span>+</span> Set up your first restaurant
                </button>
              )}
            </div>
          )}
          {restaurants.map(r => (
            <div key={r.id} className="flex items-center gap-4 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 hover:border-zinc-700 transition-colors">
              {/* Logo avatar */}
              <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-zinc-700 flex-shrink-0 overflow-hidden flex items-center justify-center text-lg font-bold text-orange-400">
                {(r as Restaurant & { logo_url?: string | null }).logo_url
                  ? <img src={(r as Restaurant & { logo_url?: string | null }).logo_url!} alt="" className="w-full h-full object-cover" />
                  : r.name[0]?.toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{r.name}</div>
                <div className="text-xs text-zinc-500">
                  /{r.slug}
                  {r.cuisine_type && ` · ${r.cuisine_type}`}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${r.is_active ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                  {r.is_active ? 'Active' : 'Inactive'}
                </span>
                <button onClick={() => handleDelete(r.id)} className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionLayout>
  )
}

// ─── Menu Tab ────────────────────────────────────────────────────────────────

function MenuTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [catForm, setCatForm] = useState({ name: '', description: '' })
  const [itemForm, setItemForm] = useState({ name: '', price: '', category_id: '', description: '' })

  useEffect(() => {
    getRestaurants().then(setRestaurants).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedRestaurant) return
    setLoading(true)
    Promise.all([
      getMenuCategories(selectedRestaurant),
      getMenuItems(selectedRestaurant),
    ]).then(([cats, its]) => {
      setCategories(cats)
      setItems(its)
    }).catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [selectedRestaurant])

  const addCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRestaurant || !catForm.name) return
    try {
      await createMenuCategory({ restaurant_id: selectedRestaurant, ...catForm })
      setCatForm({ name: '', description: '' })
      setCategories(await getMenuCategories(selectedRestaurant))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRestaurant || !itemForm.name || !itemForm.category_id) return
    try {
      await createMenuItem({
        restaurant_id: selectedRestaurant,
        category_id: itemForm.category_id,
        name: itemForm.name,
        description: itemForm.description || null,
        price: parseFloat(itemForm.price) || 0,
      })
      setItemForm({ name: '', price: '', category_id: '', description: '' })
      setItems(await getMenuItems(selectedRestaurant))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <SectionLayout title="Menu Management" description="Categories and items per restaurant.">
      <div className="mb-6">
        <label className="text-xs text-zinc-400 mb-1 block">Select Restaurant</label>
        <select value={selectedRestaurant} onChange={e => setSelectedRestaurant(e.target.value)} className="input w-full max-w-xs">
          <option value="">— choose —</option>
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {err && <ErrorBanner message={err} />}

      {selectedRestaurant && (
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium mb-3 text-zinc-300">Categories</h3>
            <form onSubmit={addCategory} className="flex gap-2 mb-3">
              <input value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Category name" className="input flex-1" required />
              <button type="submit" className="btn-primary">Add</button>
            </form>
            {loading ? <Spinner /> : (
              <div className="space-y-2">
                {categories.map(c => (
                  <div key={c.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm">{c.name}</div>
                ))}
                {categories.length === 0 && <Empty text="No categories yet." />}
              </div>
            )}
          </div>

          <div>
            <h3 className="font-medium mb-3 text-zinc-300">Menu Items</h3>
            <form onSubmit={addItem} className="space-y-2 mb-3">
              <select value={itemForm.category_id} onChange={e => setItemForm(f => ({ ...f, category_id: e.target.value }))} className="input w-full" required>
                <option value="">— select category —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Item name" className="input w-full" required />
              <input value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))}
                placeholder="Price (e.g. 12.99)" type="number" step="0.01" className="input w-full" required />
              <button type="submit" className="btn-primary w-full">Add Item</button>
            </form>
            {loading ? <Spinner /> : (
              <div className="space-y-2">
                {items.map(i => (
                  <div key={i.id} className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm flex justify-between">
                    <span>{i.name}</span>
                    <span className="text-orange-400 font-mono">${Number(i.price).toFixed(2)}</span>
                  </div>
                ))}
                {items.length === 0 && <Empty text="No items yet." />}
              </div>
            )}
          </div>
        </div>
      )}
    </SectionLayout>
  )
}

// ─── Videos Tab ──────────────────────────────────────────────────────────────

function VideosTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [items, setItems] = useState<MenuItem[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('')
  const [form, setForm] = useState({ title: '', video_url: '', menu_item_id: '' })
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { getRestaurants().then(setRestaurants).catch(() => {}) }, [])

  useEffect(() => {
    if (!selectedRestaurant) return
    Promise.all([
      getMenuItems(selectedRestaurant),
      getVideos(selectedRestaurant),
    ]).then(([i, v]) => { setItems(i); setVideos(v) }).catch(e => setErr(e.message))
  }, [selectedRestaurant])

  const addVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRestaurant || !form.title || !form.video_url || !form.menu_item_id) return
    try {
      await createVideo({ restaurant_id: selectedRestaurant, ...form })
      setForm({ title: '', video_url: '', menu_item_id: '' })
      setVideos(await getVideos(selectedRestaurant))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    }
  }

  return (
    <SectionLayout title="Videos" description="Videos are linked to specific menu items.">
      <div className="mb-6">
        <label className="text-xs text-zinc-400 mb-1 block">Select Restaurant</label>
        <select value={selectedRestaurant} onChange={e => setSelectedRestaurant(e.target.value)} className="input w-full max-w-xs">
          <option value="">— choose —</option>
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {err && <ErrorBanner message={err} />}

      {selectedRestaurant && (
        <>
          <form onSubmit={addVideo} className="grid sm:grid-cols-3 gap-2 mb-6">
            <select value={form.menu_item_id} onChange={e => setForm(f => ({ ...f, menu_item_id: e.target.value }))} className="input" required>
              <option value="">— menu item —</option>
              {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Video title" className="input" required />
            <input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
              placeholder="Video URL" className="input" required />
            <button type="submit" className="btn-primary sm:col-span-3">Add Video</button>
          </form>

          <div className="space-y-2">
            {videos.map(v => (
              <div key={v.id} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{v.title}</div>
                  <div className="text-xs text-zinc-500 truncate max-w-xs">{v.video_url}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-500">{v.view_count} views</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${v.is_published ? 'bg-green-500/20 text-green-400' : 'bg-zinc-700 text-zinc-400'}`}>
                    {v.is_published ? 'Published' : 'Draft'}
                  </span>
                </div>
              </div>
            ))}
            {videos.length === 0 && <Empty text="No videos linked yet." />}
          </div>
        </>
      )}
    </SectionLayout>
  )
}

// ─── Analytics Tab ───────────────────────────────────────────────────────────

function AnalyticsTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('')
  const [summary, setSummary] = useState<Record<string, number>>({})
  const [tracking, setTracking] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { getRestaurants().then(setRestaurants).catch(() => {}) }, [])

  useEffect(() => {
    if (!selectedRestaurant) return
    getAnalyticsSummary(selectedRestaurant)
      .then(setSummary)
      .catch(e => setErr(e.message))
  }, [selectedRestaurant])

  const sendTestEvent = async () => {
    if (!selectedRestaurant) return
    setTracking(true)
    try {
      await trackEvent({ restaurant_id: selectedRestaurant, event_type: 'page_view', metadata: { page: 'test', ts: new Date().toISOString() } })
      setSummary(await getAnalyticsSummary(selectedRestaurant))
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setTracking(false)
    }
  }

  const events = Object.entries(summary)

  return (
    <SectionLayout title="Analytics" description="Event tracking per restaurant.">
      <div className="flex flex-wrap items-end gap-4 mb-6">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">Select Restaurant</label>
          <select value={selectedRestaurant} onChange={e => setSelectedRestaurant(e.target.value)} className="input">
            <option value="">— choose —</option>
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>
        {selectedRestaurant && (
          <button onClick={sendTestEvent} disabled={tracking} className="btn-primary">
            {tracking ? 'Tracking…' : '+ Track test event'}
          </button>
        )}
      </div>

      {err && <ErrorBanner message={err} />}

      {events.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {events.map(([type, count]) => (
            <div key={type} className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4">
              <div className="text-2xl font-bold text-orange-400">{count}</div>
              <div className="text-xs text-zinc-400 mt-1 font-mono">{type}</div>
            </div>
          ))}
        </div>
      )}
      {selectedRestaurant && events.length === 0 && <Empty text="No analytics events yet. Click 'Track test event' to get started." />}
    </SectionLayout>
  )
}

// ─── Subscriptions Tab ───────────────────────────────────────────────────────

function SubscriptionsTab() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('')
  const [subscription, setSubscription] = useState<Awaited<ReturnType<typeof getSubscription>>>(null)
  const [form, setForm] = useState({ plan: 'free', status: 'active' })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => { getRestaurants().then(setRestaurants).catch(() => {}) }, [])

  useEffect(() => {
    if (!selectedRestaurant) return
    getSubscription(selectedRestaurant).then(setSubscription).catch(e => setErr(e.message))
  }, [selectedRestaurant])

  const addSubscription = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRestaurant) return
    setSaving(true)
    setErr(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'
      const now = new Date()
      const end = new Date(now); end.setMonth(end.getMonth() + 1)
      const sub = await createSubscription({
        user_id: userId,
        restaurant_id: selectedRestaurant,
        plan: form.plan,
        status: form.status,
        current_period_start: now.toISOString(),
        current_period_end: end.toISOString(),
      })
      setSubscription(sub)
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  const plans = ['free', 'starter', 'pro', 'enterprise']
  const planColors: Record<string, string> = { free: 'zinc', starter: 'blue', pro: 'orange', enterprise: 'purple' }

  return (
    <SectionLayout title="Subscriptions" description="Billing plans per restaurant.">
      <div className="mb-6">
        <label className="text-xs text-zinc-400 mb-1 block">Select Restaurant</label>
        <select value={selectedRestaurant} onChange={e => setSelectedRestaurant(e.target.value)} className="input w-full max-w-xs">
          <option value="">— choose —</option>
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>

      {err && <ErrorBanner message={err} />}

      {/* Plan cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {plans.map(p => {
          const c = planColors[p]
          return (
            <button key={p} onClick={() => setForm(f => ({ ...f, plan: p }))}
              className={`rounded-xl border p-4 text-left transition-all ${form.plan === p ? `border-${c}-500 bg-${c}-500/10` : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}>
              <div className="font-semibold capitalize text-sm">{p}</div>
              <div className="text-xs text-zinc-500 mt-1">
                {p === 'free' && 'Basic features'}
                {p === 'starter' && '3 restaurants'}
                {p === 'pro' && 'Unlimited + analytics'}
                {p === 'enterprise' && 'Custom + support'}
              </div>
            </button>
          )
        })}
      </div>

      {selectedRestaurant && !subscription && (
        <form onSubmit={addSubscription} className="flex gap-2">
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className="input">
            {['active', 'trialing', 'past_due', 'canceled'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Creating…' : 'Create Subscription'}
          </button>
        </form>
      )}

      {subscription && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold capitalize">{subscription.plan} Plan</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${subscription.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
              {subscription.status}
            </span>
          </div>
          <div className="text-xs text-zinc-400 space-y-1">
            <div>Period: {new Date(subscription.current_period_start).toLocaleDateString()} → {new Date(subscription.current_period_end).toLocaleDateString()}</div>
            {subscription.stripe_subscription_id && <div>Stripe ID: {subscription.stripe_subscription_id}</div>}
          </div>
        </div>
      )}
    </SectionLayout>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────

function SectionLayout({ title, description, children, action }: { title: string; description: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-sm text-zinc-400 mt-0.5">{description}</p>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  )
}

function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function Empty({ text }: { text: string }) {
  return <p className="text-sm text-zinc-500 py-4 text-center">{text}</p>
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
      {message}
    </div>
  )
}
