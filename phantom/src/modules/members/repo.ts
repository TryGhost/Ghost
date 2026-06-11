import {and, count, eq, inArray, like, lte, or, sql} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    memberAuthEventTable,
    memberAuthTokenTable,
    memberLabelLinkTable,
    memberLabelTable,
    memberSessionTable,
    memberTable,
    type MemberAuthEventRecord,
    type MemberAuthTokenRecord,
    type MemberLabelRecord,
    type MemberRecord,
    type MemberSessionRecord,
    type NewMemberAuthEventRecord,
    type NewMemberAuthTokenRecord,
    type NewMemberLabelRecord,
    type NewMemberRecord,
    type NewMemberSessionRecord
} from './db.js';

// Admin directory filters: email exact, name contains, free search over
// name/email, labels by slug (multiple labels AND together).
export type MemberListFilter = {
    email?: string;
    emailContains?: string;
    nameContains?: string;
    labelSlugs?: string[];
    search?: string;
};

export type MemberRepository = {
    getMemberByEmail: (email: string) => Promise<MemberRecord | null>;
    getMemberById: (id: string) => Promise<MemberRecord | null>;
    createMember: (member: NewMemberRecord) => Promise<MemberRecord>;
    updateMember: (member: MemberRecord) => Promise<MemberRecord>;
    deleteMember: (id: string) => Promise<void>;
    deleteAllMembers: () => Promise<void>;
    listMembers: (options: {limit: number; offset: number; filter?: MemberListFilter}) => Promise<MemberRecord[]>;
    countFilteredMembers: (filter?: MemberListFilter) => Promise<number>;
    countMembers: () => Promise<{total: number; free: number; paid: number}>;
    upsertLabel: (label: NewMemberLabelRecord) => Promise<MemberLabelRecord>;
    getLabelBySlug: (slug: string) => Promise<MemberLabelRecord | null>;
    listLabels: () => Promise<MemberLabelRecord[]>;
    setMemberLabels: (memberId: string, labelIds: string[]) => Promise<void>;
    getLabelsForMembers: (memberIds: string[]) => Promise<Map<string, MemberLabelRecord[]>>;
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

    const buildMemberWhere = async (filter?: MemberListFilter) => {
        const conditions = [];
        if (filter?.email) {
            conditions.push(eq(memberTable.email, filter.email));
        }
        if (filter?.search) {
            const pattern = `%${filter.search}%`;
            conditions.push(or(like(memberTable.email, pattern), like(memberTable.name, pattern))!);
        }
        if (filter?.nameContains) {
            conditions.push(like(memberTable.name, `%${filter.nameContains}%`));
        }
        if (filter?.emailContains) {
            conditions.push(like(memberTable.email, `%${filter.emailContains}%`));
        }
        for (const labelSlug of filter?.labelSlugs ?? []) {
            const label = await getLabelBySlug(labelSlug);
            if (!label) {
                return null;
            }
            const links = await db.select().from(memberLabelLinkTable).where(eq(memberLabelLinkTable.labelId, label.id));
            const memberIds = links.map((link) => link.memberId);
            if (memberIds.length === 0) {
                return null;
            }
            conditions.push(inArray(memberTable.id, memberIds));
        }
        return conditions.length > 0 ? and(...conditions) : sql`1 = 1`;
    };

    const listMembers = async ({limit, offset, filter}: {limit: number; offset: number; filter?: MemberListFilter}) => {
        const where = await buildMemberWhere(filter);
        if (!where) {
            return [];
        }
        return db.select().from(memberTable).where(where).orderBy(memberTable.createdAt, memberTable.id).limit(limit).offset(offset);
    };

    const countFilteredMembers = async (filter?: MemberListFilter) => {
        const where = await buildMemberWhere(filter);
        if (!where) {
            return 0;
        }
        const rows = await db.select({value: count()}).from(memberTable).where(where).limit(1);
        return rows[0]?.value ?? 0;
    };

    const updateMember = async (member: MemberRecord) => {
        const {id, ...updatable} = member;
        await db.update(memberTable).set(updatable).where(eq(memberTable.id, id));
        const rows = await db.select().from(memberTable).where(eq(memberTable.id, id)).limit(1);
        if (!rows[0]) {
            throw new Error('Member missing after update');
        }
        return rows[0];
    };

    const deleteMember = async (id: string) => {
        await db.delete(memberLabelLinkTable).where(eq(memberLabelLinkTable.memberId, id));
        await db.delete(memberTable).where(eq(memberTable.id, id));
    };

    const deleteAllMembers = async () => {
        await db.delete(memberLabelLinkTable);
        await db.delete(memberTable);
    };

    const getLabelBySlug = async (slug: string) => {
        const rows = await db.select().from(memberLabelTable).where(eq(memberLabelTable.slug, slug)).limit(1);
        return rows[0] ?? null;
    };

    const upsertLabel = async (label: NewMemberLabelRecord) => {
        const existing = await getLabelBySlug(label.slug);
        if (existing) {
            return existing;
        }
        await db.insert(memberLabelTable).values(label);
        const rows = await db.select().from(memberLabelTable).where(eq(memberLabelTable.id, label.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Label missing after insert');
        }
        return rows[0];
    };

    const listLabels = async () => {
        return db.select().from(memberLabelTable).orderBy(memberLabelTable.name);
    };

    const setMemberLabels = async (memberId: string, labelIds: string[]) => {
        await db.delete(memberLabelLinkTable).where(eq(memberLabelLinkTable.memberId, memberId));
        for (const labelId of labelIds) {
            await db.insert(memberLabelLinkTable).values({memberId, labelId});
        }
    };

    const getLabelsForMembers = async (memberIds: string[]) => {
        const result = new Map<string, MemberLabelRecord[]>();
        if (memberIds.length === 0) {
            return result;
        }
        const rows = await db
            .select({link: memberLabelLinkTable, label: memberLabelTable})
            .from(memberLabelLinkTable)
            .innerJoin(memberLabelTable, eq(memberLabelLinkTable.labelId, memberLabelTable.id))
            .where(inArray(memberLabelLinkTable.memberId, memberIds));
        for (const row of rows) {
            const existing = result.get(row.link.memberId) ?? [];
            existing.push(row.label);
            result.set(row.link.memberId, existing);
        }
        return result;
    };

    const countMembers = async () => {
        const [totalRows, paidRows] = await Promise.all([
            db.select({value: count()}).from(memberTable),
            db.select({value: count()}).from(memberTable).where(eq(memberTable.status, 'paid'))
        ]);
        const total = totalRows[0]?.value ?? 0;
        const paid = paidRows[0]?.value ?? 0;
        return {total, paid, free: total - paid};
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
        listMembers,
        countFilteredMembers,
        countMembers,
        getMemberById,
        createMember,
        updateMember,
        deleteMember,
        deleteAllMembers,
        upsertLabel,
        getLabelBySlug,
        listLabels,
        setMemberLabels,
        getLabelsForMembers,
        createAuthToken,
        getAuthTokenByToken,
        markAuthTokenUsed,
        createSession,
        getSessionById,
        createAuthEvent,
        cleanupAuthTokens
    };
};
