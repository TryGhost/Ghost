import {describe, expect, it} from 'vitest';
import {createSiteService} from './service.js';
import type {SiteRepository} from './repo.js';
import {defaultSiteId} from './repo.js';
import type {SiteRecord} from './db.js';

const createMemoryRepository = (): SiteRepository => {
    let record: SiteRecord | null = null;

    return {
        getSite: async () => record,
        upsertSite: async (site) => {
            record = {...site};
            return site;
        }
    };
};

describe('site service', () => {
    it('creates a default site when empty', async () => {
        const repository = createMemoryRepository();
        const service = createSiteService(repository);

        const site = await service.getSite();

        expect(site.id).toBe(defaultSiteId);
        expect(site.title).toBe('Ghost');
        expect(site.locale).toBe('en');
    });

    it('updates the site fields', async () => {
        const repository = createMemoryRepository();
        const service = createSiteService(repository);

        const updated = await service.updateSite({
            title: 'Ghost Daily',
            description: 'Latest updates',
            locale: 'en-us'
        });

        expect(updated.title).toBe('Ghost Daily');
        expect(updated.description).toBe('Latest updates');
        expect(updated.locale).toBe('en-us');
    });
});
