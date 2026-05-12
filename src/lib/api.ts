import { supabase } from './supabase'
import type {
  Restaurant,
  MenuCategory,
  MenuItem,
  Video,
  AnalyticsEvent,
  Subscription,
} from '../types/database'

// ─── Restaurants ────────────────────────────────────────────────────────────

export async function getRestaurants(): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getRestaurantById(id: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

export async function createRestaurant(
  payload: Database['public']['Tables']['restaurants']['Insert']
): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRestaurant(
  id: string,
  payload: Database['public']['Tables']['restaurants']['Update']
): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRestaurant(id: string): Promise<void> {
  const { error } = await supabase.from('restaurants').delete().eq('id', id)
  if (error) throw error
}

// ─── Menu Categories ─────────────────────────────────────────────────────────

export async function getMenuCategories(restaurantId: string): Promise<MenuCategory[]> {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createMenuCategory(
  payload: Database['public']['Tables']['menu_categories']['Insert']
): Promise<MenuCategory> {
  const { data, error } = await supabase
    .from('menu_categories')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMenuCategory(
  id: string,
  payload: Database['public']['Tables']['menu_categories']['Update']
): Promise<MenuCategory> {
  const { data, error } = await supabase
    .from('menu_categories')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMenuCategory(id: string): Promise<void> {
  const { error } = await supabase.from('menu_categories').delete().eq('id', id)
  if (error) throw error
}

// ─── Menu Items ──────────────────────────────────────────────────────────────

export async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function getMenuItemsByCategory(categoryId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('category_id', categoryId)
    .order('display_order', { ascending: true })
  if (error) throw error
  return data
}

export async function createMenuItem(
  payload: Database['public']['Tables']['menu_items']['Insert']
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateMenuItem(
  id: string,
  payload: Database['public']['Tables']['menu_items']['Update']
): Promise<MenuItem> {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteMenuItem(id: string): Promise<void> {
  const { error } = await supabase.from('menu_items').delete().eq('id', id)
  if (error) throw error
}

// ─── Videos ─────────────────────────────────────────────────────────────────

export async function getVideos(restaurantId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function getVideosByMenuItem(menuItemId: string): Promise<Video[]> {
  const { data, error } = await supabase
    .from('videos')
    .select('*')
    .eq('menu_item_id', menuItemId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createVideo(
  payload: Database['public']['Tables']['videos']['Insert']
): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateVideo(
  id: string,
  payload: Database['public']['Tables']['videos']['Update']
): Promise<Video> {
  const { data, error } = await supabase
    .from('videos')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteVideo(id: string): Promise<void> {
  const { error } = await supabase.from('videos').delete().eq('id', id)
  if (error) throw error
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function trackEvent(
  payload: Database['public']['Tables']['analytics']['Insert']
): Promise<void> {
  const { error } = await supabase.from('analytics').insert(payload)
  if (error) console.error('Analytics tracking failed:', error)
}

export async function getAnalytics(
  restaurantId: string,
  from?: string,
  to?: string
): Promise<AnalyticsEvent[]> {
  let query = supabase
    .from('analytics')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })

  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getAnalyticsSummary(restaurantId: string) {
  const { data, error } = await supabase
    .from('analytics')
    .select('event_type')
    .eq('restaurant_id', restaurantId)

  if (error) throw error

  const summary: Record<string, number> = {}
  for (const row of data) {
    summary[row.event_type] = (summary[row.event_type] || 0) + 1
  }
  return summary
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export async function getSubscription(restaurantId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data
}

export async function createSubscription(
  payload: Database['public']['Tables']['subscriptions']['Insert']
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .insert(payload)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateSubscription(
  id: string,
  payload: Database['public']['Tables']['subscriptions']['Update']
): Promise<Subscription> {
  const { data, error } = await supabase
    .from('subscriptions')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

