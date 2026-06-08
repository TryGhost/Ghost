const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

// Thing we are testing
const redirectAdminUrls = require('../../../../../core/server/web/admin/middleware/redirect-admin-urls');

describe('Admin App', function () {
    describe('middleware', function () {
        describe('redirectAdminUrls', function () {
            const app = express();

            app.use(redirectAdminUrls);
            app.use((req, res) => {
                res.json({url: req.originalUrl});
            });

            it('should redirect a url which starts with ghost', async function () {
                await request(app)
                    .get('/ghost/x')
                    .expect(302)
                    .expect('Location', '/ghost/#/x');
            });

            it('should not redirect /ghost/ on its own', async function () {
                const {body} = await request(app)
                    .get('/ghost/')
                    .expect(200);

                assert.deepEqual(body, {url: '/ghost/'});
            });

            it('should not redirect url that starts with something other than /ghost/', async function () {
                const {body} = await request(app)
                    .get('/x/ghost/x')
                    .expect(200);

                assert.deepEqual(body, {url: '/x/ghost/x'});
            });

            it('should strip a trailing slash before building the hash url', async function () {
                await request(app)
                    .get('/ghost/members/import/')
                    .expect(302)
                    .expect('Location', '/ghost/#/members/import');
            });

            it('should strip a trailing slash before the query string', async function () {
                await request(app)
                    .get('/ghost/members/import/?source=link')
                    .expect(302)
                    .expect('Location', '/ghost/#/members/import?source=link');
            });

            it('should preserve trailing slashes inside query values', async function () {
                await request(app)
                    .get('/ghost/members/import?next=/settings/')
                    .expect(302)
                    .expect('Location', '/ghost/#/members/import?next=/settings/');
            });
        });
    });
});
