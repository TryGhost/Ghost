import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';

import * as framework from '@tryghost/admin-x-framework';

import {useCurrentPage} from './use-current-page';

vi.mock('@tryghost/admin-x-framework', () => ({
    useMatches: vi.fn()
}));

describe('useCurrentPage', () => {
    const useMatches = framework.useMatches as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns the child route segment when base path is /activitypub', () => {
        useMatches.mockReturnValue([
            {
                id: 'root',
                pathname: '/',
                params: {},
                data: undefined,
                handle: undefined
            },
            {
                id: 'activitypub-base',
                pathname: '/activitypub',
                params: {},
                data: undefined,
                handle: 'activitypub-basepath'
            },
            {
                id: 'activitypub-profile',
                pathname: '/activitypub/profile',
                params: {},
                data: undefined,
                handle: undefined
            }
        ]);

        const {result} = renderHook(() => useCurrentPage());
        expect(result.current).toBe('profile');
    });

    it('returns the child route segment in test mode (empty base path)', () => {
        useMatches.mockReturnValue([
            {
                id: 'root',
                pathname: '/',
                params: {},
                data: undefined,
                handle: undefined
            },
            {
                id: 'activitypub-base',
                pathname: '',
                params: {},
                data: undefined,
                handle: 'activitypub-basepath'
            },
            {
                id: 'activitypub-reader',
                pathname: '/reader',
                params: {},
                data: undefined,
                handle: undefined
            }
        ]);

        const {result} = renderHook(() => useCurrentPage());
        expect(result.current).toBe('reader');
    });

    it('returns the child route segment even with nested routes', () => {
        useMatches.mockReturnValue([
            {
                id: 'root',
                pathname: '/',
                params: {},
                data: undefined,
                handle: undefined
            },
            {
                id: 'activitypub-base',
                pathname: '/activitypub',
                params: {},
                data: undefined,
                handle: 'activitypub-basepath'
            },
            {
                id: 'activitypub-profile',
                pathname: '/activitypub/profile',
                params: {},
                data: undefined,
                handle: undefined
            },
            {
                id: 'activitypub-profile-handle',
                pathname: '/activitypub/profile/somehandle',
                params: {handle: 'somehandle'},
                data: undefined,
                handle: undefined
            }
        ]);

        const {result} = renderHook(() => useCurrentPage());
        expect(result.current).toBe('profile');
    });

    it('returns empty string when base path route is not found', () => {
        useMatches.mockReturnValue([
            {
                id: 'root',
                pathname: '/',
                params: {},
                data: undefined,
                handle: undefined
            },
            {
                id: 'some-route',
                pathname: '/some-route',
                params: {},
                data: undefined,
                handle: undefined
            }
        ]);

        const {result} = renderHook(() => useCurrentPage());
        expect(result.current).toBe('');
    });

    it('returns empty string when no child route exists after base path', () => {
        useMatches.mockReturnValue([
            {
                id: 'root',
                pathname: '/',
                params: {},
                data: undefined,
                handle: undefined
            },
            {
                id: 'activitypub-base',
                pathname: '/activitypub',
                params: {},
                data: undefined,
                handle: 'activitypub-basepath'
            }
        ]);

        const {result} = renderHook(() => useCurrentPage());
        expect(result.current).toBe('');
    });
});
