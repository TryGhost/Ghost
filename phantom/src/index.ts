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

const app = createApp({
    siteService,
    staffAuthService,
    memberAuthService
});

serve({
    fetch: app.fetch,
    port: config.port
});
