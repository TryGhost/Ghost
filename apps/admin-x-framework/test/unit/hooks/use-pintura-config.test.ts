import {renderHook} from '@testing-library/react';
import {usePinturaConfig} from '../../../src/hooks/use-pintura-config';

vi.mock('../../../src/api/config', () => ({
    useBrowseConfig: vi.fn()
}));

vi.mock('../../../src/api/settings', () => ({
    useBrowseSettings: vi.fn(),
    getSettingValues: vi.fn()
}));

vi.mock('../../../src/utils/helpers', () => ({
    getGhostPaths: vi.fn()
}));

import {useBrowseConfig} from '../../../src/api/config';
import {getSettingValues, useBrowseSettings} from '../../../src/api/settings';
import {getGhostPaths} from '../../../src/utils/helpers';

const mockUseBrowseConfig = vi.mocked(useBrowseConfig);
const mockUseBrowseSettings = vi.mocked(useBrowseSettings);
const mockGetSettingValues = vi.mocked(getSettingValues);
const mockGetGhostPaths = vi.mocked(getGhostPaths);

describe('usePinturaConfig', () => {
    beforeEach(() => {
        mockUseBrowseConfig.mockReturnValue({
            data: {
                config: {}
            }
        } as any);
        mockUseBrowseSettings.mockReturnValue({
            data: {
                settings: []
            }
        } as any);
        mockGetSettingValues.mockReturnValue([false, undefined, undefined]);
        mockGetGhostPaths.mockReturnValue({
            subdir: '',
            adminRoot: '/ghost/',
            assetRoot: '/ghost/assets/',
            apiRoot: '/ghost/api/admin',
            activityPubRoot: '/.ghost/activitypub'
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('returns null when pintura is disabled', () => {
        mockGetSettingValues.mockReturnValue([false, 'https://cdn.example.com/pintura.js', 'https://cdn.example.com/pintura.css']);

        const {result} = renderHook(() => usePinturaConfig());

        expect(result.current).toBeNull();
    });

    it('returns null when pintura is enabled but missing one or more urls', () => {
        mockGetSettingValues.mockReturnValue([true, 'https://cdn.example.com/pintura.js', undefined]);

        const {result} = renderHook(() => usePinturaConfig());

        expect(result.current).toBeNull();
    });

    it('returns null when pintura is enabled and url settings are null', () => {
        mockGetSettingValues.mockReturnValue([true, null, null]);

        const {result} = renderHook(() => usePinturaConfig());

        expect(result.current).toBeNull();
    });

    it('uses fallback setting urls when config urls are not set', () => {
        mockGetSettingValues.mockReturnValue([true, 'https://cdn.example.com/pintura.js', 'https://cdn.example.com/pintura.css']);

        const {result} = renderHook(() => usePinturaConfig());

        expect(result.current).toEqual({
            jsUrl: 'https://cdn.example.com/pintura.js',
            cssUrl: 'https://cdn.example.com/pintura.css'
        });
    });

    it('prefers config urls over fallback setting urls', () => {
        mockUseBrowseConfig.mockReturnValue({
            data: {
                config: {
                    hostSettings: {
                        pintura: {
                            js: 'https://config.example.com/pintura.js',
                            css: 'https://config.example.com/pintura.css'
                        }
                    }
                }
            }
        } as any);
        mockGetSettingValues.mockReturnValue([true, 'https://settings.example.com/pintura.js', 'https://settings.example.com/pintura.css']);

        const {result} = renderHook(() => usePinturaConfig());

        expect(result.current).toEqual({
            jsUrl: 'https://config.example.com/pintura.js',
            cssUrl: 'https://config.example.com/pintura.css'
        });
    });

    it('resolves relative urls against the admin root and current origin', () => {
        mockUseBrowseConfig.mockReturnValue({
            data: {
                config: {
                    hostSettings: {
                        pintura: {
                            js: '/pintura/pintura-umd.js',
                            css: '/pintura/pintura.css'
                        }
                    }
                }
            }
        } as any);
        mockGetSettingValues.mockReturnValue([true, undefined, undefined]);
        mockGetGhostPaths.mockReturnValue({
            subdir: '',
            adminRoot: '/blog/ghost/',
            assetRoot: '/blog/ghost/assets/',
            apiRoot: '/blog/ghost/api/admin',
            activityPubRoot: '/.ghost/activitypub'
        });

        const {result} = renderHook(() => usePinturaConfig());

        expect(result.current).toEqual({
            jsUrl: `${window.location.origin}/blog/ghost/pintura/pintura-umd.js`,
            cssUrl: `${window.location.origin}/blog/ghost/pintura/pintura.css`
        });
    });
});
