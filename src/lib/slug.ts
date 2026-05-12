import { supabase } from './supabase'

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
  let query = supabase
    .from('restaurants')
    .select('id')
    .eq('slug', slug)

  if (excludeId) query = query.neq('id', excludeId)

  const { data, error } = await query
  if (error) return false
  return data.length === 0
}

export async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name)
  if (!base) return `restaurant-${Date.now()}`

  if (await isSlugAvailable(base)) return base

  for (let i = 2; i <= 99; i++) {
    const candidate = `${base}-${i}`
    if (await isSlugAvailable(candidate)) return candidate
  }

  return `${base}-${Date.now()}`
}
