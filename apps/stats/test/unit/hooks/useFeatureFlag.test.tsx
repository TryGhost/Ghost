import React from 'react';
import {getSettingValue} from '@tryghost/admin-x-framework/api/settings';
import {renderHook} from '@testing-library/react';
import {useFeatureFlag} from '../../../src/hooks/useFeatureFlag';
import {useGlobalData} from '@src/providers/GlobalDataProvider';
import {vi} from 'vitest';

// Mock the GlobalDataProvider
vi.mock('@src/providers/GlobalDataProvider', () => ({
    useGlobalData: vi.fn()
}));

// Mock the Navigate component
vi.mock('@tryghost/admin-x-framework', () => ({
    Navigate: () => <div data-testid="navigate">Navigate Mock</div>
}));

// Mock getSettingValue function
vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    getSettingValue: vi.fn()
}));

describe('useFeatureFlag', function () {
    const mockUseGlobalData = useGlobalData as unknown as vi.Mock;
    const mockGetSettingValue = getSettingValue as unknown as vi.Mock;

    beforeEach(function () {
        vi.resetAllMocks();
    });

    it('returns loading state when data is loading', function () {
        // Mock loading state
        mockUseGlobalData.mockReturnValue({
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

    it('returns redirect when feature flag is disabled', function () {
        // Mock data loaded state with disabled flag
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: []
        });
        
        // Mock labs settings without the flag
        mockGetSettingValue.mockReturnValue('{"otherFlag": true}');
        
        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));
        
        expect(result.current).toEqual({
            isEnabled: false,
            isLoading: false,
            redirect: expect.anything() // Navigate component
        });
    });

    it('returns enabled state when feature flag is enabled', function () {
        // Mock data loaded state
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: []
        });
        
        // Mock labs settings with the flag enabled
        mockGetSettingValue.mockReturnValue('{"testFlag": true}');
        
        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));
        
        expect(result.current).toEqual({
            isEnabled: true,
            isLoading: false,
            redirect: null
        });
    });

    it('handles empty labs settings', function () {
        // Mock data loaded state
        mockUseGlobalData.mockReturnValue({
            isLoading: false,
            settings: []
        });
        
        // Mock empty labs settings
        mockGetSettingValue.mockReturnValue(null);
        
        const {result} = renderHook(() => useFeatureFlag('testFlag', '/fallback'));
        
        expect(result.current).toEqual({
            isEnabled: false,
            isLoading: false,
            redirect: expect.anything() // Navigate component
        });
    });
}); 