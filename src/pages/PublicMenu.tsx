import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import VideoModal from '../components/VideoModal'
import ReelsViewer, { type ReelItem } from '../components/ReelsViewer'
import { THEMES, type Theme } from '../lib/themes'
import type { Restaurant, MenuCategory, MenuItem, Video } from '../types/database'

interface MenuItemWithVideos extends MenuItem {
  videos: Video[]
}

interface Props {
  slug: string
  onBack: () => void
}

export default function PublicMenu({ slug, onBack }: Props) {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<MenuItemWithVideos[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [videoModal, setVideoModal] = useState<{ video: Video; item: MenuItem } | null>(null)
  const [reelsIndex, setReelsIndex] = useState<number | null>(null)
  const [entered, setEntered] = useState(false)
  const catBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadRestaurant()
    setTimeout(() => setEntered(true), 50)
  }, [slug])

  const loadRestaurant = async () => {
    try {
      const { data: rest, error: rErr } = await supabase
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
        .eq('is_active', true)
        .single()
      if (rErr || !rest) throw new Error('Restaurant not found')
      setRestaurant(rest as Restaurant)

      const restId = (rest as Restaurant).id
      const [catsRes, itsRes, vidsRes] = await Promise.all([
        supabase.from('menu_categories').select('*').eq('restaurant_id', restId).eq('is_active', true).order('display_order'),
        supabase.from('menu_items').select('*').eq('restaurant_id', restId).eq('is_available', true).order('display_order'),
        supabase.from('videos').select('*').eq('restaurant_id', restId).eq('is_published', true),
      ])

      const cats = (catsRes.data ?? []) as MenuCategory[]
      const its = (itsRes.data ?? []) as MenuItem[]
      const vids = (vidsRes.data ?? []) as Video[]

      setCategories(cats)
      const itemsWithVideos: MenuItemWithVideos[] = its.map(item => ({
        ...item,
        videos: vids.filter(v => v.menu_item_id === item.id),
      }))
      setItems(itemsWithVideos)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const theme: Theme = THEMES.find(t => t.id === restaurant?.theme) ?? THEMES[0]

  const filteredItems = items.filter(i => {
    const matchCat = activeCategory === 'all' || i.category_id === activeCategory
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  const featuredItems = items.filter(i => i.is_featured)
  const itemsWithVideos = items.filter(i => i.videos.length > 0)

  const reelItems: ReelItem[] = itemsWithVideos.flatMap(item =>
    item.videos.map(v => ({
      id: v.id,
      videoUrl: v.video_url,
      thumbnailUrl: v.thumbnail_url,
      title: item.name,
      description: item.description,
      price: Number(item.price),
      categoryName: categories.find(c => c.id === item.category_id)?.name,
    }))
  )

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId)
    const el = document.getElementById(`cat-${catId}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (loading) return <LoadingScreen theme={theme} />
  if (error || !restaurant) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950">
      <div className="text-center space-y-4">
        <div className="text-5xl">🍽️</div>
        <h1 className="text-xl font-semibold text-white">Restaurant not found</h1>
        <p className="text-zinc-400 text-sm">{error}</p>
        <button onClick={onBack} className="btn-primary">← Back to dashboard</button>
      </div>
    </div>
  )

  const bannerUrl = (restaurant as Restaurant & { banner_url?: string | null }).banner_url

  return (
    <div
      className={`min-h-screen transition-all duration-500 ${entered ? 'opacity-100' : 'opacity-0'}`}
      style={{ background: theme.bg, color: theme.text }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        className="fixed top-4 left-4 z-30 px-3 py-1.5 rounded-full text-xs backdrop-blur border transition-colors"
        style={{ background: theme.surface + 'cc', borderColor: theme.accent + '40', color: theme.text }}
      >
        ← Dashboard
      </button>

      {/* Reels button */}
      {reelItems.length > 0 && (
        <button
          onClick={() => setReelsIndex(0)}
          className="fixed top-4 right-4 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur border transition-all hover:scale-105"
          style={{ background: theme.primary, color: '#fff', borderColor: 'transparent' }}
        >
          ▶ Watch Reels
        </button>
      )}

      {/* Hero */}
      <div className="relative h-72 md:h-96 overflow-hidden">
        {/* Banner */}
        {bannerUrl ? (
          <img src={bannerUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme.primary}40, ${theme.accent}20)` }} />
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0" style={{ background: `linear-gradient(to bottom, ${theme.bg}00 0%, ${theme.bg}dd 70%, ${theme.bg} 100%)` }} />

        {/* Floating particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {[...Array(8)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-float opacity-30"
              style={{
                width: 4 + Math.random() * 8,
                height: 4 + Math.random() * 8,
                left: `${10 + i * 12}%`,
                top: `${20 + (i % 3) * 25}%`,
                background: theme.primary,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${3 + i * 0.7}s`,
              }}
            />
          ))}
        </div>

        {/* Restaurant info */}
        <div className="absolute bottom-0 inset-x-0 p-6 md:p-10">
          <div className="max-w-4xl mx-auto flex items-end gap-5">
            {/* Logo */}
            <div
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl border-2 overflow-hidden flex-shrink-0 flex items-center justify-center text-3xl font-bold shadow-2xl"
              style={{ background: theme.surface, borderColor: theme.primary + '60', color: theme.primary }}
            >
              {restaurant.logo_url
                ? <img src={restaurant.logo_url} alt="" className="w-full h-full object-cover" />
                : restaurant.name[0]?.toUpperCase()
              }
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight" style={{ color: theme.text }}>
                {restaurant.name}
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {restaurant.cuisine_type && (
                  <span className="text-sm px-2.5 py-0.5 rounded-full" style={{ background: theme.primary + '20', color: theme.accent }}>
                    {restaurant.cuisine_type}
                  </span>
                )}
                {restaurant.description && (
                  <span className="text-sm" style={{ color: theme.text + 'aa' }}>{restaurant.description}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search + Category bar */}
      <div
        className="sticky top-0 z-20 border-b backdrop-blur-lg"
        style={{ background: theme.bg + 'ee', borderColor: theme.text + '10' }}
        ref={catBarRef}
      >
        <div className="max-w-4xl mx-auto px-4 py-3 space-y-3">
          {/* Search */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: theme.text + '60' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search dishes…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-colors"
              style={{
                background: theme.surface,
                borderColor: theme.text + '20',
                color: theme.text,
              }}
            />
          </div>
          {/* Category pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <CategoryPill
              active={activeCategory === 'all'}
              onClick={() => { setActiveCategory('all'); window.scrollTo({ top: 300, behavior: 'smooth' }) }}
              label="All"
              theme={theme}
            />
            {categories.map(cat => (
              <CategoryPill
                key={cat.id}
                active={activeCategory === cat.id}
                onClick={() => scrollToCategory(cat.id)}
                label={cat.name}
                theme={theme}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Menu content */}
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-12">
        {/* Featured */}
        {featuredItems.length > 0 && !search && activeCategory === 'all' && (
          <section>
            <SectionHeader label="⭐ Featured" theme={theme} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {featuredItems.map(item => (
                <FoodCard
                  key={item.id}
                  item={item}
                  theme={theme}
                  featured
                  onVideoClick={item.videos[0] ? () => setVideoModal({ video: item.videos[0], item }) : undefined}
                  onReelClick={item.videos[0] ? () => {
                    const idx = reelItems.findIndex(r => r.id === item.videos[0].id)
                    if (idx >= 0) setReelsIndex(idx)
                  } : undefined}
                />
              ))}
            </div>
          </section>
        )}

        {/* By category */}
        {categories.map(cat => {
          const catItems = filteredItems.filter(i => i.category_id === cat.id)
          if (catItems.length === 0) return null
          return (
            <section key={cat.id} id={`cat-${cat.id}`}>
              <SectionHeader label={cat.name} theme={theme} />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {catItems.map(item => (
                  <FoodCard
                    key={item.id}
                    item={item}
                    theme={theme}
                    onVideoClick={item.videos[0] ? () => setVideoModal({ video: item.videos[0], item }) : undefined}
                    onReelClick={item.videos[0] ? () => {
                      const idx = reelItems.findIndex(r => r.id === item.videos[0].id)
                      if (idx >= 0) setReelsIndex(idx)
                    } : undefined}
                  />
                ))}
              </div>
            </section>
          )
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-16" style={{ color: theme.text + '60' }}>
            <div className="text-5xl mb-3">🔍</div>
            <p>No dishes found for "{search}"</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t py-8 text-center" style={{ borderColor: theme.text + '10', color: theme.text + '50' }}>
        <p className="text-sm">Powered by <span style={{ color: theme.primary }}>RestaurantOS</span></p>
      </div>

      {/* Video modal */}
      {videoModal && (
        <VideoModal
          videoUrl={videoModal.video.video_url}
          thumbnailUrl={videoModal.video.thumbnail_url}
          title={videoModal.video.title}
          description={videoModal.video.description}
          onClose={() => setVideoModal(null)}
        />
      )}

      {/* Reels viewer */}
      {reelsIndex !== null && (
        <ReelsViewer
          items={reelItems}
          initialIndex={reelsIndex}
          onClose={() => setReelsIndex(null)}
        />
      )}
    </div>
  )
}

// ─── Food Card ────────────────────────────────────────────────────────────────

function FoodCard({
  item, theme, featured, onVideoClick, onReelClick,
}: {
  item: MenuItemWithVideos
  theme: Theme
  featured?: boolean
  onVideoClick?: () => void
  onReelClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const hasVideo = item.videos.length > 0

  return (
    <div
      className={`group relative rounded-2xl overflow-hidden border transition-all duration-300 cursor-default ${
        hovered ? 'scale-[1.02] shadow-2xl' : 'scale-100 shadow-md'
      } ${featured ? 'md:col-span-1' : ''}`}
      style={{ background: theme.surface, borderColor: theme.text + '15' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image */}
      <div className={`relative overflow-hidden ${featured ? 'h-48' : 'h-40'}`}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className={`w-full h-full object-cover transition-transform duration-500 ${hovered ? 'scale-110' : 'scale-100'}`}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl"
            style={{ background: `linear-gradient(135deg, ${theme.primary}20, ${theme.accent}10)` }}>
            🍽️
          </div>
        )}

        {/* Overlay on hover */}
        <div className={`absolute inset-0 transition-opacity duration-300 flex items-center justify-center gap-3 ${hovered && hasVideo ? 'opacity-100' : 'opacity-0'}`}
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}>
          {onVideoClick && (
            <button
              onClick={onVideoClick}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-transform hover:scale-105 border border-white/30"
              style={{ background: 'rgba(255,255,255,0.15)' }}
            >
              🎬 Watch
            </button>
          )}
          {onReelClick && (
            <button
              onClick={onReelClick}
              className="px-4 py-2 rounded-xl text-white text-sm font-medium transition-transform hover:scale-105 border border-white/30"
              style={{ background: theme.primary + 'cc' }}
            >
              ▶ Reels
            </button>
          )}
        </div>

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {item.is_featured && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium" style={{ background: theme.primary, color: '#fff' }}>
              ⭐ Featured
            </span>
          )}
          {hasVideo && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-medium backdrop-blur border" style={{ background: 'rgba(0,0,0,0.5)', color: '#fff', borderColor: 'rgba(255,255,255,0.2)' }}>
              🎬 Video
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-base leading-tight" style={{ color: theme.text }}>{item.name}</h3>
          <span className="font-black text-lg whitespace-nowrap" style={{ color: theme.primary }}>
            ${Number(item.price).toFixed(2)}
          </span>
        </div>
        {item.description && (
          <p className="text-sm mt-1.5 line-clamp-2" style={{ color: theme.text + '80' }}>{item.description}</p>
        )}
        {item.allergens && item.allergens.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {item.allergens.slice(0, 3).map(a => (
              <span key={a} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: theme.text + '15', color: theme.text + '80' }}>
                {a}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function CategoryPill({ active, onClick, label, theme }: {
  active: boolean
  onClick: () => void
  label: string
  theme: Theme
}) {
  return (
    <button
      onClick={onClick}
      className="whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 border flex-shrink-0"
      style={active
        ? { background: theme.primary, color: '#fff', borderColor: 'transparent' }
        : { background: theme.surface, color: theme.text + 'aa', borderColor: theme.text + '20' }
      }
    >
      {label}
    </button>
  )
}

function SectionHeader({ label, theme }: { label: string; theme: Theme }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <h2 className="text-xl font-black" style={{ color: theme.text }}>{label}</h2>
      <div className="flex-1 h-px" style={{ background: theme.text + '10' }} />
    </div>
  )
}

function LoadingScreen({ theme }: { theme: Theme }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: theme.bg }}>
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: theme.primary, borderTopColor: 'transparent' }} />
        <p style={{ color: theme.text + '60' }}>Loading menu…</p>
      </div>
    </div>
  )
}
