import { describe, expect, it, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../test/msw/server';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
}));

import { fetchAuthSession } from 'aws-amplify/auth';
import { apiFetch, parseApiError, PERMISSION_DENIED_MESSAGE } from './client';

const mockFetchAuthSession = vi.mocked(fetchAuthSession);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('apiFetch', () => {
  it('attaches the Authorization header from the current session', async () => {
    mockFetchAuthSession.mockResolvedValue({
      tokens: { idToken: { toString: () => 'test-id-token' } },
    } as never);

    let receivedAuth: string | null = null;
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, ({ request }) => {
        receivedAuth = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiFetch('/me');

    expect(receivedAuth).toBe('Bearer test-id-token');
  });

  it('omits the Authorization header when there is no session', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as never);

    let receivedAuth: string | null = 'not-set';
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, ({ request }) => {
        receivedAuth = request.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiFetch('/me');

    expect(receivedAuth).toBeNull();
  });

  it('sends the request to VITE_API_URL + the given path', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as never);

    let receivedUrl = '';
    server.use(
      http.post(`${import.meta.env.VITE_API_URL}/user/setup`, ({ request }) => {
        receivedUrl = request.url;
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiFetch('/user/setup', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    expect(receivedUrl).toBe(`${import.meta.env.VITE_API_URL}/user/setup`);
  });

  it('does not set Content-Type header when there is no request body', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as never);

    let receivedContentType: string | null = 'not-read';
    server.use(
      http.get(`${import.meta.env.VITE_API_URL}/me`, ({ request }) => {
        receivedContentType = request.headers.get('Content-Type');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiFetch('/me');

    expect(receivedContentType).toBeNull();
  });

  it('sets Content-Type: application/json when there is a request body', async () => {
    mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as never);

    let receivedContentType: string | null = 'not-read';
    server.use(
      http.post(`${import.meta.env.VITE_API_URL}/user/setup`, ({ request }) => {
        receivedContentType = request.headers.get('Content-Type');
        return HttpResponse.json({ ok: true });
      }),
    );

    await apiFetch('/user/setup', { method: 'POST', body: JSON.stringify({ a: 1 }) });

    expect(receivedContentType).toBe('application/json');
  });
});

describe('parseApiError', () => {
  test('returns the fixed permission-denied message for a 403, ignoring any body', async () => {
    const response = new Response(JSON.stringify({ error: { message: 'server-specific text' } }), {
      status: 403,
    });

    const error = await parseApiError(response, 'fallback');

    expect(error.message).toBe(PERMISSION_DENIED_MESSAGE);
  });

  test('uses the body error message when present on a non-403 failure', async () => {
    const response = new Response(JSON.stringify({ error: { message: 'spool not found' } }), {
      status: 404,
    });

    const error = await parseApiError(response, 'fallback');

    expect(error.message).toBe('spool not found');
  });

  test('falls back to the provided message when the body has no error.message', async () => {
    const response = new Response(JSON.stringify({}), { status: 500 });

    const error = await parseApiError(response, 'Failed to do the thing: 500');

    expect(error.message).toBe('Failed to do the thing: 500');
  });

  test('falls back to the provided message when the body is not valid JSON', async () => {
    const response = new Response('not json', { status: 500 });

    const error = await parseApiError(response, 'Failed to do the thing: 500');

    expect(error.message).toBe('Failed to do the thing: 500');
  });
});
