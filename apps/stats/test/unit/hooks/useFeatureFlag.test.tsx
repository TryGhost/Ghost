/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {setupStatsAppMocks} from '../../utils/test-helpers';
import {useFeatureFlag} from '@src/hooks/useFeatureFlag';

// Mock the dependencies
vi.mock('@src/providers/GlobalDataProvider');
vi.mock('@tryghost/admin-x-framework/api/settings');

const mockUseGlobalData = vi.mocked(await import('@src/providers/GlobalDataProvider')).useGlobalData;
const mockGetSettingValue = vi.mocked(await import('@tryghost/admin-x-framework/api/settings')).getSettingValue;

describe('useFeatureFlag', () => {
    let mocks: ReturnType<typeof setupStatsAppMocks>;

    beforeEach(() => {
        vi.clearAllMocks();
        mocks = setupStatsAppMocks();
        
        // Apply the mocks to the actual imported modules
        mockUseGlobalData.mockImplementation(mocks.mockUseGlobalData);
        mockGetSettingValue.mockImplementation(mocks.mockGetSettingValue);
    });

    it('returns loading state when data is loading', () => {
        mocks.mockUseGlobalData.mockReturnValue({
            ...mocks.mockUseGlobalData.mock.results[0]?.value || {},
            isLoading: true,
            settings: []
        });

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current).toEqual({
            isEnabled: false,
            isLoading: true,
            redirect: null
        });
    });

    it('returns enabled state when feature flag is true', () => {
        mocks.mockGetSettingValue.mockReturnValue('{"testFlag": true}');

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(true);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBe(null);
    });

    it('returns disabled state with redirect when feature flag is false', () => {
        mocks.mockGetSettingValue.mockReturnValue('{"testFlag": false}');

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBeTruthy();
    });

    it('returns disabled state when feature flag is not present', () => {
        mocks.mockGetSettingValue.mockReturnValue('{}');

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBeTruthy();
    });

    it('handles invalid JSON gracefully', () => {
        mocks.mockGetSettingValue.mockReturnValue('invalid json');

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBeTruthy();
    });

    it('handles null labs setting', () => {
        mocks.mockGetSettingValue.mockReturnValue(null);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBeTruthy();
    });

    it('handles undefined labs setting', () => {
        mocks.mockGetSettingValue.mockReturnValue(undefined);

        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));

        expect(result.current.isEnabled).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.redirect).toBeTruthy();
    });
}); 