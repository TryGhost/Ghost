const assert = require('node:assert/strict');
const sinon = require('sinon');

const settingsSerializer = require('../../../../../../../../core/server/api/endpoints/utils/serializers/output/settings');

describe('Settings output serializer', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('icon rewrite (Admin API)', function () {
        it('rewrites local icon path with /size/w256h256/', function () {
            const models = [
                {key: 'icon', value: '/content/images/2026/02/icon.png', group: 'site'},
                {key: 'title', value: 'Test Blog', group: 'site'}
            ];
            const frame = {
                apiType: 'admin',
                options: {},
                response: null
            };

            settingsSerializer.browse(models, {}, frame);

            const icon = frame.response.settings.find(s => s.key === 'icon');
            assert.equal(icon.value, '/content/images/size/w256h256/2026/02/icon.png');
        });

        it('rewrites CDN icon URL with /size/w256h256/', function () {
            const models = [
                {key: 'icon', value: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/icon.png', group: 'site'}
            ];
            const frame = {
                apiType: 'admin',
                options: {},
                response: null
            };

            settingsSerializer.browse(models, {}, frame);

            const icon = frame.response.settings.find(s => s.key === 'icon');
            assert.equal(icon.value, 'https://storage.ghost.is/c/6f/a3/site/content/images/size/w256h256/2026/02/icon.png');
        });

        it('does not modify settings without icon', function () {
            const models = [
                {key: 'title', value: 'Test Blog', group: 'site'}
            ];
            const frame = {
                apiType: 'admin',
                options: {},
                response: null
            };

            settingsSerializer.browse(models, {}, frame);

            const title = frame.response.settings.find(s => s.key === 'title');
            assert.equal(title.value, 'Test Blog');
        });

        it('does not modify null icon value', function () {
            const models = [
                {key: 'icon', value: null, group: 'site'}
            ];
            const frame = {
                apiType: 'admin',
                options: {},
                response: null
            };

            settingsSerializer.browse(models, {}, frame);

            const icon = frame.response.settings.find(s => s.key === 'icon');
            assert.equal(icon.value, null);
        });
    });

    describe('icon rewrite (Content API)', function () {
        it('rewrites local icon path with /size/w256h256/', function () {
            const models = {
                icon: '/content/images/2026/02/icon.png',
                title: 'Test Blog'
            };
            const frame = {
                apiType: 'content',
                options: {},
                response: null
            };

            settingsSerializer.browse(models, {}, frame);

            assert.equal(frame.response.settings.icon, '/content/images/size/w256h256/2026/02/icon.png');
        });

        it('rewrites CDN icon URL with /size/w256h256/', function () {
            const models = {
                icon: 'https://storage.ghost.is/c/6f/a3/site/content/images/2026/02/icon.png'
            };
            const frame = {
                apiType: 'content',
                options: {},
                response: null
            };

            settingsSerializer.browse(models, {}, frame);

            assert.equal(frame.response.settings.icon, 'https://storage.ghost.is/c/6f/a3/site/content/images/size/w256h256/2026/02/icon.png');
        });

        it('does not modify if no icon is present', function () {
            const models = {
                title: 'Test Blog'
            };
            const frame = {
                apiType: 'content',
                options: {},
                response: null
            };

            settingsSerializer.browse(models, {}, frame);

            assert.equal(frame.response.settings.icon, undefined);
        });
    });
});
