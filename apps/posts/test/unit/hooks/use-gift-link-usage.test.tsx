/* eslint-disable @typescript-eslint/no-explicit-any */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useGiftLinkUsage} from '@src/hooks/use-gift-link-usage';

vi.mock('@tryghost/admin-x-framework', () => ({
    useTinybirdQuery: vi.fn()
}));
vi.mock('@tryghost/admin-x-framework/api/config', () => ({
    useBrowseConfig: vi.fn()
}));
vi.mock('@tryghost/admin-x-framework/api/settings', () => ({
    useBrowseSettings: vi.fn(),
    // Mirror the real helper: pull a setting's value out of the settings array.
    getSettingValue: (settings: any[] | null, key: string) => settings?.find(s => s.key === key)?.value
}));

const TOKEN = 'gift_token_abc';

describe('useGiftLinkUsage', () => {
    let mockUseTinybirdQuery: any;
    let mockUseBrowseConfig: any;
    let mockUseBrowseSettings: any;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockUseTinybirdQuery = vi.mocked(await import('@tryghost/admin-x-framework')).useTinybirdQuery;
        mockUseBrowseConfig = vi.mocked(await import('@tryghost/admin-x-framework/api/config')).useBrowseConfig;
        mockUseBrowseSettings = vi.mocked(await import('@tryghost/admin-x-framework/api/settings')).useBrowseSettings;

        // Defaults: analytics configured + enabled, query resolved with no data.
        mockUseBrowseConfig.mockReturnValue({data: {config: {stats: {id: 'site-uuid'}}}});
        mockUseBrowseSettings.mockReturnValue({data: {settings: [{key: 'web_analytics_enabled', value: true}]}});
        mockUseTinybirdQuery.mockReturnValue({data: [], loading: false, error: null});
    });

    it('returns usage for the current token and scopes the query to it', () => {
        // The pipe is filtered by token server-side, so it returns a single row.
        mockUseTinybirdQuery.mockReturnValue({
            data: [{gift_link: TOKEN, visits: 3, views: 5}],
            loading: false,
            error: null
        });

        const {result} = renderHook(() => useGiftLinkUsage({postUuid: 'post-uuid', token: TOKEN}));

        expect(result.current.usage).toEqual({visits: 3, views: 5});
        // The token is pushed down to the query as an exact-match filter rather
        // than fetching every link on the post and matching client-side.
        expect(mockUseTinybirdQuery.mock.calls[0][0].params.gift_link).toBe(TOKEN);
    });

    it('returns a resolved zero (not undefined) when the token has no reads', () => {
        // Server-side filter matches nothing → no rows. "Ran and found nothing"
        // is a real zero, distinct from "could not run".
        mockUseTinybirdQuery.mockReturnValue({data: [], loading: false, error: null});

        const {result} = renderHook(() => useGiftLinkUsage({postUuid: 'post-uuid', token: TOKEN}));

        expect(result.current.usage).toEqual({visits: 0, views: 0});
    });

    it('returns undefined usage when the query errors', () => {
        mockUseTinybirdQuery.mockReturnValue({data: undefined, loading: false, error: new Error('boom')});

        const {result} = renderHook(() => useGiftLinkUsage({postUuid: 'post-uuid', token: TOKEN}));

        expect(result.current.usage).toBeUndefined();
        expect(result.current.error).toBeInstanceOf(Error);
    });

    it('returns undefined usage when web analytics is disabled', () => {
        mockUseBrowseSettings.mockReturnValue({data: {settings: [{key: 'web_analytics_enabled', value: false}]}});

        const {result} = renderHook(() => useGiftLinkUsage({postUuid: 'post-uuid', token: TOKEN}));

        expect(result.current.usage).toBeUndefined();
        // The query must not run when analytics is off.
        expect(mockUseTinybirdQuery.mock.calls[0][0].enabled).toBe(false);
    });

    it('returns undefined usage when there is no token yet', () => {
        const {result} = renderHook(() => useGiftLinkUsage({postUuid: 'post-uuid', token: undefined}));

        expect(result.current.usage).toBeUndefined();
    });

    it('reports loading while the active gift-link lookup is still resolving', () => {
        // No token yet, so the usage query is disabled (loading:false). The hook
        // must still report loading so callers hide the count rather than 0.
        mockUseTinybirdQuery.mockReturnValue({data: [], loading: false, error: null});

        const {result} = renderHook(() => useGiftLinkUsage({postUuid: 'post-uuid', token: undefined, tokenLoading: true}));

        expect(result.current.loading).toBe(true);
        expect(result.current.usage).toBeUndefined();
    });

    it('reports loading while the settings prerequisite is still resolving', () => {
        mockUseBrowseSettings.mockReturnValue({data: undefined, isLoading: true});
        mockUseTinybirdQuery.mockReturnValue({data: [], loading: false, error: null});

        const {result} = renderHook(() => useGiftLinkUsage({postUuid: 'post-uuid', token: TOKEN}));

        expect(result.current.loading).toBe(true);
        expect(result.current.usage).toBeUndefined();
    });

    it('surfaces an active gift-link lookup error so the count stays hidden', () => {
        // The lookup failed, so there is no token and the usage query is disabled
        // (no error of its own). Surface the lookup error rather than letting the
        // caller treat missing usage as a resolved 0.
        mockUseTinybirdQuery.mockReturnValue({data: undefined, loading: false, error: null});

        const {result} = renderHook(() => useGiftLinkUsage({postUuid: 'post-uuid', token: undefined, tokenError: new Error('boom')}));

        expect(result.current.error).toBeInstanceOf(Error);
        expect(result.current.usage).toBeUndefined();
    });
});
