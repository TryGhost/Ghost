import {randomUUID} from 'node:crypto';
import type {
    LoginRequest,
    LoginResponse,
    PasswordResetConfirmRequest,
    PasswordResetConfirmResponse,
    PasswordResetRequest,
    PasswordResetResponse,
    SsoLoginRequest,
    StaffInviteAcceptRequest,
    StaffInviteAcceptResponse,
    StaffInviteRequest,
    StaffInviteResponse,
    StaffApiTokenCreateRequest,
    StaffApiTokenCreateResponse,
    IntegrationTokenCreateRequest,
    IntegrationTokenCreateResponse,
    StaffResponse,
    StaffSessionResponse,
    StaffAuditListRequest,
    StaffAuditListResponse,
    StaffVerificationRequest,
    StaffVerificationResponse
} from './contracts.js';
import type {StaffRepository} from './repo.js';
import {
    toIntegrationTokenResponse,
    toStaffApiTokenResponse,
    toStaffInviteResponse,
    toStaffResponse,
    toStaffSessionResponse,
    toVerificationResponse
} from './mappers.js';
import {hashPassword, verifyPassword} from '../../platform/auth/passwords.js';
import {createRateLimiter} from '../../platform/auth/rate-limiter.js';
import {HttpError} from '../../platform/http/errors.js';

export type StaffAuthService = {
    login: (input: LoginRequest, ipAddress: string) => Promise<LoginResponse>;
    loginWithSso: (input: SsoLoginRequest, ipAddress: string) => Promise<LoginResponse>;
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
    getIntegrationTokenByToken: (token: string) => Promise<IntegrationTokenCreateResponse['apiToken']>;
    verifyStaffAuthFactor: (input: StaffVerificationRequest) => Promise<StaffVerificationResponse>;
    getStaffRoles: (staffId: string) => Promise<string[]>;
    listAuditEvents: (input: StaffAuditListRequest) => Promise<StaffAuditListResponse>;
};

const loginLimiter = createRateLimiter(5, 5 * 60 * 1000);
const resetTokenTtlMs = 1000 * 60 * 60;
const inviteTtlMs = 1000 * 60 * 60 * 24 * 7;

const createAuthEvent = async (repository: StaffRepository, input: {
    staffId: string;
    action: string;
    outcome: string;
    ipAddress?: string | null;
    deviceId?: string | null;
}) => {
    await repository.createStaffAuthEvent({
        id: randomUUID(),
        staffId: input.staffId,
        action: input.action,
        outcome: input.outcome,
        ipAddress: input.ipAddress ?? null,
        deviceId: input.deviceId ?? null,
        createdAt: Date.now()
    });
};

