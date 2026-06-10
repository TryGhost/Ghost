import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {beforeAll, describe, expect, it} from 'vitest';
import {createClient} from '@libsql/client';
import {drizzle} from 'drizzle-orm/libsql';
import {Hono} from 'hono';
import bcrypt from 'bcryptjs';
import {ensureCoreSchema} from '../../db/ddl.js';
import {createGhostImporter} from '../operations/importer.js';
import {createContentRepository} from '../content/repo.js';
import {createFrontendContentReader} from '../content/frontend-reader.js';
import {createSettingsRepository} from '../settings/repo.js';
import {createSettingsService} from '../settings/service.js';
import {createStaffRepository} from '../identity/repo.js';
import {createStaffAuthService} from '../identity/service.js';
import {createSubscriptionRepository} from '../subscriptions/repo.js';
import {createNewsletterRepository} from '../newsletters/repo.js';
import {createContentApiRouter} from './content-api.js';
import {createAdminApiRouter} from './admin-api.js';
import {staffTable, staffRoleTable, roleTable} from '../identity/db.js';
import {eq} from 'drizzle-orm';

const fixturePath = path.resolve(__dirname, '../../../test/fixtures/ghost-v5-export.json');

describe('ghost api compat facades', () => {
    let app: Hono;
    let db: import('../../db/client.js').DbClient;

    beforeAll(async () => {
        db = drizzle(createClient({url: ':memory:'}));
        await ensureCoreSchema(db);
        await createGhostImporter(db).importExport(
            JSON.parse(await readFile(fixturePath, 'utf8'))
        );
        // Imported staff keep their Ghost bcrypt hash; set a known password.
        await db.update(staffTable)
            .set({passwordHash: bcrypt.hashSync('Sl1m3rson99', 10)})
            .where(eq(staffTable.email, 'test@ghost.org'));

        const contentReader = createFrontendContentReader(createContentRepository(db));
        const settingsService = createSettingsService(createSettingsRepository(db));
        const staffAuthService = createStaffAuthService(createStaffRepository(db), {ssoProviders: []});
        const subscriptionRepository = createSubscriptionRepository(db);
        const newsletterRepository = createNewsletterRepository(db);

        const siteUrl = 'http://localhost:2369';
        app = new Hono();
        app.route('/ghost/api/content', createContentApiRouter({
            contentReader,
            settingsService,
            subscriptionRepository,
            newsletterRepository,
            siteUrl
        }));
        app.route('/ghost/api/admin', createAdminApiRouter({
            contentReader,
            settingsService,
            staffAuthService,
            subscriptionRepository,
            siteUrl
        }));
    });

    describe('content api', () => {
        it('browses posts in ghost wire format', async () => {
            const response = await app.request('/ghost/api/content/posts/?key=any&include=tags,authors');
            expect(response.status).toBe(200);
            const body = await response.json() as {
                posts: Array<Record<string, unknown>>;
                meta: {pagination: Record<string, unknown>};
            };
            expect(body.posts).toHaveLength(1);
            const post = body.posts[0]!;
            expect(post.title).toBe('Coming soon');
            expect(post.slug).toBe('coming-soon');
            expect(post.html).toContain('subscribe');
            expect(post.url).toBe('http://localhost:2369/coming-soon/');
            expect(post.excerpt).toBeTruthy();
            expect((post.tags as Array<{slug: string}>)[0]?.slug).toBe('news');
            expect((post.authors as Array<{slug: string}>)[0]?.slug).toBe('fixture');
            expect((post.primary_author as {slug: string}).slug).toBe('fixture');
            expect(body.meta.pagination).toMatchObject({page: 1, pages: 1, total: 1, next: null, prev: null});
        });

        it('browses pages separately from posts', async () => {
            const response = await app.request('/ghost/api/content/pages/?key=any');
            expect(response.status).toBe(200);
            const body = await response.json() as {pages: Array<{slug: string}>};
            expect(body.pages).toHaveLength(1);
            expect(body.pages[0]?.slug).toBe('about');
        });

        it('reads a single post by slug', async () => {
            const response = await app.request('/ghost/api/content/posts/slug/coming-soon/?key=any');
            expect(response.status).toBe(200);
            const body = await response.json() as {posts: Array<{title: string}>};
            expect(body.posts[0]?.title).toBe('Coming soon');
        });

        it('exposes settings as the public settings object', async () => {
            const response = await app.request('/ghost/api/content/settings/?key=any');
            expect(response.status).toBe(200);
            const body = await response.json() as {settings: Record<string, unknown>};
            expect(body.settings.title).toBe('Testing Export Fixtures');
            expect(body.settings.accent_color).toBe('#FF1A75');
            expect(body.settings.url).toBe('http://localhost:2369/');
            expect(Array.isArray(body.settings.navigation)).toBe(true);
            expect(body.settings.members_enabled).toBeDefined();
        });

        it('exposes imported products as tiers', async () => {
            const response = await app.request('/ghost/api/content/tiers/?key=any&include=monthly_price,yearly_price,benefits');
            expect(response.status).toBe(200);
            const body = await response.json() as {tiers: Array<Record<string, unknown>>};
            expect(body.tiers).toHaveLength(2);
            const paid = body.tiers.find((tier) => tier.type === 'paid')!;
            expect(paid.monthly_price).toBe(500);
            expect(paid.yearly_price).toBe(5000);
            expect(paid.currency).toBe('usd');
        });

        it('exposes newsletters', async () => {
            const response = await app.request('/ghost/api/content/newsletters/?key=any');
            const body = await response.json() as {newsletters: Array<{slug: string; status: string}>};
            expect(body.newsletters[0]?.slug).toBe('default-newsletter');
        });

        it('exposes tags and authors', async () => {
            const tags = await (await app.request('/ghost/api/content/tags/?key=any')).json() as {tags: Array<{slug: string}>};
            expect(tags.tags[0]?.slug).toBe('news');
            const authors = await (await app.request('/ghost/api/content/authors/?key=any')).json() as {authors: Array<{slug: string}>};
            expect(authors.authors[0]?.slug).toBe('fixture');
        });
    });

    describe('admin api', () => {
        const login = async () => {
            const response = await app.request('/ghost/api/admin/session/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: 'test@ghost.org', password: 'Sl1m3rson99'})
            });
            return response;
        };

        it('serves site info without auth', async () => {
            const response = await app.request('/ghost/api/admin/site/');
            expect(response.status).toBe(200);
            const body = await response.json() as {site: Record<string, unknown>};
            expect(body.site.title).toBe('Testing Export Fixtures');
            expect(body.site.url).toBe('http://localhost:2369/');
            expect(typeof body.site.version).toBe('string');
        });

        it('rejects bad credentials', async () => {
            const response = await app.request('/ghost/api/admin/session/', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({username: 'test@ghost.org', password: 'wrong-password'})
            });
            expect(response.status).toBe(401);
        });

        it('creates a session for imported staff with bcrypt hashes and serves users/me', async () => {
            const loginResponse = await login();
            expect(loginResponse.status).toBe(201);
            const cookie = loginResponse.headers.get('set-cookie');
            expect(cookie).toContain('ghost-admin-api-session=');

            const meResponse = await app.request('/ghost/api/admin/users/me/?include=roles', {
                headers: {cookie: cookie!.split(';')[0]!}
            });
            expect(meResponse.status).toBe(200);
            const body = await meResponse.json() as {users: Array<Record<string, unknown>>};
            expect(body.users[0]?.email).toBe('test@ghost.org');
            expect((body.users[0]?.roles as Array<{name: string}>)[0]?.name).toBe('Owner');
        });

        it('rejects users/me without a session', async () => {
            const response = await app.request('/ghost/api/admin/users/me/');
            expect(response.status).toBe(401);
        });

        it('serves config and settings for the admin app', async () => {
            const loginResponse = await login();
            const cookie = loginResponse.headers.get('set-cookie')!.split(';')[0]!;

            const configResponse = await app.request('/ghost/api/admin/config/', {headers: {cookie}});
            expect(configResponse.status).toBe(200);
            const config = await configResponse.json() as {config: Record<string, unknown>};
            expect(typeof config.config.version).toBe('string');

            const settingsResponse = await app.request('/ghost/api/admin/settings/', {headers: {cookie}});
            expect(settingsResponse.status).toBe(200);
            const settings = await settingsResponse.json() as {settings: Array<{key: string; value: unknown}>};
            const title = settings.settings.find((setting) => setting.key === 'title');
            expect(title?.value).toBe('Testing Export Fixtures');
        });

        it('browses posts with admin shapes, including drafts', async () => {
            const {postTable} = await import('../content/db.js');
            await db.insert(postTable).values({
                id: 'draft-1',
                title: 'A draft',
                slug: 'a-draft',
                type: 'post',
                status: 'draft',
                lexical: '{}',
                createdAt: Date.now(),
                updatedAt: Date.now()
            }).onConflictDoNothing();

            const loginResponse = await login();
            const cookie = loginResponse.headers.get('set-cookie')!.split(';')[0]!;

            const response = await app.request('/ghost/api/admin/posts/?formats=lexical&limit=15', {headers: {cookie}});
            expect(response.status).toBe(200);
            const body = await response.json() as {posts: Array<Record<string, unknown>>; meta: {pagination: {total: number}}};
            const post = body.posts.find((entry) => entry.slug === 'coming-soon')!;
            expect(post.status).toBe('published');
            expect(typeof post.lexical).toBe('string');
            // Admin browse includes drafts; the public content api does not.
            expect(body.posts.some((entry) => entry.slug === 'a-draft')).toBe(true);
            const publicResponse = await app.request('/ghost/api/content/posts/?key=any');
            const publicBody = await publicResponse.json() as {posts: Array<{slug: string}>};
            expect(publicBody.posts.some((entry) => entry.slug === 'a-draft')).toBe(false);
        });

        it('accepts api paths without trailing slashes', async () => {
            const response = await app.request('/ghost/api/admin/site');
            expect(response.status).toBe(200);
            const contentResponse = await app.request('/ghost/api/content/posts?key=any');
            expect(contentResponse.status).toBe(200);
        });

        it('logs out by deleting the session', async () => {
            const loginResponse = await login();
            const cookie = loginResponse.headers.get('set-cookie')!.split(';')[0]!;
            const deleteResponse = await app.request('/ghost/api/admin/session/', {
                method: 'DELETE',
                headers: {cookie}
            });
            expect(deleteResponse.status).toBe(204);
            const meResponse = await app.request('/ghost/api/admin/users/me/', {headers: {cookie}});
            expect(meResponse.status).toBe(401);
        });
    });
});
