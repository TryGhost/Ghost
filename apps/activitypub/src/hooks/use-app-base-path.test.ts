import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';

import * as framework from '@tryghost/admin-x-framework';

import {useAppBasePath} from './use-app-base-path';

vi.mock('@tryghost/admin-x-framework', () => ({
    useMatches: vi.fn()
}));

describe('useAppBasePath', () => {
    const useMatches = framework.useMatches as ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns the base path when a matching route is found', () => {
        (useMatches as ReturnType<typeof vi.fn>).mockReturnValue([
            {
                id: 'root',
                pathname: '/activitypub',
                params: {},
                data: undefined,
                handle: 'activitypub-basepath'
            }
        ]);

        const {result} = renderHook(() => useAppBasePath());

        expect(result.current).toBe('/activitypub');
    });

    it('returns empty string when no matching route exists', () => {
        (useMatches as ReturnType<typeof vi.fn>).mockReturnValue([
            {
                id: 'some-route',
                pathname: '/some-path',
                params: {},
                data: undefined,
                handle: 'other-handle'
            }
        ]);

        const {result} = renderHook(() => useAppBasePath());

        expect(result.current).toBe('');
    });

    it('returns empty string when matches array is empty', () => {
        (useMatches as ReturnType<typeof vi.fn>).mockReturnValue([]);

        const {result} = renderHook(() => useAppBasePath());

        expect(result.current).toBe('');
    });

    it('strips trailing slash from pathname', () => {
        (useMatches as ReturnType<typeof vi.fn>).mockReturnValue([
            {
                id: 'root',
                pathname: '/activitypub/',
                params: {},
                data: undefined,
                handle: 'activitypub-basepath'
            }
        ]);

        const {result} = renderHook(() => useAppBasePath());

        expect(result.current).toBe('/activitypub');
    });

    it('handles empty pathname', () => {
        (useMatches as ReturnType<typeof vi.fn>).mockReturnValue([
            {
                id: 'root',
                pathname: '',
                params: {},
                data: undefined,
                handle: 'activitypub-basepath'
            }
        ]);

        const {result} = renderHook(() => useAppBasePath());

        expect(result.current).toBe('');
    });

    it('handles root pathname with trailing slash', () => {
        (useMatches as ReturnType<typeof vi.fn>).mockReturnValue([
            {
                id: 'root',
                pathname: '/',
                params: {},
                data: undefined,
                handle: 'activitypub-basepath'
            }
        ]);

        const {result} = renderHook(() => useAppBasePath());

        expect(result.current).toBe('');
    });
});
