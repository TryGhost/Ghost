const assert = require('node:assert/strict');
const sinon = require('sinon');
const errors = require('@tryghost/errors');

// Module under test
const middleware = require('../../../../../../core/server/web/api/endpoints/admin/middleware');

describe('Admin API Middleware', function () {
    describe('tokenPermissionCheck', function () {
        let req, res, next;

        beforeEach(function () {
            req = {
                method: 'GET',
                path: '/posts/',
                url: '/posts',
                query: {}
            };
            res = {};
            next = sinon.stub();
        });

        afterEach(function () {
            sinon.restore();
        });

        describe('User Authentication (no API key)', function () {
            it('should call next() when user is authenticated without API key', function () {
                req.api_key = null;
                req.user = {id: 'abcd1234'};

                // Get the notImplemented middleware from the authAdminApi array
                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                assert.equal(next.firstCall.args.length, 0);
            });
        });

        describe('Staff Token Authentication', function () {
            beforeEach(function () {
                // Mock api_key as a Bookshelf model with get() method
                req.api_key = {
                    get: sinon.stub().withArgs('user_id').returns('abcd1234')
                };
                req.user = {id: 'abcd1234', role: 'Editor'};
            });

            it('should allow staff tokens to access regular endpoints', function () {
                req.path = '/posts/';
                req.method = 'GET';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                assert.equal(next.firstCall.args.length, 0);
            });

            it('should block staff tokens from DELETE /db/ endpoint', function () {
                req.path = '/db/';
                req.method = 'DELETE';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                const error = next.firstCall.args[0];
                assert.equal(error instanceof errors.NoPermissionError, true);
                assert.equal(error.message, 'Staff tokens are not allowed to access this endpoint');
            });

            it('should block staff tokens from PUT /users/owner/ endpoint', function () {
                req.path = '/users/owner/';
                req.method = 'PUT';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                const error = next.firstCall.args[0];
                assert.equal(error instanceof errors.NoPermissionError, true);
                assert.equal(error.message, 'Staff tokens are not allowed to access this endpoint');
            });

            it('should allow staff tokens to POST to /db/ endpoint', function () {
                req.path = '/db/';
                req.method = 'POST';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                assert.equal(next.firstCall.args.length, 0);
            });

            it('should allow staff tokens to GET /users/owner/ endpoint', function () {
                req.path = '/users/owner/';
                req.method = 'GET';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                assert.equal(next.firstCall.args.length, 0);
            });

            it('should allow staff tokens to access endpoints without trailing slash', function () {
                req.path = '/posts';
                req.method = 'GET';

                const notImplemented = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                notImplemented(req, res, next);

                sinon.assert.calledOnce(next);
                assert.equal(next.firstCall.args.length, 0);
            });

            it('should block staff tokens from DELETE /db (without trailing slash)', function () {
                req.path = '/db';
                req.method = 'DELETE';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                const error = next.firstCall.args[0];
                assert.equal(error instanceof errors.NoPermissionError, true);
                assert.equal(error.message, 'Staff tokens are not allowed to access this endpoint');
            });

            it('should block staff tokens from PUT /users/owner (without trailing slash)', function () {
                req.path = '/users/owner';
                req.method = 'PUT';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                const error = next.firstCall.args[0];
                assert.equal(error instanceof errors.NoPermissionError, true);
                assert.equal(error.message, 'Staff tokens are not allowed to access this endpoint');
            });
        });

        describe('Integration Token Authentication', function () {
            beforeEach(function () {
                // Mock api_key as a Bookshelf model with get() method that returns null for user_id
                req.api_key = {
                    get: sinon.stub().withArgs('user_id').returns(null)
                };
                req.user = null; // Integration tokens don't have associated users
            });

            it('should allow integration tokens to access allowlisted endpoints', function () {
                req.url = '/posts';
                req.method = 'GET';

                const notImplemented = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                notImplemented(req, res, next);

                sinon.assert.calledOnce(next);
                assert.equal(next.firstCall.args.length, 0);
            });

            it('should block integration tokens from non-allowlisted endpoints', function () {
                req.url = '/non-existent';
                req.method = 'GET';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                const error = next.firstCall.args[0];
                assert.equal(error instanceof errors.NoPermissionError, true);
                assert.equal(error.statusCode, 403);
            });

            it('should allow integration tokens to POST to /db endpoint', function () {
                req.url = '/db';
                req.method = 'POST';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                assert.equal(next.firstCall.args.length, 0);
            });

            it('should block integration tokens from DELETE /db endpoint', function () {
                req.url = '/db';
                req.method = 'DELETE';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                const error = next.firstCall.args[0];
                assert.equal(error instanceof errors.NoPermissionError, true);
                assert.equal(error.statusCode, 403);
            });
        });

        describe('God Mode', function () {
            it('should allow access in development with god_mode query param', function () {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = 'development';

                req.api_key = {
                    get: sinon.stub().withArgs('user_id').returns(null)
                };
                req.user = null;
                req.query.god_mode = 'true';
                req.url = '/non-existent';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                assert.equal(next.firstCall.args.length, 0);

                process.env.NODE_ENV = originalEnv;
            });

            it('should not allow god mode in production', function () {
                const originalEnv = process.env.NODE_ENV;
                process.env.NODE_ENV = 'production';

                req.api_key = {
                    get: sinon.stub().withArgs('user_id').returns(null)
                };
                req.user = null;
                req.query.god_mode = 'true';
                req.url = '/non-existent';

                const tokenPermissionCheck = middleware.authAdminApi[middleware.authAdminApi.length - 1];
                tokenPermissionCheck(req, res, next);

                sinon.assert.calledOnce(next);
                const error = next.firstCall.args[0];
                assert.equal(error instanceof errors.NoPermissionError, true);

                process.env.NODE_ENV = originalEnv;
            });
        });
    });
});