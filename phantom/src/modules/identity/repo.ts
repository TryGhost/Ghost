import {and, desc, eq, gte, isNull, lt, lte, sql} from 'drizzle-orm';
import type {DbClient} from '../../db/client.js';
import {
    staffTable,
    staffSessionTable,
    staffInviteTable,
    roleTable,
    staffRoleTable,
    staffApiTokenTable,
    integrationTokenTable,
    staffAuthEventTable,
    staffAuthFactorTable,
    resetTokenTable,
    type StaffRecord,
    type NewStaffRecord,
    type RoleRecord,
    type NewRoleRecord,
    type StaffSessionRecord,
    type NewStaffSessionRecord,
    type StaffInviteRecord,
    type NewStaffInviteRecord,
    type StaffApiTokenRecord,
    type NewStaffApiTokenRecord,
    type IntegrationTokenRecord,
    type NewIntegrationTokenRecord,
    type StaffAuthEventRecord,
    type NewStaffAuthEventRecord,
    type StaffAuthFactorRecord,
    type NewStaffAuthFactorRecord,
    type ResetTokenRecord,
    type NewResetTokenRecord
} from './db.js';

export type StaffRepository = {
    getStaffByEmail: (email: string) => Promise<StaffRecord | null>;
    listStaff: () => Promise<StaffRecord[]>;
    getStaffById: (id: string) => Promise<StaffRecord | null>;
    createStaff: (staff: NewStaffRecord) => Promise<StaffRecord>;
    updateStaffPassword: (id: string, passwordHash: string, updatedAt: number) => Promise<void>;
    updateStaffAccessibility: (id: string, accessibility: string | null, updatedAt: number) => Promise<void>;
    updateStaffProfile: (id: string, profile: {name?: string; email?: string}, updatedAt: number) => Promise<void>;
    createSession: (session: NewStaffSessionRecord) => Promise<StaffSessionRecord>;
    getSession: (id: string) => Promise<StaffSessionRecord | null>;
    revokeSession: (id: string, revokedAt: number) => Promise<void>;
    setSessionVerified: (id: string, verifiedAt: number) => Promise<void>;
    revokeSessionsForStaff: (staffId: string, revokedAt: number) => Promise<void>;
    createResetToken: (token: NewResetTokenRecord) => Promise<ResetTokenRecord>;
    getResetTokenByToken: (token: string) => Promise<ResetTokenRecord | null>;
    markResetTokenUsed: (id: string, usedAt: number) => Promise<void>;
    createInvite: (invite: NewStaffInviteRecord) => Promise<StaffInviteRecord>;
    getInviteByToken: (token: string) => Promise<StaffInviteRecord | null>;
    listInvites: () => Promise<StaffInviteRecord[]>;
    listRoles: () => Promise<RoleRecord[]>;
    markInviteAccepted: (id: string, acceptedAt: number) => Promise<void>;
    getRoleByName: (name: string) => Promise<RoleRecord | null>;
    createRole: (role: NewRoleRecord) => Promise<void>;
    assignRoleToStaff: (staffId: string, roleId: string) => Promise<void>;
    getRolesForStaff: (staffId: string) => Promise<string[]>;
    createStaffApiToken: (token: NewStaffApiTokenRecord) => Promise<StaffApiTokenRecord>;
    getStaffApiTokenById: (id: string) => Promise<StaffApiTokenRecord | null>;
    getStaffApiTokenByToken: (token: string) => Promise<StaffApiTokenRecord | null>;
    revokeStaffApiToken: (id: string, revokedAt: number) => Promise<void>;
    createIntegrationToken: (token: NewIntegrationTokenRecord) => Promise<IntegrationTokenRecord>;
    getIntegrationTokenById: (id: string) => Promise<IntegrationTokenRecord | null>;
    getIntegrationTokenByToken: (token: string) => Promise<IntegrationTokenRecord | null>;
    revokeIntegrationToken: (id: string, revokedAt: number) => Promise<void>;
    createStaffAuthEvent: (event: NewStaffAuthEventRecord) => Promise<StaffAuthEventRecord>;
    listStaffAuthEvents: (filters: {staffId?: string; from?: number; to?: number; limit: number; cursor?: number}) => Promise<StaffAuthEventRecord[]>;
    createAuthFactor: (factor: NewStaffAuthFactorRecord) => Promise<StaffAuthFactorRecord>;
    getAuthFactorByToken: (token: string) => Promise<StaffAuthFactorRecord | null>;
    invalidateAuthFactors: (staffId: string, type: string, invalidatedAt: number) => Promise<void>;
    markAuthFactorUsed: (id: string, usedAt: number) => Promise<void>;
    cleanupResetTokens: (before: number) => Promise<number>;
    cleanupAuthFactors: (before: number) => Promise<number>;
};