export const createStaffAuthService = (
    repository: StaffRepository,
    options: {ssoProviders?: string[]} = {}
): StaffAuthService => {
    const ssoProviders = options.ssoProviders ?? [];

    const validateSsoProvider = (provider: string, providers: string[]) => {
        if (!providers.includes(provider)) {
            throw new HttpError(401, 'invalid_sso', 'SSO provider is not configured');
        }
    };

    const login = async (input: LoginRequest, ipAddress: string) => {
        const key = `${input.email}:${ipAddress}`;
        const rate = loginLimiter.check(key);
        if (!rate.allowed) {
            throw new HttpError(429, 'rate_limited', 'Too many login attempts');
        }

        const staff = await repository.getStaffByEmail(input.email);
        if (!staff || !verifyPassword(input.password, staff.passwordHash)) {
            if (staff) {
                await createAuthEvent(repository, {
                    staffId: staff.id,
                    action: 'login',
                    outcome: 'failed',
                    ipAddress
                });
            }
            throw new HttpError(401, 'invalid_credentials', 'Invalid email or password');
        }

        if (staff.status !== 'active') {
            await createAuthEvent(repository, {
                staffId: staff.id,
                action: 'login',
                outcome: 'blocked',
                ipAddress
            });
            throw new HttpError(403, 'staff_suspended', 'Staff account is suspended');
        }

        loginLimiter.reset(key);

        if (staff.twoFactorEnabled === 1) {
            const now = Date.now();
            await repository.invalidateAuthFactors(staff.id, 'device', now);
            const authFactor = await repository.createAuthFactor({
                id: randomUUID(),
                staffId: staff.id,
                type: 'device',
                token: randomUUID(),
                createdAt: now,
                expiresAt: now + resetTokenTtlMs,
                usedAt: null,
                invalidatedAt: null
            });

            await createAuthEvent(repository, {
                staffId: staff.id,
                action: 'verification_issued',
                outcome: 'success',
                ipAddress
            });

            return {
                staff: toStaffResponse(staff),
                verification: toVerificationResponse(authFactor)
            };
        }

        const now = Date.now();
        const session = await repository.createSession({
            id: randomUUID(),
            staffId: staff.id,
            createdAt: now,
            expiresAt: now + 1000 * 60 * 60 * 24 * 7
        });

        await createAuthEvent(repository, {
            staffId: staff.id,
            action: 'login',
            outcome: 'success',
            ipAddress
        });

        return {
            staff: toStaffResponse(staff),
            session: toStaffSessionResponse(session)
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

        return toStaffResponse(staff);
    };

    const logout = async (sessionId: string) => {
        const session = await repository.getSession(sessionId);
        if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
            throw new HttpError(401, 'invalid_session', 'Session is invalid');
        }

        await repository.revokeSession(sessionId, Date.now());

        await createAuthEvent(repository, {
            staffId: session.staffId,
            action: 'logout',
            outcome: 'success'
        });
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

        await createAuthEvent(repository, {
            staffId: staff.id,
            action: 'reset_requested',
            outcome: 'success'
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

        await createAuthEvent(repository, {
            staffId: staff.id,
            action: 'reset_completed',
            outcome: 'success'
        });

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
            invite: toStaffInviteResponse(invite)
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
            twoFactorEnabled: 0,
            externalSubjectId: null,
            externallyManaged: 0,
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
                ...toStaffApiTokenResponse(apiToken),
                token: apiToken.token
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
                ...toIntegrationTokenResponse(apiToken),
                token: apiToken.token
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

    const getIntegrationTokenByToken = async (token: string) => {
        const apiToken = await repository.getIntegrationTokenByToken(token);
        if (!apiToken || apiToken.revokedAt) {
            throw new HttpError(401, 'invalid_integration_token', 'Integration token is invalid');
        }

        return {
            ...toIntegrationTokenResponse(apiToken),
            token: apiToken.token
        };
    };

    const verifyStaffAuthFactor = async (input: StaffVerificationRequest) => {
        const authFactor = await repository.getAuthFactorByToken(input.token);
        if (!authFactor || authFactor.usedAt || authFactor.invalidatedAt || authFactor.expiresAt <= Date.now()) {
            throw new HttpError(400, 'invalid_verification', 'Verification token is invalid or expired');
        }

        const staff = await repository.getStaffById(authFactor.staffId);
        if (!staff) {
            throw new HttpError(400, 'invalid_verification', 'Verification token is invalid or expired');
        }

        const now = Date.now();
        const session = await repository.createSession({
            id: randomUUID(),
            staffId: staff.id,
            createdAt: now,
            expiresAt: now + 1000 * 60 * 60 * 24 * 7
        });

        await repository.markAuthFactorUsed(authFactor.id, now);
        await createAuthEvent(repository, {
            staffId: staff.id,
            action: 'verification_completed',
            outcome: 'success'
        });

        return {
            staff: toStaffResponse(staff),
            session: toStaffSessionResponse(session)
        };
    };

    const getStaffRoles = async (staffId: string) => {
        return repository.getRolesForStaff(staffId);
    };

    const listAuditEvents = async (input: StaffAuditListRequest) => {
        const filters: Parameters<StaffRepository['listStaffAuthEvents']>[0] = {
            limit: input.limit
        };
        if (input.staffId) {
            filters.staffId = input.staffId;
        }
        if (input.from !== undefined) {
            filters.from = input.from;
        }
        if (input.to !== undefined) {
            filters.to = input.to;
        }
        if (input.cursor !== undefined) {
            filters.cursor = input.cursor;
        }

        const events = await repository.listStaffAuthEvents(filters);
        const nextCursor = events.length > 0 ? events[events.length - 1]?.createdAt ?? null : null;
        return {
            events: events.map((event) => ({
                id: event.id,
                staffId: event.staffId,
                action: event.action,
                outcome: event.outcome,
                ipAddress: event.ipAddress ?? null,
                deviceId: event.deviceId ?? null,
                createdAt: event.createdAt
            })),
            nextCursor
        };
    };

    const loginWithSso = async (input: SsoLoginRequest, ipAddress: string) => {
        validateSsoProvider(input.provider, ssoProviders);

        const staff = await repository.getStaffByEmail(input.email);
        if (!staff) {
            throw new HttpError(401, 'invalid_sso', 'SSO user is not recognized');
        }

        if (staff.status !== 'active') {
            throw new HttpError(403, 'staff_suspended', 'Staff account is suspended');
        }

        if (staff.twoFactorEnabled === 1) {
            const now = Date.now();
            await repository.invalidateAuthFactors(staff.id, 'device', now);
            const authFactor = await repository.createAuthFactor({
                id: randomUUID(),
                staffId: staff.id,
                type: 'device',
                token: randomUUID(),
                createdAt: now,
                expiresAt: now + resetTokenTtlMs,
                usedAt: null,
                invalidatedAt: null
            });

            await createAuthEvent(repository, {
                staffId: staff.id,
                action: 'verification_issued',
                outcome: 'success',
                ipAddress
            });

            return {
                staff: toStaffResponse(staff),
                verification: toVerificationResponse(authFactor)
            };
        }

        const now = Date.now();
        const session = await repository.createSession({
            id: randomUUID(),
            staffId: staff.id,
            createdAt: now,
            expiresAt: now + 1000 * 60 * 60 * 24 * 7
        });

        await createAuthEvent(repository, {
            staffId: staff.id,
            action: 'sso_login',
            outcome: 'success',
            ipAddress
        });

        return {
            staff: toStaffResponse(staff),
            session: toStaffSessionResponse(session)
        };
    };

    return {
        login,
        loginWithSso,
        getStaffBySession,
        logout,
        requestPasswordReset,
        resetPassword,
        createStaffInvite,
        acceptStaffInvite,
        createStaffApiToken,
        revokeStaffApiToken,
        createIntegrationToken,
        revokeIntegrationToken,
        getIntegrationTokenByToken,
        verifyStaffAuthFactor,
        getStaffRoles,
        listAuditEvents
    };
};
