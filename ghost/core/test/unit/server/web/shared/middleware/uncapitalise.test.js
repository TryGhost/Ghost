const sinon = require('sinon');
const uncapitalise = require('../../../../../../core/server/web/shared/middleware/uncapitalise');

// NOTE: all urls will have had trailing slashes added before uncapitalise is called

describe('Middleware: uncapitalise', function () {
    let res;
    let req;
    let next;

    beforeEach(function () {
        res = {
            redirect: sinon.spy(),
            set: sinon.spy()
        };
        req = {};
        next = sinon.spy();
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('Signup or reset request', function () {
        it('[signup] does nothing if there are no capitals in req.path', function (done) {
            req.path = '/ghost/signup/';
            uncapitalise(req, res, next);

            sinon.assert.calledOnce(next);
            done();
        });

        it('[signup] does nothing if there are no capitals in the baseUrl', function (done) {
            req.baseUrl = '/ghost/signup/';
            req.path = '';
            uncapitalise(req, res, next);

            sinon.assert.calledOnce(next);
            done();
        });

        it('[signup] does nothing if there are no capitals except in a token', function (done) {
            req.baseUrl = '/blog';
            req.path = '/ghost/signup/XEB123';

            uncapitalise(req, res, next);

            sinon.assert.calledOnce(next);
            done();
        });

        it('[reset] does nothing if there are no capitals except in a token', function (done) {
            req.baseUrl = '/blog';
            req.path = '/ghost/reset/NCR3NjY4NzI1ODI1OHzlcmlzZHNAZ51haWwuY29tfEpWeGxRWHUzZ3Y0cEpQRkNYYzQvbUZyc2xFSVozU3lIZHZWeFJLRml6cY54';
            uncapitalise(req, res, next);

            sinon.assert.calledOnce(next);
            done();
        });

        it('[signup] redirects if there are capitals in req.path', function (done) {
            req.path = '/ghost/SignUP/';
            req.url = req.path;

            uncapitalise(req, res, next);

            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 301, '/ghost/signup/');
            done();
        });

        it('[signup] redirects if there are capitals in req.baseUrl', function (done) {
            req.baseUrl = '/ghost/SignUP/';
            req.path = '';
            req.url = req.path;
            req.originalUrl = req.baseUrl + req.path;

            uncapitalise(req, res, next);

            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 301, '/ghost/signup/');
            done();
        });

        it('[signup] redirects correctly if there are capitals in req.path and req.baseUrl', function (done) {
            req.baseUrl = '/Blog';
            req.path = '/ghosT/signUp/';
            req.url = req.path;
            req.originalUrl = req.baseUrl + req.path;

            uncapitalise(req, res, next);

            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 301, '/blog/ghost/signup/');
            done();
        });

        it('[signup] redirects correctly with capitals in req.path if there is a token', function (done) {
            req.path = '/ghosT/sigNup/XEB123';
            req.url = req.path;

            uncapitalise(req, res, next);

            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 301, '/ghost/signup/XEB123');
            done();
        });

        it('[reset] redirects correctly with capitals in req.path & req.baseUrl if there is a token', function (done) {
            req.baseUrl = '/Blog';
            req.path = '/Ghost/Reset/NCR3NjY4NzI1ODI1OHzlcmlzZHNAZ51haWwuY29tfEpWeGxRWHUzZ3Y0cEpQRkNYYzQvbUZyc2xFSVozU3lIZHZWeFJLRml6cY54';
            req.url = req.path;
            req.originalUrl = req.baseUrl + req.path;

            uncapitalise(req, res, next);

            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 301, '/blog/ghost/reset/NCR3NjY4NzI1ODI1OHzlcmlzZHNAZ51haWwuY29tfEpWeGxRWHUzZ3Y0cEpQRkNYYzQvbUZyc2xFSVozU3lIZHZWeFJLRml6cY54');
            done();
        });
    });

    describe('An API request', function () {
        ['v0.1', 'canary', 'v10', null].forEach((apiVersion) => {
            const getApiPath = (version) => {
                return version ? `/${version}` : '';
            };

            describe(`for ${apiVersion}`, function () {
                it('does nothing if there are no capitals', function (done) {
                    req.path = `/ghost/api${getApiPath(apiVersion)}/endpoint/`;
                    uncapitalise(req, res, next);

                    sinon.assert.calledOnce(next);
                    done();
                });

                it('version identifier is uppercase', function (done) {
                    // CASE: capitalizing "empty" string does not make sense
                    if (apiVersion === null) {
                        done();
                        return;
                    }

                    req.path = `/ghost/api${getApiPath(apiVersion).toUpperCase()}/endpoint/`;
                    req.url = req.path;

                    uncapitalise(req, res, next);

                    sinon.assert.notCalled(next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, 301, `/ghost/api${getApiPath(apiVersion)}/endpoint/`);
                    done();
                });

                it('redirects to the lower case slug if there are capitals', function (done) {
                    req.path = `/ghost/api${getApiPath(apiVersion)}/ASDfJ/`;
                    req.url = req.path;

                    uncapitalise(req, res, next);

                    sinon.assert.notCalled(next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, 301, `/ghost/api${getApiPath(apiVersion)}/asdfj/`);
                    done();
                });

                it('redirects to the lower case slug if there are capitals in req.baseUrl', function (done) {
                    req.baseUrl = '/Blog';
                    req.path = `/ghost/api${getApiPath(apiVersion)}/ASDfJ/`;
                    req.url = req.path;
                    req.originalUrl = req.baseUrl + req.path;

                    uncapitalise(req, res, next);

                    sinon.assert.notCalled(next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, 301, `/blog/ghost/api${getApiPath(apiVersion)}/asdfj/`);
                    done();
                });

                it('does not convert any capitals after the endpoint', function (done) {
                    const query = '?filter=mAgic';
                    req.path = `/Ghost/API${getApiPath(apiVersion)}/settings/is_private/`;
                    req.url = `${req.path}${query}`;

                    uncapitalise(req, res, next);

                    sinon.assert.notCalled(next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, 301, `/ghost/api${getApiPath(apiVersion)}/settings/is_private/${query}`);
                    done();
                });

                it('does not convert any capitals after the endpoint with baseUrl', function (done) {
                    const query = '?filter=mAgic';
                    req.baseUrl = '/Blog';
                    req.path = `/ghost/api${getApiPath(apiVersion)}/mail/test@example.COM/`;
                    req.url = `${req.path}${query}`;
                    req.originalUrl = `${req.baseUrl}${req.path}${query}`;

                    uncapitalise(req, res, next);

                    sinon.assert.notCalled(next);
                    sinon.assert.calledOnce(res.redirect);
                    sinon.assert.calledWith(res.redirect, 301, `/blog/ghost/api${getApiPath(apiVersion)}/mail/test@example.COM/${query}`);
                    done();
                });
            });
        });
    });

    describe('Any other request', function () {
        it('does nothing if there are no capitals', function (done) {
            req.path = '/this-is-my-blog-post';
            uncapitalise(req, res, next);

            sinon.assert.calledOnce(next);
            done();
        });

        it('redirects to the lower case slug if there are capitals', function (done) {
            req.path = '/THis-iS-my-BLOg-poSt';
            req.url = req.path;

            uncapitalise(req, res, next);

            sinon.assert.notCalled(next);
            sinon.assert.calledOnce(res.redirect);
            sinon.assert.calledWith(res.redirect, 301, '/this-is-my-blog-post');
            done();
        });
    });
});
