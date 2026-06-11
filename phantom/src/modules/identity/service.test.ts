import {describe, expect, it} from 'vitest';
import {createStaffAuthService} from './service.js';
import type {StaffRepository} from './repo.js';
import {hashPassword, verifyPassword} from '../../platform/auth/passwords.js';
import {HttpError} from '../../platform/http/errors.js';
import type {
    IntegrationTokenRecord,
    NewResetTokenRecord,
    ResetTokenRecord,
    StaffApiTokenRecord,
    StaffAuthEventRecord,
    StaffRecord,
    StaffSessionRecord
} from './db.js';

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
    const staffApiTokens: StaffApiTokenRecord[] = [];
    const integrationTokens: IntegrationTokenRecord[] = [];
    const authEvents: StaffAuthEventRecord[] = [];
    const authFactors: {
        id: string;
        staffId: string;
        type: string;
        token: string;
        createdAt: number;
        expiresAt: number;
        usedAt: number | null;
        invalidatedAt: number | null;
    }[] = [];

    const repository: StaffRepository = {
        listStaff: async () => staffRecords,
        getStaffByEmail: async (email) => staffRecords.find((record) => record.email === email) ?? null,
        getStaffById: async (id) => staffRecords.find((record) => record.id === id) ?? null,
        createStaff: async (record) => {
            staffRecords = [...staffRecords, record as StaffRecord];
            return record as StaffRecord;
        },
        updateStaffAccessibility: async () => undefined,
        updateStaffProfile: async () => undefined,
        listInvites: async () => [],
        listRoles: async () => [],
        updateStaffPassword: async (id, passwordHash, updatedAt) => {
            staffRecords = staffRecords.map((record) =>
                record.id === id ? {...record, passwordHash, updatedAt} : record
            );
        },
        createSession: async (session) => {
            const record: StaffSessionRecord = {
                revokedAt: null,
                verifiedAt: session.verifiedAt ?? null,
                ...session
            } as StaffSessionRecord;
            sessions = [...sessions, record];
            return record;
        },
        setSessionVerified: async (id, verifiedAt) => {
            sessions = sessions.map((session) => (session.id === id ? {...session, verifiedAt} : session));
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
        },
        getRolesForStaff: async (staffId) => {
            return staffRoles
                .filter((entry) => entry.staffId === staffId)
                .map((entry) => roles.find((role) => role.id === entry.roleId)?.name)
                .filter((name): name is string => Boolean(name));
        },
        createStaffApiToken: async (token) => {
            const record: StaffApiTokenRecord = {
                ...token,
                revokedAt: token.revokedAt ?? null
            };
            staffApiTokens.push(record);
            return record;
        },
        getStaffApiTokenById: async (id) => staffApiTokens.find((record) => record.id === id) ?? null,
        getStaffApiTokenByToken: async (token) => staffApiTokens.find((record) => record.token === token) ?? null,
        revokeStaffApiToken: async (id, revokedAt) => {
            const index = staffApiTokens.findIndex((record) => record.id === id);
            const existing = staffApiTokens[index];
            if (!existing) {
                return;
            }

            staffApiTokens[index] = {...existing, revokedAt};
        },
        createIntegrationToken: async (token) => {
            const record: IntegrationTokenRecord = {
                ...token,
                revokedAt: token.revokedAt ?? null
            };
            integrationTokens.push(record);
            return record;
        },
        getIntegrationTokenById: async (id) => integrationTokens.find((record) => record.id === id) ?? null,
        getIntegrationTokenByToken: async (token) => integrationTokens.find((record) => record.token === token) ?? null,
        revokeIntegrationToken: async (id, revokedAt) => {
            const index = integrationTokens.findIndex((record) => record.id === id);
            const existing = integrationTokens[index];
            if (!existing) {
                return;
            }

            integrationTokens[index] = {...existing, revokedAt};
        },
        createStaffAuthEvent: async (event) => {
            const record: StaffAuthEventRecord = {
                ...event,
                ipAddress: event.ipAddress ?? null,
                deviceId: event.deviceId ?? null
            };
            authEvents.push(record);
            return record;
        },
        listStaffAuthEvents: async (filters) => {
            return authEvents
                .filter((event) => (filters.staffId ? event.staffId === filters.staffId : true))
                .filter((event) => (filters.from !== undefined ? event.createdAt >= filters.from : true))
                .filter((event) => (filters.to !== undefined ? event.createdAt <= filters.to : true))
                .filter((event) => (filters.cursor !== undefined ? event.createdAt < filters.cursor : true))
                .slice(0, filters.limit);
        },
        createAuthFactor: async (factor) => {
            const record = {
                ...factor,
                usedAt: factor.usedAt ?? null,
                invalidatedAt: factor.invalidatedAt ?? null
            };
            authFactors.push(record);
            return record;
        },
        getAuthFactorByToken: async (token) => authFactors.find((record) => record.token === token) ?? null,
        invalidateAuthFactors: async (staffId, type, invalidatedAt) => {
            authFactors.forEach((record, index) => {
                if (record.staffId === staffId && record.type === type && record.invalidatedAt === null) {
                    authFactors[index] = {...record, invalidatedAt};
                }
            });
        },
        markAuthFactorUsed: async (id, usedAt) => {
            const index = authFactors.findIndex((record) => record.id === id);
            const existing = authFactors[index];
            if (!existing) {
                return;
            }
            authFactors[index] = {...existing, usedAt};
        },
        cleanupResetTokens: async () => 0,
        cleanupAuthFactors: async () => 0
    };

    return {
        repository,
        state: {
            staffRecords: () => staffRecords,
            staffRoles: () => staffRoles,
            invites: () => invites,
            roles: () => roles,
            staffApiTokens: () => staffApiTokens,
            integrationTokens: () => integrationTokens,
            authEvents: () => authEvents,
            authFactors: () => authFactors
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
            twoFactorEnabled: 0,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository} = createRepository(staff);
        const service = createStaffAuthService(repository);

        const result = await service.login({email: staff.email, password: 'password-123'}, '127.0.0.1');

        expect(result.staff.email).toBe(staff.email);
        expect(result.session?.staffId).toBe(staff.id);
    });

    it('records auth events on login', async () => {
        const staff: StaffRecord = {
            id: 'staff-8',
            email: 'log@example.com',
            name: 'Log',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            twoFactorEnabled: 0,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository, state} = createRepository(staff);
        const service = createStaffAuthService(repository);

        await service.login({email: staff.email, password: 'password-123'}, '127.0.0.1');

        const events = state.authEvents();
        const event = events.find((record) => record.action === 'login');

        expect(event?.outcome).toBe('success');
    });

    it('requires verification when 2FA is enabled', async () => {
        const staff: StaffRecord = {
            id: 'staff-9',
            email: '2fa@example.com',
            name: 'Two Factor',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            twoFactorEnabled: 1,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository, state} = createRepository(staff);
        const service = createStaffAuthService(repository);

        const login = await service.login({email: staff.email, password: 'password-123'}, '127.0.0.1');
        const token = login.verification?.token ?? '';

        const verified = await service.verifyStaffAuthFactor({token});

        const factor = state.authFactors()[0];

        expect(login.session).toBeUndefined();
        expect(login.verification?.token).toBeTruthy();
        expect(verified.session.staffId).toBe(staff.id);
        expect(factor?.usedAt).not.toBeNull();
    });

    it('logs in with SSO for configured providers', async () => {
        const staff: StaffRecord = {
            id: 'staff-10',
            email: 'sso@example.com',
            name: 'SSO User',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            twoFactorEnabled: 0,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository} = createRepository(staff);
        const service = createStaffAuthService(repository, {ssoProviders: ['google']});

        const result = await service.loginWithSso({
            provider: 'google',
            subject: 'sso-subject',
            email: staff.email,
            name: staff.name
        }, '127.0.0.1');

        expect(result.session?.staffId).toBe(staff.id);
    });

    it('rate limits repeated failures', async () => {
        const staff: StaffRecord = {
            id: 'staff-2',
            email: 'casey@example.com',
            name: 'Casey',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            twoFactorEnabled: 0,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
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
            twoFactorEnabled: 0,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
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
            twoFactorEnabled: 0,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
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
            twoFactorEnabled: 0,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
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

    it('creates and revokes staff API tokens', async () => {
        const staff: StaffRecord = {
            id: 'staff-6',
            email: 'token-owner@example.com',
            name: 'Token Owner',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            twoFactorEnabled: 0,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository, state} = createRepository(staff);
        const service = createStaffAuthService(repository);

        const created = await service.createStaffApiToken(staff.id, {name: 'CLI'});
        await service.revokeStaffApiToken(staff.id, created.apiToken.id);

        const stored = state.staffApiTokens()[0];

        expect(created.apiToken.token).toBeTruthy();
        expect(stored?.revokedAt).not.toBeNull();
    });

    it('creates and revokes integration tokens', async () => {
        const staff: StaffRecord = {
            id: 'staff-7',
            email: 'integration-owner@example.com',
            name: 'Integration Owner',
            status: 'active',
            passwordHash: hashPassword('password-123'),
            twoFactorEnabled: 0,
            accessibility: null,
            externalSubjectId: null,
            externallyManaged: 0,
            createdAt: Date.now(),
            updatedAt: Date.now()
        };

        const {repository, state} = createRepository(staff);
        const service = createStaffAuthService(repository);

        const created = await service.createIntegrationToken({name: 'Zapier'});
        await service.revokeIntegrationToken(created.apiToken.id);

        const stored = state.integrationTokens()[0];

        expect(created.apiToken.token).toBeTruthy();
        expect(stored?.revokedAt).not.toBeNull();
    });
});
