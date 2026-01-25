import {randomUUID} from 'node:crypto';
import type {StaffRepository} from '../identity/repo.js';
import type {StaffResponse} from '../identity/contracts.js';
import type {
    AccessGrantRequest,
    AccessGrantResponse,
    PartnerTokenRequest,
    PartnerTokenResponse,
    PartnerValidateRequest,
    PartnerValidateResponse
} from './contracts.js';
import type {PartnerRepository} from './repo.js';
import {HttpError} from '../../platform/http/errors.js';

export type PartnerService = {
    createAccessGrant: (input: AccessGrantRequest) => Promise<AccessGrantResponse>;
    issuePartnerToken: (input: PartnerTokenRequest) => Promise<PartnerTokenResponse>;
    validatePartnerToken: (input: PartnerValidateRequest) => Promise<PartnerValidateResponse>;
};

const splitScopes = (scopes: string) => scopes.split(',').map((scope) => scope.trim()).filter(Boolean);
const joinScopes = (scopes: string[]) => scopes.join(',');

const ensureOrg = async (repository: PartnerRepository, orgId: string) => {
    const org = await repository.getOrgById(orgId);
    if (org) {
        return org;
    }

    return repository.createOrg({id: orgId, name: orgId});
};

const ensurePartnerStaff = async (repository: StaffRepository, input: {
    subject: string;
    email: string;
    name: string;
}): Promise<StaffResponse> => {
    const existing = await repository.getStaffByEmail(input.email);
    if (existing) {
        return {
            id: existing.id,
            email: existing.email,
            name: existing.name,
            status: existing.status === 'suspended' ? 'suspended' : 'active'
        };
    }

    const now = Date.now();
    const staff = await repository.createStaff({
        id: randomUUID(),
        email: input.email,
        name: input.name,
        status: 'active',
        passwordHash: 'external',
        twoFactorEnabled: 0,
        externalSubjectId: input.subject,
        externallyManaged: 1,
        createdAt: now,
        updatedAt: now
    });

    return {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        status: staff.status === 'suspended' ? 'suspended' : 'active'
    };
};

export const createPartnerService = (repository: PartnerRepository, staffRepository: StaffRepository): PartnerService => {
    const createAccessGrant = async (input: AccessGrantRequest) => {
        await ensureOrg(repository, input.orgId);
        const now = Date.now();
        const expiresAt = now + input.ttlHours * 60 * 60 * 1000;
        const grant = await repository.createGrant({
            id: randomUUID(),
            orgId: input.orgId,
            scopes: joinScopes(input.scopes),
            createdAt: now,
            expiresAt,
            revokedAt: null
        });

        return {
            grant: {
                id: grant.id,
                orgId: grant.orgId,
                scopes: splitScopes(grant.scopes),
                expiresAt: grant.expiresAt
            }
        };
    };

    const issuePartnerToken = async (input: PartnerTokenRequest) => {
        const grant = await repository.getGrantById(input.grantId);
        if (!grant || grant.revokedAt || grant.expiresAt <= Date.now()) {
            throw new HttpError(400, 'invalid_grant', 'Access grant is invalid or expired');
        }

        const now = Date.now();
        const token = await repository.createToken({
            id: randomUUID(),
            grantId: grant.id,
            subject: input.subject,
            email: input.email,
            name: input.name,
            token: randomUUID(),
            createdAt: now,
            expiresAt: now + input.ttlHours * 60 * 60 * 1000,
            revokedAt: null
        });

        return {
            token: {
                token: token.token,
                grantId: token.grantId,
                subject: token.subject,
                scopes: splitScopes(grant.scopes),
                expiresAt: token.expiresAt
            }
        };
    };

    const validatePartnerToken = async (input: PartnerValidateRequest) => {
        const token = await repository.getTokenByValue(input.token);
        if (!token || token.revokedAt || token.expiresAt <= Date.now()) {
            throw new HttpError(401, 'invalid_partner_token', 'Partner token is invalid or expired');
        }

        const grant = await repository.getGrantById(token.grantId);
        if (!grant || grant.revokedAt || grant.expiresAt <= Date.now()) {
            throw new HttpError(403, 'invalid_grant', 'Access grant is invalid or expired');
        }

        const scopes = splitScopes(grant.scopes);
        if (input.requiredScopes && input.requiredScopes.some((scope) => !scopes.includes(scope))) {
            throw new HttpError(403, 'scope_mismatch', 'Partner token missing required scope');
        }

        const staff = await ensurePartnerStaff(staffRepository, {
            subject: token.subject,
            email: token.email,
            name: token.name
        });

        return {
            staffId: staff.id,
            orgId: grant.orgId,
            scopes
        };
    };

    return {
        createAccessGrant,
        issuePartnerToken,
        validatePartnerToken
    };
};
