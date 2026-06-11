import {describe, expect, it} from 'vitest';
import {createPartnerService} from './service.js';
import type {PartnerRepository} from './repo.js';
import type {StaffRepository} from '../identity/repo.js';
import type {StaffRecord} from '../identity/db.js';
import {HttpError} from '../../platform/http/errors.js';

const createPartnerRepository = (): PartnerRepository & {state: () => {tokens: string[]}} => {
    const grants: {id: string; orgId: string; scopes: string; createdAt: number; expiresAt: number; revokedAt: number | null}[] = [];
    const tokens: {id: string; grantId: string; token: string; subject: string; email: string; name: string; createdAt: number; expiresAt: number; revokedAt: number | null}[] = [];
    const orgs: {id: string; name: string}[] = [];

    return {
        getOrgById: async (id) => orgs.find((org) => org.id === id) ?? null,
        createOrg: async (org) => {
            const record = org as {id: string; name: string};
            orgs.push(record);
            return record;
        },
        createGrant: async (grant) => {
            const record = grant as {id: string; orgId: string; scopes: string; createdAt: number; expiresAt: number; revokedAt: number | null};
            grants.push(record);
            return record;
        },
        getGrantById: async (id) => grants.find((grant) => grant.id === id) ?? null,
        revokeGrant: async () => undefined,
        createToken: async (token) => {
            const record = token as {id: string; grantId: string; token: string; subject: string; email: string; name: string; createdAt: number; expiresAt: number; revokedAt: number | null};
            tokens.push(record);
            return record;
        },
        getTokenByValue: async (token) => tokens.find((record) => record.token === token) ?? null,
        revokeToken: async () => undefined,
        createAuditEvent: async (event) => event,
        state: () => ({tokens: tokens.map((record) => record.token)})
    };
};

const createStaffRepository = (): StaffRepository => {
    const staff: StaffRecord[] = [];

    return {
        listStaff: async () => [],
        getStaffByEmail: async (email) => staff.find((record) => record.email === email) ?? null,
        getStaffById: async (id) => staff.find((record) => record.id === id) ?? null,
        createStaff: async (record) => {
            staff.push(record as StaffRecord);
            return record as StaffRecord;
        },
        updateStaffPassword: async () => undefined,
        updateStaffAccessibility: async () => undefined,
        createSession: async () => {
            throw new Error('Not implemented');
        },
        getSession: async () => {
            throw new Error('Not implemented');
        },
        revokeSession: async () => undefined,
        revokeSessionsForStaff: async () => undefined,
        createResetToken: async () => {
            throw new Error('Not implemented');
        },
        getResetTokenByToken: async () => {
            throw new Error('Not implemented');
        },
        markResetTokenUsed: async () => undefined,
        createInvite: async () => {
            throw new Error('Not implemented');
        },
        getInviteByToken: async () => {
            throw new Error('Not implemented');
        },
        markInviteAccepted: async () => undefined,
        getRoleByName: async () => null,
        createRole: async () => undefined,
        assignRoleToStaff: async () => undefined,
        getRolesForStaff: async () => [],
        createStaffApiToken: async () => {
            throw new Error('Not implemented');
        },
        getStaffApiTokenById: async () => {
            throw new Error('Not implemented');
        },
        getStaffApiTokenByToken: async () => {
            throw new Error('Not implemented');
        },
        revokeStaffApiToken: async () => undefined,
        createIntegrationToken: async () => {
            throw new Error('Not implemented');
        },
        getIntegrationTokenById: async () => {
            throw new Error('Not implemented');
        },
        getIntegrationTokenByToken: async () => {
            throw new Error('Not implemented');
        },
        revokeIntegrationToken: async () => undefined,
        createStaffAuthEvent: async () => {
            throw new Error('Not implemented');
        },
        createAuthFactor: async () => {
            throw new Error('Not implemented');
        },
        getAuthFactorByToken: async () => {
            throw new Error('Not implemented');
        },
        invalidateAuthFactors: async () => undefined,
        markAuthFactorUsed: async () => undefined,
        listStaffAuthEvents: async () => [],
        cleanupResetTokens: async () => 0,
        cleanupAuthFactors: async () => 0
    };
};

describe('partner service', () => {
    it('issues tokens for access grants', async () => {
        const partnerRepository = createPartnerRepository();
        const staffRepository = createStaffRepository();
        const service = createPartnerService(partnerRepository, staffRepository);

        const grant = await service.createAccessGrant({orgId: 'org-1', scopes: ['posts'], ttlHours: 1});
        const token = await service.issuePartnerToken({
            grantId: grant.grant.id,
            subject: 'partner-staff',
            email: 'partner@example.com',
            name: 'Partner',
            ttlHours: 1
        });

        expect(token.token.token).toBeTruthy();
        expect(partnerRepository.state().tokens.length).toBe(1);
    });

    it('validates partner tokens and scopes', async () => {
        const partnerRepository = createPartnerRepository();
        const staffRepository = createStaffRepository();
        const service = createPartnerService(partnerRepository, staffRepository);

        const grant = await service.createAccessGrant({orgId: 'org-1', scopes: ['posts'], ttlHours: 1});
        const token = await service.issuePartnerToken({
            grantId: grant.grant.id,
            subject: 'partner-staff',
            email: 'partner@example.com',
            name: 'Partner',
            ttlHours: 1
        });

        const validated = await service.validatePartnerToken({token: token.token.token, requiredScopes: ['posts']});

        expect(validated.orgId).toBe('org-1');
        expect(validated.scopes).toContain('posts');
    });

    it('rejects scope mismatches', async () => {
        const partnerRepository = createPartnerRepository();
        const staffRepository = createStaffRepository();
        const service = createPartnerService(partnerRepository, staffRepository);

        const grant = await service.createAccessGrant({orgId: 'org-1', scopes: ['posts'], ttlHours: 1});
        const token = await service.issuePartnerToken({
            grantId: grant.grant.id,
            subject: 'partner-staff',
            email: 'partner@example.com',
            name: 'Partner',
            ttlHours: 1
        });

        let error: HttpError | null = null;

        try {
            await service.validatePartnerToken({token: token.token.token, requiredScopes: ['settings']});
        } catch (caught) {
            if (caught instanceof HttpError) {
                error = caught;
            }
        }

        expect(error?.status).toBe(403);
    });
});
