'use client';

/**
 * Auth hooks — consume AuthContext in client components.
 */

import { useContext } from 'react';
import { AuthContext, type AuthContextValue } from './provider';

/**
 * Returns the full auth context (user, profile, session, loading, signOut).
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

/**
 * Returns the current Supabase user or null.
 */
export function useUser() {
  const { user, isLoading } = useAuth();
  return { user, isLoading };
}

/**
 * Returns the current user's profile or null.
 */
export function useProfile() {
  const { profile, isLoading } = useAuth();
  return { profile, isLoading };
}
