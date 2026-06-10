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
import type {SettingsService} from '../src/modules/settings/service.js';
import type {NotificationService} from '../src/modules/notifications/service.js';
import type {JobsService} from '../src/modules/jobs/service.js';
import type {OperationsService} from '../src/modules/operations/service.js';
import type {BillingService} from '../src/modules/billing/service.js';
import type {ExtensionsService} from '../src/modules/extensions/service.js';
import type {CommentService} from '../src/modules/comments/service.js';
import type {MetricsClient} from '../src/platform/metrics/client.js';
import type {AppConfig} from '../src/platform/config/config.js';

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

const config: AppConfig = {
    port: 2369,
    db: {url: 'file:./ghost.db'},
    identity: {ssoProviders: []},
    memberAuth: {signupPolicy: 'open'},
    queue: {provider: 'memory'},
    themes: {
        provider: 'fs',
        fs: {root: './content/themes'},
        r2: {
            baseUrl: null,
            bundlePath: 'themes/{themeId}/bundle.mjs',
            assetPath: 'themes/{themeId}/assets/{path}'
        }
    }
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
    getIntegrationTokenByToken: async () => ({
        id: 'integration-token',
        name: 'Zapier',
        token: 'token-value',
        createdAt: 1,
        revokedAt: null
    }),
    listAuditEvents: async () => ({events: [], nextCursor: null, remaining: 0}),
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
            slug: 'hello',
            status: 'draft',
            lexical: {},
            visibility: 'public',
            customExcerpt: null,
            featureImage: null,
            featureImageAlt: null,
            featureImageCaption: null,
            publishedAt: null,
            createdAt: 1,
            updatedAt: 2
        }
    }),
    getPost: async () => ({
        post: {
            id: 'post',
            title: 'Hello',
            slug: 'hello',
            status: 'draft',
            lexical: {},
            visibility: 'public',
            customExcerpt: null,
            featureImage: null,
            featureImageAlt: null,
            featureImageCaption: null,
            publishedAt: null,
            createdAt: 1,
            updatedAt: 2
        }
    }),
    getPostBySlug: async () => ({
        post: {
            id: 'post',
            title: 'Hello',
            slug: 'hello',
            status: 'draft',
            lexical: {},
            visibility: 'public',
            customExcerpt: null,
            featureImage: null,
            featureImageAlt: null,
            featureImageCaption: null,
            publishedAt: null,
            createdAt: 1,
            updatedAt: 2
        }
    }),
    listPublishedPosts: async () => ({
        posts: [{
            id: 'post',
            title: 'Hello',
            slug: 'hello',
            status: 'published',
            lexical: {},
            visibility: 'public',
            customExcerpt: null,
            featureImage: null,
            featureImageAlt: null,
            featureImageCaption: null,
            publishedAt: null,
            createdAt: 1,
            updatedAt: 2
        }],
        pagination: {page: 1, limit: 10, pages: 1, total: 1}
    }),
    createTag: async () => ({
        tag: {
            id: 'tag',
            name: 'News',
            slug: 'news'
        }
    }),
    updatePost: async () => ({
        post: {
            id: 'post',
            title: 'Hello',
            slug: 'hello',
            status: 'draft',
            lexical: {},
            visibility: 'public',
            customExcerpt: null,
            featureImage: null,
            featureImageAlt: null,
            featureImageCaption: null,
            publishedAt: null,
            createdAt: 1,
            updatedAt: 2
        }
    }),
    deletePost: async () => {},
    createCollection: async () => ({collection: {id: 'collection', name: 'Home', slug: 'home', filter: ''}}),
    listCollections: async () => ({collections: []}),
    createAuthorProfile: async () => ({author: {id: 'author', name: 'Author', slug: 'author', bio: null}}),
    listAuthorProfiles: async () => ({authors: []})
};

const newsletterService = {
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
    }),
    recordDeliveryStatus: async () => ({
        issue: {
            id: 'issue',
            newsletterId: 'newsletter',
            subject: 'Update',
            status: 'draft',
            sendAt: null
        }
    }),
    createSuppression: async () => ({suppression: {id: 'suppression', email: 'blocked@example.com', reason: 'manual', createdAt: 1}}),
    deleteSuppression: async () => {},
    queueAutomatedEmail: async () => ({queued: true}),
    sendIssue: async () => ({queued: 1}),
    retryBatch: async () => ({queued: 1})
} as unknown as NewsletterService;

