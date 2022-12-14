const should = require('should');
const sinon = require('sinon');

// Thing we are testing
const redirectAdminUrls = require('../../../../../core/server/web/admin/middleware/redirect-admin-urls');

describe('Admin App', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('middleware', function () {
        describe('redirectAdminUrls', function () {
            let req;
            let res;
            let next;
            // Input: req.originalUrl
            // Output: either next or res.redirect are called
            beforeEach(function () {
                req = {};
                res = {};
                next = sinon.stub();
                res.redirect = sinon.stub();
            });

            it('should redirect a url which starts with ghost', function () {
                req.originalUrl = '/ghost/x';

                redirectAdminUrls(req, res, next);

                next.called.should.be.false();
                res.redirect.called.should.be.true();
                res.redirect.calledWith('/ghost/#/x').should.be.true();
            });

            it('should not redirect /ghost/ on its owh', function () {
                req.originalUrl = '/ghost/';

                redirectAdminUrls(req, res, next);

                next.called.should.be.true();
                res.redirect.called.should.be.false();
            });

            it('should not redirect url that has no slash', function () {
                req.originalUrl = 'ghost/x';

                redirectAdminUrls(req, res, next);

                next.called.should.be.true();
                res.redirect.called.should.be.false();
            });

            it('should not redirect url that starts with something other than /ghost/', function () {
                req.originalUrl = 'x/ghost/x';

                redirectAdminUrls(req, res, next);

                next.called.should.be.true();
                res.redirect.called.should.be.false();
            });
        });
    });
});
