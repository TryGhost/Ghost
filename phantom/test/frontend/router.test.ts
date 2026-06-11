import {promises as fs} from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {describe, expect, it} from 'vitest';
import {Hono} from 'hono';
import {createFrontendRouter} from '../../src/frontend/router.js';
import type {AppConfig} from '../../src/platform/config/config.js';
import type {FrontendContentReader} from '../../src/modules/content/frontend-reader.js';
import type {PostRecord} from '../../src/modules/content/db.js';
import type {SettingsService} from '../../src/modules/settings/service.js';

const writeThemeBundle = async (root: string, themeId: string) => {
    const moduleSource = [
        'export const templates = {',
        '    "default": (data) => "LAYOUT:" + (data.body ?? ""),',
        '    "index": (data) => "TITLE:" + data.site.title + (data.posts || []).map((post) => "POST:" + post.title).join(""),',
        '    "post": (data) => "POST:" + data.post.title + " BODY:" + data.post.html',
        '};',
        'export const partials = {};',
        'export const theme = {',
        `    name: "${themeId}",`,
        '    version: "1.0.0",',
        '    config: {},',
        '    templates: ["default", "index", "post"],',
        '    customTemplates: [],',
        '    partials: [],',
        '    layouts: {"index": "default", "post": "default", "default": null}',
        '};',
        'export default {templates, partials, theme};',
        ''
    ].join('\n');

    const themePath = path.join(root, themeId);
    await fs.mkdir(themePath, {recursive: true});
    await fs.writeFile(path.join(themePath, 'bundle.mjs'), moduleSource, 'utf8');
};

const post: PostRecord = {
    id: '1',
    uuid: null,
    title: 'Hello',
    slug: 'hello',
    type: 'post',
    status: 'published',
    lexical: '{}',
    html: '<p>Hello body</p>',
    visibility: 'public',
    featured: 0,
    emailOnly: 0,
    newsletterId: null,
    emailRecipientFilter: null,
    customExcerpt: null,
    featureImage: null,
    featureImageAlt: null,
    featureImageCaption: null,
    codeinjectionHead: null,
    codeinjectionFoot: null,
    canonicalUrl: null,
    customTemplate: null,
    publishedAt: null,
    createdAt: 0,
    updatedAt: 0
};

const contentReader: FrontendContentReader = {
    getEntryBySlug: async (slug) => (slug === 'hello' ? {post, tags: [], authors: []} : null),
    listPublished: async () => ({
        entries: [{post, tags: [], authors: []}],
        pagination: {page: 1, limit: 10, pages: 1, total: 1, next: null, prev: null}
    }),
    getEntryById: async () => null,
    getEntryByUuid: async (uuid) => (uuid === 'draft-uuid'
        ? {post: {...post, id: '2', uuid: 'draft-uuid', title: 'Draft preview', slug: 'draft-preview', status: 'draft'}, tags: [], authors: []}
        : null),
    isSlugTaken: async () => false,
    getTagBySlug: async () => null,
    getAuthorBySlug: async () => null,
    listTags: async () => [],
    listTagsWithCounts: async () => [],
    listAuthors: async () => []
};

const settingsService: SettingsService = {
    listSettings: async () => ({
        settings: [
            {key: 'theme.active', group: 'theme', type: 'string', value: 'casper', updatedAt: Date.now()},
            {key: 'site.title', group: 'site', type: 'string', value: 'Phantom', updatedAt: Date.now()},
            {key: 'site.description', group: 'site', type: 'string', value: null, updatedAt: Date.now()},
            {key: 'site.locale', group: 'site', type: 'string', value: 'en', updatedAt: Date.now()},
            {key: 'feature.membership', group: 'features', type: 'boolean', value: false, updatedAt: Date.now()},
            {key: 'feature.comments', group: 'features', type: 'boolean', value: false, updatedAt: Date.now()}
        ]
    }),
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
};

