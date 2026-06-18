import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    linkClickTable,
    linkRedirectTable,
    linkTable,
    type LinkClickRecord,
    type LinkRecord,
    type LinkRedirectRecord,
    type NewLinkClickRecord,
    type NewLinkRecord,
    type NewLinkRedirectRecord
} from './db.js';

export type LinkRepository = {
    createLink: (link: NewLinkRecord) => Promise<LinkRecord>;
    getLinkById: (id: string) => Promise<LinkRecord | null>;
    createRedirect: (redirect: NewLinkRedirectRecord) => Promise<LinkRedirectRecord>;
    createClick: (click: NewLinkClickRecord) => Promise<LinkClickRecord>;
    getClickByRequest: (requestId: string) => Promise<LinkClickRecord | null>;
};

export const createLinkRepository = (db: DbClient): LinkRepository => {
    const createLink = async (link: NewLinkRecord) => {
        await db.insert(linkTable).values(link);
        const rows = await db.select().from(linkTable).where(eq(linkTable.id, link.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Link missing after insert');
        }
        return rows[0];
    };

    const getLinkById = async (id: string) => {
        const rows = await db.select().from(linkTable).where(eq(linkTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createRedirect = async (redirect: NewLinkRedirectRecord) => {
        await db.insert(linkRedirectTable).values(redirect);
        const rows = await db.select().from(linkRedirectTable).where(eq(linkRedirectTable.id, redirect.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Redirect missing after insert');
        }
        return rows[0];
    };

    const createClick = async (click: NewLinkClickRecord) => {
        await db.insert(linkClickTable).values(click);
        const rows = await db.select().from(linkClickTable).where(eq(linkClickTable.id, click.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Click missing after insert');
        }
        return rows[0];
    };

    const getClickByRequest = async (requestId: string) => {
        const rows = await db.select().from(linkClickTable).where(eq(linkClickTable.requestId, requestId)).limit(1);
        return rows[0] ?? null;
    };

    return {
        createLink,
        getLinkById,
        createRedirect,
        createClick,
        getClickByRequest
    };
};
