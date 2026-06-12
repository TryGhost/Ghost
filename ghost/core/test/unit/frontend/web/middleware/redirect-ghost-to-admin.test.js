const express = require('../../../../../core/shared/express');
const request = require('supertest');
const redirectGhostToAdmin = require('../../../../../core/frontend/web/middleware/redirect-ghost-to-admin');
const configUtils = require('../../../../utils/config-utils');

describe('Redirect Ghost To Admin', function () {
    afterEach(async function () {
        await configUtils.restore();
    });

    const createApp = () => {
        const app = express('test');
        app.use(redirectGhostToAdmin());
        app.use((req, res) => {
            res.sendStatus(204);
        });
        return app;
    };

    const expectRedirectsToAdmin = async (inputPath, expectedAdminPath) => {
        await request(createApp())
            .get(inputPath)
            .expect(301)
            .expect('Location', `http://localhost:2368/ghost${expectedAdminPath}`);
    };

    describe('redirects', function () {
        beforeEach(function () {
            configUtils.set({
                url: 'http://localhost:2368',
                admin: {redirects: true}
            });
        });

        it('redirects /ghost (no trailing slash) to admin root', async function () {
            await expectRedirectsToAdmin('/ghost', '/');
        });

        it('redirects /ghost/ to admin root', async function () {
            await expectRedirectsToAdmin('/ghost/', '/');
        });

        it('redirects /ghost/api/admin/site/ to admin API', async function () {
            await expectRedirectsToAdmin('/ghost/api/admin/site/', '/api/admin/site/');
        });
    });

    describe('does not redirect', function () {
        it('when admin redirects are disabled', async function () {
            configUtils.set({admin: {redirects: false}});

            await request(createApp())
                .get('/ghost')
                .expect(204);
        });

        it('unrelated paths', async function () {
            configUtils.set({admin: {redirects: true}});

            await request(createApp())
                .get('/admin')
                .expect(204);
            await request(createApp())
                .get('/.ghost/')
                .expect(204);
            await request(createApp())
                .get('/tag/ghost/')
                .expect(204);
        });
    });
});
