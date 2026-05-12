import { useState, useCallback, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { createRestaurant } from '../lib/api'
import { uploadImage } from '../lib/storage'
import { slugify, generateUniqueSlug, isSlugAvailable } from '../lib/slug'
import { THEMES, type ThemeId, type Theme } from '../lib/themes'
import type { Restaurant } from '../types/database'

type Step = 1 | 2 | 3

interface FormState {
  name: string
  description: string
  cuisine_type: string
  slug: string
  theme: ThemeId
  logoFile: File | null
  logoPreview: string | null
  bannerFile: File | null
  bannerPreview: string | null
  address: string
  phone: string
  email: string
}

interface Props {
  onComplete: (restaurant: Restaurant) => void
  onBack?: () => void
}

export default function RestaurantSetup({ onComplete, onBack }: Props) {
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<FormState>({
    name: '',
    description: '',
    cuisine_type: '',
    slug: '',
    theme: 'ember',
    logoFile: null,
    logoPreview: null,
    bannerFile: null,
    bannerPreview: null,
    address: '',
    phone: '',
    email: '',
  })
  const [slugStatus, setSlugStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-generate slug when name changes
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!form.name) { setForm(f => ({ ...f, slug: '' })); setSlugStatus('idle'); return }
    if (slugDebounce.current) clearTimeout(slugDebounce.current)
    slugDebounce.current = setTimeout(async () => {
      const generated = slugify(form.name)
      setForm(f => ({ ...f, slug: generated }))
      setSlugStatus('checking')
      const available = await isSlugAvailable(generated)
      setSlugStatus(available ? 'available' : 'taken')
    }, 500)
    return () => { if (slugDebounce.current) clearTimeout(slugDebounce.current) }
  }, [form.name])

  // Manual slug edit check
  const checkSlug = useCallback(async (slug: string) => {
    if (!slug) { setSlugStatus('idle'); return }
    setSlugStatus('checking')
    const available = await isSlugAvailable(slug)
    setSlugStatus(available ? 'available' : 'taken')
  }, [])

  const handleSlugChange = (val: string) => {
    const cleaned = slugify(val) || val.toLowerCase().replace(/[^a-z0-9-]/g, '')
    setForm(f => ({ ...f, slug: cleaned }))
    setSlugStatus('checking')
    if (slugDebounce.current) clearTimeout(slugDebounce.current)
    slugDebounce.current = setTimeout(() => checkSlug(cleaned), 500)
  }

  const handleAutoSlug = async () => {
    setSlugStatus('checking')
    const slug = await generateUniqueSlug(form.name)
    setForm(f => ({ ...f, slug }))
    setSlugStatus('available')
  }

  // File drop handler
  const makeDropHandler = (field: 'logo' | 'banner') =>
    (e: React.DragEvent) => {
      e.preventDefault()
      const file = e.dataTransfer.files[0]
      if (!file || !file.type.startsWith('image/')) return
      setImageFile(field, file)
    }

  const setImageFile = (field: 'logo' | 'banner', file: File) => {
    const preview = URL.createObjectURL(file)
    if (field === 'logo') {
      setForm(f => ({ ...f, logoFile: file, logoPreview: preview }))
    } else {
      setForm(f => ({ ...f, bannerFile: file, bannerPreview: preview }))
    }
  }

  const clearImage = (field: 'logo' | 'banner') => {
    if (field === 'logo') setForm(f => ({ ...f, logoFile: null, logoPreview: null }))
    else setForm(f => ({ ...f, bannerFile: null, bannerPreview: null }))
  }

  const canProceedStep1 =
    form.name.trim().length >= 2 &&
    form.slug.length >= 2 &&
    (slugStatus === 'available' || slugStatus === 'idle')

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const userId = user?.id ?? '00000000-0000-0000-0000-000000000000'

      // Ensure slug is unique
      const finalSlug = await generateUniqueSlug(form.slug || form.name)

      // Upload images
      let logoUrl: string | null = null
      let bannerUrl: string | null = null

      if (form.logoFile) {
        try {
          const result = await uploadImage(form.logoFile, 'logos', finalSlug)
          logoUrl = result.url
        } catch {
          // Storage bucket may not be set up — continue without image
        }
      }

      if (form.bannerFile) {
        try {
          const result = await uploadImage(form.bannerFile, 'banners', finalSlug)
          bannerUrl = result.url
        } catch {
          // Storage bucket may not be set up — continue without image
        }
      }

      const restaurant = await createRestaurant({
        user_id: userId,
        name: form.name,
        slug: finalSlug,
        description: form.description || null,
        cuisine_type: form.cuisine_type || null,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        theme: form.theme,
        address: form.address || null,
        phone: form.phone || null,
        email: form.email || null,
        is_active: true,
      })

      onComplete(restaurant)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save restaurant')
    } finally {
      setSaving(false)
    }
  }

  const selectedTheme = THEMES.find(t => t.id === form.theme) ?? THEMES[0]

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Progress header */}
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-xs">R</div>
            <span className="font-semibold text-sm">RestaurantOS</span>
          </div>
          <span className="text-xs text-zinc-500">Step {step} of 3</span>
        </div>
        <div className="flex gap-1.5">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                s <= step ? 'bg-orange-500' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        {/* Step 1 — Basics */}
        {step === 1 && (
          <div>
            <div className="px-8 pt-8 pb-6 border-b border-zinc-800">
              <h1 className="text-2xl font-bold">Tell us about your restaurant</h1>
              <p className="text-zinc-400 text-sm mt-1">Basic info and your unique URL slug.</p>
            </div>
            <div className="px-8 py-6 space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  Restaurant name <span className="text-orange-400">*</span>
                </label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. The Golden Fork"
                  className="input w-full text-base"
                  autoFocus
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                  URL slug <span className="text-orange-400">*</span>
                  <span className="text-zinc-500 font-normal ml-2">— your restaurant's unique address</span>
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm select-none pointer-events-none">
                      restaurantos.app/
                    </span>
                    <input
                      value={form.slug}
                      onChange={e => handleSlugChange(e.target.value)}
                      placeholder="the-golden-fork"
                      className="input w-full pl-[130px] font-mono text-sm"
                    />
                    {form.slug && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm">
                        {slugStatus === 'checking' && <span className="text-zinc-500">⟳</span>}
                        {slugStatus === 'available' && <span className="text-green-400">✓</span>}
                        {slugStatus === 'taken' && <span className="text-red-400">✗</span>}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAutoSlug}
                    disabled={!form.name}
                    className="px-3 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 text-xs transition-colors disabled:opacity-40 whitespace-nowrap"
                  >
                    Auto-generate
                  </button>
                </div>
                {slugStatus === 'taken' && (
                  <p className="text-xs text-red-400 mt-1.5">This slug is taken. Try a different one or click Auto-generate.</p>
                )}
                {slugStatus === 'available' && form.slug && (
                  <p className="text-xs text-green-400 mt-1.5">✓ Available!</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1.5">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="A short tagline or description of your restaurant…"
                  rows={3}
                  className="input w-full resize-none"
                />
              </div>

              {/* Cuisine & Contact */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Cuisine type</label>
                  <input
                    value={form.cuisine_type}
                    onChange={e => setForm(f => ({ ...f, cuisine_type: e.target.value }))}
                    placeholder="e.g. Italian, Japanese…"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
                  <input
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="hello@restaurant.com"
                    type="email"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Phone</label>
                  <input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="+1 (555) 000-0000"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">Address</label>
                  <input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="123 Main St, City"
                    className="input w-full"
                  />
                </div>
              </div>
            </div>
            <div className="px-8 pb-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!canProceedStep1}
                className="btn-primary px-8"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2 — Branding */}
        {step === 2 && (
          <div>
            <div className="px-8 pt-8 pb-6 border-b border-zinc-800">
              <h1 className="text-2xl font-bold">Upload your branding</h1>
              <p className="text-zinc-400 text-sm mt-1">Logo and banner image. Both optional — you can add them later.</p>
            </div>
            <div className="px-8 py-6 space-y-6">
              {/* Logo */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Logo</label>
                <ImageDropZone
                  preview={form.logoPreview}
                  onFile={f => setImageFile('logo', f)}
                  onDrop={makeDropHandler('logo')}
                  onClear={() => clearImage('logo')}
                  aspect="square"
                  hint="Recommended: square, 400×400px or larger"
                />
              </div>

              {/* Banner */}
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Banner image</label>
                <ImageDropZone
                  preview={form.bannerPreview}
                  onFile={f => setImageFile('banner', f)}
                  onDrop={makeDropHandler('banner')}
                  onClear={() => clearImage('banner')}
                  aspect="wide"
                  hint="Recommended: 1920×500px or wider"
                />
              </div>

              <p className="text-xs text-zinc-500 bg-zinc-800/60 rounded-lg px-3 py-2">
                Images are uploaded to Supabase Storage. Make sure you have a public bucket named <code className="text-orange-400 font-mono">restaurant-assets</code> in your Supabase project (Storage → New bucket).
              </p>
            </div>
            <div className="px-8 pb-8 flex justify-between">
              <button onClick={() => setStep(1)} className="px-5 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                ← Back
              </button>
              <button onClick={() => setStep(3)} className="btn-primary px-8">
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Theme */}
        {step === 3 && (
          <div>
            <div className="px-8 pt-8 pb-6 border-b border-zinc-800">
              <h1 className="text-2xl font-bold">Choose your theme</h1>
              <p className="text-zinc-400 text-sm mt-1">Pick the visual style for your restaurant's page.</p>
            </div>
            <div className="px-8 py-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                {THEMES.map(theme => (
                  <ThemeCard
                    key={theme.id}
                    theme={theme}
                    selected={form.theme === theme.id}
                    onSelect={() => setForm(f => ({ ...f, theme: theme.id }))}
                  />
                ))}
              </div>

              {/* Live preview */}
              <div className="rounded-xl overflow-hidden border border-zinc-700">
                <div className="text-xs text-zinc-500 px-3 py-2 bg-zinc-800/80 border-b border-zinc-700 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Preview — {selectedTheme.name} theme
                </div>
                <MiniPreview theme={selectedTheme} name={form.name || 'Your Restaurant'} banner={form.bannerPreview} logo={form.logoPreview} />
              </div>
            </div>

            {error && (
              <div className="mx-8 mb-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3">
                {error}
              </div>
            )}

            <div className="px-8 pb-8 flex justify-between">
              <button onClick={() => setStep(2)} className="px-5 py-2 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
                ← Back
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary px-8 flex items-center gap-2">
                {saving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin inline-block" />
                    Creating…
                  </>
                ) : (
                  'Create Restaurant →'
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Step indicator dots */}
      <div className="flex gap-2 mt-6">
        {([1, 2, 3] as Step[]).map(s => (
          <button
            key={s}
            onClick={() => s < step ? setStep(s) : undefined}
            className={`w-2 h-2 rounded-full transition-colors ${s === step ? 'bg-orange-500' : s < step ? 'bg-zinc-500 hover:bg-zinc-400 cursor-pointer' : 'bg-zinc-700'}`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Image Drop Zone ──────────────────────────────────────────────────────────

function ImageDropZone({
  preview,
  onFile,
  onDrop,
  onClear,
  aspect,
  hint,
}: {
  preview: string | null
  onFile: (f: File) => void
  onDrop: (e: React.DragEvent) => void
  onClear: () => void
  aspect: 'square' | 'wide'
  hint: string
}) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const height = aspect === 'square' ? 'h-40' : 'h-36'

  return (
    <div
      className={`relative ${height} rounded-xl border-2 border-dashed transition-colors overflow-hidden ${
        dragging ? 'border-orange-500 bg-orange-500/5' : 'border-zinc-700 hover:border-zinc-500'
      } ${preview ? 'border-solid border-zinc-700' : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { setDragging(false); onDrop(e) }}
      onClick={() => !preview && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f) }}
      />

      {preview ? (
        <>
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              onClick={e => { e.stopPropagation(); inputRef.current?.click() }}
              className="px-3 py-1.5 rounded-lg bg-white/10 text-white text-xs hover:bg-white/20 backdrop-blur"
            >
              Replace
            </button>
            <button
              onClick={e => { e.stopPropagation(); onClear() }}
              className="px-3 py-1.5 rounded-lg bg-red-500/30 text-red-300 text-xs hover:bg-red-500/50 backdrop-blur"
            >
              Remove
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center justify-center h-full gap-2 cursor-pointer select-none">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-xl">🖼️</div>
          <p className="text-sm text-zinc-400">Drop image here or <span className="text-orange-400 underline">browse</span></p>
          <p className="text-xs text-zinc-600">{hint}</p>
        </div>
      )}
    </div>
  )
}

// ─── Theme Card ───────────────────────────────────────────────────────────────

function ThemeCard({ theme, selected, onSelect }: { theme: Theme; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`relative rounded-xl border-2 overflow-hidden transition-all text-left ${
        selected ? 'border-orange-500 ring-2 ring-orange-500/30' : 'border-zinc-800 hover:border-zinc-600'
      }`}
    >
      {/* Mini preview */}
      <div className="h-20" style={{ background: theme.previewBg }}>
        <div className="h-5 w-full flex items-center px-2 gap-1" style={{ background: theme.previewBar }}>
          <div className="w-2 h-2 rounded-full" style={{ background: theme.previewAccent }} />
          <div className="h-1.5 rounded flex-1" style={{ background: theme.previewAccent + '40' }} />
          <div className="h-4 px-2 rounded text-[7px] flex items-center" style={{ background: theme.previewAccent, color: '#fff' }}>Book</div>
        </div>
        <div className="px-2 pt-2 space-y-1">
          <div className="h-1.5 rounded w-3/4" style={{ background: theme.previewAccent + '60' }} />
          <div className="h-1 rounded w-1/2" style={{ background: theme.previewAccent + '30' }} />
        </div>
      </div>
      {/* Label */}
      <div className="px-3 py-2 bg-zinc-900">
        <div className="text-xs font-semibold text-zinc-200">{theme.name}</div>
        <div className="text-[10px] text-zinc-500 mt-0.5">{theme.description}</div>
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">✓</div>
      )}
    </button>
  )
}

// ─── Mini Preview ─────────────────────────────────────────────────────────────

function MiniPreview({ theme, name, banner, logo }: { theme: Theme; name: string; banner: string | null; logo: string | null }) {
  return (
    <div style={{ background: theme.bg, minHeight: 200 }}>
      {/* Banner */}
      <div
        className="w-full h-24 relative flex items-end"
        style={{ background: banner ? undefined : theme.previewAccent + '30' }}
      >
        {banner && <img src={banner} alt="" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, ' + theme.bg + 'cc, transparent)' }} />
        {/* Logo */}
        <div className="relative ml-6 mb-[-20px] z-10">
          <div
            className="w-14 h-14 rounded-xl border-2 overflow-hidden flex items-center justify-center text-xl font-bold"
            style={{ background: theme.surface, borderColor: theme.previewAccent + '60', color: theme.previewAccent }}
          >
            {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : name[0]?.toUpperCase() ?? 'R'}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-8 px-6 pb-6" style={{ color: theme.text }}>
        <h3 className="text-base font-bold">{name}</h3>
        <div className="flex gap-2 mt-3">
          {['Starters', 'Mains', 'Desserts'].map(cat => (
            <div
              key={cat}
              className="text-xs px-3 py-1 rounded-full"
              style={{ background: theme.previewAccent + '20', color: theme.previewAccent }}
            >
              {cat}
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {['Bruschetta', 'Pasta Carbonara'].map(item => (
            <div key={item} className="rounded-lg p-2.5" style={{ background: theme.surface }}>
              <div className="text-xs font-medium" style={{ color: theme.text }}>{item}</div>
              <div className="text-xs mt-0.5" style={{ color: theme.previewAccent }}>$12.00</div>
            </div>
          ))}
        </div>
        <button
          className="mt-4 w-full rounded-lg py-2 text-xs font-semibold"
          style={{ background: theme.previewAccent, color: '#fff' }}
        >
          View Full Menu
        </button>
      </div>
    </div>
  )
}
