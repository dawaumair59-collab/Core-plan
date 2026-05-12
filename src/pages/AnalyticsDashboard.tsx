import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts'
import { supabase } from '../lib/supabase'
import { getRestaurants, getMenuItems, getVideos } from '../lib/api'
import { AnimatedCounter, GlowCard, ShimmerSkeleton } from '../components/PremiumEffects'
import type { Restaurant, MenuItem, Video } from '../types/database'

interface AnalyticsRow {
  event_type: string
  menu_item_id: string | null
  video_id: string | null
  created_at: string
  metadata: Record<string, unknown> | null
}

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#a855f7', '#f43f5e', '#fbbf24']

const CARD_VARIANTS = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.08, duration: 0.4 } }),
}

export default function AnalyticsDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [items, setItems] = useState<MenuItem[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [events, setEvents] = useState<AnalyticsRow[]>([])
  const [loading, setLoading] = useState(false)
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    getRestaurants().then(r => {
      setRestaurants(r)
      if (r.length > 0) setSelectedId(r[0].id)
    }).catch(() => {})
  }, [])

  const load = useCallback(async () => {
    if (!selectedId) return
    setLoading(true)
    try {
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
      const since = new Date(Date.now() - days * 86400000).toISOString()

      const [its, vids, { data: evts }] = await Promise.all([
        getMenuItems(selectedId),
        getVideos(selectedId),
        supabase.from('analytics').select('*').eq('restaurant_id', selectedId).gte('created_at', since).order('created_at'),
      ])

      setItems(its)
      setVideos(vids)
      setEvents((evts ?? []) as AnalyticsRow[])
    } finally {
      setLoading(false)
    }
  }, [selectedId, range])

  useEffect(() => { load() }, [load])

  // ── Derived stats ────────────────────────────────────────────────────────────
  const totalViews = events.filter(e => e.event_type === 'page_view').length
  const videoPlays = events.filter(e => e.event_type === 'video_play').length
  const interactions = events.filter(e => ['menu_item_view', 'click', 'order_intent'].includes(e.event_type)).length
  const uniqueSessions = new Set(events.map(e => (e.metadata as Record<string, string> | null)?.session_id).filter(Boolean)).size

  // Daily views chart
  const dailyMap: Record<string, number> = {}
  events.filter(e => e.event_type === 'page_view').forEach(e => {
    const day = e.created_at.slice(0, 10)
    dailyMap[day] = (dailyMap[day] ?? 0) + 1
  })
  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const dailyViews = Array.from({ length: days }, (_, i) => {
    const d = new Date(Date.now() - (days - 1 - i) * 86400000)
    const key = d.toISOString().slice(0, 10)
    return { date: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), views: dailyMap[key] ?? 0 }
  })

  // Top items
  const itemViewMap: Record<string, number> = {}
  events.filter(e => e.event_type === 'menu_item_view' && e.menu_item_id).forEach(e => {
    itemViewMap[e.menu_item_id!] = (itemViewMap[e.menu_item_id!] ?? 0) + 1
  })
  const topItems = Object.entries(itemViewMap)
    .map(([id, count]) => ({ name: items.find(i => i.id === id)?.name ?? 'Unknown', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Video stats
  const videoPlayMap: Record<string, number> = {}
  events.filter(e => e.event_type === 'video_play' && e.video_id).forEach(e => {
    videoPlayMap[e.video_id!] = (videoPlayMap[e.video_id!] ?? 0) + 1
  })
  const topVideos = Object.entries(videoPlayMap)
    .map(([id, count]) => ({ name: videos.find(v => v.id === id)?.title ?? 'Unknown', count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Event type breakdown
  const eventBreakdown = Object.entries(
    events.reduce<Record<string, number>>((acc, e) => {
      acc[e.event_type] = (acc[e.event_type] ?? 0) + 1
      return acc
    }, {})
  ).map(([name, value]) => ({ name, value }))

  const Skeleton = () => <ShimmerSkeleton className="h-full w-full" />

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white">Analytics</h1>
          <p className="text-zinc-400 text-sm mt-0.5">Performance insights for your restaurant</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Restaurant selector */}
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="input text-sm"
          >
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          {/* Range */}
          <div className="flex rounded-lg bg-zinc-800 border border-zinc-700 p-0.5">
            {(['7d', '30d', '90d'] as const).map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${range === r ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Views', value: totalViews, icon: '👁️', color: 'text-orange-400', suffix: '' },
          { label: 'Video Plays', value: videoPlays, icon: '▶️', color: 'text-blue-400', suffix: '' },
          { label: 'Interactions', value: interactions, icon: '🖱️', color: 'text-green-400', suffix: '' },
          { label: 'Sessions', value: uniqueSessions, icon: '🧑', color: 'text-purple-400', suffix: '' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            custom={i}
            variants={CARD_VARIANTS}
            initial="hidden"
            animate="visible"
          >
            <GlowCard className="h-full">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider">{stat.label}</p>
                    <div className={`text-3xl font-black mt-1 ${stat.color}`}>
                      {loading ? '—' : <AnimatedCounter value={stat.value} suffix={stat.suffix} />}
                    </div>
                  </div>
                  <div className="text-2xl">{stat.icon}</div>
                </div>
                <div className="mt-3 h-1 bg-zinc-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: stat.color.replace('text-', 'bg-').includes('orange') ? '#f97316' : stat.color.includes('blue') ? '#3b82f6' : stat.color.includes('green') ? '#22c55e' : '#a855f7' }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (stat.value / Math.max(totalViews, 1)) * 100)}%` }}
                    transition={{ delay: 0.5, duration: 1 }}
                  />
                </div>
              </div>
            </GlowCard>
          </motion.div>
        ))}
      </div>

      {/* Daily views chart */}
      <motion.div
        className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
          <span>📈</span> Daily Page Views
        </h3>
        <div className="h-56">
          {loading ? <Skeleton /> : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyViews} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                <defs>
                  <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false}
                  interval={Math.floor(dailyViews.length / 6)} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 10, color: '#f5f5f5', fontSize: 12 }}
                  cursor={{ stroke: '#f97316', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area type="monotone" dataKey="views" stroke="#f97316" strokeWidth={2} fill="url(#viewGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Grid: top items + top videos */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Top menu items */}
        <motion.div
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>🍽️</span> Most Viewed Items
          </h3>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <ShimmerSkeleton key={i} className="h-10" />)}</div>
          ) : topItems.length === 0 ? (
            <EmptyState label="No item views yet" />
          ) : (
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-200 truncate">{item.name}</div>
                    <div className="mt-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-orange-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(item.count / (topItems[0]?.count || 1)) * 100}%` }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.8 }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-orange-400 font-bold">{item.count}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Top videos */}
        <motion.div
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>🎬</span> Top Videos
          </h3>
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <ShimmerSkeleton key={i} className="h-10" />)}</div>
          ) : topVideos.length === 0 ? (
            <EmptyState label="No video plays yet" />
          ) : (
            <div className="space-y-3">
              {topVideos.map((v, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs text-zinc-500 w-4 text-right">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-zinc-200 truncate">{v.name}</div>
                    <div className="mt-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-blue-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(v.count / (topVideos[0]?.count || 1)) * 100}%` }}
                        transition={{ delay: 0.6 + i * 0.1, duration: 0.8 }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-blue-400 font-bold">{v.count}</span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Event breakdown pie + bar */}
      <div className="grid md:grid-cols-2 gap-5">
        {/* Pie chart */}
        <motion.div
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>🔘</span> Event Breakdown
          </h3>
          {loading || eventBreakdown.length === 0 ? (
            <EmptyState label="No event data yet" />
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie data={eventBreakdown} cx="50%" cy="50%" innerRadius={45} outerRadius={70}
                    dataKey="value" strokeWidth={0}>
                    {eventBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 flex-1">
                {eventBreakdown.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-zinc-400 truncate flex-1">{e.name}</span>
                    <span className="text-zinc-300 font-medium">{e.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>

        {/* Bar chart */}
        <motion.div
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <span>📊</span> Event Volume
          </h3>
          <div className="h-44">
            {loading || eventBreakdown.length === 0 ? (
              <EmptyState label="No event data yet" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventBreakdown} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 8, color: '#f5f5f5', fontSize: 12 }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {eventBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Engagement summary */}
      <motion.div
        className="bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20 rounded-2xl p-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
          <span>⚡</span> Quick Insights
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <Insight label="Avg daily views" value={totalViews > 0 ? (totalViews / days).toFixed(1) : '0'} />
          <Insight label="Video play rate" value={totalViews > 0 ? `${((videoPlays / totalViews) * 100).toFixed(1)}%` : '0%'} />
          <Insight label="Total events" value={events.length.toString()} />
          <Insight label="Active items" value={items.filter(i => i.is_available).length.toString()} />
          <Insight label="Videos uploaded" value={videos.length.toString()} />
          <Insight label="Featured items" value={items.filter(i => i.is_featured).length.toString()} />
        </div>
      </motion.div>
    </div>
  )
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-zinc-900/50 rounded-xl p-3 border border-zinc-800">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="text-orange-400 font-bold text-lg mt-0.5">{value}</div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 text-zinc-600 text-sm gap-2">
      <span className="text-3xl opacity-50">📭</span>
      <span>{label}</span>
    </div>
  )
}
