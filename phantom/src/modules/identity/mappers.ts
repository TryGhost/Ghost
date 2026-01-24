import type {
    IntegrationTokenRecord,
    StaffApiTokenRecord,
    StaffAuthFactorRecord,
    StaffInviteRecord,
    StaffRecord,
    StaffSessionRecord
} from './db.js';

export const toStaffResponse = (record: StaffRecord) => ({
    id: record.id,
    email: record.email,
    name: record.name,
    status: record.status === 'suspended' ? 'suspended' : 'active'
} as const);

export const toStaffSessionResponse = (session: StaffSessionRecord) => ({
    id: session.id,
    staffId: session.staffId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt
});

export const toVerificationResponse = (factor: StaffAuthFactorRecord) => ({
    token: factor.token,
    type: factor.type === 'device' ? 'device' : 'device',
    expiresAt: factor.expiresAt
} as const);

export const toStaffInviteResponse = (invite: StaffInviteRecord) => ({
    id: invite.id,
    email: invite.email,
    role: invite.role,
    token: invite.token,
    expiresAt: invite.expiresAt
});

export const toStaffApiTokenResponse = (token: StaffApiTokenRecord) => ({
    id: token.id,
    staffId: token.staffId,
    name: token.name,
    createdAt: token.createdAt,
    revokedAt: token.revokedAt ?? null
});

export const toIntegrationTokenResponse = (token: IntegrationTokenRecord) => ({
    id: token.id,
    name: token.name,
    createdAt: token.createdAt,
    revokedAt: token.revokedAt ?? null
});
