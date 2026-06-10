import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    extensionInstallTable,
    extensionListingTable,
    type ExtensionInstallRecord,
    type ExtensionListingRecord,
    type NewExtensionInstallRecord,
    type NewExtensionListingRecord
} from './db.js';

export type ExtensionsRepository = {
    listListings: () => Promise<ExtensionListingRecord[]>;
    getListingById: (id: string) => Promise<ExtensionListingRecord | null>;
    createListing: (listing: NewExtensionListingRecord) => Promise<ExtensionListingRecord>;
    createInstall: (install: NewExtensionInstallRecord) => Promise<ExtensionInstallRecord>;
    getInstallById: (id: string) => Promise<ExtensionInstallRecord | null>;
    deleteInstall: (id: string) => Promise<void>;
};

export const createExtensionsRepository = (db: DbClient): ExtensionsRepository => {
    const listListings = async () => db.select().from(extensionListingTable);

    const getListingById = async (id: string) => {
        const rows = await db.select().from(extensionListingTable).where(eq(extensionListingTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createListing = async (listing: NewExtensionListingRecord) => {
        await db.insert(extensionListingTable).values(listing);
        const rows = await db.select().from(extensionListingTable).where(eq(extensionListingTable.id, listing.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Listing missing after insert');
        }
        return rows[0];
    };

    const createInstall = async (install: NewExtensionInstallRecord) => {
        await db.insert(extensionInstallTable).values(install);
        const rows = await db.select().from(extensionInstallTable).where(eq(extensionInstallTable.id, install.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Install missing after insert');
        }
        return rows[0];
    };

    const getInstallById = async (id: string) => {
        const rows = await db.select().from(extensionInstallTable).where(eq(extensionInstallTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const deleteInstall = async (id: string) => {
        await db.delete(extensionInstallTable).where(eq(extensionInstallTable.id, id));
    };

    return {
        listListings,
        getListingById,
        createListing,
        createInstall,
        getInstallById,
        deleteInstall
    };
};
