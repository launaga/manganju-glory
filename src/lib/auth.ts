// Authentication + authorization helpers for the admin area (client-side).
//
// Authentication ("who are you?") is handled by Supabase Auth.
// Authorization ("are you allowed to manage this CMS?") is checked against the
// admin_users table from Phase 3: its RLS policy only returns rows to a caller
// for whom private.is_admin() is true, so a successful non-empty read *is* the
// authorization signal. RLS remains the real enforcement — these helpers only
// drive UI/routing (redirects, hiding content), never security by themselves.
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const LOGIN_PATH = '/admin/login';
export const ADMIN_PATH = '/admin';

/** Current signed-in user, or null. Reads local session (no network). */
export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

/**
 * Is the current user an authorized admin? Relies on the admin_users RLS
 * policy (select allowed only when private.is_admin()). Non-admins get 0 rows.
 */
export async function isAdmin(): Promise<boolean> {
  const { data, error } = await supabase.from('admin_users').select('user_id').limit(1);
  if (error) return false;
  return (data?.length ?? 0) > 0;
}

export interface AuthResult {
  ok: boolean;
  /** Human-readable, non-leaky message (Bahasa Indonesia). */
  message?: string;
}

/** Sign in, then verify admin authorization. Never reveals which field was wrong. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      // Do not distinguish "no such email" from "wrong password" (anti-enumeration).
      return { ok: false, message: 'Email atau password salah.' };
    }
    if (!(await isAdmin())) {
      // Authenticated but not authorized → drop the session immediately.
      await supabase.auth.signOut();
      return { ok: false, message: 'Anda tidak memiliki akses ke area ini.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: 'Terjadi gangguan jaringan. Coba lagi sebentar.' };
  }
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Route guard for protected admin pages. Resolves to true only for an
 * authenticated + authorized admin; otherwise redirects and resolves false.
 * Call this before revealing any protected content (prevents flashing).
 */
export async function requireAdmin(): Promise<boolean> {
  const user = await getUser();
  if (!user) {
    window.location.replace(LOGIN_PATH);
    return false;
  }
  if (!(await isAdmin())) {
    await signOut();
    window.location.replace(`${LOGIN_PATH}?denied=1`);
    return false;
  }
  return true;
}
