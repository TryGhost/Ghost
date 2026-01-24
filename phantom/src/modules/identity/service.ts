import {randomUUID} from 'node:crypto';
import type {
    LoginRequest,
    PasswordResetConfirmRequest,
    PasswordResetConfirmResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    StaffInviteAcceptRequest,
    StaffInviteAcceptResponse,
    StaffInviteRequest,
    StaffInviteResponse,
    StaffApiTokenCreateRequest,
    StaffApiTokenCreateResponse,
    IntegrationTokenCreateRequest,
    IntegrationTokenCreateResponse,
    StaffResponse,
    StaffSessionResponse
} from './contracts.js';
import type {StaffRepository} from './repo.js';
import {hashPassword, verifyPassword} from '../../platform/auth/passwords.js';
import {createRateLimiter} from '../../platform/auth/rate-limiter.js';
import {HttpError} from '../../platform/http/errors.js';

export type StaffAuthService = {
    login: (input: LoginRequest, ipAddress: string) => Promise<{staff: StaffResponse; session: StaffSessionResponse}>;
    getStaffBySession: (sessionId: string) => Promise<StaffResponse>;
    logout: (sessionId: string) => Promise<void>;
    requestPasswordReset: (input: PasswordResetRequest) => Promise<PasswordResetResponse>;
    resetPassword: (input: PasswordResetConfirmRequest) => Promise<PasswordResetConfirmResponse>;
    createStaffInvite: (input: StaffInviteRequest) => Promise<StaffInviteResponse>;
    acceptStaffInvite: (input: StaffInviteAcceptRequest) => Promise<StaffInviteAcceptResponse>;
    createStaffApiToken: (staffId: string, input: StaffApiTokenCreateRequest) => Promise<StaffApiTokenCreateResponse>;
    revokeStaffApiToken: (staffId: string, tokenId: string) => Promise<void>;
    createIntegrationToken: (input: IntegrationTokenCreateRequest) => Promise<IntegrationTokenCreateResponse>;
    revokeIntegrationToken: (tokenId: string) => Promise<void>;
};

const loginLimiter = createRateLimiter(5, 5 * 60 * 1000);
const resetTokenTtlMs = 1000 * 60 * 60;
const inviteTtlMs = 1000 * 60 * 60 * 24 * 7;

const mapStaff = (record: {
    id: string;
    email: string;
    name: string;
    status: string;
}) => ({
    id: record.id,
    email: record.email,
    name: record.name,
    status: record.status === 'suspended' ? 'suspended' : 'active'
} as const);

