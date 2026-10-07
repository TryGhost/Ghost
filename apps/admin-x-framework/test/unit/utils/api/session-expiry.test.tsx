import { renderHook } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { setupServer } from 'msw/node';
import { restoreLocation, stubLocation } from '../../../utils/stub-location';

const unauthorizedBody = {
  errors: [
    {
      message: 'Authorization failed',
      context: 'Unable to determine the authenticated user or integration.',
      type: 'UnauthorizedError',
      details: null,
      property: null,
      help: null,
      code: null,
      id: 'error-id',
      ghostErrorCode: null,
    },
  ],
};

const unauthorized = () => HttpResponse.json(unauthorizedBody, { status: 401 });

const expiredSessionBody = {
  errors: [
    {
      message: 'Authorization failed',
      context: 'Unable to determine the authenticated user or integration.',
      type: 'NoPermissionError',
      details: null,
      property: null,
      help: null,
      code: null,
      id: 'error-id',
      ghostErrorCode: null,
    },
  ],
};

const expiredSession = () => HttpResponse.json(expiredSessionBody, { status: 403 });

const forbidden = () =>
  HttpResponse.json(
    {
      errors: [
        {
          ...expiredSessionBody.errors[0],
          message: 'You do not have permission to perform this action.',
        },
      ],
    },
    { status: 403 },
  );

