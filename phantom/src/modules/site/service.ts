import type {SiteUpdateInput} from './contracts.js';
import type {Site} from './model.js';
import type {SiteRepository} from './repo.js';
import {defaultSiteId} from './repo.js';

export type SiteService = {
    getSite: () => Promise<Site>;
    updateSite: (input: SiteUpdateInput) => Promise<Site>;
};

const buildDefaultSite = (): Site => {
    const now = Date.now();

    return {
        id: defaultSiteId,
        title: 'Ghost',
        description: null,
        locale: 'en',
        createdAt: now,
        updatedAt: now
    };
};

export const createSiteService = (repository: SiteRepository): SiteService => {
    const ensureSite = async () => {
        const existing = await repository.getSite();

        if (existing) {
            return existing;
        }

        return repository.upsertSite(buildDefaultSite());
    };

    const getSite = async () => ensureSite();

    const updateSite = async (input: SiteUpdateInput) => {
        const current = await ensureSite();
        const updated: Site = {
            ...current,
            title: input.title ?? current.title,
            description: input.description === undefined ? current.description : input.description,
            locale: input.locale ?? current.locale,
            updatedAt: Date.now()
        };

        return repository.upsertSite(updated);
    };

    return {
        getSite,
        updateSite
    };
};
