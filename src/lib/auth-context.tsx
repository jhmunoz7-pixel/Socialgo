'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import type { Organization, Member } from '@/types';

interface AuthContextData {
  user: any | null;
  member: Member | null;
  organization: Organization | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  member: null,
  organization: null,
  loading: true,
  error: null,
  refetch: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const supabase = createSupabaseClient();
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!authData.user) {
        setUser(null);
        setMember(null);
        setOrganization(null);
        return;
      }

      setUser(authData.user);

      // Check for impersonation cookie (platform admin viewing as agency)
      const impersonateOrgId = document.cookie
        .split('; ')
        .find(row => row.startsWith('x-impersonate-org='))
        ?.split('=')[1] || null;

      // Fetch member + org in a single query using join
      let memberQuery = supabase
        .from('members')
        .select(`
          *,
          organizations:org_id (*)
        `)
        .eq('user_id', authData.user.id);

      // When impersonating, scope to the target org
      if (impersonateOrgId) {
        memberQuery = memberQuery.eq('org_id', impersonateOrgId);
      }

      // Use maybeSingle + order so duplicate member rows don't break auth
      const { data: memberData, error: memberError } = await memberQuery
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      if (memberData) {
        const { organizations, ...memberOnly } = memberData;
        setMember(memberOnly as Member);
        setOrganization((organizations as unknown as Organization) || null);
      } else {
        setMember(null);
        setOrganization(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();

    const supabase = createSupabaseClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, _session) => {
        // Re-fetch user/member/org whenever auth state changes
        // (login, logout, token refresh, password recovery)
        fetchAll();
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAll]);

  return (
    <AuthContext.Provider
      value={{ user, member, organization, loading, error, refetch: fetchAll }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  return useContext(AuthContext);
}
