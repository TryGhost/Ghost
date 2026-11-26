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
    token.send.mockImplementation((call) => call('ghost_app_current'));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const token = {
    send: vi.fn<(call: (token: string) => Promise<Response>) => Promise<Response>>(),
  };

  const adminApiFetch = createAdminApiFetch({
    apiRoot: new URL(API_ROOT),
    approvedScopes: new Set(['post:browse', 'post:add', 'post:edit', 'tag:browse']),
    ghostVersion: '6.0',
    token,
  });

  it('refuses a call the installation wasn’t approved for, before sending anything', async () => {
    await expect(adminApiFetch({ path: '/tiers/' }, session.signal)).rejects.toThrow(
      "This app wasn't approved for product:browse, which GET /tiers/ needs",
    );
    await expect(
      adminApiFetch({ path: '/posts/?include=count.clicks' }, session.signal),
    ).rejects.toMatchObject({ code: 'blocked' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('includes how posts performed for an app approved for post:readStats', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(new Response('{}')));
    const withStats = createAdminApiFetch({
      apiRoot: new URL(API_ROOT),
      approvedScopes: new Set(['post:browse', 'post:readStats']),
      token,
    });

    await withStats({ path: '/posts/?include=email,count.clicks' }, session.signal);
    // With nothing named, Ghost's defaults, how posts performed included.
    await withStats({ path: '/posts/' }, session.signal);

    expect(fetchMock.mock.calls.map(([url]) => (url as URL).href)).toEqual([
      `${API_ROOT}posts/?include=email,count.clicks`,
      `${API_ROOT}posts/?include=authors,email,count.clicks`,
    ]);
  });

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
    expect(init?.headers).toEqual({
      'app-pragma': 'no-cache',
      'x-ghost-version': '6.0',
      authorization: 'Bearer ghost_app_current',
    });
  });

  it('labels a body as JSON itself, whatever content type the app set', async () => {
    fetchMock.mockResolvedValue(new Response('{}'));

    // The schema refuses these before a request gets here, but this test doesn't rely on that.
    await adminApiFetch(
      {
        path: '/posts/',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-7',
          'content-encoding': 'gzip',
        },
        body: '{"posts":[{"title":"Hello"}]}',
      },
      session.signal,
    );

    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toEqual({
      'app-pragma': 'no-cache',
      'content-type': 'application/json',
      'x-ghost-version': '6.0',
      authorization: 'Bearer ghost_app_current',
    });
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
    // With no include named, the app gets the defaults it may have, without how posts performed.
    expect(url).toEqual(new URL(`${API_ROOT}posts/?limit=5&include=tags,authors`));
    // The app's token is the only credential: the staff session's cookie isn't sent.
    expect(init).toMatchObject({
      method: 'GET',
      credentials: 'omit',
      redirect: 'manual',
      headers: {
        'app-pragma': 'no-cache',
        'x-ghost-version': '6.0',
        'x-podcast-trace': 'abc',
        authorization: 'Bearer ghost_app_current',
      },
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
      new URL(`${API_ROOT}posts/?include=tags,authors`),
      response,
    );
  });

  it('gives the app the response its token source settled on', async () => {
    token.send.mockImplementation(async (call) => {
      await call('ghost_app_expired');
      return call('ghost_app_renewed');
    });
    fetchMock
      .mockResolvedValueOnce(
        new Response('{"errors":[{"code":"APP_TOKEN_INVALID"}]}', { status: 401 }),
      )
      .mockResolvedValueOnce(new Response('{"posts":[]}'));

    const answer = await adminApiFetch({ path: '/posts/' }, session.signal);

    expect(answer).toMatchObject({ status: 200, body: '{"posts":[]}' });
    expect(
      fetchMock.mock.calls.map(
        ([, init]) => (init?.headers as Record<string, string>).authorization,
      ),
    ).toEqual(['Bearer ghost_app_expired', 'Bearer ghost_app_renewed']);
  });
});
