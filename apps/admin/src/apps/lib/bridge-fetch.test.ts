import { handleSessionExpiry } from '@tryghost/admin-x-framework/helpers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createAdminApiFetch } from './bridge-fetch';

vi.mock('@tryghost/admin-x-framework/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tryghost/admin-x-framework/helpers')>()),
  handleSessionExpiry: vi.fn(async () => {}),
}));

const API_ROOT = 'https://site.example/ghost/api/admin/';

/** What fetch returns for a request that hit a redirect it was told not to follow. */
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

  it('sends Admin’s own headers and drops any the app set to replace them', async () => {
    fetchMock.mockResolvedValue(new Response('{}'));

    // The schema refuses these before a request gets here, but this test doesn't rely on that.
    await adminApiFetch(
      {
        path: '/posts/',
        headers: { 'App-Pragma': 'cache', 'x-ghost-version': '0.1', Authorization: 'Ghost forged' },
      },
      session.signal,
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toEqual({ 'app-pragma': 'no-cache', 'x-ghost-version': '6.0' });
  });

  it('returns the Admin API’s response as plain data, for a request sent with Admin’s headers', async () => {
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

  it('refuses a request the allowlist doesn’t allow, or a path that leaves the API, without sending it', async () => {
    await expect(adminApiFetch({ path: '/db/' }, session.signal)).rejects.toThrow(
      "blocked: Apps can't use GET /db/",
    );
    await expect(
      adminApiFetch({ path: '/posts/?filter=tag:news', method: 'DELETE' }, session.signal),
    ).rejects.toThrow("blocked: Apps can't use DELETE /posts/");
    await expect(
      adminApiFetch({ path: '/v4/db/?x=ghost/api/v4/admin/' }, session.signal),
    ).rejects.toThrow(/^blocked: /);
    await expect(
      adminApiFetch(
        {
          path: '/posts/',
          method: 'POST',
          body: JSON.stringify({
            posts: [{ title: 'x', codeinjection_foot: '<script></script>' }],
          }),
        },
        session.signal,
      ),
    ).rejects.toThrow("blocked: Apps can't send codeinjection_foot to POST /posts/");
    await expect(adminApiFetch({ path: '/../content/' }, session.signal)).rejects.toThrow(
      /^invalid_path: /,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('refuses a path the Admin API only redirects, and says its paths end in /', async () => {
    fetchMock.mockResolvedValue(opaqueRedirect());

    await expect(adminApiFetch({ path: '/posts?limit=5' }, session.signal)).rejects.toThrow(
      'invalid_path: The Admin API answers /posts only with a redirect: its paths end in /, such as /posts/',
    );
    expect(handleSessionExpiry).not.toHaveBeenCalled();
  });

  it('refuses a route that redirects on purpose, without blaming the path', async () => {
    fetchMock.mockResolvedValue(opaqueRedirect());

    await expect(adminApiFetch({ path: '/tags/?limit=5' }, session.signal)).rejects.toThrow(
      'invalid_path: The Admin API answers /tags/ with a redirect, which apps can’t follow',
    );
  });

  it('reports that the Admin API couldn’t be reached when the request fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(adminApiFetch({ path: '/posts/' }, session.signal)).rejects.toThrow(
      'network_error: Couldn’t reach the Admin API: TypeError: Failed to fetch',
    );
  });

  it('rejects a request aborted by the session ending with session_ended', async () => {
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

  it('rejects a response cut off by the session ending with session_ended', async () => {
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

  it('passes a failed response to Admin’s session-expiry check, and still returns it to the app', async () => {
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
