const assert = require('node:assert/strict');
const sinon = require('sinon');
const request = require('supertest');

const express = require('../../../../../core/shared/express');
const settingsCache = require('../../../../../core/shared/settings-cache');
const llmsDiscovery = require('../../../../../core/frontend/web/middleware/llms-discovery');

describe('Unit: frontend/web/middleware/llms-discovery', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('adds llms discovery headers and preserves existing Link headers', async function () {
        sinon.stub(settingsCache, 'get').returns(false);

        const app = express('test');
        app.use(llmsDiscovery);
        app.get('/', (req, res) => {
            res.set('Link', '</existing>; rel="preload"');
            res.send('ok');
        });

        const response = await request(app).get('/').expect(200);

        assert.match(response.headers.link, /<\/existing>; rel="preload"/);
        assert.match(response.headers.link, /<\/llms\.txt>; rel="llms-txt"/);
        assert.match(response.headers.link, /<\/llms-full\.txt>; rel="llms-full-txt"/);
        assert.equal(response.headers['x-llms-txt'], '/llms.txt');
    });

    it('does not add llms discovery headers for private sites', async function () {
        sinon.stub(settingsCache, 'get').returns(true);

        const app = express('test');
        app.use(llmsDiscovery);
        app.get('/', (req, res) => res.send('ok'));

        const response = await request(app).get('/').expect(200);

        assert.equal(response.headers.link, undefined);
        assert.equal(response.headers['x-llms-txt'], undefined);
    });
});
