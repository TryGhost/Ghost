import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';

import * as framework from '@tryghost/admin-x-framework';

import {useNavigateWithBasePath} from './use-navigate-with-base-path';

vi.mock('@tryghost/admin-x-framework', () => ({
    useMatches: vi.fn(),
    useNavigate: vi.fn()
}));

describe('useNavigateWithBasePath', () => {
    const useMatches = framework.useMatches as ReturnType<typeof vi.fn>;
    const useNavigate = framework.useNavigate as ReturnType<typeof vi.fn>;
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as ReturnType<typeof vi.fn>).mockReturnValue(mockNavigate);
    });

    describe('with base path /activitypub', () => {
        beforeEach(() => {
            (useMatches as ReturnType<typeof vi.fn>).mockReturnValue([
                {
                    id: 'root',
                    pathname: '/activitypub',
                    params: {},
                    data: undefined,
                    handle: 'activitypub-basepath'
                }
            ]);
        });

        it('passes through numeric navigation unchanged', () => {
            const {result} = renderHook(() => useNavigateWithBasePath());

            result.current(-1);

            expect(mockNavigate).toHaveBeenCalledWith(-1, undefined);
        });

        it('prepends base path to absolute paths', () => {
            const {result} = renderHook(() => useNavigateWithBasePath());

            result.current('/profile');

            expect(mockNavigate).toHaveBeenCalledWith('/activitypub/profile', undefined);
        });

        it('prepends base path to root path', () => {
            const {result} = renderHook(() => useNavigateWithBasePath());

            result.current('/');

            expect(mockNavigate).toHaveBeenCalledWith('/activitypub/', undefined);
        });

        it('passes through relative paths unchanged', () => {
            const {result} = renderHook(() => useNavigateWithBasePath());

            result.current('profile');

            expect(mockNavigate).toHaveBeenCalledWith('profile', undefined);
        });

        it('preserves options with absolute path', () => {
            const {result} = renderHook(() => useNavigateWithBasePath());
            const options = {replace: true, state: {from: 'test'}};

            result.current('/profile', options);

            expect(mockNavigate).toHaveBeenCalledWith('/activitypub/profile', options);
        });

        it('preserves options with numeric navigation', () => {
            const {result} = renderHook(() => useNavigateWithBasePath());
            const options = {replace: true};

            result.current(-1, options);

            expect(mockNavigate).toHaveBeenCalledWith(-1, options);
        });

        it('preserves options with relative path', () => {
            const {result} = renderHook(() => useNavigateWithBasePath());
            const options = {state: {from: 'test'}};

            result.current('profile', options);

            expect(mockNavigate).toHaveBeenCalledWith('profile', options);
        });
    });

    describe('with empty base path (test mode)', () => {
        beforeEach(() => {
            (useMatches as ReturnType<typeof vi.fn>).mockReturnValue([
                {
                    id: 'root',
                    pathname: '',
                    params: {},
                    data: undefined,
                    handle: 'activitypub-basepath'
                }
            ]);
        });

        it('does not prepend anything to absolute paths when base path is empty', () => {
            const {result} = renderHook(() => useNavigateWithBasePath());

            result.current('/profile');

            expect(mockNavigate).toHaveBeenCalledWith('/profile', undefined);
        });
    });
});
