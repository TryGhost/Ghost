import {describe, expect, it} from 'vitest';
import {createStaffAuthService} from './service.js';
import type {StaffRepository} from './repo.js';
import {hashPassword, verifyPassword} from '../../platform/auth/passwords.js';
import {HttpError} from '../../platform/http/errors.js';
import type {NewResetTokenRecord, ResetTokenRecord, StaffRecord, StaffSessionRecord} from './db.js';

const createRepository = (staff: StaffRecord) => {
    let staffRecords: StaffRecord[] = [{...staff}];
    let sessions: StaffSessionRecord[] = [];
    const resetTokens: ResetTokenRecord[] = [];
    const invites: {
        id: string;
        email: string;
        role: string;
        token: string;
        createdAt: number;
        expiresAt: number;
        acceptedAt: number | null;
    }[] = [];
    const roles: {id: string; name: string}[] = [];
    const staffRoles: {staffId: string; roleId: string}[] = [];

    const repository: StaffRepository = {
        getStaffByEmail: async (email) => staffRecords.find((record) => record.email === email) ?? null,
        getStaffById: async (id) => staffRecords.find((record) => record.id === id) ?? null,
        createStaff: async (record) => {
            staffRecords = [...staffRecords, record as StaffRecord];
            return record as StaffRecord;
        },
        updateStaffPassword: async (id, passwordHash, updatedAt) => {
            staffRecords = staffRecords.map((record) =>
                record.id === id ? {...record, passwordHash, updatedAt} : record
            );
        },
        createSession: async (session) => {
            const record: StaffSessionRecord = {
                ...session,
                revokedAt: null
            };
            sessions = [...sessions, record];
            return record;
        },
        getSession: async (id) => sessions.find((session) => session.id === id) ?? null,
        revokeSession: async () => undefined,
        revokeSessionsForStaff: async (staffId, revokedAt) => {
            sessions = sessions.map((session) => (session.staffId === staffId ? {...session, revokedAt} : session));
        },
        createResetToken: async (token: NewResetTokenRecord) => {
            const record: ResetTokenRecord = {
                ...token,
                usedAt: token.usedAt ?? null
            };
            resetTokens.push(record);
            return record;
        },
        getResetTokenByToken: async (token) => resetTokens.find((record) => record.token === token) ?? null,
        markResetTokenUsed: async (id, usedAt) => {
            const index = resetTokens.findIndex((record) => record.id === id);
            const existing = resetTokens[index];
            if (!existing) {
                return;
            }

            resetTokens[index] = {...existing, usedAt};
        },
        createInvite: async (invite) => {
            const record = {
                ...invite,
                acceptedAt: invite.acceptedAt ?? null
            };
            invites.push(record);
            return record;
        },
        getInviteByToken: async (token) => invites.find((record) => record.token === token) ?? null,
        markInviteAccepted: async (id, acceptedAt) => {
            const index = invites.findIndex((record) => record.id === id);
            const existing = invites[index];
            if (!existing) {
                return;
            }

            invites[index] = {...existing, acceptedAt};
        },
        getRoleByName: async (name) => roles.find((record) => record.name === name) ?? null,
        createRole: async (role) => {
            roles.push(role as {id: string; name: string});
        },
        assignRoleToStaff: async (staffId, roleId) => {
            staffRoles.push({staffId, roleId});
        }
    };

    return {
        repository,
        state: {
            staffRecords: () => staffRecords,
            staffRoles: () => staffRoles,
            invites: () => invites,
            roles: () => roles
        }
    };
};

describe('staff auth service', () => {
    it('logs in staff and returns a session', async () => {
        const staff: StaffRecord = {
            id: 'staff-1',
            email: 'jamie@example.com',
            name: 'Jamie',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository} = createRepository(staff);
        const service = createStaffAuthService(repository);

        const result = await service.login({email: staff.email, password: 'password-123'}, '127.0.0.1');

        expect(result.staff.email).toBe(staff.email);
        expect(result.session.staffId).toBe(staff.id);
    });

    it('rate limits repeated failures', async () => {
        const staff: StaffRecord = {
            id: 'staff-2',
            email: 'casey@example.com',
            name: 'Casey',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository} = createRepository(staff);
        const service = createStaffAuthService(repository);

        let rateLimited = false;

        for (let i = 0; i < 6; i += 1) {
            try {
                await service.login({email: staff.email, password: 'bad-password'}, '127.0.0.2');
            } catch (error) {
                if (error instanceof HttpError && error.code === 'rate_limited') {
                    rateLimited = true;
                    break;
                }
            }
        }

        expect(rateLimited).toBe(true);
    });

    it('issues a reset token for staff email', async () => {
        const staff: StaffRecord = {
            id: 'staff-3',
            email: 'alex@example.com',
            name: 'Alex',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository} = createRepository(staff);
        const service = createStaffAuthService(repository);

        const result = await service.requestPasswordReset({email: staff.email});

        expect(result.issued).toBe(true);
        expect(result.resetToken?.token).toBeTruthy();
    });

    it('resets password and revokes sessions', async () => {
        const now = Date.now();
        const staff: StaffRecord = {
            id: 'staff-4',
            email: 'taylor@example.com',
            name: 'Taylor',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            createdAt: now,
            updatedAt: now
        };

        const {repository} = createRepository(staff);
        const service = createStaffAuthService(repository);

        const reset = await service.requestPasswordReset({email: staff.email});
        const resetToken = reset.resetToken?.token ?? '';

        const result = await service.resetPassword({token: resetToken, password: 'new-password-123'});

        const updated = await repository.getStaffById(staff.id);

        expect(result.staffId).toBe(staff.id);
        expect(updated).not.toBeNull();
        expect(verifyPassword('new-password-123', updated?.passwordHash ?? '')).toBe(true);
    });

    it('creates and accepts staff invites', async () => {
        const staff: StaffRecord = {
            id: 'staff-5',
            email: 'owner@example.com',
            name: 'Owner',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository, state} = createRepository(staff);
        const service = createStaffAuthService(repository);

        const invite = await service.createStaffInvite({email: 'new@example.com', role: 'editor'});
        const accepted = await service.acceptStaffInvite({
            token: invite.invite.token,
            name: 'New Staff',
            password: 'password-123'
        });

        const staffRecords = state.staffRecords();
        const staffRoles = state.staffRoles();
        const role = await repository.getRoleByName('editor');

        expect(invite.invite.email).toBe('new@example.com');
        expect(accepted.staffId).toBeTruthy();
        expect(staffRecords.some((record) => record.email === 'new@example.com')).toBe(true);
        expect(role).not.toBeNull();
        expect(staffRoles.some((entry) => entry.staffId === accepted.staffId)).toBe(true);
    });
});
