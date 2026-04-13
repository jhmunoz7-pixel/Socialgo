'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth-context';
import {
  Organization,
  Member,
  Client,
  Package,
  Post,
  Asset,
  BrandKit,
  PostComment,
  ContentWeek,
} from '@/types';

// Type for hook return pattern
interface HookResult<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface HookResultArray<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// ==============================================================================
// HOOKS FOR FETCHING DATA
// ==============================================================================

/**
 * Returns the current authenticated user and their member record.
 * Uses the shared AuthProvider context — no duplicate API calls.
 */
export function useCurrentUser(): HookResult<{
  user: any;
  member: Member | null;
}> {
  const auth = useAuth();
  const data = useMemo(
    () => (auth.user ? { user: auth.user, member: auth.member } : null),
    [auth.user, auth.member]
  );
  return {
    data,
    loading: auth.loading,
    error: auth.error,
    refetch: auth.refetch,
  };
}

/**
 * Returns the current user's organization.
 * Uses the shared AuthProvider context — no duplicate API calls.
 */
export function useOrganization(): HookResult<Organization> {
  const auth = useAuth();
  return {
    data: auth.organization,
    loading: auth.loading,
    error: auth.error,
    refetch: auth.refetch,
  };
}

/**
 * Fetches all members of the current organization
 */
export function useMembers(): HookResultArray<Member> {
  const [data, setData] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: currentUser } = useCurrentUser();

  const fetchMembers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser?.member?.org_id) {
        setData([]);
        return;
      }

      const supabase = createSupabaseClient();
      const { data: membersData, error: membersError } = await supabase
        .from('members')
        .select('*')
        .eq('org_id', currentUser.member.org_id)
        .order('full_name', { ascending: true });

      if (membersError) throw membersError;

      setData(membersData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.member?.org_id]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  return {
    data,
    loading,
    error,
    refetch: fetchMembers,
  };
}

/**
 * Fetches all clients for the current organization
 * @param accountStatus - Optional filter by account_status (activo/onboarding/pausado)
 */
export function useClients(
  accountStatus?: 'activo' | 'onboarding' | 'pausado'
): HookResultArray<Client> {
  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: currentUser } = useCurrentUser();

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser?.member?.org_id) {
        setData([]);
        return;
      }

      const supabase = createSupabaseClient();
      let query = supabase
        .from('clients')
        .select('*, package:packages(*), manager:members(*)')
        .eq('org_id', currentUser.member.org_id);

      if (accountStatus) {
        query = query.eq('account_status', accountStatus);
      }

      const { data: clientsData, error: clientsError } = await query.order(
        'name',
        {
          ascending: true,
        }
      );

      if (clientsError) throw clientsError;

      setData(clientsData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.member?.org_id, accountStatus]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  return {
    data,
    loading,
    error,
    refetch: fetchClients,
  };
}

/**
 * Fetches a single client with their posts
 * @param clientId - The client ID to fetch
 */
export function useClient(
  clientId: string | null | undefined
): HookResult<Client & { posts: Post[] }> {
  const [data, setData] = useState<(Client & { posts: Post[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchClient = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!clientId) {
        setData(null);
        return;
      }

      const supabase = createSupabaseClient();
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select(
          `
          *,
          package:packages(*),
          manager:members(*),
          posts (*)
        `
        )
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;

      setData(clientData as Client & { posts: Post[] });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClient();
  }, [fetchClient]);

  return {
    data,
    loading,
    error,
    refetch: fetchClient,
  };
}

/**
 * Fetches packages for the current organization
 */
export function usePackages(): HookResultArray<Package> {
  const [data, setData] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: currentUser } = useCurrentUser();

  const fetchPackages = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser?.member?.org_id) {
        setData([]);
        return;
      }

      const supabase = createSupabaseClient();
      const { data: packagesData, error: packagesError } = await supabase
        .from('packages')
        .select('*')
        .eq('org_id', currentUser.member.org_id)
        .order('sort_order', { ascending: true });

      if (packagesError) throw packagesError;

      setData(packagesData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.member?.org_id]);

  useEffect(() => {
    fetchPackages();
  }, [fetchPackages]);

  return {
    data,
    loading,
    error,
    refetch: fetchPackages,
  };
}