export const createStaffAuthService = (repository: StaffRepository): StaffAuthService => {
    const login = async (input: LoginRequest, ipAddress: string) => {
        const key = `${input.email}:${ipAddress}`;
        const rate = loginLimiter.check(key);
        if (!rate.allowed) {
            throw new HttpError(429, 'rate_limited', 'Too many login attempts');
        }

        const staff = await repository.getStaffByEmail(input.email);
        if (!staff || !verifyPassword(input.password, staff.passwordHash)) {
            throw new HttpError(401, 'invalid_credentials', 'Invalid email or password');
        }

        if (staff.status !== 'active') {
            throw new HttpError(403, 'staff_suspended', 'Staff account is suspended');
        }

        loginLimiter.reset(key);

        const now = Date.now();
        const session = await repository.createSession({
            id: randomUUID(),
            staffId: staff.id,
            createdAt: now,
            expiresAt: now + 1000 * 60 * 60 * 24 * 7
        });

        return {
            staff: mapStaff(staff),
            session: {
                id: session.id,
                staffId: session.staffId,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt
            }
        };
    };

    const getStaffBySession = async (sessionId: string) => {
        const session = await repository.getSession(sessionId);
        if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
            throw new HttpError(401, 'invalid_session', 'Session is invalid');
        }

        const staff = await repository.getStaffById(session.staffId);
        if (!staff) {
            throw new HttpError(401, 'invalid_session', 'Session is invalid');
        }

        return mapStaff(staff);
    };

    const logout = async (sessionId: string) => {
        const session = await repository.getSession(sessionId);
        if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
            throw new HttpError(401, 'invalid_session', 'Session is invalid');
        }

        await repository.revokeSession(sessionId, Date.now());
    };

    const requestPasswordReset = async (input: PasswordResetRequest) => {
        const staff = await repository.getStaffByEmail(input.email);
        if (!staff) {
            return {issued: false};
        }

        const now = Date.now();
        const token = randomUUID();
        const resetToken = await repository.createResetToken({
            id: randomUUID(),
            staffId: staff.id,
            token,
            expiresAt: now + resetTokenTtlMs,
            usedAt: null
        });

        return {
            issued: true,
            resetToken: {
                token: resetToken.token,
                expiresAt: resetToken.expiresAt
            }
        };
    };

    const resetPassword = async (input: PasswordResetConfirmRequest) => {
        const token = await repository.getResetTokenByToken(input.token);
        if (!token || token.usedAt || token.expiresAt <= Date.now()) {
            throw new HttpError(400, 'invalid_reset_token', 'Reset token is invalid or expired');
        }

        const staff = await repository.getStaffById(token.staffId);
        if (!staff) {
            throw new HttpError(400, 'invalid_reset_token', 'Reset token is invalid or expired');
        }

        const now = Date.now();
        await repository.updateStaffPassword(staff.id, hashPassword(input.password), now);
        await repository.markResetTokenUsed(token.id, now);
        await repository.revokeSessionsForStaff(staff.id, now);

        return {
            staffId: staff.id,
            verificationToken: randomUUID()
        };
    };

    const createStaffInvite = async (input: StaffInviteRequest) => {
        const existing = await repository.getStaffByEmail(input.email);
        if (existing) {
            throw new HttpError(409, 'staff_exists', 'Staff already exists');
        }

        const now = Date.now();
        const invite = await repository.createInvite({
            id: randomUUID(),
            email: input.email,
            role: input.role,
            token: randomUUID(),
            createdAt: now,
            expiresAt: now + inviteTtlMs,
            acceptedAt: null
        });

        return {
            invite: {
                id: invite.id,
                email: invite.email,
                role: invite.role,
                token: invite.token,
                expiresAt: invite.expiresAt
            }
        };
    };

    const acceptStaffInvite = async (input: StaffInviteAcceptRequest) => {
        const invite = await repository.getInviteByToken(input.token);
        if (!invite || invite.acceptedAt || invite.expiresAt <= Date.now()) {
            throw new HttpError(400, 'invalid_invite', 'Invite is invalid or expired');
        }

        const existing = await repository.getStaffByEmail(invite.email);
        if (existing) {
            throw new HttpError(409, 'staff_exists', 'Staff already exists');
        }

        const now = Date.now();
        const staffId = randomUUID();
        await repository.createStaff({
            id: staffId,
            email: invite.email,
            name: input.name,
            status: 'active',
            passwordHash: hashPassword(input.password),
            createdAt: now,
            updatedAt: now
        });

        let role = await repository.getRoleByName(invite.role);
        if (!role) {
            role = {id: randomUUID(), name: invite.role};
            await repository.createRole(role);
        }

        await repository.assignRoleToStaff(staffId, role.id);
        await repository.markInviteAccepted(invite.id, now);

        return {staffId};
    };

    const createStaffApiToken = async (staffId: string, input: StaffApiTokenCreateRequest) => {
        const now = Date.now();
        const apiToken = await repository.createStaffApiToken({
            id: randomUUID(),
            staffId,
            name: input.name,
            token: randomUUID(),
            createdAt: now,
            revokedAt: null
        });

        return {
            apiToken: {
                id: apiToken.id,
                staffId: apiToken.staffId,
                name: apiToken.name,
                token: apiToken.token,
                createdAt: apiToken.createdAt,
                revokedAt: apiToken.revokedAt ?? null
            }
        };
    };

    const revokeStaffApiToken = async (staffId: string, tokenId: string) => {
        const token = await repository.getStaffApiTokenById(tokenId);
        if (!token || token.staffId !== staffId || token.revokedAt) {
            throw new HttpError(404, 'staff_api_token_not_found', 'API token not found');
        }

        await repository.revokeStaffApiToken(tokenId, Date.now());
    };

    const createIntegrationToken = async (input: IntegrationTokenCreateRequest) => {
        const now = Date.now();
        const apiToken = await repository.createIntegrationToken({
            id: randomUUID(),
            name: input.name,
            token: randomUUID(),
            createdAt: now,
            revokedAt: null
        });

        return {
            apiToken: {
                id: apiToken.id,
                name: apiToken.name,
                token: apiToken.token,
                createdAt: apiToken.createdAt,
                revokedAt: apiToken.revokedAt ?? null
            }
        };
    };

    const revokeIntegrationToken = async (tokenId: string) => {
        const token = await repository.getIntegrationTokenById(tokenId);
        if (!token || token.revokedAt) {
            throw new HttpError(404, 'integration_token_not_found', 'Integration token not found');
        }

        await repository.revokeIntegrationToken(tokenId, Date.now());
    };

    return {
        login,
        getStaffBySession,
        logout,
        requestPasswordReset,
        resetPassword,
        createStaffInvite,
        acceptStaffInvite,
        createStaffApiToken,
        revokeStaffApiToken,
        createIntegrationToken,
        revokeIntegrationToken
    };
};
