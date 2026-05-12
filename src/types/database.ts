export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: {
          id: string
          user_id: string
          name: string
          slug: string
          description: string | null
          logo_url: string | null
          address: string | null
          phone: string | null
          email: string | null
          website: string | null
          cuisine_type: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          cuisine_type?: string | null
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          address?: string | null
          phone?: string | null
          email?: string | null
          website?: string | null
          cuisine_type?: string | null
          is_active?: boolean
          updated_at?: string
        }
      }
      menu_categories: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          description: string | null
          display_order: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          description?: string | null
          display_order?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          name?: string
          description?: string | null
          display_order?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          category_id: string
          restaurant_id: string
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_available: boolean
          is_featured: boolean
          allergens: string[] | null
          nutritional_info: Json | null
          display_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          restaurant_id: string
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          allergens?: string[] | null
          nutritional_info?: Json | null
          display_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          restaurant_id?: string
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_available?: boolean
          is_featured?: boolean
          allergens?: string[] | null
          nutritional_info?: Json | null
          display_order?: number
          updated_at?: string
        }
      }
      videos: {
        Row: {
          id: string
          menu_item_id: string
          restaurant_id: string
          title: string
          description: string | null
          video_url: string
          thumbnail_url: string | null
          duration_seconds: number | null
          view_count: number
          is_published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          menu_item_id: string
          restaurant_id: string
          title: string
          description?: string | null
          video_url: string
          thumbnail_url?: string | null
          duration_seconds?: number | null
          view_count?: number
          is_published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          menu_item_id?: string
          restaurant_id?: string
          title?: string
          description?: string | null
          video_url?: string
          thumbnail_url?: string | null
          duration_seconds?: number | null
          view_count?: number
          is_published?: boolean
          updated_at?: string
        }
      }
      analytics: {
        Row: {
          id: string
          restaurant_id: string
          event_type: string
          menu_item_id: string | null
          video_id: string | null
          session_id: string | null
          metadata: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          event_type: string
          menu_item_id?: string | null
          video_id?: string | null
          session_id?: string | null
          metadata?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          restaurant_id?: string
          event_type?: string
          menu_item_id?: string | null
          video_id?: string | null
          session_id?: string | null
          metadata?: Json | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          restaurant_id: string
          plan: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end: boolean
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          restaurant_id: string
          plan: string
          status: string
          current_period_start: string
          current_period_end: string
          cancel_at_period_end?: boolean
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          restaurant_id?: string
          plan?: string
          status?: string
          current_period_start?: string
          current_period_end?: string
          cancel_at_period_end?: boolean
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          updated_at?: string
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
export type MenuItem = Database['public']['Tables']['menu_items']['Row']
export type Video = Database['public']['Tables']['videos']['Row']
export type AnalyticsEvent = Database['public']['Tables']['analytics']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
