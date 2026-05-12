import { useState, useEffect, useCallback, useRef } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import {
  getRestaurants,
  getMenuCategories,
  createMenuCategory,
  updateMenuCategory,
  deleteMenuCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  createVideo,
  getVideos,
  deleteVideo,
} from '../lib/api'
import { uploadToCloudinary, getVideoThumbnail } from '../lib/cloudinary'
import { uploadImage } from '../lib/storage'
import VideoUploader from '../components/VideoUploader'
import type { Restaurant, MenuCategory, MenuItem, Video } from '../types/database'
import type { CloudinaryUploadResult } from '../lib/cloudinary'

// ─── Types ────────────────────────────────────────────────────────────────────

interface ItemWithVideo extends MenuItem {
  videos?: Video[]
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MenuManager() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>('')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [items, setItems] = useState<ItemWithVideo[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemWithVideo | null>(null)
  const [showItemForm, setShowItemForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)

  useEffect(() => {
    getRestaurants().then(r => {
      setRestaurants(r)
      if (r.length > 0) setSelectedRestaurant(r[0].id)
    }).catch(() => {})
  }, [])

  const loadData = useCallback(async () => {
    if (!selectedRestaurant) return
    setLoading(true)
    try {
      const [cats, its] = await Promise.all([
        getMenuCategories(selectedRestaurant),
        getMenuItems(selectedRestaurant),
      ])
      setCategories(cats)
      // Attach videos to items
      const videos = await getVideos(selectedRestaurant)
      const withVideos: ItemWithVideo[] = its.map(item => ({
        ...item,
        videos: videos.filter(v => v.menu_item_id === item.id),
      }))
      setItems(withVideos)
    } finally {
      setLoading(false)
    }
  }, [selectedRestaurant])

  useEffect(() => { loadData() }, [loadData])

  const filtered = items.filter(i => {
    const matchCat = selectedCategory === 'all' || i.category_id === selectedCategory
    const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.description?.toLowerCase().includes(search.toLowerCase()))
    return matchCat && matchSearch
  })

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = items.findIndex(i => i.id === active.id)
    const newIdx = items.findIndex(i => i.id === over.id)
    const reordered = arrayMove(items, oldIdx, newIdx)
    setItems(reordered)
    // Persist new display_order
    await Promise.all(
      reordered.map((item, idx) =>
        updateMenuItem(item.id, { display_order: idx })
      )
    )
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  if (!selectedRestaurant) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🍽️</div>
        <p className="text-zinc-400">No restaurants found. Create one first.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-6 h-full min-h-0">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 space-y-4">
        {/* Restaurant selector */}
        <div>
          <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1.5 block">Restaurant</label>
          <select
            value={selectedRestaurant}
            onChange={e => setSelectedRestaurant(e.target.value)}
            className="input w-full"
          >
            {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
        </div>

        {/* Categories */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-zinc-500 uppercase tracking-wider">Categories</label>
            <button
              onClick={() => setShowCategoryForm(true)}
              className="text-xs text-orange-400 hover:text-orange-300"
            >+ Add</button>
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${selectedCategory === 'all' ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
            >
              All items
              <span className="ml-auto float-right text-xs opacity-60">{items.length}</span>
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors group flex items-center justify-between ${selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100'}`}
              >
                <span className="truncate">{cat.name}</span>
                <span className="text-xs opacity-60">{items.filter(i => i.category_id === cat.id).length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
          <StatRow label="Total items" value={items.length} />
          <StatRow label="Available" value={items.filter(i => i.is_available).length} color="text-green-400" />
          <StatRow label="Featured" value={items.filter(i => i.is_featured).length} color="text-orange-400" />
          <StatRow label="With videos" value={items.filter(i => (i.videos?.length ?? 0) > 0).length} color="text-blue-400" />
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-4">
        {/* Toolbar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search menu items…"
              className="input w-full pl-9"
            />
          </div>
          <button
            onClick={() => { setEditingItem(null); setShowItemForm(true) }}
            className="btn-primary flex items-center gap-1.5 whitespace-nowrap"
          >
            + Add Item
          </button>
        </div>

        {/* Item grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="text-5xl">{search ? '🔍' : '🍽️'}</div>
            <p className="text-zinc-400">{search ? 'No items match your search' : 'No menu items yet'}</p>
            {!search && (
              <button onClick={() => { setEditingItem(null); setShowItemForm(true) }} className="btn-primary">
                + Add your first item
              </button>
            )}
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={filtered.map(i => i.id)} strategy={verticalListSortingStrategy}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {filtered.map(item => (
                  <SortableMenuCard
                    key={item.id}
                    item={item}
                    categories={categories}
                    onEdit={() => { setEditingItem(item); setShowItemForm(true) }}
                    onDelete={async () => {
                      await deleteMenuItem(item.id)
                      await loadData()
                    }}
                    onToggleAvailable={async () => {
                      await updateMenuItem(item.id, { is_available: !item.is_available })
                      await loadData()
                    }}
                    onToggleFeatured={async () => {
                      await updateMenuItem(item.id, { is_featured: !item.is_featured })
                      await loadData()
                    }}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      {/* Modals */}
      {showCategoryForm && (
        <CategoryFormModal
          restaurantId={selectedRestaurant}
          categories={categories}
          onClose={() => setShowCategoryForm(false)}
          onSave={async () => { await loadData(); setShowCategoryForm(false) }}
        />
      )}

      {showItemForm && (
        <ItemFormModal
          restaurantId={selectedRestaurant}
          categories={categories}
          item={editingItem}
          onClose={() => { setShowItemForm(false); setEditingItem(null) }}
          onSave={async () => { await loadData(); setShowItemForm(false); setEditingItem(null) }}
        />
      )}
    </div>
  )
}

// ─── Sortable Card ────────────────────────────────────────────────────────────

function SortableMenuCard({
  item, categories, onEdit, onDelete, onToggleAvailable, onToggleFeatured,
}: {
  item: ItemWithVideo
  categories: MenuCategory[]
  onEdit: () => void
  onDelete: () => void
  onToggleAvailable: () => void
  onToggleFeatured: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const cat = categories.find(c => c.id === item.category_id)
  const hasVideo = (item.videos?.length ?? 0) > 0

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative bg-zinc-900 border rounded-xl overflow-hidden transition-all ${
        isDragging ? 'border-orange-500 shadow-xl shadow-orange-500/20 z-10' : 'border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex gap-0">
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          className="flex items-center justify-center w-8 bg-zinc-800/50 cursor-grab active:cursor-grabbing text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0"
        >
          ⠿
        </div>

        {/* Image */}
        <div className="w-24 h-24 flex-shrink-0 bg-zinc-800 relative overflow-hidden">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl">🍽️</div>
          )}
          {hasVideo && (
            <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center text-[10px]">▶</div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-sm truncate">{item.name}</div>
              {cat && <div className="text-xs text-orange-400 mt-0.5">{cat.name}</div>}
              {item.description && (
                <div className="text-xs text-zinc-500 mt-1 line-clamp-2">{item.description}</div>
              )}
            </div>
            <div className="text-orange-400 font-bold text-sm whitespace-nowrap">${Number(item.price).toFixed(2)}</div>
          </div>

          {/* Badges + actions */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <button
              onClick={onToggleAvailable}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                item.is_available
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {item.is_available ? '● Available' : '○ Unavailable'}
            </button>
            <button
              onClick={onToggleFeatured}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                item.is_featured
                  ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-500'
              }`}
            >
              {item.is_featured ? '★ Featured' : '☆ Feature'}
            </button>
            <div className="ml-auto flex gap-1">
              <button onClick={onEdit} className="text-xs px-2 py-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors">Edit</button>
              <button onClick={onDelete} className="text-xs px-2 py-1 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors">Del</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Category Form Modal ──────────────────────────────────────────────────────

function CategoryFormModal({
  restaurantId, categories, onClose, onSave,
}: {
  restaurantId: string
  categories: MenuCategory[]
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await createMenuCategory({
        restaurant_id: restaurantId,
        name,
        display_order: categories.length,
      })
      onSave()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New Category" onClose={onClose}>
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="label">Category name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Starters, Mains, Desserts" className="input w-full" autoFocus required />
        </div>
        {err && <ErrorMsg msg={err} />}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary">{saving ? 'Saving…' : 'Create Category'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Item Form Modal ──────────────────────────────────────────────────────────

function ItemFormModal({
  restaurantId, categories, item, onClose, onSave,
}: {
  restaurantId: string
  categories: MenuCategory[]
  item: ItemWithVideo | null
  onClose: () => void
  onSave: () => void
}) {
  const [form, setForm] = useState({
    name: item?.name ?? '',
    description: item?.description ?? '',
    price: item?.price?.toString() ?? '',
    category_id: item?.category_id ?? categories[0]?.id ?? '',
    is_available: item?.is_available ?? true,
    is_featured: item?.is_featured ?? false,
    allergens: item?.allergens?.join(', ') ?? '',
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(item?.image_url ?? null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [videoResult, setVideoResult] = useState<CloudinaryUploadResult | null>(null)
  const [videoTitle, setVideoTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'details' | 'image' | 'video'>('details')
  const imgInputRef = useRef<HTMLInputElement>(null)

  const handleImageFile = (file: File) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    try {
      let imageUrl = item?.image_url ?? null
      if (imageFile) {
        setUploadingImage(true)
        const slug = form.name.toLowerCase().replace(/\s+/g, '-')
        const result = await uploadImage(imageFile, 'logos', slug)
        imageUrl = result.url
        setUploadingImage(false)
      }

      const payload = {
        restaurant_id: restaurantId,
        category_id: form.category_id,
        name: form.name,
        description: form.description || null,
        price: parseFloat(form.price) || 0,
        image_url: imageUrl,
        is_available: form.is_available,
        is_featured: form.is_featured,
        allergens: form.allergens ? form.allergens.split(',').map(s => s.trim()).filter(Boolean) : null,
        display_order: item?.display_order ?? 999,
      }

      let savedItem: MenuItem
      if (item) {
        savedItem = await updateMenuItem(item.id, payload)
      } else {
        savedItem = await createMenuItem(payload)
      }

      // Save video if uploaded
      if (videoResult) {
        await createVideo({
          menu_item_id: savedItem.id,
          restaurant_id: restaurantId,
          title: videoTitle || form.name,
          video_url: videoResult.secure_url,
          thumbnail_url: getVideoThumbnail(videoResult.public_id),
          duration_seconds: videoResult.duration ? Math.round(videoResult.duration) : null,
          is_published: true,
        })
      }

      onSave()
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title={item ? `Edit: ${item.name}` : 'New Menu Item'} onClose={onClose} wide>
      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-zinc-800 rounded-lg p-1">
        {(['details', 'image', 'video'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors capitalize ${tab === t ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
          >
            {t === 'details' ? '📝 Details' : t === 'image' ? '🖼️ Image' : '🎬 Video'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        {/* Details tab */}
        {tab === 'details' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="label">Item name *</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Truffle Pasta" className="input w-full" required autoFocus />
              </div>
              <div>
                <label className="label">Price *</label>
                <input value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="0.00" type="number" step="0.01" min="0" className="input w-full" required />
              </div>
              <div>
                <label className="label">Category</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className="input w-full">
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="label">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe this dish…" rows={3} className="input w-full resize-none" />
              </div>
              <div className="col-span-2">
                <label className="label">Allergens <span className="text-zinc-500 font-normal">(comma separated)</span></label>
                <input value={form.allergens} onChange={e => setForm(f => ({ ...f, allergens: e.target.value }))} placeholder="e.g. gluten, dairy, nuts" className="input w-full" />
              </div>
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} className="accent-orange-500 w-4 h-4" />
                <span className="text-sm text-zinc-300">Available</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_featured} onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))} className="accent-orange-500 w-4 h-4" />
                <span className="text-sm text-zinc-300">Featured</span>
              </label>
            </div>
          </div>
        )}

        {/* Image tab */}
        {tab === 'image' && (
          <div className="space-y-4">
            <div
              className="relative rounded-xl border-2 border-dashed border-zinc-700 hover:border-zinc-500 h-56 overflow-hidden cursor-pointer transition-colors flex items-center justify-center"
              onClick={() => imgInputRef.current?.click()}
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="text-white text-sm">Click to replace</span>
                  </div>
                </>
              ) : (
                <div className="text-center space-y-2">
                  <div className="text-4xl">📷</div>
                  <p className="text-sm text-zinc-400">Click or drag to upload food photo</p>
                  <p className="text-xs text-zinc-600">JPG, PNG, WebP • Recommended 800×600px</p>
                </div>
              )}
            </div>
            <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f) }} />
          </div>
        )}

        {/* Video tab */}
        {tab === 'video' && (
          <div className="space-y-4">
            <VideoUploader
              onUploadComplete={setVideoResult}
              existingVideoUrl={item?.videos?.[0]?.video_url}
              existingThumbnailUrl={item?.videos?.[0]?.thumbnail_url}
            />
            {videoResult && (
              <div>
                <label className="label">Video title</label>
                <input value={videoTitle} onChange={e => setVideoTitle(e.target.value)} placeholder={form.name || 'Video title'} className="input w-full" />
              </div>
            )}
            {item?.videos && item.videos.length > 0 && !videoResult && (
              <div className="rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-sm text-zinc-400 flex items-center justify-between">
                <span>📹 Has {item.videos.length} video(s) attached</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (item.videos?.[0]) await deleteVideo(item.videos[0].id)
                  }}
                  className="text-red-400 text-xs hover:text-red-300"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        )}

        {err && <ErrorMsg msg={err} />}

        <div className="flex justify-between items-center mt-5 pt-4 border-t border-zinc-800">
          <div className="flex gap-2">
            {tab !== 'details' && <button type="button" onClick={() => setTab(tab === 'video' ? 'image' : 'details')} className="btn-ghost">← Back</button>}
            {tab !== 'video' && <button type="button" onClick={() => setTab(tab === 'details' ? 'image' : 'video')} className="btn-ghost">Next →</button>}
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={saving || uploadingImage} className="btn-primary">
              {saving || uploadingImage ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {uploadingImage ? 'Uploading…' : 'Saving…'}
                </span>
              ) : item ? 'Save Changes' : 'Create Item'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-semibold text-lg">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 mt-3">{msg}</div>
}

function StatRow({ label, value, color = 'text-zinc-100' }: { label: string; value: number; color?: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  )
}
