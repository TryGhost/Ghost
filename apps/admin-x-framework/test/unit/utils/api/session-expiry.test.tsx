import {renderHook} from '@testing-library/react';
import {HttpResponse, http} from 'msw';
import {setupMswServer} from '../../../../src/test/msw-utils';

const unauthorizedBody = {
    errors: [{
        message: 'Authorization failed',
        context: 'Unable to determine the authenticated user or integration.',
        type: 'UnauthorizedError',
        details: null,
        property: null,
        help: null,
        code: null,
        id: 'error-id',
        ghostErrorCode: null
    }]
};

const unauthorized = () => HttpResponse.json(unauthorizedBody, {status: 401});

const expiredSessionBody = {
    errors: [{
        message: 'Authorization failed',
        context: 'Unable to determine the authenticated user or integration.',
        type: 'NoPermissionError',
        details: null,
        property: null,
        help: null,
        code: null,
        id: 'error-id',
        ghostErrorCode: null
    }]
};

const expiredSession = () => HttpResponse.json(expiredSessionBody, {status: 403});

const forbidden = () => HttpResponse.json({
    errors: [{
        ...expiredSessionBody.errors[0],
        message: 'You do not have permission to perform this action.'
    }]
}, {status: 403});

setupMswServer([
    http.get('http://localhost:3000/ghost/api/admin/posts/', expiredSession),
    http.get('http://localhost:3000/ghost/api/admin/posts/401/', unauthorized),
    http.get('http://localhost:3000/ghost/api/admin/members/', forbidden),
    http.post('http://localhost:3000/ghost/api/admin/session', unauthorized),
    http.post('http://localhost:3000/ghost/api/admin/session/', unauthorized),
    http.put('http://localhost:3000/ghost/api/admin/session/verify/', unauthorized),
    http.get('http://localhost:3000/external/data/', unauthorized)
]);

// The redirect-once guard is module state, so each test re-imports a fresh
// fetch-api module (and its errors module, to keep instanceof checks valid)
const loadModules = async () => {
    const [{useFetchApi}, {SessionExpiredError, UnauthorizedError, ValidationError}] = await Promise.all([
        import('../../../../src/utils/api/fetch-api'),
        import('../../../../src/utils/errors')
    ]);
    return {useFetchApi, SessionExpiredError, UnauthorizedError, ValidationError};
};

describe('session expiry handling', () => {
    let originalLocation: Location;

    beforeEach(() => {
        vi.resetModules();

        originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = {
            href: 'http://localhost:3000/ghost/',
            hash: '#/posts',
            origin: 'http://localhost:3000',
            pathname: '/ghost/',
            replace: vi.fn()
        };
    });

    afterEach(() => {
        (window as any).location = originalLocation;
    });

    it('redirects to the admin root when an API request returns 403 Authorization failed', async () => {
        const {useFetchApi, SessionExpiredError} = await loadModules();
        const {result} = renderHook(() => useFetchApi());

        await expect(result.current('http://localhost:3000/ghost/api/admin/posts/', {retry: false}))
            .rejects.toBeInstanceOf(SessionExpiredError);

        expect(window.location.replace).toHaveBeenCalledExactlyOnceWith('/ghost/');
    });

    it('redirects to the admin root when an API request returns 401', async () => {
        const {useFetchApi, SessionExpiredError} = await loadModules();
        const {result} = renderHook(() => useFetchApi());

        const error = await result.current('http://localhost:3000/ghost/api/admin/posts/401/', {retry: false})
            .catch(fetchError => fetchError);
        expect(error).toBeInstanceOf(SessionExpiredError);
        expect(error.data).toEqual(unauthorizedBody);

        expect(window.location.replace).toHaveBeenCalledExactlyOnceWith('/ghost/');
    });

    it('redirects only once when multiple in-flight requests return session expiry errors', async () => {
        const {useFetchApi, SessionExpiredError} = await loadModules();
        const {result} = renderHook(() => useFetchApi());

        const results = await Promise.allSettled([
            result.current('http://localhost:3000/ghost/api/admin/posts/', {retry: false}),
            result.current('http://localhost:3000/ghost/api/admin/posts/', {retry: false}),
            result.current('http://localhost:3000/ghost/api/admin/posts/', {retry: false})
        ]);

        for (const settled of results) {
            expect(settled.status).toBe('rejected');
            expect((settled as PromiseRejectedResult).reason).toBeInstanceOf(SessionExpiredError);
        }

        expect(window.location.replace).toHaveBeenCalledTimes(1);
    });

    it.each([
        '',
        '#/',
        '#/signin',
        '#/signin/verify',
        '#/signup/invitation-token',
        '#/setup/one',
        '#/reset/reset-token'
    ])('does not redirect from unauthenticated Admin route %s', async (hash) => {
        (window as any).location.hash = hash;
        const {useFetchApi, SessionExpiredError} = await loadModules();
        const {result} = renderHook(() => useFetchApi());

        await expect(result.current('http://localhost:3000/ghost/api/admin/posts/', {retry: false}))
            .rejects.toBeInstanceOf(SessionExpiredError);

        expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('does not redirect when the session endpoint returns 401', async () => {
        const {useFetchApi, SessionExpiredError, UnauthorizedError} = await loadModules();
        const {result} = renderHook(() => useFetchApi());

        await expect(result.current('http://localhost:3000/ghost/api/admin/session/', {
            method: 'POST',
            body: JSON.stringify({username: 'test@example.com', password: 'wrong'}),
            retry: false
        })).rejects.toBeInstanceOf(UnauthorizedError);

        await expect(result.current('http://localhost:3000/ghost/api/admin/session/verify/', {
            method: 'PUT',
            retry: false
        })).rejects.toBeInstanceOf(UnauthorizedError);

        const queryError = await result.current('http://localhost:3000/ghost/api/admin/session?source=signin', {
            method: 'POST',
            retry: false
        }).catch(error => error);
        expect(queryError).toBeInstanceOf(UnauthorizedError);
        expect(queryError).not.toBeInstanceOf(SessionExpiredError);

        const fragmentError = await result.current('http://localhost:3000/ghost/api/admin/session#signin', {
            method: 'POST',
            retry: false
        }).catch(error => error);
        expect(fragmentError).toBeInstanceOf(UnauthorizedError);
        expect(fragmentError).not.toBeInstanceOf(SessionExpiredError);

        expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('does not redirect when a non-Ghost API request returns 401', async () => {
        const {useFetchApi, SessionExpiredError, UnauthorizedError} = await loadModules();
        const {result} = renderHook(() => useFetchApi());

        const error = await result.current('http://localhost:3000/external/data/', {retry: false})
            .catch(fetchError => fetchError);
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error).not.toBeInstanceOf(SessionExpiredError);

        expect(window.location.replace).not.toHaveBeenCalled();
    });

    it('does not redirect for other 403 permission errors', async () => {
        const {useFetchApi, SessionExpiredError, ValidationError} = await loadModules();
        const {result} = renderHook(() => useFetchApi());

        const error = await result.current('http://localhost:3000/ghost/api/admin/members/', {retry: false})
            .catch(fetchError => fetchError);
        expect(error).toBeInstanceOf(ValidationError);
        expect(error).not.toBeInstanceOf(SessionExpiredError);

        expect(window.location.replace).not.toHaveBeenCalled();
    });
});
