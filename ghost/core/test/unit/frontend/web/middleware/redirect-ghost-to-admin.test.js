const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const redirectGhostToAdmin = require('../../../../../core/frontend/web/middleware/redirect-ghost-to-admin');
const {handleAdminRedirect} = require('../../../../../core/frontend/web/middleware/redirect-ghost-to-admin');
const configUtils = require('../../../../utils/config-utils');
const urlUtils = require('../../../../../core/shared/url-utils');

describe('Redirect Ghost To Admin', function () {
    let req;
    let res;
    let redirectToAdminStub;

    beforeEach(function () {
        req = {
            path: ''
        };
        res = {
            redirect: sinon.spy()
        };

        redirectToAdminStub = sinon.stub(urlUtils, 'redirectToAdmin');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    // Helper function to test redirect behavior
    const expectPathCallsRedirectToAdminWith = (inputPath, expectedAdminPath) => {
        req.path = inputPath;
        handleAdminRedirect(req, res);
        sinon.assert.calledOnce(redirectToAdminStub);
        sinon.assert.calledWith(redirectToAdminStub, 301, res, expectedAdminPath);
    };

    describe('handleAdminRedirect function', function () {
        it('should redirect /ghost (no trailing slash) to admin root', function () {
            expectPathCallsRedirectToAdminWith('/ghost', '/');
        });

        it('should redirect /ghost/ to admin root', function () {
            expectPathCallsRedirectToAdminWith('/ghost/', '/');
        });

        it('should redirect /ghost/api/admin/site/ to admin API', function () {
            expectPathCallsRedirectToAdminWith('/ghost/api/admin/site/', '/api/admin/site/');
        });
    });

    describe('redirectGhostToAdmin middleware', function () {
        it('should return router with no routes when admin:redirects is disabled', function () {
            configUtils.set({admin: {redirects: false}});

            const router = redirectGhostToAdmin();

            // When disabled, no ghost redirect routes should be added
            const ghostRoutes = router.stack.filter(layer => layer.regexp.source.includes('ghost'));
            assert.equal(ghostRoutes.length, 0);
        });

        it('should add admin redirect route when admin:redirects is enabled', function () {
            configUtils.set({admin: {redirects: true}});

            const router = redirectGhostToAdmin();

            // Find the ghost redirect route
            const ghostRoute = router.stack.find(layer => layer.regexp.source.includes('ghost'));
            assertExists(ghostRoute);
        });

        it('admin redirect route should match the correct regex pattern', function () {
            configUtils.set({admin: {redirects: true}});

            const router = redirectGhostToAdmin();
            const route = router.stack.find(layer => layer.regexp.source.includes('ghost'));

            // Test that the regex matches the expected paths
            assert.equal(route.regexp.test('/ghost'), true);
            assert.equal(route.regexp.test('/ghost/'), true);
            assert.equal(route.regexp.test('/ghost/api/admin/site/'), true);

            // Test that it doesn't match unrelated paths
            assert.equal(route.regexp.test('/admin'), false);
            assert.equal(route.regexp.test('/.ghost/'), false);
            assert.equal(route.regexp.test('/tag/ghost/'), false);
        });
    });
});