const analyticsService = {
    recordEvent: async () => undefined,
    listEvents: async () => ({
        events: [{id: 'event', memberId: 'member', type: 'signup', createdAt: 1}],
        nextCursor: null,
        remaining: 0
    })
} as unknown as AnalyticsService;

const linkService = {
    createLink: async () => ({
        link: {
            id: 'link',
            url: 'https://example.com',
            createdAt: 1
        }
    }),
    bulkUpdateLinks: async () => ({updated: 1, results: []}),
    recordClick: async () => ({recorded: true})
} as unknown as LinkService;

const mediaService = {
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
    }),
    rewriteLexicalUrls: async () => ({lexical: {}})
} as unknown as MediaService;

const webhookService = {
    createWebhook: async () => ({
        webhook: {
            id: 'webhook',
            integrationId: 'integration',
            event: 'post.published',
            targetUrl: 'https://example.com/webhook'
        }
    }),
    listWebhooks: async () => ({webhooks: []}),
    updateWebhook: async () => ({
        webhook: {
            id: 'webhook',
            integrationId: 'integration',
            event: 'post.published',
            targetUrl: 'https://example.com/webhook'
        }
    }),
    deleteWebhook: async () => {},
    dispatchEvent: async () => ({queued: 1}),
    markDispatchFailed: async () => {},
    markDispatchSucceeded: async () => {}
} as unknown as WebhookService;

const settingsService = {
    listSettings: async () => ({settings: []}),
    updateSettings: async () => ({settings: []}),
    migrateSettingsToMetafields: async () => ({migration: {version: '0', direction: 'forward', createdAt: 0, rolledBackAt: null}}),
    rollbackMetafieldMigration: async () => ({migration: {version: '0', direction: 'rollback', createdAt: 0, rolledBackAt: 0}}),
    registerSettingsMigration: async () => ({migration: {id: '0', group: 'theme', createdAt: 0}}),
    listCustomObjects: async () => ({customObjects: []}),
    createCustomObject: async () => ({customObject: {id: '0', name: 'obj', slug: 'obj', fields: [], createdAt: 0, updatedAt: 0}}),
    updateCustomObject: async () => ({customObject: {id: '0', name: 'obj', slug: 'obj', fields: [], createdAt: 0, updatedAt: 0}}),
    getCustomObject: async () => ({customObject: {id: '0', name: 'obj', slug: 'obj', fields: [], createdAt: 0, updatedAt: 0}}),
    deleteCustomObject: async () => {},
    listCustomObjectRecords: async () => ({records: []}),
    createCustomObjectRecord: async () => ({record: {id: '0', objectId: '0', data: {}, createdAt: 0, updatedAt: 0}}),
    updateCustomObjectRecord: async () => ({record: {id: '0', objectId: '0', data: {}, createdAt: 0, updatedAt: 0}}),
    getCustomObjectRecord: async () => ({record: {id: '0', objectId: '0', data: {}, createdAt: 0, updatedAt: 0}}),
    deleteCustomObjectRecord: async () => {}
} as unknown as SettingsService;

const notificationService = {listNotifications: async () => ({notifications: []})} as unknown as NotificationService;
const jobsService = {listJobs: async () => ({jobs: [], queueDepth: 0})} as unknown as JobsService;
const operationsService = {updateCheck: async () => ({version: '0.0.0', updatedAt: 0})} as unknown as OperationsService;
const billingService = {listPrices: async () => ({prices: []})} as unknown as BillingService;
const extensionsService = {listExtensions: async () => ({extensions: []})} as unknown as ExtensionsService;
const commentService = {listComments: async () => ({comments: []})} as unknown as CommentService;
const metricsClient = {isEnabled: () => false, render: () => ''} as unknown as MetricsClient;

describe('app routes', () => {
    it('returns health status', async () => {
        const app = createApp({
            config,
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
            webhookService,
            settingsService,
            notificationService,
            jobsService,
            operationsService,
            billingService,
            extensionsService,
            commentService,
            metricsClient
        });

        const response = await app.request('/ghost/api/health');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual({status: 'ok'});
    });

    it('updates site details', async () => {
        const app = createApp({
            config,
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
            webhookService,
            settingsService,
            notificationService,
            jobsService,
            operationsService,
            billingService,
            extensionsService,
            commentService,
            metricsClient
        });

        const response = await app.request('/ghost/api/site', {
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
            config,
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
            webhookService,
            settingsService,
            notificationService,
            jobsService,
            operationsService,
            billingService,
            extensionsService,
            commentService,
            metricsClient
        });

        const response = await app.request('/ghost/api/site', {
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
