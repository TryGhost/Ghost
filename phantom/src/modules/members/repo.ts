import {eq, lte, sql} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    memberAuthEventTable,
    memberAuthTokenTable,
    memberSessionTable,
    memberTable,
    type MemberAuthEventRecord,
    type MemberAuthTokenRecord,
    type MemberRecord,
    type MemberSessionRecord,
    type NewMemberAuthEventRecord,
    type NewMemberAuthTokenRecord,
    type NewMemberRecord,
    type NewMemberSessionRecord
} from './db.js';

export type MemberRepository = {
    getMemberByEmail: (email: string) => Promise<MemberRecord | null>;
    getMemberById: (id: string) => Promise<MemberRecord | null>;
    createMember: (member: NewMemberRecord) => Promise<MemberRecord>;
    createAuthToken: (token: NewMemberAuthTokenRecord) => Promise<MemberAuthTokenRecord>;
    getAuthTokenByToken: (token: string) => Promise<MemberAuthTokenRecord | null>;
    markAuthTokenUsed: (id: string, usedAt: number) => Promise<void>;
    createSession: (session: NewMemberSessionRecord) => Promise<MemberSessionRecord>;
    getSessionById: (id: string) => Promise<MemberSessionRecord | null>;
    createAuthEvent: (event: NewMemberAuthEventRecord) => Promise<MemberAuthEventRecord>;
    cleanupAuthTokens: (before: number) => Promise<number>;
};

export const createMemberRepository = (db: DbClient): MemberRepository => {
    const getMemberByEmail = async (email: string) => {
        const rows = await db.select().from(memberTable).where(eq(memberTable.email, email)).limit(1);
        return rows[0] ?? null;
    };

    const getMemberById = async (id: string) => {
        const rows = await db.select().from(memberTable).where(eq(memberTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createMember = async (member: NewMemberRecord) => {
        await db.insert(memberTable).values(member);
        const rows = await db.select().from(memberTable).where(eq(memberTable.id, member.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Member record missing after insert');
        }
        return rows[0];
    };

    const createAuthToken = async (token: NewMemberAuthTokenRecord) => {
        await db.insert(memberAuthTokenTable).values(token);
        const rows = await db.select().from(memberAuthTokenTable).where(eq(memberAuthTokenTable.id, token.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Auth token missing after insert');
        }
        return rows[0];
    };

    const getAuthTokenByToken = async (token: string) => {
        const rows = await db.select().from(memberAuthTokenTable).where(eq(memberAuthTokenTable.token, token)).limit(1);
        return rows[0] ?? null;
    };

    const markAuthTokenUsed = async (id: string, usedAt: number) => {
        await db
            .update(memberAuthTokenTable)
            .set({usedAt})
            .where(eq(memberAuthTokenTable.id, id));
    };

    const createSession = async (session: NewMemberSessionRecord) => {
        await db.insert(memberSessionTable).values(session);
        const rows = await db.select().from(memberSessionTable).where(eq(memberSessionTable.id, session.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Member session missing after insert');
        }
        return rows[0];
    };

    const getSessionById = async (id: string) => {
        const rows = await db.select().from(memberSessionTable).where(eq(memberSessionTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createAuthEvent = async (event: NewMemberAuthEventRecord) => {
        await db.insert(memberAuthEventTable).values(event);
        const rows = await db.select().from(memberAuthEventTable).where(eq(memberAuthEventTable.id, event.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Member auth event missing after insert');
        }
        return rows[0];
    };

    const cleanupAuthTokens = async (before: number) => {
        const rows = await db
            .select({count: sql<number>`count(*)`})
            .from(memberAuthTokenTable)
            .where(lte(memberAuthTokenTable.expiresAt, before));
        await db.delete(memberAuthTokenTable).where(lte(memberAuthTokenTable.expiresAt, before));
        return rows[0]?.count ?? 0;
    };

    return {
        getMemberByEmail,
        getMemberById,
        createMember,
        createAuthToken,
        getAuthTokenByToken,
        markAuthTokenUsed,
        createSession,
        getSessionById,
        createAuthEvent,
        cleanupAuthTokens
    };
};
