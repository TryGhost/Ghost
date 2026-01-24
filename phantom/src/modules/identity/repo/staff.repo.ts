import {eq} from 'drizzle-orm';
import type {DbClient} from '../../../db/client.js';
import {
    staffTable,
    staffSessionTable,
    resetTokenTable,
    type StaffRecord,
    type StaffSessionRecord,
    type NewStaffSessionRecord,
    type ResetTokenRecord,
    type NewResetTokenRecord
} from '../schema/staff.schema.js';

export type StaffRepository = {
    getStaffByEmail: (email: string) => Promise<StaffRecord | null>;
    getStaffById: (id: string) => Promise<StaffRecord | null>;
    createSession: (session: NewStaffSessionRecord) => Promise<StaffSessionRecord>;
    getSession: (id: string) => Promise<StaffSessionRecord | null>;
    revokeSession: (id: string, revokedAt: number) => Promise<void>;
    createResetToken: (token: NewResetTokenRecord) => Promise<ResetTokenRecord>;
};

export const createStaffRepository = (db: DbClient): StaffRepository => {
    const getStaffByEmail = async (email: string) => {
        const rows = await db.select().from(staffTable).where(eq(staffTable.email, email)).limit(1);
        return rows[0] ?? null;
    };

    const getStaffById = async (id: string) => {
        const rows = await db.select().from(staffTable).where(eq(staffTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createSession = async (session: NewStaffSessionRecord) => {
        await db.insert(staffSessionTable).values(session);
        const rows = await db.select().from(staffSessionTable).where(eq(staffSessionTable.id, session.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Session record missing after insert');
        }
        return rows[0];
    };

    const getSession = async (id: string) => {
        const rows = await db.select().from(staffSessionTable).where(eq(staffSessionTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const revokeSession = async (id: string, revokedAt: number) => {
        await db
            .update(staffSessionTable)
            .set({revokedAt})
            .where(eq(staffSessionTable.id, id));
    };

    const createResetToken = async (token: NewResetTokenRecord) => {
        await db.insert(resetTokenTable).values(token);
        const rows = await db.select().from(resetTokenTable).where(eq(resetTokenTable.id, token.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Reset token missing after insert');
        }
        return rows[0];
    };

    return {
        getStaffByEmail,
        getStaffById,
        createSession,
        getSession,
        revokeSession,
        createResetToken
    };
};