describe('frontend router', () => {
    it('renders collection and entry routes', async () => {
        const themeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'phantom-theme-'));
        await writeThemeBundle(themeRoot, 'casper');

        const config: AppConfig = {
            port: 2369,
            db: {url: 'file:./ghost.db'},
            identity: {ssoProviders: []},
            memberAuth: {signupPolicy: 'open'},
            queue: {provider: 'memory'},
            themes: {
                provider: 'fs',
                fs: {root: themeRoot},
                r2: {
                    baseUrl: null,
                    bundlePath: 'themes/{themeId}/bundle.mjs',
                    assetPath: 'themes/{themeId}/assets/{path}'
                }
            },
            hostSettings: {},
            security: {staffDeviceVerification: false}
        };

        const app = new Hono();
        app.route('/', createFrontendRouter({config, contentReader, settingsService}));

        const indexResponse = await app.request('/');
        expect(indexResponse.status).toBe(200);
        const indexHtml = await indexResponse.text();
        expect(indexHtml).toContain('TITLE:Phantom');
        expect(indexHtml).toContain('POST:Hello');

        const postResponse = await app.request('/hello/');
        expect(postResponse.status).toBe(200);
        const postHtml = await postResponse.text();
        expect(postHtml).toContain('POST:Hello');
        expect(postHtml).toContain('BODY:');
        expect(postHtml).toContain('Hello body');

        // /p/<uuid> renders drafts for the editor's preview modal.
        const previewResponse = await app.request('/p/draft-uuid/');
        expect(previewResponse.status).toBe(200);
        expect(await previewResponse.text()).toContain('POST:Draft preview');

        const missingPreview = await app.request('/p/unknown-uuid/');
        expect(missingPreview.status).toBe(404);
    });

    it('gates the site behind /private/ when private mode is on', async () => {
        const themeRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'phantom-theme-'));
        await writeThemeBundle(themeRoot, 'casper');

        const config: AppConfig = {
            port: 2369,
            db: {url: 'file:./ghost.db'},
            identity: {ssoProviders: []},
            memberAuth: {signupPolicy: 'open'},
            queue: {provider: 'memory'},
            themes: {
                provider: 'fs',
                fs: {root: themeRoot},
                r2: {
                    baseUrl: null,
                    bundlePath: 'themes/{themeId}/bundle.mjs',
                    assetPath: 'themes/{themeId}/assets/{path}'
                }
            },
            hostSettings: {},
            security: {staffDeviceVerification: false}
        };

        const privateSettingsService: SettingsService = {
            ...settingsService,
            listSettings: async () => {
                const {settings} = await settingsService.listSettings();
                return {
                    settings: [
                        ...settings,
                        {key: 'site.is_private', group: 'site', type: 'boolean', value: true, updatedAt: Date.now()},
                        {key: 'site.password', group: 'site', type: 'string', value: 'cat', updatedAt: Date.now()}
                    ]
                };
            }
        };

        const app = new Hono();
        app.route('/', createFrontendRouter({config, contentReader, settingsService: privateSettingsService}));

        const gated = await app.request('/');
        expect(gated.status).toBe(302);
        expect(gated.headers.get('location')).toBe('/private/?r=%2F');

        const privatePage = await app.request('/private/?r=%2F');
        expect(privatePage.status).toBe(200);
        const privateHtml = await privatePage.text();
        expect(privateHtml).toContain('Enter access code');

        const wrong = await app.request('/private/?r=%2F', {
            method: 'POST',
            headers: {'content-type': 'application/x-www-form-urlencoded'},
            body: 'password=dog'
        });
        expect(wrong.status).toBe(401);

        const right = await app.request('/private/?r=%2F', {
            method: 'POST',
            headers: {'content-type': 'application/x-www-form-urlencoded'},
            body: 'password=cat'
        });
        expect(right.status).toBe(302);
        expect(right.headers.get('location')).toBe('/');
        const cookie = right.headers.get('set-cookie')!.split(';')[0]!;

        const unlocked = await app.request('/', {headers: {cookie}});
        expect(unlocked.status).toBe(200);
        expect(await unlocked.text()).toContain('TITLE:Phantom');
    });
});
