'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import type { Organization, Member } from '@/types';

interface AuthContextData {
  user: any | null;
  member: Member | null;
  organization: Organization | null;
  allMemberships: { member: Member; organization: Organization }[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  switchOrg: (orgId: string) => void;
}

const AuthContext = createContext<AuthContextData>({
  user: null,
  member: null,
  organization: null,
  allMemberships: [],
  loading: true,
  error: null,
  refetch: async () => {},
  switchOrg: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [allMemberships, setAllMemberships] = useState<{ member: Member; organization: Organization }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);

  const switchOrg = useCallback((orgId: string) => {
    setSelectedOrgId(orgId);
    if (typeof window !== 'undefined') {
      localStorage.setItem('socialgo_active_org', orgId);
    }
  }, []);

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
        setAllMemberships([]);
        return;
      }

      setUser(authData.user);

      // Fetch ALL memberships for this user (supports multi-org)
      const { data: membersData, error: memberError } = await supabase
        .from('members')
        .select(`
          *,
          organizations:org_id (*)
        `)
        .eq('user_id', authData.user.id);

      if (memberError && memberError.code !== 'PGRST116') {
        throw memberError;
      }

      if (membersData && membersData.length > 0) {
        const memberships = membersData.map((m: any) => {
          const { organizations, ...memberOnly } = m;
          return { member: memberOnly as Member, organization: organizations as Organization };
        });
        setAllMemberships(memberships);

        // Determine active org: saved preference > first membership
        const savedOrgId = selectedOrgId || (typeof window !== 'undefined' ? localStorage.getItem('socialgo_active_org') : null);
        const active = memberships.find((m: any) => m.member.org_id === savedOrgId) || memberships[0];

        setMember(active.member);
        setOrganization(active.organization);
      } else {
        setMember(null);
        setOrganization(null);
        setAllMemberships([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  }, [selectedOrgId]);

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
      value={{ user, member, organization, allMemberships, loading, error, refetch: fetchAll, switchOrg }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextData {
  return useContext(AuthContext);
}