export const createStaffRepository = (db: DbClient): StaffRepository => {
    const listStaff = async () => {
        return db.select().from(staffTable);
    };

    const getStaffByEmail = async (email: string) => {
        const rows = await db.select().from(staffTable).where(eq(staffTable.email, email)).limit(1);
        return rows[0] ?? null;
    };

    const getStaffById = async (id: string) => {
        const rows = await db.select().from(staffTable).where(eq(staffTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const createStaff = async (staff: NewStaffRecord) => {
        await db.insert(staffTable).values(staff);
        const rows = await db.select().from(staffTable).where(eq(staffTable.id, staff.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Staff record missing after insert');
        }
        return rows[0];
    };

    const createSession = async (session: NewStaffSessionRecord) => {
        await db.insert(staffSessionTable).values(session);
        const rows = await db.select().from(staffSessionTable).where(eq(staffSessionTable.id, session.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Session record missing after insert');
        }
        return rows[0];
    };

    const updateStaffPassword = async (id: string, passwordHash: string, updatedAt: number) => {
        await db
            .update(staffTable)
            .set({passwordHash, updatedAt})
            .where(eq(staffTable.id, id));
    };

    const updateStaffAccessibility = async (id: string, accessibility: string | null, updatedAt: number) => {
        await db
            .update(staffTable)
            .set({accessibility, updatedAt})
            .where(eq(staffTable.id, id));
    };

    const updateStaffProfile = async (id: string, profile: {name?: string; email?: string}, updatedAt: number) => {
        await db
            .update(staffTable)
            .set({
                ...(profile.name !== undefined ? {name: profile.name} : {}),
                ...(profile.email !== undefined ? {email: profile.email} : {}),
                updatedAt
            })
            .where(eq(staffTable.id, id));
    };

    const getSession = async (id: string) => {
        const rows = await db.select().from(staffSessionTable).where(eq(staffSessionTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const setSessionVerified = async (id: string, verifiedAt: number) => {
        await db
            .update(staffSessionTable)
            .set({verifiedAt})
            .where(eq(staffSessionTable.id, id));
    };

    const revokeSession = async (id: string, revokedAt: number) => {
        await db
            .update(staffSessionTable)
            .set({revokedAt})
            .where(eq(staffSessionTable.id, id));
    };

    const revokeSessionsForStaff = async (staffId: string, revokedAt: number) => {
        await db
            .update(staffSessionTable)
            .set({revokedAt})
            .where(eq(staffSessionTable.staffId, staffId));
    };

    const createResetToken = async (token: NewResetTokenRecord) => {
        await db.insert(resetTokenTable).values(token);
        const rows = await db.select().from(resetTokenTable).where(eq(resetTokenTable.id, token.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Reset token missing after insert');
        }
        return rows[0];
    };

    const getResetTokenByToken = async (token: string) => {
        const rows = await db.select().from(resetTokenTable).where(eq(resetTokenTable.token, token)).limit(1);
        return rows[0] ?? null;
    };

    const markResetTokenUsed = async (id: string, usedAt: number) => {
        await db
            .update(resetTokenTable)
            .set({usedAt})
            .where(eq(resetTokenTable.id, id));
    };

    const createInvite = async (invite: NewStaffInviteRecord) => {
        await db.insert(staffInviteTable).values(invite);
        const rows = await db.select().from(staffInviteTable).where(eq(staffInviteTable.id, invite.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Invite record missing after insert');
        }
        return rows[0];
    };

    const listInvites = async () => {
        return db.select().from(staffInviteTable);
    };

    const listRoles = async () => {
        return db.select().from(roleTable);
    };

    const getInviteByToken = async (token: string) => {
        const rows = await db.select().from(staffInviteTable).where(eq(staffInviteTable.token, token)).limit(1);
        return rows[0] ?? null;
    };

    const markInviteAccepted = async (id: string, acceptedAt: number) => {
        await db
            .update(staffInviteTable)
            .set({acceptedAt})
            .where(eq(staffInviteTable.id, id));
    };

    const getRoleByName = async (name: string) => {
        const rows = await db.select().from(roleTable).where(eq(roleTable.name, name)).limit(1);
        return rows[0] ?? null;
    };

    const createRole = async (role: NewRoleRecord) => {
        await db.insert(roleTable).values(role);
    };

    const assignRoleToStaff = async (staffId: string, roleId: string) => {
        await db.insert(staffRoleTable).values({staffId, roleId});
    };

    const getRolesForStaff = async (staffId: string) => {
        const rows = await db
            .select({name: roleTable.name})
            .from(staffRoleTable)
            .innerJoin(roleTable, eq(staffRoleTable.roleId, roleTable.id))
            .where(eq(staffRoleTable.staffId, staffId));
        return rows.map((row) => row.name);
    };

    const createStaffApiToken = async (token: NewStaffApiTokenRecord) => {
        await db.insert(staffApiTokenTable).values(token);
        const rows = await db.select().from(staffApiTokenTable).where(eq(staffApiTokenTable.id, token.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Staff API token missing after insert');
        }
        return rows[0];
    };

    const getStaffApiTokenById = async (id: string) => {
        const rows = await db.select().from(staffApiTokenTable).where(eq(staffApiTokenTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const getStaffApiTokenByToken = async (token: string) => {
        const rows = await db.select().from(staffApiTokenTable).where(eq(staffApiTokenTable.token, token)).limit(1);
        return rows[0] ?? null;
    };

    const revokeStaffApiToken = async (id: string, revokedAt: number) => {
        await db
            .update(staffApiTokenTable)
            .set({revokedAt})
            .where(eq(staffApiTokenTable.id, id));
    };

    const createIntegrationToken = async (token: NewIntegrationTokenRecord) => {
        await db.insert(integrationTokenTable).values(token);
        const rows = await db.select().from(integrationTokenTable).where(eq(integrationTokenTable.id, token.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Integration token missing after insert');
        }
        return rows[0];
    };

    const getIntegrationTokenById = async (id: string) => {
        const rows = await db.select().from(integrationTokenTable).where(eq(integrationTokenTable.id, id)).limit(1);
        return rows[0] ?? null;
    };

    const getIntegrationTokenByToken = async (token: string) => {
        const rows = await db.select().from(integrationTokenTable).where(eq(integrationTokenTable.token, token)).limit(1);
        return rows[0] ?? null;
    };

    const revokeIntegrationToken = async (id: string, revokedAt: number) => {
        await db
            .update(integrationTokenTable)
            .set({revokedAt})
            .where(eq(integrationTokenTable.id, id));
    };

    const createStaffAuthEvent = async (event: NewStaffAuthEventRecord) => {
        await db.insert(staffAuthEventTable).values(event);
        const rows = await db.select().from(staffAuthEventTable).where(eq(staffAuthEventTable.id, event.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Auth event missing after insert');
        }
        return rows[0];
    };

    const listStaffAuthEvents = async (filters: {staffId?: string; from?: number; to?: number; limit: number; cursor?: number}) => {
        const clauses = [] as ReturnType<typeof eq>[];
        if (filters.staffId) {
            clauses.push(eq(staffAuthEventTable.staffId, filters.staffId));
        }
        if (filters.from !== undefined) {
            clauses.push(gte(staffAuthEventTable.createdAt, filters.from));
        }
        if (filters.to !== undefined) {
            clauses.push(lte(staffAuthEventTable.createdAt, filters.to));
        }
        if (filters.cursor !== undefined) {
            clauses.push(lt(staffAuthEventTable.createdAt, filters.cursor));
        }

        const query = db
            .select()
            .from(staffAuthEventTable)
            .orderBy(desc(staffAuthEventTable.createdAt))
            .limit(filters.limit);

        if (clauses.length === 0) {
            return query;
        }

        return query.where(and(...clauses));
    };

    const createAuthFactor = async (factor: NewStaffAuthFactorRecord) => {
        await db.insert(staffAuthFactorTable).values(factor);
        const rows = await db.select().from(staffAuthFactorTable).where(eq(staffAuthFactorTable.id, factor.id)).limit(1);
        if (!rows[0]) {
            throw new Error('Auth factor missing after insert');
        }
        return rows[0];
    };

    const getAuthFactorByToken = async (token: string) => {
        const rows = await db.select().from(staffAuthFactorTable).where(eq(staffAuthFactorTable.token, token)).limit(1);
        return rows[0] ?? null;
    };

    const invalidateAuthFactors = async (staffId: string, type: string, invalidatedAt: number) => {
        await db
            .update(staffAuthFactorTable)
            .set({invalidatedAt})
            .where(and(
                eq(staffAuthFactorTable.staffId, staffId),
                eq(staffAuthFactorTable.type, type),
                isNull(staffAuthFactorTable.invalidatedAt)
            ));
    };

    const markAuthFactorUsed = async (id: string, usedAt: number) => {
        await db
            .update(staffAuthFactorTable)
            .set({usedAt})
            .where(eq(staffAuthFactorTable.id, id));
    };

    const cleanupResetTokens = async (before: number) => {
        const rows = await db
            .select({count: sql<number>`count(*)`})
            .from(resetTokenTable)
            .where(lte(resetTokenTable.expiresAt, before));
        await db.delete(resetTokenTable).where(lte(resetTokenTable.expiresAt, before));
        return rows[0]?.count ?? 0;
    };

    const cleanupAuthFactors = async (before: number) => {
        const rows = await db
            .select({count: sql<number>`count(*)`})
            .from(staffAuthFactorTable)
            .where(lte(staffAuthFactorTable.expiresAt, before));
        await db.delete(staffAuthFactorTable).where(lte(staffAuthFactorTable.expiresAt, before));
        return rows[0]?.count ?? 0;
    };

    return {
        getStaffByEmail,
        listStaff,
        getStaffById,
        createStaff,
        updateStaffPassword,
        updateStaffAccessibility,
        updateStaffProfile,
        createSession,
        getSession,
        revokeSession,
        setSessionVerified,
        revokeSessionsForStaff,
        createResetToken,
        getResetTokenByToken,
        markResetTokenUsed,
        createInvite,
        getInviteByToken,
        listInvites,
        listRoles,
        markInviteAccepted,
        getRoleByName,
        createRole,
        assignRoleToStaff,
        getRolesForStaff,
        createStaffApiToken,
        getStaffApiTokenById,
        getStaffApiTokenByToken,
        revokeStaffApiToken,
        createIntegrationToken,
        getIntegrationTokenById,
        getIntegrationTokenByToken,
        revokeIntegrationToken,
        createStaffAuthEvent,
        listStaffAuthEvents,
        createAuthFactor,
        getAuthFactorByToken,
        invalidateAuthFactors,
        markAuthFactorUsed,
        cleanupResetTokens,
        cleanupAuthFactors
    };
};
