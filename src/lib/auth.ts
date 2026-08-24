import { api, clearCsrf, refreshSession } from './api';

export const LOGIN_PATH = '/admin/login';
export const ADMIN_PATH = '/admin';

/** Current signed-in user, or null. Reads local session (no network). */
export interface User { id: string; email: string; }

export async function getUser(): Promise<User | null> {
  return refreshSession();
}

/**
 * Is the current user an authorized admin? Relies on the admin_users RLS
 * policy (select allowed only when private.is_admin()). Non-admins get 0 rows.
 */
export async function isAdmin(): Promise<boolean> {
  return (await getUser()) !== null;
}

export interface AuthResult {
  ok: boolean;
  /** Human-readable, non-leaky message (Bahasa Indonesia). */
  message?: string;
}

/** Sign in, then verify admin authorization. Never reveals which field was wrong. */
export async function signIn(email: string, password: string): Promise<AuthResult> {
  try {
    await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    return { ok: true };
  } catch (error: any) {
    return { ok: false, message: error?.message ?? 'Terjadi gangguan jaringan. Coba lagi sebentar.' };
  }
}

export async function signOut(): Promise<void> {
  try { await api('/auth/logout', { method: 'POST' }); } finally { clearCsrf(); }
}

export async function requestPassword(email: string): Promise<AuthResult> {
  try {
    const result = await api<{ message?: string }>('/auth/request-password', {
      method: 'POST', body: JSON.stringify({ email }),
    });
    return { ok: true, message: result.message };
  } catch (error: any) {
    return { ok: false, message: error?.message ?? 'Gagal mengirim tautan. Coba lagi.' };
  }
}

export async function resetPassword(token: string, password: string): Promise<AuthResult> {
  try {
    const result = await api<{ message?: string }>('/auth/reset-password', {
      method: 'POST', body: JSON.stringify({ token, password }),
    });
    return { ok: true, message: result.message };
  } catch (error: any) {
    return { ok: false, message: error?.message ?? 'Tautan tidak valid atau sudah kedaluwarsa.' };
  }
}

/**
 * Route guard for protected admin pages. Resolves to true only for an
 * authenticated + authorized admin; otherwise redirects and resolves false.
 * Call this before revealing any protected content (prevents flashing).
 */
export async function requireAdmin(): Promise<boolean> {
  if (!(await getUser())) {
    window.location.replace(LOGIN_PATH);
    return false;
  }
  return true;
}
