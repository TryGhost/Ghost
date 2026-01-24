import {describe, expect, it} from 'vitest';
import {createApp} from '../src/app/app.js';
import type {SiteService} from '../src/modules/site/service.js';
import type {StaffAuthService} from '../src/modules/identity/service.js';
import type {SiteUpdateInput} from '../src/modules/site/contracts.js';

const siteService: SiteService = {
    getSite: async () => ({
        id: 'site',
        title: 'Ghost',
        description: null,
        locale: 'en',
        createdAt: 1,
        updatedAt: 1
    }),
    updateSite: async (input: SiteUpdateInput) => ({
        id: 'site',
        title: input.title ?? 'Ghost',
        description: input.description ?? null,
        locale: input.locale ?? 'en',
        createdAt: 1,
        updatedAt: 2
    })
};

const staffAuthService: StaffAuthService = {
    login: async () => ({
        staff: {id: 'staff', email: 'jamie@example.com', name: 'Jamie', status: 'active'},
        session: {id: 'session', staffId: 'staff', createdAt: 1, expiresAt: 2}
    }),
    getStaffBySession: async () => ({
        id: 'staff',
        email: 'jamie@example.com',
        name: 'Jamie',
        status: 'active'
    }),
    logout: async () => undefined,
    requestPasswordReset: async () => ({issued: true}),
    resetPassword: async () => ({staffId: 'staff', verificationToken: 'verification'}),
    createStaffInvite: async () => ({
        invite: {
            id: 'invite',
            email: 'new@example.com',
            role: 'editor',
            token: 'invite-token',
            expiresAt: 2
        }
    }),
    acceptStaffInvite: async () => ({staffId: 'staff-2'}),
    createStaffApiToken: async () => ({
        apiToken: {
            id: 'token',
            staffId: 'staff',
            name: 'CLI',
            token: 'token-value',
            createdAt: 1,
            revokedAt: null
        }
    }),
    revokeStaffApiToken: async () => undefined,
    createIntegrationToken: async () => ({
        apiToken: {
            id: 'integration-token',
            name: 'Zapier',
            token: 'token-value',
            createdAt: 1,
            revokedAt: null
        }
    }),
    revokeIntegrationToken: async () => undefined,
    verifyStaffAuthFactor: async () => ({
        staff: {
            id: 'staff',
            email: 'jamie@example.com',
            name: 'Jamie',
            status: 'active'
        },
        session: {id: 'session', staffId: 'staff', createdAt: 1, expiresAt: 2}
    })
};

describe('app routes', () => {
    it('returns health status', async () => {
        const app = createApp({siteService, staffAuthService});

        const response = await app.request('/health');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({status: 'ok'});
    });

    it('updates site details', async () => {
        const app = createApp({siteService, staffAuthService});

        const response = await app.request('/site', {
            method: 'PUT',
            headers: {
                authorization: 'Bearer session',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                title: 'Ghost Daily',
                locale: 'en-us'
            })
        });

        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body.site.title).toBe('Ghost Daily');
        expect(body.site.locale).toBe('en-us');
    });

    it('returns validation errors for invalid updates', async () => {
        const app = createApp({siteService, staffAuthService});

        const response = await app.request('/site', {
            method: 'PUT',
            headers: {
                authorization: 'Bearer session',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                title: ''
            })
        });

        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.error).toBe('validation_error');
    });
});
