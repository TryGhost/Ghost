/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useFeatureFlag} from '@src/hooks/use-feature-flag';

vi.mock('@tryghost/admin-x-framework', () => ({
    Navigate: ({to}: {to: string}) => React.createElement('div', {'data-testid': 'navigate', 'data-to': to})
}));

vi.mock('@src/providers/post-analytics-context');

describe('useFeatureFlag', () => {
    let mockUseGlobalData: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockUseGlobalData = vi.mocked(await import('@src/providers/post-analytics-context')).useGlobalData;
    });

    it('returns loading state while data is loading', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: true,
            data: undefined
        });

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(true);
        expect(result.current.redirect).toBe(null);
    });

    it('returns enabled when flag is true', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            data: {labs: {testFlag: true}}
        });

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBe(null);
    });

    it('returns redirect when flag is explicitly false', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            data: {labs: {testFlag: false}}
        });

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
        });

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.redirect).toMatchObject({
            props: {to: '/fallback'}
        });
    });
});
