'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import {
  Organization,
  Member,
  Client,
  Package,
  Post,
  Asset,
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
 * Fetches the current authenticated user and their member record
 */
export function useCurrentUser(): HookResult<{
  user: any;
  member: Member | null;
}> {
  const [data, setData] = useState<{ user: any; member: Member | null } | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createSupabaseClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) {
        setData({ user: null, member: null });
        return;
      }

      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      setData({
        user: authData.user,
        member: memberData || null,
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  return {
    data,
    loading,
    error,
    refetch: fetchCurrentUser,
  };
}

/**
 * Fetches the current user's organization
 */
export function useOrganization(): HookResult<Organization> {
  const [data, setData] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createSupabaseClient();
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) {
        setData(null);
        return;
      }

      const { data: orgData, error: orgError } = await supabase
        .from('members')
        .select(
          `
          organizations:org_id (*)
        `
        )
        .eq('user_id', authData.user.id)
        .single();

      if (orgError && orgError.code !== 'PGRST116') {
        throw orgError;
      }

      if (orgData && orgData.organizations) {
        setData(orgData.organizations as Organization);
      } else {
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganization();
  }, [fetchOrganization]);

  return {
    data,
    loading,
    error,
    refetch: fetchOrganization,
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
        .select('*')
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

      // Fetch active clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('mrr, pay_status')
        .eq('org_id', orgId)
        .eq('account_status', 'activo');

      if (clientsError) throw clientsError;

      const activeClientsCount = clientsData?.length || 0;

      // Calculate total MRR and pending payments
      let totalMRR = 0;
      let pendingPayments = 0;

      clientsData?.forEach((client: any) => {
        if (client.mrr) {
          totalMRR += client.mrr;
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

  const { data: memberData } = await supabase
    .from('members')
    .select('org_id')
    .eq('user_id', authData.user.id)
    .single();

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

  const { data: memberData } = await supabase
    .from('members')
    .select('org_id')
    .eq('user_id', authData.user.id)
    .single();

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