/**
 * Fetches posts, optionally filtered by client
 * @param clientId - Optional client ID to filter by
 */
export function usePosts(clientId?: string | null): HookResultArray<Post> {
  const [data, setData] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: currentUser } = useCurrentUser();

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser?.member?.org_id) {
        setData([]);
        return;
      }

      const supabase = createSupabaseClient();
      let query = supabase
        .from('posts')
        .select('*')
        .eq('org_id', currentUser.member.org_id);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      const { data: postsData, error: postsError } = await query.order(
        'scheduled_date',
        {
          ascending: false,
        }
      );

      if (postsError) throw postsError;

      setData(postsData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.member?.org_id, clientId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    data,
    loading,
    error,
    refetch: fetchPosts,
  };
}

/**
 * Computes dashboard statistics for the current organization
 */
export function useStats(): HookResult<{
  activeClientsCount: number;
  totalMRR: number;
  postsThisMonth: number;
  pendingPayments: number;
}> {
  const [data, setData] = useState<{
    activeClientsCount: number;
    totalMRR: number;
    postsThisMonth: number;
    pendingPayments: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: currentUser } = useCurrentUser();

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser?.member?.org_id) {
        setData({
          activeClientsCount: 0,
          totalMRR: 0,
          postsThisMonth: 0,
          pendingPayments: 0,
        });
        return;
      }

      const supabase = createSupabaseClient();
      const orgId = currentUser.member.org_id;

      // Fetch all clients with package info (not just activo — pending payments span all statuses)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('pay_status, package_type, custom_price, package_id, account_status')
        .eq('org_id', orgId);

      if (clientsError) throw clientsError;

      const activeClientsCount = clientsData?.filter((c: any) => c.account_status === 'activo').length || 0;

      // Calculate pending payments (MRR calculation needs packages, simplified here)
      let totalMRR = 0;
      let pendingPayments = 0;

      clientsData?.forEach((client: any) => {
        if (client.custom_price) {
          totalMRR += client.custom_price;
        }
        if (client.pay_status === 'pendiente' || client.pay_status === 'vencido') {
          pendingPayments++;
        }
      });

      // Fetch posts from this month
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id')
        .eq('org_id', orgId)
        .gte('scheduled_date', monthStart.toISOString())
        .lte('scheduled_date', monthEnd.toISOString());

      if (postsError) throw postsError;

      const postsThisMonth = postsData?.length || 0;

      setData({
        activeClientsCount,
        totalMRR,
        postsThisMonth,
        pendingPayments,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.member?.org_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    data,
    loading,
    error,
    refetch: fetchStats,
  };
}

// ==============================================================================
// MUTATION FUNCTIONS
// ==============================================================================

/**
 * Creates a new client
 */
export async function createClient(
  data: Omit<Client, 'id' | 'org_id' | 'created_at' | 'updated_at'>
): Promise<Client> {
  const supabase = createSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    throw new Error('Not authenticated');
  }

  const { data: memberData } = await supabase
    .from('members')
    .select('org_id')
    .eq('user_id', authData.user.id)
    .single();

  if (!memberData) {
    throw new Error('User is not a member of any organization');
  }

  // Enforce plan client limit before creating
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select('client_limit')
    .eq('id', memberData.org_id)
    .single();

  if (orgError) throw orgError;

  const { count: currentClientCount, error: countError } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', memberData.org_id);

  if (countError) throw countError;

  if (orgData?.client_limit && (currentClientCount ?? 0) >= orgData.client_limit) {
    throw new Error(`Has alcanzado el límite de ${orgData.client_limit} cliente(s) de tu plan. Actualiza tu plan para agregar más clientes.`);
  }

  const { data: result, error } = await supabase
    .from('clients')
    .insert({
      ...data,
      org_id: memberData.org_id,
    })
    .select()
    .single();

  if (error) throw error;
  return result as Client;
}

/**
 * Updates an existing client
 */
