import type {Services} from '../../types';
import type {MembersApiClient} from './index';
import {warn} from '../log';

let inflight: Promise<void> | null = null;

/** Test hook — clears the single-flight cache. */
export function resetSiteDataCache(): void {
    inflight = null;
}

/**
 * Hydrate state.site with tiers + newsletters from the content API.
 * Single-flight; resolves (never rejects) on failure so features degrade to empty lists.
 */
export function ensureSiteData(services: Services, api: MembersApiClient): Promise<void> {
    const site = services.getState().site;
    if (site.tiers && site.newsletters) {
        return Promise.resolve();
    }
    if (!inflight) {
        inflight = fetchAndMerge(services, api).finally(() => {
            inflight = null;
        });
    }
    return inflight;
}

async function fetchAndMerge(services: Services, api: MembersApiClient): Promise<void> {
    try {
        const [tiersRes, newslettersRes] = await Promise.all([api.site.tiers(), api.site.newsletters()]);
        // content API newsletters carry visibility but no paid/status
        const newsletters = (newslettersRes.newsletters as unknown as Array<Record<string, unknown>>).map(n => ({
            ...n,
            status: n.status ?? 'active',
            paid: n.visibility === 'paid'
        }));
        services.mergeSiteData({tiers: tiersRes.tiers || [], newsletters});
    } catch (err) {
        warn('failed to load site tiers/newsletters', err);
    }
}