const server = setupServer(
  http.get('http://localhost:3000/ghost/api/admin/users/me/', () =>
    HttpResponse.json({ users: [{ id: '1' }] }),
  ),
  http.get('http://localhost:3000/blog/ghost/api/admin/users/me/', () =>
    HttpResponse.json({ users: [{ id: '1' }] }),
  ),
  http.get('http://localhost:3000/ghost/api/admin/site/', () => HttpResponse.json({ site: {} })),
  http.get('http://localhost:3000/ghost/api/admin/users/me/token/', () =>
    HttpResponse.json({ apiKey: {} }),
  ),
  http.get('http://localhost:3000/ghost/api/admin/posts/', expiredSession),
  http.get('http://localhost:3000/ghost/api/admin/posts/401/', unauthorized),
  http.get('http://localhost:3000/ghost/api/admin/members/', forbidden),
  http.post('http://localhost:3000/ghost/api/admin/session', unauthorized),
  http.post('http://localhost:3000/ghost/api/admin/session/', unauthorized),
  http.put('http://localhost:3000/ghost/api/admin/session/verify/', unauthorized),
  http.get('http://localhost:3000/external/data/', unauthorized),
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// The redirect-once guard is module state, so each test re-imports a fresh
// fetch-api module (and its errors module, to keep instanceof checks valid)
const loadModules = async () => {
  const [{ useFetchApi }, { SessionExpiredError, UnauthorizedError, ValidationError }] =
    await Promise.all([
      import('../../../../src/utils/api/fetch-api'),
      import('../../../../src/utils/errors'),
    ]);
  return { useFetchApi, SessionExpiredError, UnauthorizedError, ValidationError };
};

type FetchApi = ReturnType<Awaited<ReturnType<typeof loadModules>>['useFetchApi']>;

// The redirect only applies once the page has seen the session work
const confirmSession = (fetchApi: FetchApi) =>
  fetchApi('http://localhost:3000/ghost/api/admin/users/me/?include=roles', { retry: false });

describe('session expiry handling', () => {
  beforeEach(() => {
    vi.resetModules();
    stubLocation();
  });

  afterEach(() => {
    restoreLocation();
  });

  it('redirects to the admin root when an API request returns 403 Authorization failed', async () => {
    const { useFetchApi, SessionExpiredError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());
    await confirmSession(result.current);

    await expect(
      result.current('http://localhost:3000/ghost/api/admin/posts/', { retry: false }),
    ).rejects.toBeInstanceOf(SessionExpiredError);

    expect(window.location.replace).toHaveBeenCalledExactlyOnceWith('/ghost/');
  });

  it('redirects to the admin root when an API request returns 401', async () => {
    const { useFetchApi, SessionExpiredError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());
    await confirmSession(result.current);

    const error = await result
      .current('http://localhost:3000/ghost/api/admin/posts/401/', { retry: false })
      .catch((fetchError) => fetchError);
    expect(error).toBeInstanceOf(SessionExpiredError);
    expect(error.data).toEqual(unauthorizedBody);

    expect(window.location.replace).toHaveBeenCalledExactlyOnceWith('/ghost/');
  });

  it('redirects only once when multiple in-flight requests return session expiry errors', async () => {
    const { useFetchApi, SessionExpiredError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());
    await confirmSession(result.current);

    const results = await Promise.allSettled([
      result.current('http://localhost:3000/ghost/api/admin/posts/', { retry: false }),
      result.current('http://localhost:3000/ghost/api/admin/posts/', { retry: false }),
      result.current('http://localhost:3000/ghost/api/admin/posts/', { retry: false }),
    ]);

    for (const settled of results) {
      expect(settled.status).toBe('rejected');
      expect((settled as PromiseRejectedResult).reason).toBeInstanceOf(SessionExpiredError);
    }

    expect(window.location.replace).toHaveBeenCalledTimes(1);
  });

  it('does not redirect while signed out before the page has seen the session work', async () => {
    server.use(http.get('http://localhost:3000/ghost/api/admin/users/me/', expiredSession));
    const { useFetchApi, SessionExpiredError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());

    await expect(confirmSession(result.current)).rejects.toBeInstanceOf(SessionExpiredError);
    await expect(
      result.current('http://localhost:3000/ghost/api/admin/posts/', { retry: false }),
    ).rejects.toBeInstanceOf(SessionExpiredError);

    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it('does not treat a successful request to a public endpoint as a confirmed session', async () => {
    const { useFetchApi, SessionExpiredError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());

    await result.current('http://localhost:3000/ghost/api/admin/site/', { retry: false });
    await result.current('http://localhost:3000/ghost/api/admin/users/me/token/', { retry: false });
    await expect(
      result.current('http://localhost:3000/ghost/api/admin/posts/', { retry: false }),
    ).rejects.toBeInstanceOf(SessionExpiredError);

    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it('confirms the session from the current user under a subdirectory install', async () => {
    const { useFetchApi, SessionExpiredError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());

    await result.current('http://localhost:3000/blog/ghost/api/admin/users/me/?include=roles', {
      retry: false,
    });
    await expect(
      result.current('http://localhost:3000/ghost/api/admin/posts/', { retry: false }),
    ).rejects.toBeInstanceOf(SessionExpiredError);

    expect(window.location.replace).toHaveBeenCalledExactlyOnceWith('/ghost/');
  });

  it('redirects from the signed-in onboarding route under /setup', async () => {
    (window as any).location.hash = '#/setup/onboarding?returnTo=/analytics';
    const { useFetchApi, SessionExpiredError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());
    await confirmSession(result.current);

    await expect(
      result.current('http://localhost:3000/ghost/api/admin/posts/', { retry: false }),
    ).rejects.toBeInstanceOf(SessionExpiredError);

    expect(window.location.replace).toHaveBeenCalledExactlyOnceWith('/ghost/');
  });

  it.each([
    '',
    '#/',
    '#/signin',
    '#/signin/verify',
    '#/signin?labs=authReact',
    '#/signout',
    '#/signup/invitation-token',
    '#/setup',
    '#/reset/reset-token',
    '#/reset/reset-token/',
  ])('does not redirect from unauthenticated Admin route %s', async (hash) => {
    (window as any).location.hash = hash;
    const { useFetchApi, SessionExpiredError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());
    await confirmSession(result.current);

    await expect(
      result.current('http://localhost:3000/ghost/api/admin/posts/', { retry: false }),
    ).rejects.toBeInstanceOf(SessionExpiredError);

    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it('does not redirect when the session endpoint returns 401', async () => {
    const { useFetchApi, SessionExpiredError, UnauthorizedError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());
    await confirmSession(result.current);

    await expect(
      result.current('http://localhost:3000/ghost/api/admin/session/', {
        method: 'POST',
        body: JSON.stringify({ username: 'test@example.com', password: 'wrong' }),
        retry: false,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    await expect(
      result.current('http://localhost:3000/ghost/api/admin/session/verify/', {
        method: 'PUT',
        retry: false,
      }),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    const queryError = await result
      .current('http://localhost:3000/ghost/api/admin/session?source=signin', {
        method: 'POST',
        retry: false,
      })
      .catch((error) => error);
    expect(queryError).toBeInstanceOf(UnauthorizedError);
    expect(queryError).not.toBeInstanceOf(SessionExpiredError);

    const fragmentError = await result
      .current('http://localhost:3000/ghost/api/admin/session#signin', {
        method: 'POST',
        retry: false,
      })
      .catch((error) => error);
    expect(fragmentError).toBeInstanceOf(UnauthorizedError);
    expect(fragmentError).not.toBeInstanceOf(SessionExpiredError);

    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it('does not redirect when a non-Ghost API request returns 401', async () => {
    const { useFetchApi, SessionExpiredError, UnauthorizedError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());
    await confirmSession(result.current);

    const error = await result
      .current('http://localhost:3000/external/data/', { retry: false })
      .catch((fetchError) => fetchError);
    expect(error).toBeInstanceOf(UnauthorizedError);
    expect(error).not.toBeInstanceOf(SessionExpiredError);

    expect(window.location.replace).not.toHaveBeenCalled();
  });

  it('does not redirect for other 403 permission errors', async () => {
    const { useFetchApi, SessionExpiredError, ValidationError } = await loadModules();
    const { result } = renderHook(() => useFetchApi());
    await confirmSession(result.current);

    const error = await result
      .current('http://localhost:3000/ghost/api/admin/members/', { retry: false })
      .catch((fetchError) => fetchError);
    expect(error).toBeInstanceOf(ValidationError);
    expect(error).not.toBeInstanceOf(SessionExpiredError);

    expect(window.location.replace).not.toHaveBeenCalled();
  });
});
