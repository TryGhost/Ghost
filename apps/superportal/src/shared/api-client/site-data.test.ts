import {describe, it, expect, vi, beforeEach} from 'vitest';
import {ensureSiteData, resetSiteDataCache} from './site-data';
import type {Services} from '../../types';
import type {MembersApiClient} from './index';

function fakeServices(site: Record<string, unknown> = {}) {
    const mergeSiteData = vi.fn();
    const services = {getState: () => ({site}), mergeSiteData} as unknown as Services;
    return {services, mergeSiteData};
}

function fakeApi(overrides: Record<string, unknown> = {}) {
    const tiers = vi.fn().mockResolvedValue({tiers: [{id: 't1', name: 'Gold', monthly_price: 500}]});
    const newsletters = vi.fn().mockResolvedValue({newsletters: [{id: 'n1', name: 'Weekly', visibility: 'members'}]});
    const api = {site: {tiers, newsletters, ...overrides}} as unknown as MembersApiClient;
    return {api, tiers, newsletters};
}

beforeEach(() => {
    resetSiteDataCache();
});

describe('ensureSiteData', () => {
    it('fetches tiers + newsletters and merges them into state', async () => {
        const {services, mergeSiteData} = fakeServices();
        const {api} = fakeApi();

        await ensureSiteData(services, api);

        expect(mergeSiteData).toHaveBeenCalledWith({
            tiers: [{id: 't1', name: 'Gold', monthly_price: 500}],
            newsletters: [{id: 'n1', name: 'Weekly', visibility: 'members', status: 'active', paid: false}]
        });
    });

    it('derives paid from visibility', async () => {
        const {services, mergeSiteData} = fakeServices();
        const {api} = fakeApi({newsletters: vi.fn().mockResolvedValue({newsletters: [{id: 'n1', name: 'Premium', visibility: 'paid'}]})});

        await ensureSiteData(services, api);

        expect(mergeSiteData.mock.calls[0]?.[0]?.newsletters?.[0]?.paid).toBe(true);
    });

    it('skips the fetch when state already has tiers and newsletters', async () => {
        const {services, mergeSiteData} = fakeServices({tiers: [], newsletters: []});
        const {api, tiers} = fakeApi();

        await ensureSiteData(services, api);

        expect(tiers).not.toHaveBeenCalled();
        expect(mergeSiteData).not.toHaveBeenCalled();
    });

    it('shares one fetch across concurrent calls', async () => {
        const {services} = fakeServices();
        const {api, tiers} = fakeApi();

        await Promise.all([ensureSiteData(services, api), ensureSiteData(services, api)]);

        expect(tiers).toHaveBeenCalledTimes(1);
    });

    it('resolves on failure and retries on the next call', async () => {
        const {services, mergeSiteData} = fakeServices();
        const tiers = vi.fn().mockRejectedValue(new Error('down'));
        const {api} = fakeApi({tiers});

        await expect(ensureSiteData(services, api)).resolves.toBeUndefined();
        expect(mergeSiteData).not.toHaveBeenCalled();

        await ensureSiteData(services, api);
        expect(tiers).toHaveBeenCalledTimes(2);
    });
});
