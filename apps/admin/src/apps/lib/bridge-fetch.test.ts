import { handleSessionExpiry } from '@tryghost/admin-x-framework/helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminApiFetch } from './bridge-fetch';

vi.mock('@tryghost/admin-x-framework/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework/helpers')>()),
  handleSessionExpiry: vi.fn(async () => {}),
}));

const API_ROOT = 'https://site.example/ghost/api/admin/';

/** What fetch answers a request that met a redirect it was told not to follow. */
const opaqueRedirect = () =>
  ({ type: 'opaqueredirect', status: 0, statusText: '', headers: new Headers() }) as Response;

describe('createAdminApiFetch', () => {
  const fetchMock = vi.fn<typeof fetch>();
  let session: AbortController;

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    session = new AbortController();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const adminApiFetch = createAdminApiFetch({ apiRoot: new URL(API_ROOT), ghostVersion: '6.0' });

  it('answers with the Admin API’s response as plain data, sent with Admin’s headers', async () => {
    fetchMock.mockResolvedValue(
      new Response('{"posts":[]}', {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      }),
    );

    const response = await adminApiFetch(
      { path: '/posts/?limit=5', headers: { 'X-Podcast-Trace': 'abc' } },
      session.signal,
    );

    expect(response).toEqual({
      status: 200,
      statusText: 'OK',
      headers: { 'content-type': 'application/json' },
      body: '{"posts":[]}',
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toEqual(new URL(`${API_ROOT}posts/?limit=5`));
    expect(init).toMatchObject({
      method: 'GET',
      credentials: 'include',
      redirect: 'manual',
      headers: { 'app-pragma': 'no-cache', 'x-ghost-version': '6.0', 'x-podcast-trace': 'abc' },
    });
  });

  it('refuses a path the blocklist closes, or one that leaves the API, without sending it', async () => {
    await expect(adminApiFetch({ path: '/db/' }, session.signal)).rejects.toThrow(
      'blocked: Apps can’t use /db/',
    );
    await expect(adminApiFetch({ path: '/../content/' }, session.signal)).rejects.toThrow(
      /^invalid_path: /,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a path the Admin API only redirects, saying how its paths are spelled', async () => {
    fetchMock.mockResolvedValue(opaqueRedirect());

    await expect(adminApiFetch({ path: '/posts?limit=5' }, session.signal)).rejects.toThrow(
      'invalid_path: The Admin API answers /posts only with a redirect: its paths are in lowercase and end in /, such as /posts/',
    );
    expect(handleSessionExpiry).not.toHaveBeenCalled();
  });

  it('says the Admin API couldn’t be reached when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(adminApiFetch({ path: '/posts/' }, session.signal)).rejects.toThrow(
      'network_error: Couldn’t reach the Admin API: TypeError: Failed to fetch',
    );
  });

  it('refuses a request the session’s end aborted as the session having ended', async () => {
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );

    const request = adminApiFetch({ path: '/posts/' }, session.signal);
    session.abort();

    await expect(request).rejects.toThrow('session_ended: The app’s session ended');
  });

  it('refuses an answer the session’s end cut off as the session having ended', async () => {
    const response = new Response('{}', { status: 200 });
    vi.spyOn(response, 'text').mockImplementation(() => {
      session.abort();
      return Promise.reject(new DOMException('Aborted', 'AbortError'));
    });
    fetchMock.mockResolvedValue(response);

    await expect(adminApiFetch({ path: '/posts/' }, session.signal)).rejects.toThrow(
      'session_ended: The app’s session ended',
    );
  });

  it('leaves for sign-in on an expired session, and still answers the app', async () => {
    const response = new Response('{"errors":[]}', { status: 401 });
    fetchMock.mockResolvedValue(response);

    const answer = await adminApiFetch({ path: '/posts/' }, session.signal);

    expect(answer.status).toBe(401);
    expect(answer.body).toBe('{"errors":[]}');
    expect(handleSessionExpiry).toHaveBeenCalledExactlyOnceWith(
      new URL(`${API_ROOT}posts/`),
      response,
    );
  });
});