export async function updateClient(
  id: string,
  data: Partial<Omit<Client, 'id' | 'org_id' | 'created_at' | 'updated_at'>>
): Promise<Client> {
  const supabase = createSupabaseClient();

  const { data: result, error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as Client;
}

/**
 * Deletes a client
 */
export async function deleteClient(id: string): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase.from('clients').delete().eq('id', id);

  if (error) throw error;
}

/**
 * Creates a new post
 */
export async function createPost(
  data: Omit<Post, 'id' | 'org_id' | 'created_at' | 'updated_at'>
): Promise<Post> {
  const supabase = createSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    throw new Error('Not authenticated');
  }

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('org_id')
    .eq('user_id', authData.user.id)
    .single();

  if (memberError) {
    throw new Error(`Error fetching member: ${memberError.message} (code: ${memberError.code})`);
  }
  if (!memberData) {
    throw new Error('User is not a member of any organization');
  }

  const { data: result, error } = await supabase
    .from('posts')
    .insert({
      ...data,
      org_id: memberData.org_id,
    })
    .select()
    .single();

  if (error) throw error;
  return result as Post;
}

/**
 * Updates an existing post
 */
export async function updatePost(
  id: string,
  data: Partial<Omit<Post, 'id' | 'org_id' | 'created_at' | 'updated_at'>>
): Promise<Post> {
  const supabase = createSupabaseClient();

  const { data: result, error } = await supabase
    .from('posts')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as Post;
}

/**
 * Deletes a post
 */
export async function deletePost(id: string): Promise<void> {
  const supabase = createSupabaseClient();

  const { error } = await supabase.from('posts').delete().eq('id', id);

  if (error) throw error;
}

/**
 * Creates a new package
 */
export async function createPackage(
  data: Omit<Package, 'id' | 'org_id' | 'created_at' | 'updated_at'>
): Promise<Package> {
  const supabase = createSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    throw new Error('Not authenticated');
  }

  const { data: memberData, error: memberError } = await supabase
    .from('members')
    .select('org_id')
    .eq('user_id', authData.user.id)
    .single();

  if (memberError) {
    throw new Error(`Error fetching member: ${memberError.message} (code: ${memberError.code})`);
  }
  if (!memberData) {
    throw new Error('User is not a member of any organization');
  }

  const { data: result, error } = await supabase
    .from('packages')
    .insert({
      ...data,
      org_id: memberData.org_id,
    })
    .select()
    .single();

  if (error) throw error;
  return result as Package;
}

/**
 * Updates an existing package
 */
export async function updatePackage(
  id: string,
  data: Partial<Omit<Package, 'id' | 'org_id' | 'created_at' | 'updated_at'>>
): Promise<Package> {
  const supabase = createSupabaseClient();

  const { data: result, error } = await supabase
    .from('packages')
    .update(data)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return result as Package;
}

/**
 * Deletes a package
 */
export async function deletePackage(id: string): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase.from('packages').delete().eq('id', id);
  if (error) throw error;
}

/**
 * Updates organization theme
 */
export async function updateOrganizationTheme(
  orgId: string,
  theme: 'rose' | 'blue' | 'dark'
): Promise<void> {
  const supabase = createSupabaseClient();
  const { error } = await supabase
    .from('organizations')
    .update({ theme })
    .eq('id', orgId);
  if (error) throw error;
}

/**
 * Creates a brand kit for a client
 */
export async function createBrandKit(
  data: Omit<BrandKit, 'id' | 'created_at' | 'updated_at'>
): Promise<BrandKit> {
  const supabase = createSupabaseClient();
  const { data: result, error } = await supabase
    .from('brand_kits')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as BrandKit;
}

/**
 * Updates a brand kit
 */
export async function updateBrandKit(
  id: string,
  data: Partial<Omit<BrandKit, 'id' | 'created_at' | 'updated_at'>>
): Promise<BrandKit> {
  const supabase = createSupabaseClient();
  const { data: result, error } = await supabase
    .from('brand_kits')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result as BrandKit;
}

