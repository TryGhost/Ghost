import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {siteTable, type SiteRecord} from './db.js';

export type SiteRepository = {
    getSite: () => Promise<SiteRecord | null>;
    upsertSite: (site: SiteRecord) => Promise<SiteRecord>;
};

export const defaultSiteId = 'site';

export const createSiteRepository = (db: DbClient): SiteRepository => {
    const getSite = async () => {
        const rows = await db
            .select()
            .from(siteTable)
            .where(eq(siteTable.id, defaultSiteId))
            .limit(1);

        return rows[0] ?? null;
    };

    const upsertSite = async (site: SiteRecord) => {
        await db
            .insert(siteTable)
            .values(site)
            .onConflictDoUpdate({
                target: siteTable.id,
                set: {
                    title: site.title,
                    description: site.description,
                    locale: site.locale,
                    updatedAt: site.updatedAt
                }
            });

        const rows = await db
            .select()
            .from(siteTable)
            .where(eq(siteTable.id, site.id))
            .limit(1);

        if (!rows[0]) {
            throw new Error('Site record missing after upsert');
        }

        return rows[0];
    };

    return {
        getSite,
        upsertSite
    };
};
