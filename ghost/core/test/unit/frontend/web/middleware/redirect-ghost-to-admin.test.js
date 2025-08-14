const should = require('should');
const sinon = require('sinon');
const redirectGhostToAdmin = require('../../../../../core/frontend/web/middleware/redirect-ghost-to-admin');
const {handleAdminRedirect} = require('../../../../../core/frontend/web/middleware/redirect-ghost-to-admin');
const configUtils = require('../../../../utils/configUtils');
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
        redirectToAdminStub.calledOnce.should.be.true();
        redirectToAdminStub.calledWith(301, res, expectedAdminPath).should.be.true();
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
            ghostRoutes.should.have.length(0);
        });

        it('should add admin redirect route when admin:redirects is enabled', function () {
            configUtils.set({admin: {redirects: true}});

            const router = redirectGhostToAdmin();

            // Find the ghost redirect route
            const ghostRoute = router.stack.find(layer => layer.regexp.source.includes('ghost'));
            ghostRoute.should.not.be.undefined();
        });

        it('admin redirect route should match the correct regex pattern', function () {
            configUtils.set({admin: {redirects: true}});

            const router = redirectGhostToAdmin();
            const route = router.stack.find(layer => layer.regexp.source.includes('ghost'));

            // Test that the regex matches the expected paths
            route.regexp.test('/ghost').should.be.true();
            route.regexp.test('/ghost/').should.be.true();
            route.regexp.test('/ghost/api/admin/site/').should.be.true();

            // Test that it doesn't match unrelated paths
            route.regexp.test('/admin').should.be.false();
            route.regexp.test('/.ghost/').should.be.false();
            route.regexp.test('/tag/ghost/').should.be.false();
        });
    });
});
