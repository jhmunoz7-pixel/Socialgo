/**
 * SocialGo TypeScript types
 * Mirrors the Supabase database schema
 */

// ========== Auth ==========
export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: Record<string, unknown>;
}

// ========== Organization (Tenant) ==========
export interface Organization {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  timezone: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: "free" | "pro" | "full_access";
  plan_status: "trialing" | "active" | "past_due" | "canceled";
  billing_cycle: "monthly" | "quarterly" | "annual";
  client_limit: number;
  created_at: string;
  updated_at: string;
}

// ========== Member (Team) ==========
export interface Member {
  id: string;
  org_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

// ========== Package (Agency's service tiers) ==========
export interface Package {
  id: string;
  org_id: string;
  name: string;
  price: number | null;
  currency: string;
  features: string[];
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ========== Client (Brand managed by agency) ==========
export type PayStatus = "pagado" | "pendiente" | "vencido";
export type AccountStatus = "activo" | "onboarding" | "pausado";

export interface Client {
  id: string;
  org_id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  emoji: string;
  color: string;
  instagram: string | null;
  tiktok: string | null;
  facebook: string | null;
  linkedin: string | null;
  package_id: string | null;
  mrr: number;
  mrr_currency: string;
  start_date: string | null;
  pay_status: PayStatus;
  account_status: AccountStatus;
  manager_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  package?: Package;
  manager?: Member;
}

// ========== Post (Content grid item) ==========
export type PostType =
  | "educativo"
  | "producto"
  | "fun"
  | "social"
  | "behind_the_scenes"
  | "ugc"
  | "promo";

export type PostStatus = "draft" | "scheduled" | "published" | "archived";
export type Platform = "instagram" | "tiktok" | "facebook" | "linkedin" | "twitter" | "youtube";

export interface Post {
  id: string;
  org_id: string;
  client_id: string;
  scheduled_date: string | null;
  post_type: PostType | null;
  objective: string | null;
  copy: string | null;
  inspo_url: string | null;
  internal_comments: string | null;
  platform: Platform;
  status: PostStatus;
  ai_score: number | null;
  ai_insights: string[];
  image_url: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  client?: Client;
  assigned_member?: Member;
}

// ========== Asset ==========
export type AssetType = "photo" | "video" | "template" | "kit" | "other";

export interface Asset {
  id: string;
  org_id: string;
  client_id: string | null;
  name: string;
  file_url: string;
  file_type: AssetType | null;
  file_size: number | null;
  dimensions: string | null;
  created_at: string;
}

// ========== SocialGo Pricing ==========
export interface PricingTier {
  id: string;
  name: string;
  description: string;
  clients_included: number;
  max_clients: number;
  prices: {
    monthly: number;
    quarterly: number;
    annual: number;
  };
  currency: string;
  features: string[];
  is_popular?: boolean;
  stripe_price_ids?: {
    monthly: string;
    quarterly: string;
    annual: string;
  };
}

// ========== API Helpers ==========
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ========== Post Type UI Config ==========
export const POST_TYPE_COLORS: Record<PostType, { bg: string; text: string }> = {
  educativo: { bg: "#E8D5FF", text: "#5B3D8A" },
  producto: { bg: "#FFD0D8", text: "#8A1F35" },
  fun: { bg: "#FFE5B0", text: "#8A5A00" },
  social: { bg: "#B8E8C8", text: "#2D6B47" },
  behind_the_scenes: { bg: "#FFD4B8", text: "#8A5A20" },
  ugc: { bg: "#D0E8FF", text: "#1F5A8A" },
  promo: { bg: "#FFB5C8", text: "#8A1F50" },
};
