import {serve} from '@hono/node-server';
import {createApp} from './app/app.js';
import {createDb} from './db/client.js';
import {loadConfig} from './platform/config/config.js';
import {createSiteRepository} from './modules/site/repo.js';
import {createSiteService} from './modules/site/service.js';
import {createStaffRepository} from './modules/identity/repo.js';
import {createStaffAuthService} from './modules/identity/service.js';
import {createMemberRepository} from './modules/members/repo.js';
import {createMemberAuthService} from './modules/members/service.js';
import {createPartnerRepository} from './modules/partners/repo.js';
import {createPartnerService} from './modules/partners/service.js';
import {createSubscriptionRepository} from './modules/subscriptions/repo.js';
import {createSubscriptionService} from './modules/subscriptions/service.js';
import {createContentRepository} from './modules/content/repo.js';
import {createContentService} from './modules/content/service.js';
import {createNewsletterRepository} from './modules/newsletters/repo.js';
import {createNewsletterService} from './modules/newsletters/service.js';
import {createAnalyticsRepository} from './modules/analytics/repo.js';
import {createAnalyticsService} from './modules/analytics/service.js';
import {createLinkRepository} from './modules/links/repo.js';
import {createLinkService} from './modules/links/service.js';

const config = loadConfig();
const db = createDb(config.db);
const siteRepository = createSiteRepository(db);
const siteService = createSiteService(siteRepository);
const staffRepository = createStaffRepository(db);
const staffAuthService = createStaffAuthService(staffRepository, {
    ssoProviders: config.identity.ssoProviders
});
const memberRepository = createMemberRepository(db);
const memberAuthService = createMemberAuthService(memberRepository, config.memberAuth.signupPolicy);
const partnerRepository = createPartnerRepository(db);
const partnerService = createPartnerService(partnerRepository, staffRepository);
const subscriptionRepository = createSubscriptionRepository(db);
const subscriptionService = createSubscriptionService(subscriptionRepository, memberRepository);
const contentRepository = createContentRepository(db);
const contentService = createContentService(contentRepository);
const newsletterRepository = createNewsletterRepository(db);
const newsletterService = createNewsletterService(newsletterRepository);
const analyticsRepository = createAnalyticsRepository(db);
const analyticsService = createAnalyticsService(analyticsRepository);
const linkRepository = createLinkRepository(db);
const linkService = createLinkService(linkRepository);

const app = createApp({
    siteService,
    staffAuthService,
    memberAuthService,
    partnerService,
    subscriptionService,
    contentService,
    newsletterService,
    analyticsService,
    linkService
});

serve({
    fetch: app.fetch,
    port: config.port
});
