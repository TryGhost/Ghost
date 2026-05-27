const assert = require('node:assert/strict');
const sinon = require('sinon');

const settingsCache = require('../../../../../core/shared/settings-cache');
const urlUtils = require('../../../../../core/shared/url-utils');
const configUtils = require('../../../../utils/config-utils');

const {getAdminToolbarAttributes} = require('../../../../../core/frontend/services/staff-frontend-tools/head-scripts');

describe('staff frontend tools head-scripts', function () {
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();
        sandbox.stub(urlUtils, 'urlFor').returns('http://localhost:2368/ghost/');
        sandbox.stub(settingsCache, 'get').callsFake((key) => {
            const defaults = {
                title: 'Test Site',
                comments_enabled: 'all',
                members_enabled: true,
                web_analytics_enabled: true,
                social_web_enabled: true
            };
            return defaults[key] ?? null;
        });

        configUtils.set('adminToolbar', {
            url: 'https://cdn.example.com/admin-toolbar.min.js',
            version: '0.1'
        });
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    describe('getAdminToolbarAttributes', function () {
        it('returns admin URL and site title', function () {
            const attrs = getAdminToolbarAttributes({_locals: {context: []}}, 'My Site');

            assert.equal(attrs['ghost-admin-toolbar'], 'http://localhost:2368/ghost/');
            assert.equal(attrs['site-title'], 'My Site');
        });

        it('uses settings cache title when siteTitle is not provided', function () {
            const attrs = getAdminToolbarAttributes({_locals: {context: []}});

            assert.equal(attrs['site-title'], 'Test Site');
        });

        it('sets resource-type to post for post context', function () {
            const attrs = getAdminToolbarAttributes({
                _locals: {context: ['post']},
                post: {id: 'post-123', type: 'post'}
            });

            assert.equal(attrs['resource-type'], 'post');
            assert.equal(attrs['resource-id'], 'post-123');
        });

        it('sets resource-type to page for page context', function () {
            const attrs = getAdminToolbarAttributes({
                _locals: {context: ['page']},
                page: {id: 'page-456', type: 'page'}
            });

            assert.equal(attrs['resource-type'], 'page');
            assert.equal(attrs['resource-id'], 'page-456');
        });

        it('sets resource-type to tag for tag context', function () {
            const attrs = getAdminToolbarAttributes({
                _locals: {context: ['tag']},
                tag: {slug: 'my-tag'}
            });

            assert.equal(attrs['resource-type'], 'tag');
            assert.equal(attrs['resource-slug'], 'my-tag');
        });

        it('sets page-context to home on home pages', function () {
            const attrs = getAdminToolbarAttributes({_locals: {context: ['home']}});

            assert.equal(attrs['page-context'], 'home');
        });

        it('omits page-context on non-home pages', function () {
            const attrs = getAdminToolbarAttributes({_locals: {context: ['post']}});

            assert.equal(attrs['page-context'], undefined);
        });

        it('omits comments-enabled when comments are on (default)', function () {
            const attrs = getAdminToolbarAttributes({
                _locals: {context: ['post']},
                post: {id: 'post-123', type: 'post'}
            });

            assert.equal(attrs['comments-enabled'], undefined);
        });

        it('sets comments-enabled to false when comments are off on a post', function () {
            settingsCache.get.callsFake((key) => {
                if (key === 'comments_enabled') {
                    return 'off';
                }
                return null;
            });

            const attrs = getAdminToolbarAttributes({
                _locals: {context: ['post']},
                post: {id: 'post-123', type: 'post'}
            });

            assert.equal(attrs['comments-enabled'], 'false');
        });

        it('omits comments-enabled on non-post pages even when comments are off', function () {
            settingsCache.get.callsFake((key) => {
                if (key === 'comments_enabled') {
                    return 'off';
                }
                return null;
            });

            const attrs = getAdminToolbarAttributes({_locals: {context: ['home']}});

            assert.equal(attrs['comments-enabled'], undefined);
        });

        it('includes home-only attributes on home context', function () {
            const attrs = getAdminToolbarAttributes({_locals: {context: ['home']}});

            assert.equal(attrs['site-analytics-enabled'], 'true');
            assert.equal(attrs['activitypub-enabled'], 'true');
            assert.equal(attrs['members-enabled'], 'true');
        });

        it('omits home-only attributes on non-home context', function () {
            const attrs = getAdminToolbarAttributes({
                _locals: {context: ['post']},
                post: {id: 'post-123', type: 'post'}
            });

            assert.equal(attrs['site-analytics-enabled'], undefined);
            assert.equal(attrs['activitypub-enabled'], undefined);
            assert.equal(attrs['members-enabled'], undefined);
        });
    });
});
