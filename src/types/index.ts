/**
 * SocialGo V2 TypeScript types
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
  plan: 'free' | 'pro' | 'full_access';
  plan_status: 'trialing' | 'active' | 'past_due' | 'canceled';
  billing_cycle: 'monthly' | 'quarterly' | 'annual';
  client_limit: number;
  theme: 'rose' | 'blue' | 'dark';
  slack_webhook_url: string | null;
  created_at: string;
  updated_at: string;
}

// ========== Member (Team) ==========
export type MemberRole = 'owner' | 'admin' | 'member' | 'creative' | 'client_viewer';

export interface Member {
  id: string;
  org_id: string;
  user_id: string;
  role: MemberRole;
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
  description: string | null;
  price: number | null;
  currency: string;
  features: string[];
  discount_quarterly: number;
  discount_semiannual: number;
  discount_annual: number;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ========== Client (Brand managed by agency) ==========
export type PayStatus = 'pagado' | 'pendiente' | 'vencido';
export type AccountStatus = 'activo' | 'on_track' | 'pago_pendiente' | 'onboarding' | 'pausado';
export type PackageType = 'monthly' | 'quarterly' | 'semiannual' | 'annual';

export interface Client {
  id: string;
  org_id: string;
  // Brand identity
  name: string;
  emoji: string;
  color: string;
  // Contact
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  city: string | null;
  // Social
  instagram: string | null;
  instagram_connected: boolean;
  instagram_access_token: string | null;
  tiktok: string | null;
  facebook: string | null;
  linkedin: string | null;
  // Package & billing
  package_id: string | null;
  package_type: PackageType;
  contract_months: number;
  custom_price: number | null;
  requires_iva: boolean;
  iva_included: boolean;
  total_accumulated: number;
  // Dates
  start_date: string | null;
  end_date: string | null;
  // Status
  pay_status: PayStatus;
  account_status: AccountStatus;
  // Assignment
  manager_id: string | null;
  // Meta
  created_at: string;
  updated_at: string;
  // Joined fields (from queries)
  package?: Package;
  manager?: Member;
}

// ========== Post ==========
export type PostType = 'ventas_promo' | 'fun_casual' | 'educativo' | 'formal' | 'otro';
export type PostFormat = 'video' | 'estatico' | 'carousel' | 'story' | 'reel' | 'otro';
export type PostStatus = 'draft' | 'planned' | 'approved' | 'approved_with_changes' | 'rejected' | 'review_1_1' | 'in_production' | 'scheduled' | 'published' | 'archived';
export type ApprovalStatus = 'pending' | 'approved' | 'approved_with_changes' | 'rejected' | 'review_1_1';
export type Platform = 'instagram' | 'tiktok' | 'facebook' | 'linkedin' | 'twitter' | 'youtube';

export interface Post {
  id: string;
  org_id: string;
  client_id: string;
  // Content
  name: string | null;
  copy: string | null;
  explanation: string | null;
  cta: string | null;
  inspo_url: string | null;
  internal_comments: string | null;
  // Classification
  post_type: PostType | null;
  format: PostFormat | null;
  platform: Platform;
  // Scheduling
  scheduled_date: string | null;
  scheduled_time: string | null;
  status: PostStatus;
  // Approval
  approval_status: ApprovalStatus;
  approval_token: string | null;
  approval_comments: string | null;
  approved_at: string | null;
  approved_by: string | null;
  // Media
  image_url: string | null;
  media_urls: string[];
  // AI
  ai_score: number | null;
  ai_insights: Record<string, unknown>[];
  // Engagement metrics
  likes: number;
  comments_count: number;
  shares: number;
  saves: number;
  impressions: number;
  reach: number;
  // Assignment
  assigned_to: string | null;
  // Publishing
  published_url: string | null;
  published_at: string | null;
  publish_error: string | null;
  // Meta
  created_at: string;
  updated_at: string;
  // Joined
  client?: Client;
  assigned_member?: Member;
}

// ========== Asset ==========
export type AssetType = 'photo' | 'video' | 'template' | 'kit' | 'brandbook' | 'logo' | 'font' | 'other';
export type AssetCategory = 'general' | 'brandkit' | 'inspo' | 'content' | 'logo' | 'font';

export interface Asset {
  id: string;
  org_id: string;
  client_id: string | null;
  name: string;
  file_url: string;
  file_type: AssetType | null;
  file_size: number | null;
  dimensions: string | null;
  category: AssetCategory;
  created_at: string;
}

// ========== Brand Kit ==========
export interface BrandKit {
  id: string;
  client_id: string;
  org_id: string;
  color_palette: { name: string; hex: string }[];
  fonts: { name: string; usage: string }[];
  style_questionnaire: Record<string, unknown>;
  inspo_accounts: string[];
  inspo_notes: string | null;
  created_at: string;
  updated_at: string;
}

// ========== Post Comment ==========
export interface PostComment {
  id: string;
  post_id: string;
  author_name: string | null;
  author_email: string | null;
  author_member_id: string | null;
  content: string;
  is_client_comment: boolean;
  created_at: string;
}

// ========== Social Connection (Direct Publishing) ==========
export interface SocialConnection {
  id: string;
  org_id: string;
  client_id: string;
  platform: 'instagram' | 'facebook';
  access_token: string;
  page_id: string | null;
  page_name: string | null;
  token_expires_at: string | null;
  created_at: string;
  updated_at: string;
}

// ========== Content Week ==========
export interface ContentWeek {
  id: string;
  org_id: string;
  client_id: string;
  week_start: string;
  week_end: string;
  status: 'in_progress' | 'pending_approval' | 'approved' | 'published';
  created_at: string;
  updated_at: string;
}

// ========== Competitor ==========
export interface Competitor {
  id: string;
  org_id: string;
  client_id: string;
  name: string;
  instagram_handle: string | null;
  facebook_url: string | null;
  tiktok_handle: string | null;
  linkedin_url: string | null;
  website: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ========== SocialGo Pricing (for SocialGo's own plans) ==========
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

// ========== Theme System ==========
export interface ThemeConfig {
  id: 'rose' | 'blue' | 'dark';
  name: string;
  colors: {
    primary: string;
    primaryDeep: string;
    secondary: string;
    secondaryDeep: string;
    accent: string;
    bg: string;
    bgWarm: string;
    surface: string;
    glassBorder: string;
    textDark: string;
    textMid: string;
    textLight: string;
  };
}

export const THEMES: ThemeConfig[] = [
  {
    id: 'rose',
    name: 'Rosa & Peach',
    colors: {
      primary: '#FFB5C8',
      primaryDeep: '#FF8FAD',
      secondary: '#FFD4B8',
      secondaryDeep: '#FFBA8A',
      accent: '#E8D5FF',
      bg: '#FFF8F3',
      bgWarm: '#FFFBF8',
      surface: 'rgba(255,255,255,0.55)',
      glassBorder: 'rgba(255,180,150,0.25)',
      textDark: '#2A1F1A',
      textMid: '#7A6560',
      textLight: '#B8A9A4',
    },
  },
  {
    id: 'blue',
    name: 'Azul & Blanco',
    colors: {
      primary: '#93C5FD',
      primaryDeep: '#3B82F6',
      secondary: '#BAE6FD',
      secondaryDeep: '#0EA5E9',
      accent: '#C7D2FE',
      bg: '#F8FAFC',
      bgWarm: '#FFFFFF',
      surface: 'rgba(255,255,255,0.7)',
      glassBorder: 'rgba(59,130,246,0.15)',
      textDark: '#0F172A',
      textMid: '#475569',
      textLight: '#94A3B8',
    },
  },
  {
    id: 'dark',
    name: 'Oscuro Loonshot',
    colors: {
      primary: '#A78BFA',
      primaryDeep: '#7C3AED',
      secondary: '#818CF8',
      secondaryDeep: '#6366F1',
      accent: '#F0ABFC',
      bg: '#0F0F14',
      bgWarm: '#1A1A24',
      surface: 'rgba(30,30,42,0.8)',
      glassBorder: 'rgba(124,58,237,0.2)',
      textDark: '#F1F5F9',
      textMid: '#94A3B8',
      textLight: '#64748B',
    },
  },
];

// ========== Post Type UI Config ==========
export const POST_TYPE_CONFIG: Record<PostType, { label: string; color: string; letter: string }> = {
  ventas_promo: { label: 'Ventas/Promo', color: '#FF8FAD', letter: 'V' },
  fun_casual: { label: 'Fun/Casual', color: '#FFE5B0', letter: 'F' },
  educativo: { label: 'Educativo', color: '#E8D5FF', letter: 'E' },
  formal: { label: 'Formal', color: '#B8E8C8', letter: 'L' },
  otro: { label: 'Otro', color: '#D0E8FF', letter: 'O' },
};

export const FORMAT_CONFIG: Record<PostFormat, { label: string; letter: string }> = {
  reel: { label: 'Reel', letter: 'R' },
  estatico: { label: 'Estático', letter: 'P' },
  carousel: { label: 'Carousel', letter: 'C' },
  story: { label: 'Story', letter: 'S' },
  video: { label: 'Video', letter: 'V' },
  otro: { label: 'Otro', letter: 'O' },
};

// ========== Helper: Calculate monthly payment ==========
export function calculateMonthlyPayment(pkg: Package | null, contractType: PackageType, customPrice?: number | null): number {
  if (!pkg && !customPrice) return 0;

  const basePrice = customPrice ?? pkg?.price ?? 0;

  const monthsMap: Record<PackageType, number> = {
    monthly: 1,
    quarterly: 3,
    semiannual: 6,
    annual: 12,
  };

  const discountMap: Record<PackageType, number> = {
    monthly: 0,
    quarterly: pkg?.discount_quarterly ?? 0,
    semiannual: pkg?.discount_semiannual ?? 0,
    annual: pkg?.discount_annual ?? 0,
  };

  const months = monthsMap[contractType];
  const discount = discountMap[contractType] / 100;
  const totalWithDiscount = basePrice * months * (1 - discount);

  return totalWithDiscount / months;
}

export function calculateTotalWithIVA(amount: number, requiresIva: boolean, ivaIncluded: boolean): { subtotal: number; iva: number; total: number } {
  if (!requiresIva) return { subtotal: amount, iva: 0, total: amount };

  if (ivaIncluded) {
    const subtotal = amount / 1.16;
    return { subtotal, iva: amount - subtotal, total: amount };
  }

  const iva = amount * 0.16;
  return { subtotal: amount, iva, total: amount + iva };
}