/**
 * Creates a post comment (used in approval flows)
 */
export async function createPostComment(
  data: Omit<PostComment, 'id' | 'created_at'>
): Promise<PostComment> {
  const supabase = createSupabaseClient();
  const { data: result, error } = await supabase
    .from('post_comments')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as PostComment;
}

/**
 * Fetches comments for a post
 */
export function usePostComments(postId: string | null): HookResultArray<PostComment> {
  const [data, setData] = useState<PostComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchComments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!postId) { setData([]); return; }

      const supabase = createSupabaseClient();
      const { data: commentsData, error: commentsError } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;
      setData(commentsData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { fetchComments(); }, [fetchComments]);

  return { data, loading, error, refetch: fetchComments };
}

/**
 * Fetches content weeks for a client within a date range
 */
export function useContentWeeks(clientId?: string | null, weekStart?: string): HookResultArray<ContentWeek> {
  const [data, setData] = useState<ContentWeek[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { data: currentUser } = useCurrentUser();

  const fetchContentWeeks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!currentUser?.member?.org_id) {
        setData([]);
        return;
      }

      const supabase = createSupabaseClient();
      let query = supabase
        .from('content_weeks')
        .select('*')
        .eq('org_id', currentUser.member.org_id);

      if (clientId) {
        query = query.eq('client_id', clientId);
      }

      if (weekStart) {
        query = query.eq('week_start', weekStart);
      }

      const { data: weeksData, error: weeksError } = await query.order('week_start', { ascending: false });

      if (weeksError) throw weeksError;
      setData(weeksData || []);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.member?.org_id, clientId, weekStart]);

  useEffect(() => { fetchContentWeeks(); }, [fetchContentWeeks]);

  return { data, loading, error, refetch: fetchContentWeeks };
}

/**
 * Creates a content week
 */
export async function createContentWeek(
  data: Omit<ContentWeek, 'id' | 'created_at' | 'updated_at'>
): Promise<ContentWeek> {
  const supabase = createSupabaseClient();
  const { data: result, error } = await supabase
    .from('content_weeks')
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return result as ContentWeek;
}

/**
 * Updates a content week
 */
export async function updateContentWeek(
  id: string,
  data: Partial<Omit<ContentWeek, 'id' | 'created_at' | 'updated_at'>>
): Promise<ContentWeek> {
  const supabase = createSupabaseClient();
  const { data: result, error } = await supabase
    .from('content_weeks')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return result as ContentWeek;
}

/**
 * Fetches brand kit for a client
 */
export function useBrandKit(clientId: string | null): HookResult<BrandKit> {
  const [data, setData] = useState<BrandKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBrandKit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      if (!clientId) { setData(null); return; }

      const supabase = createSupabaseClient();
      const { data: bkData, error: bkError } = await supabase
        .from('brand_kits')
        .select('*')
        .eq('client_id', clientId)
        .single();

      if (bkError && bkError.code !== 'PGRST116') throw bkError;
      setData(bkData as BrandKit || null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => { fetchBrandKit(); }, [fetchBrandKit]);

  return { data, loading, error, refetch: fetchBrandKit };
}

// ═══════════════════════════════════════════════════════════════
// Asset Upload
// ═══════════════════════════════════════════════════════════════

/**
 * Uploads a file to Supabase Storage and returns the public URL.
 * Bucket: "post-assets" (must exist in Supabase dashboard).
 */
export async function uploadPostAsset(
  file: File,
  orgId: string,
  postId: string
): Promise<string> {
  const supabase = createSupabaseClient();

  const ext = file.name.split('.').pop() || 'bin';
  const filePath = `${orgId}/${postId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('post-assets')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from('post-assets')
    .getPublicUrl(filePath);

  return urlData.publicUrl;
}

/**
 * Uploads an asset file, updates the post's image_url, and returns the updated post.
 */
export async function uploadAndAttachAsset(
  file: File,
  orgId: string,
  postId: string
): Promise<Post> {
  const publicUrl = await uploadPostAsset(file, orgId, postId);
  return updatePost(postId, { image_url: publicUrl });
}
