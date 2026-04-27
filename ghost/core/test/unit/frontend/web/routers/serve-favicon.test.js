const sinon = require('sinon');
const assert = require('node:assert/strict');
const {Readable} = require('stream');
const express = require('../../../../../core/shared/express');
const serveFavicon = require('../../../../../core/frontend/web/routers/serve-favicon');
const settingsCache = require('../../../../../core/shared/settings-cache');
const storage = require('../../../../../core/server/adapters/storage');
const configUtils = require('../../../../utils/config-utils');
const path = require('path');

function request(app, url) {
    return new Promise((resolve, reject) => {
        const req = new Readable({
            read() {
                this.push(null);
            }
        });
        const headers = {};
        const chunks = [];
        let finished = false;
        const finish = (response) => {
            if (!finished) {
                finished = true;
                resolve(response);
            }
        };

        req.method = 'GET';
        req.url = url;
        req.originalUrl = url;
        req.headers = {
            host: '127.0.0.1'
        };
        req.connection = {};
        req.socket = req.connection;

        const res = {
            statusCode: 200,
            setHeader(name, value) {
                headers[name.toLowerCase()] = value;
            },
            getHeader(name) {
                return headers[name.toLowerCase()];
            },
            removeHeader(name) {
                delete headers[name.toLowerCase()];
            },
            writeHead(statusCode, headerValues) {
                this.statusCode = statusCode;
                for (const [name, value] of Object.entries(headerValues)) {
                    this.setHeader(name, value);
                }
            },
            write(chunk) {
                chunks.push(Buffer.from(chunk));
            },
            end(chunk) {
                if (chunk) {
                    chunks.push(Buffer.from(chunk));
                }
                finish({
                    body: Buffer.concat(chunks),
                    headers,
                    statusCode: this.statusCode
                });
            }
        };

        app.handle(req, res, reject);
    });
}

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

                const response = await request(blogApp, '/favicon.ico');

                assert.equal(response.statusCode, 200);
                assert.match(response.headers['content-type'], /image\/x-icon/);
                assert.equal(response.headers['content-length'], 15406);
            });
        });

        describe('redirects', function () {
            it('custom uploaded favicon.png', async function () {
                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = '/content/images/favicon.png';

                const response = await request(blogApp, '/favicon.png');

                assert.equal(response.statusCode, 302);
                assert.equal(response.headers.location, '/content/images/size/w256h256/favicon.png');
            });

            it('custom uploaded favicon.webp', async function () {
                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = '/content/images/favicon.webp';

                const response = await request(blogApp, '/favicon.png');

                assert.equal(response.statusCode, 302);
                assert.equal(response.headers.location, '/content/images/size/w256h256/format/png/favicon.webp');
            });

            it('custom uploaded favicon.ico', async function () {
                storage.getStorage().storagePath = path.join(__dirname, '../../../../utils/fixtures/images/');
                localSettingsCache.icon = '/content/images/favicon.ico';

                const response = await request(blogApp, '/favicon.ico');

                assert.equal(response.statusCode, 302);
                assert.equal(response.headers.location, '/content/images/favicon.ico');
            });

            it('to favicon.ico when favicon.png is requested', async function () {
                configUtils.set('paths:publicFilePath', path.join(__dirname, '../../../../test/utils/fixtures/'));
                localSettingsCache.icon = null;

                const response = await request(blogApp, '/favicon.png');

                assert.equal(response.statusCode, 302);
                assert.equal(response.headers.location, '/favicon.ico');
            });
        });
    });
});
