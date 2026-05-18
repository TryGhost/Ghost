const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const express = require('express');
const request = require('supertest');
const sinon = require('sinon');
const hbs = require('../../../../../core/frontend/services/theme-engine/engine');
const middleware = require('../../../../../core/frontend/services/theme-engine').middleware;
// is only exposed via themeEngine.getActive()
const activeTheme = require('../../../../../core/frontend/services/theme-engine/active');
const settingsCache = require('../../../../../core/shared/settings-cache');
const customThemeSettingsCache = require('../../../../../core/shared/custom-theme-settings-cache');
const config = require('../../../../../core/shared/config');
const labs = require('../../../../../core/shared/labs');
const urlUtils = require('../../../../../core/shared/url-utils');

const sandbox = sinon.createSandbox();

describe('Themes middleware', function () {
    const app = express();

    app.use(middleware);
    app.get('/', (_req, res) => {
        res.json({ok: true});
    });
    app.use((err, _req, res, _next) => {
        void _next;

        res.status(err.statusCode || 500).json({
            message: err.message
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    let fakeActiveTheme;
    let fakeActiveThemeName;
    let fakeSiteData;
    let fakeLabsData;
    let fakeCustomThemeSettingsData;
    let activeThemeGetStub;
    let settingsCacheGetStub;
    let hbsUpdateTemplateOptionsStub;
    let hbsUpdateLocalTemplateOptionsStub;

    beforeEach(function () {
        fakeActiveTheme = {
            config: sandbox.stub().returns(2),
            mount: sandbox.stub()
        };

        fakeActiveThemeName = 'bacon-sensation';

        fakeSiteData = {
            comments_enabled: 'all'
        };

        fakeLabsData = {
            // labs data is deep cloned,
            // if we want to compare it
            // we will need some unique content
            members: true,
            offers: true
        };

        fakeCustomThemeSettingsData = {
            header_typography: 'Sans-Serif'
        };

        activeThemeGetStub = sandbox.stub(activeTheme, 'get')
            .returns(fakeActiveTheme);

        settingsCacheGetStub = sandbox.stub(settingsCache, 'get')
            .withArgs('active_theme').returns(fakeActiveThemeName);

        sandbox.stub(labs, 'getAll').returns(fakeLabsData);

        sandbox.stub(settingsCache, 'getPublic')
            .returns(fakeSiteData);

        sandbox.stub(customThemeSettingsCache, 'getAll')
            .returns(fakeCustomThemeSettingsData);

        hbsUpdateTemplateOptionsStub = sandbox.stub(hbs, 'updateTemplateOptions');
        hbsUpdateLocalTemplateOptionsStub = sandbox.stub(hbs, 'updateLocalTemplateOptions');
    });

    it('mounts active theme if not yet mounted', async function () {
        fakeActiveTheme.mounted = false;

        await request(app)
            .get('/')
            .expect(200);

        sinon.assert.called(fakeActiveTheme.mount);
        sinon.assert.calledWith(fakeActiveTheme.mount, app);
    });

    it('does not mounts the active theme if it is already mounted', async function () {
        fakeActiveTheme.mounted = true;

        await request(app)
            .get('/')
            .expect(200);

        sinon.assert.notCalled(fakeActiveTheme.mount);
    });

    it('throws error if theme is missing', async function () {
        activeThemeGetStub.restore();
        activeThemeGetStub = sandbox.stub(activeTheme, 'get')
            .returns(undefined);

        await request(app)
            .get('/')
            .expect(500)
            .expect({
                message: 'The currently active theme "bacon-sensation" is missing.'
            });

        sinon.assert.called(activeThemeGetStub);
        sinon.assert.notCalled(fakeActiveTheme.mount);
    });

    describe('updateTemplateOptions', function () {
        it('is called with correct data', async function () {
            const themeDataExpectedProps = ['posts_per_page', 'image_sizes'];

            await request(app)
                .get('/')
                .expect(200);

            sinon.assert.calledOnce(hbsUpdateTemplateOptionsStub);
            const templateOptions = hbsUpdateTemplateOptionsStub.firstCall.args[0];
            const data = templateOptions.data;

            assert(data && typeof data === 'object');
            assert('site' in data);
            assert('labs' in data);
            assert('config' in data);
            assert('custom' in data);

            // Check Theme Config
            assert(data.config && typeof data.config === 'object');
            assert('posts_per_page' in data.config);
            assert('image_sizes' in data.config);
            assert.equal(Object.keys(data.config).length, themeDataExpectedProps.length);
            // posts per page should be set according to the stub
            assert.equal(data.config.posts_per_page, 2);

            // Check labs config
            assert.deepEqual(data.labs, fakeLabsData);

            assert.deepEqual(data.site, {
                ...fakeSiteData,

                // signup_url should get added
                signup_url: '#/portal',

                // the comments_enabled setting should be mapped to comments_access, and comments_enabled should be a boolean
                comments_enabled: true,
                comments_access: 'all'
            });

            assert.deepEqual(data.custom, fakeCustomThemeSettingsData);
        });

        it('switches @site.signup_url to RSS when signup is disabled', async function () {
            settingsCacheGetStub.withArgs('members_signup_access').returns('none');

            await request(app)
                .get('/')
                .expect(200);

            const templateOptions = hbsUpdateTemplateOptionsStub.firstCall.args[0];
            const data = templateOptions.data;

            assertExists(data.site.signup_url);
            assert.equal(data.site.signup_url, `https://feedly.com/i/subscription/feed/${encodeURIComponent(config.get('url') + '/rss/')}`);
        });
    });

    describe('updateLocalTemplateOptions', function () {
        it('includes admin_url ending with /ghost/ in site data', async function () {
            await request(app)
                .get('/')
                .expect(200);

            sinon.assert.calledOnce(hbsUpdateLocalTemplateOptionsStub);
            const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
            const data = templateOptions.data;

            assert(data.site.admin_url, 'admin_url should be set in site data');
            assert.equal(typeof data.site.admin_url, 'string');
            assert.ok(data.site.admin_url.endsWith('/ghost/'),
                `admin_url should end with /ghost/ but got: ${data.site.admin_url}`);
        });

        it('includes admin_url ending with /ghost/ when admin is on a separate domain', async function () {
            sandbox.stub(urlUtils, 'getAdminUrl').returns('https://admin.example.com/');

            await request(app)
                .get('/')
                .expect(200);

            sinon.assert.calledOnce(hbsUpdateLocalTemplateOptionsStub);
            const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
            const data = templateOptions.data;

            assert.ok(data.site.admin_url.endsWith('/ghost/'),
                `admin_url should end with /ghost/ but got: ${data.site.admin_url}`);
            assert.equal(data.site.admin_url, 'https://admin.example.com/ghost/');
        });
    });

    describe('Preview Mode', function () {
        it('calls updateLocalTemplateOptions with correct data when one parameter is set', async function () {
            const previewString = 'c=%23000fff';

            await request(app)
                .get('/')
                .set('x-ghost-preview', previewString)
                .expect(200);

            sinon.assert.calledOnce(hbsUpdateLocalTemplateOptionsStub);
            const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
            const data = templateOptions.data;

            assert.equal(data.site._preview, previewString);
            assert.equal(data.site.accent_color, '#000fff');
        });

        it('calls updateLocalTemplateOptions with correct data when two parameters are set', async function () {
            const previewString = 'c=%23000fff&icon=%2Fcontent%2Fimages%2Fmyimg.png';

            await request(app)
                .get('/')
                .set('x-ghost-preview', previewString)
                .expect(200);

            sinon.assert.calledOnce(hbsUpdateLocalTemplateOptionsStub);
            const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
            const data = templateOptions.data;

            assert.equal(data.site._preview, previewString);
            assert.equal(data.site.accent_color, '#000fff');
            assert.equal(data.site.icon, '/content/images/myimg.png');
        });

        it('calls updateLocalTemplateOptions with correct custom theme settings data', async function () {
            const customPreviewObject = {header_typography: 'Serif'};
            const previewString = `custom=${encodeURIComponent(JSON.stringify(customPreviewObject))}`;

            await request(app)
                .get('/')
                .set('x-ghost-preview', previewString)
                .expect(200);

            sinon.assert.calledOnce(hbsUpdateLocalTemplateOptionsStub);
            const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
            const data = templateOptions.data;

            assert(data && typeof data === 'object');
            assert('site' in data);
            assert.equal(data.custom.header_typography, 'Serif');
        });

        it('calls updateLocalTemplateOptions with correct without unknown custom theme settings', async function () {
            const customPreviewObject = {header_typography: 'Serif', unknown_setting: true};
            const previewString = `custom=${encodeURIComponent(JSON.stringify(customPreviewObject))}`;

            await request(app)
                .get('/')
                .set('x-ghost-preview', previewString)
                .expect(200);

            sinon.assert.calledOnce(hbsUpdateLocalTemplateOptionsStub);
            const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
            const data = templateOptions.data;

            assert(data && typeof data === 'object');
            assert('site' in data);
            assert('custom' in data);

            assert.equal(data.custom.header_typography, 'Serif');

            assert(!('unknown_setting' in data.custom));
        });

        it('calls updateLocalTemplateOptions with no custom data when custom param is not parseable JSON', async function () {
            const previewString = `custom=${encodeURIComponent('<html>')}`;

            await request(app)
                .get('/')
                .set('x-ghost-preview', previewString)
                .expect(200);

            sinon.assert.calledOnce(hbsUpdateLocalTemplateOptionsStub);
            const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
            const data = templateOptions.data;

            assert(data && typeof data === 'object');
            assert('site' in data);
            assert.deepEqual(data.custom, {});
        });

        it('calls updateLocalTemplateOptions with no custom data when custom param is not an object', async function () {
            const previewString = `custom=${encodeURIComponent('"header_typography"')}`;

            await request(app)
                .get('/')
                .set('x-ghost-preview', previewString)
                .expect(200);

            sinon.assert.calledOnce(hbsUpdateLocalTemplateOptionsStub);
            const templateOptions = hbsUpdateLocalTemplateOptionsStub.firstCall.args[1];
            const data = templateOptions.data;

            assert(data && typeof data === 'object');
            assert('site' in data);
            assert.deepEqual(data.custom, {});
        });
    });
});
