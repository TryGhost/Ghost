import {serve} from '@hono/node-server';
import {createApp} from './app/app.js';
import {createDb} from './db/client.js';
import {loadConfig} from './platform/config/config.js';
import {createSiteRepository} from './modules/site/repo/site.repo.js';
import {createSiteService} from './modules/site/service/site.service.js';

const config = loadConfig();
const db = createDb(config.db);
const siteRepository = createSiteRepository(db);
const siteService = createSiteService(siteRepository);

const app = createApp({
    siteService
});

serve({
    fetch: app.fetch,
    port: config.port
});
