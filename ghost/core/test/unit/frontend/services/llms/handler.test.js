const sinon = require('sinon');
const request = require('supertest');

const express = require('../../../../../core/shared/express');
const configUtils = require('../../../../utils/config-utils');
const settingsCache = require('../../../../../core/shared/settings-cache');
const urlService = require('../../../../../core/server/services/url');
const llmsHandler = require('../../../../../core/frontend/services/llms/handler');
const llmsService = require('../../../../../core/frontend/services/llms/service');

describe('Unit: frontend/services/llms/handler', function () {
    let app;

    beforeEach(function () {
        app = express('test');
        llmsHandler(app);
        llmsHandler.mountMarkdownRoutes(app);
        app.use((req, res) => res.sendStatus(404));

        sinon.stub(settingsCache, 'get').callsFake((key) => {
            if (key === 'is_private') {
                return false;
            }

            return null;
        });
    });

    afterEach(function () {
        configUtils.restore();
        sinon.restore();
    });

    it('serves generated llms files and well-known aliases', async function () {
        sinon.stub(llmsService, 'getLlmsTxt').resolves('# llms');
        sinon.stub(llmsService, 'getLlmsFullTxt').resolves('# llms full');

        await request(app)
            .get('/llms.txt')
            .expect(200)
            .expect('Cache-Control', 'public, max-age=3600')
            .expect('Content-Type', /text\/plain/)
            .expect('# llms');

        await request(app)
            .get('/.well-known/llms-full.txt')
            .expect(200)
            .expect('# llms full');
    });

    it('serves markdown for public entry .md URLs', async function () {
        sinon.stub(urlService, 'getResource').returns({
            config: {type: 'posts'},
            data: {id: 'post-id', visibility: 'public'}
        });

        sinon.stub(llmsService, 'fetchPublicEntry').resolves({
            title: 'Hello world',
            url: 'https://example.com/hello-world/',
            published_at: '2026-04-14T12:00:00.000Z',
            updated_at: '2026-04-14T13:00:00.000Z',
            custom_excerpt: 'Short summary',
            visibility: 'public',
            primary_author: {name: 'John'},
            primary_tag: {name: 'News'},
            html: '<p>Hello <strong>world</strong></p>',
            plaintext: 'Hello world'
        });

        await request(app)
            .get('/hello-world.md')
            .expect(200)
            .expect('Content-Type', /text\/markdown/)
            .expect('Content-Location', '/hello-world.md')
            .expect(/^> ## Content Index/m)
            .expect(/Fetch the complete content index at: http:\/\/127\.0\.0\.1:\d+\/llms\.txt/)
            .expect(/# Hello world/)
            .expect(/- Published: 2026-04-14T12:00:00.000Z/)
            .expect(/- Author: John/)
            .expect((response) => {
                if (response.text.includes('- Visibility:')) {
                    throw new Error('Visibility metadata should not be rendered');
                }
            })
            .expect(/Hello \*\*world\*\*/);
    });

    it('skips llms routes for private sites', async function () {
        settingsCache.get.restore();
        sinon.stub(settingsCache, 'get').callsFake(key => key === 'is_private');

        sinon.stub(llmsService, 'getLlmsTxt').resolves('# llms');

        await request(app)
            .get('/llms.txt')
            .expect(404);
    });

    it('redirects llms.txt to the site root when llms is disabled', async function () {
        settingsCache.get.restore();
        sinon.stub(settingsCache, 'get').callsFake((key) => {
            if (key === 'is_private') {
                return false;
            }

            if (key === 'llms_enabled') {
                return false;
            }

            return null;
        });

        await request(app)
            .get('/llms.txt?ref=test')
            .expect(302)
            .expect('Location', '/?ref=test');
    });

    it('redirects markdown entry URLs to their canonical path when llms is disabled', async function () {
        settingsCache.get.restore();
        sinon.stub(settingsCache, 'get').callsFake((key) => {
            if (key === 'is_private') {
                return false;
            }

            if (key === 'llms_enabled') {
                return false;
            }

            return null;
        });

        await request(app)
            .get('/hello-world.md?ref=test')
            .expect(302)
            .expect('Location', '/hello-world/?ref=test');
    });

    it('uses the site subdirectory for redirects and llms index links', async function () {
        configUtils.set('url', 'http://127.0.0.1:2368/blog');

        settingsCache.get.restore();
        sinon.stub(settingsCache, 'get').callsFake((key) => {
            if (key === 'is_private') {
                return false;
            }

            if (key === 'llms_enabled') {
                return false;
            }

            return null;
        });

        await request(app)
            .get('/llms.txt?ref=test')
            .expect(302)
            .expect('Location', '/blog/?ref=test');

        await request(app)
            .get('/hello-world.md?ref=test')
            .expect(302)
            .expect('Location', '/blog/hello-world/?ref=test');

        settingsCache.get.restore();
        sinon.stub(settingsCache, 'get').callsFake((key) => {
            if (key === 'is_private') {
                return false;
            }

            return null;
        });

        sinon.stub(urlService, 'getResource').returns({
            config: {type: 'posts'},
            data: {id: 'post-id', visibility: 'public'}
        });

        sinon.stub(llmsService, 'fetchPublicEntry').resolves({
            title: 'Hello world',
            url: 'http://127.0.0.1:2368/blog/hello-world/',
            published_at: '2026-04-14T12:00:00.000Z',
            updated_at: '2026-04-14T13:00:00.000Z',
            html: '<p>Hello <strong>world</strong></p>',
            plaintext: 'Hello world'
        });

        await request(app)
            .get('/hello-world.md')
            .expect(200)
            .expect(/Fetch the complete content index at: http:\/\/127\.0\.0\.1:\d+\/blog\/llms\.txt/);
    });
});
