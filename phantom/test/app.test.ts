import {describe, expect, it} from 'vitest';
import {createApp} from '../src/app/app.js';
import type {SiteService} from '../src/modules/site/service.js';
import type {StaffAuthService} from '../src/modules/identity/service.js';
import type {SiteUpdateInput} from '../src/modules/site/contracts.js';
import type {MemberAuthService} from '../src/modules/members/service.js';
import type {PartnerService} from '../src/modules/partners/service.js';
import type {SubscriptionService} from '../src/modules/subscriptions/service.js';
import type {ContentService} from '../src/modules/content/service.js';
import type {NewsletterService} from '../src/modules/newsletters/service.js';
import type {AnalyticsService} from '../src/modules/analytics/service.js';
import type {LinkService} from '../src/modules/links/service.js';
import type {MediaService} from '../src/modules/media/service.js';
import type {WebhookService} from '../src/modules/webhooks/service.js';

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
    loginWithSso: async () => ({
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
    getStaffRoles: async () => ['admin'],
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

const memberAuthService: MemberAuthService = {
    requestMagicLink: async () => ({issued: true, token: 'token'}),
    verifyMagicLink: async () => ({
        member: {
            id: 'member',
            email: 'member@example.com',
            status: 'free',
            createdAt: 1,
            updatedAt: 2
        },
        session: {
            id: 'member-session',
            memberId: 'member',
            createdAt: 1,
            expiresAt: 2
        }
    }),
    verifySession: async () => ({
        member: {
            id: 'member',
            email: 'member@example.com',
            status: 'free',
            createdAt: 1,
            updatedAt: 2
        }
    })
};

const partnerService: PartnerService = {
    createAccessGrant: async () => ({
        grant: {
            id: 'grant',
            orgId: 'org-1',
            scopes: ['posts'],
            expiresAt: 2
        }
    }),
    issuePartnerToken: async () => ({
        token: {
            token: 'partner-token',
            grantId: 'grant',
            subject: 'partner-staff',
            scopes: ['posts'],
            expiresAt: 2
        }
    }),
    validatePartnerToken: async () => ({
        staffId: 'staff',
        orgId: 'org-1',
        scopes: ['posts']
    })
};

const subscriptionService: SubscriptionService = {
    createPlan: async () => ({
        plan: {
            id: 'plan',
            name: 'Pro',
            prices: [
                {id: 'price-month', cadence: 'month', amount: 500, currency: 'USD'},
                {id: 'price-year', cadence: 'year', amount: 5000, currency: 'USD'}
            ]
        }
    }),
    createOffer: async () => ({
        offer: {
            id: 'offer',
            code: 'WELCOME',
            amount: 100,
            currency: 'USD',
            active: true
        }
    }),
    createCheckoutSession: async () => ({
        session: {
            id: 'checkout',
            memberId: 'member',
            priceId: 'price-month',
            url: 'https://payments.example/checkout'
        }
    }),
    confirmCheckoutSession: async () => ({subscriptionId: 'sub'})
};

const contentService: ContentService = {
    createPost: async () => ({
        post: {
            id: 'post',
            title: 'Hello',
            status: 'draft',
            publishedAt: null,
            createdAt: 1,
            updatedAt: 2
        }
    }),
    getPost: async () => ({
        post: {
            id: 'post',
            title: 'Hello',
            status: 'draft',
            publishedAt: null,
            createdAt: 1,
            updatedAt: 2
        }
    }),
    createTag: async () => ({
        tag: {
            id: 'tag',
            name: 'News',
            slug: 'news'
        }
    })
};

const newsletterService: NewsletterService = {
    createNewsletter: async () => ({
        newsletter: {
            id: 'newsletter',
            name: 'Weekly',
            senderEmail: 'hello@example.com',
            createdAt: 1,
            updatedAt: 2
        }
    }),
    createIssue: async () => ({
        issue: {
            id: 'issue',
            newsletterId: 'newsletter',
            subject: 'Update',
            status: 'draft',
            sendAt: null
        }
    })
};

const analyticsService: AnalyticsService = {
    recordEvent: async () => undefined,
    listEvents: async () => ({
        events: [{id: 'event', memberId: 'member', type: 'signup', createdAt: 1}]
    })
};

const linkService: LinkService = {
    createLink: async () => ({
        link: {
            id: 'link',
            url: 'https://example.com',
            createdAt: 1
        }
    }),
    bulkUpdateLinks: async () => ({updated: 1}),
    recordClick: async () => ({recorded: true})
};

const mediaService: MediaService = {
    uploadAsset: async () => ({
        asset: {
            id: 'asset',
            url: 'https://cdn.example/asset.png',
            mimeType: 'image/png',
            size: 10
        }
    }),
    updateStorageConfig: async () => ({
        config: {
            id: 'storage',
            adapter: 's3',
            baseUrl: 'https://cdn.example'
        }
    })
};

const webhookService: WebhookService = {
    createWebhook: async () => ({
        webhook: {
            id: 'webhook',
            integrationId: 'integration',
            event: 'post.published',
            targetUrl: 'https://example.com/webhook'
        }
    }),
    dispatchEvent: async () => ({queued: 1})
};

describe('app routes', () => {
    it('returns health status', async () => {
        const app = createApp({
            siteService,
            staffAuthService,
            memberAuthService,
            partnerService,
            subscriptionService,
            contentService,
            newsletterService,
            analyticsService,
            linkService,
            mediaService,
            webhookService
        });

        const response = await app.request('/health');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({status: 'ok'});
    });

    it('updates site details', async () => {
        const app = createApp({
            siteService,
            staffAuthService,
            memberAuthService,
            partnerService,
            subscriptionService,
            contentService,
            newsletterService,
            analyticsService,
            linkService,
            mediaService,
            webhookService
        });

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
        const app = createApp({
            siteService,
            staffAuthService,
            memberAuthService,
            partnerService,
            subscriptionService,
            contentService,
            newsletterService,
            analyticsService,
            linkService,
            mediaService,
            webhookService
        });

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
