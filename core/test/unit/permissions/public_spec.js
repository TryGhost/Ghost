var should = require('should'), // jshint ignore:line
    _ = require('lodash'),
    errors = require('../../../server/errors'),
    applyPublicRules = require('../../../server/permissions/public');

describe('Permissions', function () {
    describe('applyPublicRules', function () {
        it('should return empty object for docName with no rules', function (done) {
            applyPublicRules('test', 'test', {}).then(function (result) {
                result.should.eql({});
                done();
            });
        });

        it('should return unchanged object for non-public context', function (done) {
            var internal = {context: 'internal'},
                user = {context: {user: 1}},
                app = {context: {app: 1}};

            applyPublicRules('posts', 'browse', _.cloneDeep(internal)).then(function (result) {
                result.should.eql(internal);

                return applyPublicRules('posts', 'browse', _.cloneDeep(user));
            }).then(function (result) {
                result.should.eql(user);

                return applyPublicRules('posts', 'browse', _.cloneDeep(app));
            }).then(function (result) {
                result.should.eql(app);

                done();
            }).catch(done);
        });

        it('should return unchanged object for post with public context', function (done) {
            var publicContext = {context: {}};

            applyPublicRules('posts', 'browse', _.cloneDeep(publicContext)).then(function (result) {
                result.should.not.eql(publicContext);
                result.should.eql({
                    context: {},
                    status: 'published'
                });

                return applyPublicRules('posts', 'browse', _.extend({}, _.cloneDeep(publicContext), {status: 'published'}));
            }).then(function (result) {
                result.should.eql({
                    context: {},
                    status: 'published'
                });

                done();
            }).catch(done);
        });

        it('should throw an error for draft post without uuid (read)', function (done) {
            var draft = {context: {}, data: {status: 'draft'}};

            applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                (err instanceof errors.NoPermissionError).should.eql(true);
                done();
            });
        });

        it('should throw an error for draft post (browse)', function (done) {
            var draft = {context: {}, status: 'draft'};

            applyPublicRules('posts', 'browse', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                (err instanceof errors.NoPermissionError).should.eql(true);
                done();
            });
        });

        it('should permit post draft status with uuid (read)', function (done) {
            var draft = {context: {}, data: {status: 'draft', uuid: '1234-abcd'}};

            applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function (result) {
                result.should.eql(draft);
                done();
            }).catch(done);
        });

        it('should permit post all status with uuid (read)', function (done) {
            var draft = {context: {}, data: {status: 'all', uuid: '1234-abcd'}};

            applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function (result) {
                result.should.eql(draft);
                done();
            }).catch(done);
        });

        it('should NOT permit post draft status with uuid (browse)', function (done) {
            var draft = {context: {}, status: 'draft', uuid: '1234-abcd'};

            applyPublicRules('posts', 'browse', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                (err instanceof errors.NoPermissionError).should.eql(true);
                done();
            });
        });

        it('should NOT permit post all status with uuid (browse)', function (done) {
            var draft = {context: {}, status: 'all', uuid: '1234-abcd'};

            applyPublicRules('posts', 'browse', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                (err instanceof errors.NoPermissionError).should.eql(true);
                done();
            });
        });

        it('should throw an error for draft post with uuid and id or slug (read)', function (done) {
            var draft = {context: {}, data: {status: 'draft', uuid: '1234-abcd', id: 1}};

            applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function () {
                done('Did not throw an error for draft');
            }).catch(function (err) {
                (err instanceof errors.NoPermissionError).should.eql(true);

                draft = {context: {}, data: {status: 'draft', uuid: '1234-abcd', slug: 'abcd'}};

                return applyPublicRules('posts', 'read', _.cloneDeep(draft)).then(function () {
                    done('Did not throw an error for draft');
                }).catch(function (err) {
                    (err instanceof errors.NoPermissionError).should.eql(true);
                    done();
                });
            });
        });

        it('should return unchanged object for user with public context', function (done) {
            var publicContext = {context: {}};

            applyPublicRules('users', 'browse', _.cloneDeep(publicContext)).then(function (result) {
                result.should.not.eql(publicContext);
                result.should.eql({
                    context: {},
                    status: 'all'
                });

                return applyPublicRules('users', 'browse', _.extend({}, _.cloneDeep(publicContext), {status: 'active'}));
            }).then(function (result) {
                result.should.eql({
                    context: {},
                    status: 'active'
                });

                done();
            }).catch(done);
        });
    });
});
