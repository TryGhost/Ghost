import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {beforeAll, describe, expect, it} from 'vitest';
import {createClient} from '@libsql/client';
import {drizzle} from 'drizzle-orm/libsql';
import {Hono} from 'hono';
import {ensureCoreSchema} from '../../src/db/ddl.js';
import {createGhostImporter} from '../../src/modules/operations/importer.js';
import {createContentRepository} from '../../src/modules/content/repo.js';
import {createFrontendContentReader} from '../../src/modules/content/frontend-reader.js';
import {createSettingsRepository} from '../../src/modules/settings/repo.js';
import {createSettingsService} from '../../src/modules/settings/service.js';
import {createFrontendRouter} from '../../src/frontend/router.js';
import type {AppConfig} from '../../src/platform/config/config.js';

const fixturePath = path.resolve(__dirname, '../fixtures/ghost-v5-export.json');
const themesRoot = path.resolve(__dirname, '../../content/themes');

// Renders the REAL `source` theme bundle against REALLY imported fixture
// content: the same path a migrated Ghost site takes.
describe('theme rendering with imported content', () => {
    let app: Hono;

    beforeAll(async () => {
        const db = drizzle(createClient({url: ':memory:'}));
        await ensureCoreSchema(db);
        await createGhostImporter(db).importExport(
            JSON.parse(await readFile(fixturePath, 'utf8'))
        );

        const config: AppConfig = {
            port: 2369,
            db: {url: ':memory:'},
            identity: {ssoProviders: []},
            memberAuth: {signupPolicy: 'open'},
            queue: {provider: 'memory'},
            themes: {
                provider: 'fs',
                fs: {root: themesRoot},
                r2: {
                    baseUrl: null,
                    bundlePath: 'themes/{themeId}/bundle.mjs',
                    assetPath: 'themes/{themeId}/assets/{path}'
                }
            }
        };

        const contentReader = createFrontendContentReader(createContentRepository(db));
        const settingsService = createSettingsService(createSettingsRepository(db));

        app = new Hono();
        app.route('/', createFrontendRouter({config, contentReader, settingsService}));
    });

    it('renders the home collection with imported site identity and posts', async () => {
        const response = await app.request('/');
        expect(response.status).toBe(200);
        const html = await response.text();

        expect(html).toContain('Testing Export Fixtures');
        expect(html).toContain('Coming soon');
        expect(html).toContain('/coming-soon/');
        // Imported navigation labels rendered by the {{navigation}} helper.
        expect(html).toContain('Home');
        expect(html).toContain('About');
        // Imported accent color flows through ghost_head.
        expect(html).toContain('#FF1A75');
    });

    it('renders a post entry with content, author and tag from the import', async () => {
        const response = await app.request('/coming-soon/');
        expect(response.status).toBe(200);
        const html = await response.text();

        expect(html).toContain('Coming soon');
        // The post body came through mobiledoc→lexical html preservation.
        expect(html).toContain('subscribe');
        expect(html).toContain('Fixture Ghosty');
        expect(html).toContain('News');
        // Published date is rendered (22 Jul 2025 in some format).
        expect(html).toMatch(/2025/);
    });

    it('renders pages with the page context', async () => {
        const response = await app.request('/about/');
        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain('About this site');
    });

    it('renders tag archives listing tagged posts', async () => {
        const response = await app.request('/tag/news/');
        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain('News');
        expect(html).toContain('Coming soon');
        expect(html).not.toContain('About this site');
    });

    it('renders author archives listing the author posts', async () => {
        const response = await app.request('/author/fixture/');
        expect(response.status).toBe(200);
        const html = await response.text();
        expect(html).toContain('Fixture Ghosty');
        expect(html).toContain('Coming soon');
    });

    it('returns 404 for unknown slugs', async () => {
        const response = await app.request('/no-such-post/');
        expect(response.status).toBe(404);
    });

    it('returns 404 for unknown tags', async () => {
        const response = await app.request('/tag/no-such-tag/');
        expect(response.status).toBe(404);
    });
});
