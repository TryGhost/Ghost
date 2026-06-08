const sinon = require('sinon');
const request = require('supertest');
const express = require('../../../../../core/shared/express');
const serveFavicon = require('../../../../../core/frontend/web/routers/serve-favicon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const storage = require('../../../../../core/server/adapters/storage');
const configUtils = require('../../../../utils/config-utils');
const path = require('path');

describe('Serve Favicon', function () {
    let blogApp;
    let localSettingsCache = {};
    let originalStoragePath;

    beforeEach(function () {
        blogApp = express('test');

        sinon.stub(settingsCache, 'get').callsFake(function (key) {
            return localSettingsCache[key];
        });

        originalStoragePath = storage.getStorage().storagePath;

        serveFavicon(blogApp);
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
        localSettingsCache = {};
        storage.getStorage().storagePath = originalStoragePath;
    });

    describe('serveFavicon', function () {
        describe('serves', function () {
            it('default favicon.ico', async function () {
                localSettingsCache.icon = '';

                await request(blogApp)
                    .get('/favicon.ico')
                    .expect(200)
                    .expect('Content-Type', /image\/x-icon/)
                    .expect('Content-Length', '15406');
            });
        });

        describe('redirects', function () {
            it('custom uploaded favicon.png', async function () {
                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = '/content/images/favicon.png';

                await request(blogApp)
                    .get('/favicon.png')
                    .expect(302)
                    .expect('Location', '/content/images/size/w256h256/favicon.png');
            });

            it('custom uploaded favicon.webp', async function () {
                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = '/content/images/favicon.webp';

                await request(blogApp)
                    .get('/favicon.png')
                    .expect(302)
                    .expect('Location', '/content/images/size/w256h256/format/png/favicon.webp');
            });

            it('custom uploaded favicon.ico', async function () {
                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = '/content/images/favicon.ico';

                await request(blogApp)
                    .get('/favicon.ico')
                    .expect(302)
                    .expect('Location', '/content/images/favicon.ico');
            });

            it('to favicon.ico when favicon.png is requested', async function () {
                configUtils.set('paths:publicFilePath', path.join(__dirname, '../../../../test/utils/fixtures/'));
                localSettingsCache.icon = null;

                await request(blogApp)
                    .get('/favicon.png')
                    .expect(302)
                    .expect('Location', '/favicon.ico');
            });
        });
    });
});
