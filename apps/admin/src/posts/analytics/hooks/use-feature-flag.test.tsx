import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useFeatureFlag} from '@/posts/analytics/hooks/use-feature-flag';

vi.mock('@tryghost/admin-x-framework', () => ({
    Navigate: ({to}: {to: string}) => React.createElement('div', {'data-testid': 'navigate', 'data-to': to})
}));

vi.mock('@/posts/analytics/providers/post-analytics-context');

const mockUseGlobalData = vi.mocked(await import('@/posts/analytics/providers/post-analytics-context')).useGlobalData;

describe('useFeatureFlag', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns loading state while data is loading', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: true,
            data: undefined
        } as unknown as ReturnType<typeof mockUseGlobalData>);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(true);
        expect(result.current.redirect).toBe(null);
    });

    it('returns enabled when flag is true', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            data: {labs: {testFlag: true}}
        } as unknown as ReturnType<typeof mockUseGlobalData>);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBe(null);
    });

    it('returns redirect when flag is explicitly false', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            data: {labs: {testFlag: false}}
        } as unknown as ReturnType<typeof mockUseGlobalData>);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toMatchObject({
            props: {to: '/fallback'}
        });
    });

    it('returns redirect when flag is absent', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            data: {labs: {otherFlag: true}}
        } as unknown as ReturnType<typeof mockUseGlobalData>);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.redirect).toMatchObject({
            props: {to: '/fallback'}
        });
    });
});
