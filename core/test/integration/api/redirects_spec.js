var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    Promise = require('bluebird'),
    RedirectsAPI = require('../../../server/api/redirects'),
    mail = require('../../../server/api/mail'),
    sandbox = sinon.sandbox.create();

should.equal(true, true);

describe('Redirects API', function () {
    beforeEach(testUtils.teardown);
    beforeEach(testUtils.setup('settings', 'users:roles', 'perms:redirect', 'perms:init'));

    beforeEach(function () {
        sandbox.stub(mail, 'send', function () {
            return Promise.resolve();
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(testUtils.teardown);

    describe('Permissions', function () {
        describe('Owner', function () {
            it('Can upload', function (done) {
                RedirectsAPI.upload(testUtils.context.owner)
                    .then(function () {
                        done();
                    })
                    .catch(done);
            });

            it('Can download', function (done) {
                RedirectsAPI.download(testUtils.context.owner)
                    .then(function () {
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Admin', function () {
            it('Can upload', function (done) {
                RedirectsAPI.upload(testUtils.context.admin)
                    .then(function () {
                        done();
                    })
                    .catch(done);
            });

            it('Can download', function (done) {
                RedirectsAPI.download(testUtils.context.admin)
                    .then(function () {
                        done();
                    })
                    .catch(done);
            });
        });

        describe('Editor', function () {
            it('Can\'t upload', function (done) {
                RedirectsAPI.upload(testUtils.context.editor)
                    .then(function () {
                        done(new Error('Editor is not allowed to upload redirects.'));
                    })
                    .catch(function (err) {
                        err.statusCode.should.eql(403);
                        done();
                    });
            });

            it('Can\'t download', function (done) {
                RedirectsAPI.upload(testUtils.context.editor)
                    .then(function () {
                        done(new Error('Editor is not allowed to download redirects.'));
                    })
                    .catch(function (err) {
                        err.statusCode.should.eql(403);
                        done();
                    });
            });
        });

        describe('Author', function () {
            it('Can\'t upload', function (done) {
                RedirectsAPI.upload(testUtils.context.author)
                    .then(function () {
                        done(new Error('Author is not allowed to upload redirects.'));
                    })
                    .catch(function (err) {
                        err.statusCode.should.eql(403);
                        done();
                    });
            });

            it('Can\'t download', function (done) {
                RedirectsAPI.upload(testUtils.context.author)
                    .then(function () {
                        done(new Error('Author is not allowed to download redirects.'));
                    })
                    .catch(function (err) {
                        err.statusCode.should.eql(403);
                        done();
                    });
            });
        });
    });
});
