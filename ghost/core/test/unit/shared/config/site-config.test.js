const assert = require('node:assert/strict');
const {buildSiteConfig} = require('../../../../core/shared/config/site-config');
const {createConfigView} = require('../../../../core/shared/container/config-view');

describe('buildSiteConfig', function () {
    const fakeConfig = (values) => ({
        get: key => (key === 'slugs' ? {protected: ['ghost']} : values[key]),
        getSiteUrl: () => values.url,
        getAdminUrl: () => values['admin:url'],
        getSubdir: () => '',
        getContentPath: type => `/content/${type}`
    });

    it('picks the site-level keys from config', function () {
        const database = {client: 'better-sqlite3', connection: {filename: '/tmp/site.db'}};
        const config = fakeConfig({
            url: 'https://site-a.example',
            'admin:url': 'https://admin.site-a.example',
            database,
            site_uuid: 'aaaa-bbbb',
            hostSettings: {siteId: '123'},
            labs: {someFlag: true},
            'paths:contentPath': '/content/site-a'
        });

        const siteConfig = buildSiteConfig(config);

        assert.equal(siteConfig.url, 'https://site-a.example');
        assert.equal(siteConfig.adminUrl, 'https://admin.site-a.example');
        assert.equal(siteConfig.database, database);
        assert.equal(siteConfig.siteUuid, 'aaaa-bbbb');
        assert.deepEqual(siteConfig.hostSettings, {siteId: '123'});
        assert.deepEqual(siteConfig.labs, {someFlag: true});
        assert.equal(siteConfig.contentPath, '/content/site-a');
        assert.equal(siteConfig.getSiteUrl(), 'https://site-a.example');
        assert.deepEqual(siteConfig.protectedSlugs, ['ghost']);
    });

    it('keeps the database object identity so dialect shaping stays visible to the migrator', function () {
        const database = {client: 'mysql2', connection: {}};
        const siteConfig = buildSiteConfig(fakeConfig({database}));

        assert.equal(siteConfig.database, database);
    });
});

describe('createConfigView', function () {
    it('serves hostSettings from siteConfig and everything else from deployment config', function () {
        const view = createConfigView({
            siteConfig: {hostSettings: {managedEmail: {enabled: true}}},
            deploymentConfig: {get: key => (key === 'mail:from' ? 'test@example.com' : undefined)}
        });

        assert.deepEqual(view.get('hostSettings'), {managedEmail: {enabled: true}});
        assert.equal(view.get('hostSettings:managedEmail:enabled'), true);
        assert.equal(view.get('hostSettings:missing:deep'), undefined);
        assert.equal(view.get('mail:from'), 'test@example.com');
    });
});
