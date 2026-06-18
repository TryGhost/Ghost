import type {SiteResponse} from './contracts.js';
import type {Site} from './model.js';

export const toSiteResponse = (site: Site): {site: SiteResponse} => {
    return {
        site: {
            id: site.id,
            title: site.title,
            description: site.description,
            locale: site.locale,
            createdAt: site.createdAt,
            updatedAt: site.updatedAt
        }
    };
};
