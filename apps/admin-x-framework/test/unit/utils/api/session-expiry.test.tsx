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

setupMswServer([
    http.get('http://localhost:3000/ghost/api/admin/posts/', unauthorized),
    http.post('http://localhost:3000/ghost/api/admin/session', unauthorized),
    http.post('http://localhost:3000/ghost/api/admin/session/', unauthorized),
    http.put('http://localhost:3000/ghost/api/admin/session/verify/', unauthorized),
    http.get('http://localhost:3000/external/data/', unauthorized)
]);

// The redirect-once guard is module state, so each test re-imports a fresh
// fetch-api module (and its errors module, to keep instanceof checks valid)
const loadModules = async () => {
    const [{useFetchApi}, {SessionExpiredError, UnauthorizedError}] = await Promise.all([
        import('../../../../src/utils/api/fetch-api'),
        import('../../../../src/utils/errors')
    ]);
    return {useFetchApi, SessionExpiredError, UnauthorizedError};
};

describe('session expiry handling', () => {
    let originalLocation: Location;

    beforeEach(() => {
        vi.resetModules();

        originalLocation = window.location;
        delete (window as any).location;
        (window as any).location = {
            href: 'http://localhost:3000/ghost/',
            origin: 'http://localhost:3000',
            pathname: '/ghost/',
            replace: vi.fn()
        };
    });

    afterEach(() => {
        (window as any).location = originalLocation;
    });

    it('redirects to the admin root when an API request returns 401', async () => {
        const {useFetchApi, SessionExpiredError} = await loadModules();
        const {result} = renderHook(() => useFetchApi());

        await expect(result.current('http://localhost:3000/ghost/api/admin/posts/', {retry: false}))
            .rejects.toBeInstanceOf(SessionExpiredError);

        expect(window.location.replace).toHaveBeenCalledExactlyOnceWith('/ghost/');
    });

    it('redirects only once when multiple in-flight requests return 401', async () => {
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
});
