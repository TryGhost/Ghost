/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useFeatureFlag} from '@src/hooks/useFeatureFlag';

// Mock the dependencies
vi.mock('@src/providers/PostAnalyticsContext');
vi.mock('@tryghost/admin-x-framework/api/settings');

const mockUseGlobalData = vi.mocked(await import('@src/providers/PostAnalyticsContext')).useGlobalData;
const mockGetSettingValue = vi.mocked(await import('@tryghost/admin-x-framework/api/settings')).getSettingValue;

describe('useFeatureFlag', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('returns loading state when data is loading', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: true,
            settings: []
        } as any);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current).toEqual({
            isEnabled: false,
            isLoading: true,
            redirect: null
        });
    });

    it('returns enabled state when feature flag is true', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: []
        } as any);

        mockGetSettingValue.mockReturnValue('{"testFlag": true}');

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBe(null);
    });

    it('returns disabled state with redirect when feature flag is false', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: []
        } as any);

        mockGetSettingValue.mockReturnValue('{"testFlag": false}');

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBeTruthy();
    });

    it('returns disabled state when feature flag is not present', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: []
        } as any);

        mockGetSettingValue.mockReturnValue('{}');

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBeTruthy();
    });

    it('handles invalid JSON gracefully', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: []
        } as any);

        mockGetSettingValue.mockReturnValue('invalid json');

        expect(() => {
            renderHook(() => useFeatureFlag('testFlag', '/fallback'));
        }).toThrow();
    });

    it('handles null labs setting', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: []
        } as any);

        mockGetSettingValue.mockReturnValue(null);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBeTruthy();
    });

    it('handles undefined labs setting', () => {
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: []
        } as any);

        mockGetSettingValue.mockReturnValue(undefined);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBeTruthy();
    });
}); 