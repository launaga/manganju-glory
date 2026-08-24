let csrfToken = '';

export interface ApiError extends Error { status?: number; code?: string; }

export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!csrfToken && !path.startsWith('/auth/')) await refreshSession();
    if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  }
  const response = await fetch(`/api${path}`, {
    ...init, method, headers, credentials: 'same-origin',
  });
  const payload = await response.json().catch(() => ({}));
  if (payload?.csrf_token) csrfToken = payload.csrf_token;
  if (!response.ok || payload?.ok === false) {
    const error = new Error(payload?.message || 'Request failed') as ApiError;
    error.status = response.status;
    error.code = payload?.code;
    throw error;
  }
  return payload as T;
}

export async function refreshSession(): Promise<any | null> {
  try {
    const payload = await api<any>('/auth/me');
    csrfToken = payload.csrf_token ?? '';
    return payload.user ?? null;
  } catch {
    csrfToken = '';
    return null;
  }
}

export function clearCsrf(): void { csrfToken = ''; }
