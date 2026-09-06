import { fetchAuthSession } from 'aws-amplify/auth';

export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();

  const headers = new Headers(init?.headers);
  if (init?.body) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers,
  });
}

export const PERMISSION_DENIED_MESSAGE = "You don't have permission to do that.";

export async function parseApiError(response: Response, fallback: string): Promise<Error> {
  if (response.status === 403) {
    return new Error(PERMISSION_DENIED_MESSAGE);
  }
  try {
    const body = await response.json();
    return new Error(body.error?.message ?? fallback);
  } catch {
    return new Error(fallback);
  }
}
