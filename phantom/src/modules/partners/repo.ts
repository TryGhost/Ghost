import {eq} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    accessGrantTable,
    partnerOrgTable,
    partnerTokenTable,
    type AccessGrantRecord,
    type NewAccessGrantRecord,
    type NewPartnerOrgRecord,
    type NewPartnerTokenRecord,
    type PartnerOrgRecord,
    type PartnerTokenRecord
} from './db.js';

export type PartnerRepository = {
    getOrgById: (id: string) => Promise<PartnerOrgRecord | null>;
    createOrg: (org: NewPartnerOrgRecord) => Promise<PartnerOrgRecord>;
    createGrant: (grant: NewAccessGrantRecord) => Promise<AccessGrantRecord>;
    getGrantById: (id: string) => Promise<AccessGrantRecord | null>;
    revokeGrant: (id: string, revokedAt: number) => Promise<void>;
    createToken: (token: NewPartnerTokenRecord) => Promise<PartnerTokenRecord>;
    getTokenByValue: (token: string) => Promise<PartnerTokenRecord | null>;
    revokeToken: (id: string, revokedAt: number) => Promise<void>;
};

export const createPartnerRepository = (db: DbClient): PartnerRepository => {
    const getOrgById = async (id: string) => {
        const rows = await db.select().from(partnerOrgTable).where(eq(partnerOrgTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createOrg = async (org: NewPartnerOrgRecord) => {
        await db.insert(partnerOrgTable).values(org);
        const rows = await db.select().from(partnerOrgTable).where(eq(partnerOrgTable.id, org.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Partner org missing after insert');
        }
        return rows[0];
    };

    const createGrant = async (grant: NewAccessGrantRecord) => {
        await db.insert(accessGrantTable).values(grant);
        const rows = await db.select().from(accessGrantTable).where(eq(accessGrantTable.id, grant.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Access grant missing after insert');
        }
        return rows[0];
    };

    const getGrantById = async (id: string) => {
        const rows = await db.select().from(accessGrantTable).where(eq(accessGrantTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const revokeGrant = async (id: string, revokedAt: number) => {
        await db
            .update(accessGrantTable)
            .set({revokedAt})
            .where(eq(accessGrantTable.id, id));
    };

    const createToken = async (token: NewPartnerTokenRecord) => {
        await db.insert(partnerTokenTable).values(token);
        const rows = await db.select().from(partnerTokenTable).where(eq(partnerTokenTable.id, token.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Partner token missing after insert');
        }
        return rows[0];
    };

    const getTokenByValue = async (token: string) => {
        const rows = await db.select().from(partnerTokenTable).where(eq(partnerTokenTable.token, token)).limit(1);
        return rows[0] ?? null;
    };

    const revokeToken = async (id: string, revokedAt: number) => {
        await db
            .update(partnerTokenTable)
            .set({revokedAt})
            .where(eq(partnerTokenTable.id, id));
    };

    return {
        getOrgById,
        createOrg,
        createGrant,
        getGrantById,
        revokeGrant,
        createToken,
        getTokenByValue,
        revokeToken
    };
};
