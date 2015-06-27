/*globals describe, it, afterEach */
/*jshint expr:true*/
var should  = require('should'),
    sinon   = require('sinon'),
    _       = require('lodash'),
    Promise = require('bluebird'),

    permissions = require('../../server/permissions'),
    apiUtils = require('../../server/api/utils'),

    sandbox = sinon.sandbox.create();

describe('API Utils', function () {
    afterEach(function () {
        sandbox.restore();
    });

    describe('Default Options', function () {
        it('should provide a set of default options', function () {
            apiUtils.globalDefaultOptions.should.eql(['context', 'include']);
            apiUtils.browseDefaultOptions.should.eql(['page', 'limit']);
            apiUtils.dataDefaultOptions.should.eql(['data']);
            apiUtils.idDefaultOptions.should.eql(['id']);
        });
    });

    describe('validate', function () {
        it('should create options when passed no args', function (done) {
            apiUtils.validate()().then(function (options) {
                options.should.eql({});
                done();
            }).catch(done);
        });

        it('should pick data attrs when passed them', function (done) {
            apiUtils.validate('test', {attrs: ['id']})(
                {id: 'test', status: 'all', uuid: 'other-test'}
            ).then(function (options) {
                options.should.have.ownProperty('data');
                options.data.should.have.ownProperty('id');
                options.should.not.have.ownProperty('id');
                options.data.id.should.eql('test');

                options.data.should.not.have.ownProperty('status');
                options.should.not.have.ownProperty('status');

                options.should.not.have.ownProperty('uuid');
                done();
            }).catch(done);
        });

        it('should pick data attrs & leave options if passed', function (done) {
            apiUtils.validate('test', {attrs: ['id'], opts: ['status', 'uuid']})(
                {id: 'test', status: 'all', uuid: 'ffecea44-393c-4273-b784-e1928975ecfb'}
            ).then(function (options) {
                options.should.have.ownProperty('data');
                options.data.should.have.ownProperty('id');
                options.should.not.have.ownProperty('id');
                options.data.id.should.eql('test');

                options.data.should.not.have.ownProperty('status');
                options.should.have.ownProperty('status');
                options.status.should.eql('all');

                options.should.have.ownProperty('uuid');
                options.uuid.should.eql('ffecea44-393c-4273-b784-e1928975ecfb');
                done();
            }).catch(done);
        });

        it('should check data if an object is passed', function (done) {
            var object = {test: [{id: 1}]},
                checkObjectStub = sandbox.stub(apiUtils, 'checkObject').returns(Promise.resolve(object));

            apiUtils.validate('test')(object, {}).then(function (options) {
                checkObjectStub.calledOnce.should.be.true;
                checkObjectStub.calledWith(object, 'test').should.be.true;
                options.should.have.ownProperty('data');
                options.data.should.have.ownProperty('test');
                done();
            }).catch(done);
        });

        it('should handle options being undefined', function (done) {
            apiUtils.validate()(undefined).then(function (options) {
                options.should.eql({});
                done();
            }).catch(done);
        });

        it('should handle options being undefined when provided with object', function (done) {
            var object = {test: [{id: 1}]},
                checkObjectStub = sandbox.stub(apiUtils, 'checkObject').returns(Promise.resolve(object));

            apiUtils.validate('test')(object, undefined).then(function (options) {
                checkObjectStub.calledOnce.should.be.true;
                checkObjectStub.calledWith(object, 'test').should.be.true;
                options.should.have.ownProperty('data');
                options.data.should.have.ownProperty('test');
                done();
            }).catch(done);
        });

        it('should remove unknown options', function (done) {
            apiUtils.validate('test')({magic: 'stuff', rubbish: 'stuff'}).then(function (options) {
                options.should.not.have.ownProperty('data');
                options.should.not.have.ownProperty('rubbish');
                options.should.not.have.ownProperty('magic');
                done();
            }).catch(done);
        });

        it('should always allow context & include options', function (done) {
            apiUtils.validate('test')({context: 'stuff', include: 'stuff'}).then(function (options) {
                options.should.not.have.ownProperty('data');
                options.should.have.ownProperty('context');
                options.context.should.eql('stuff');
                options.should.have.ownProperty('include');
                options.include.should.eql('stuff');
                done();
            }).catch(done);
        });

        it('should allow page & limit options when browseDefaultOptions passed', function (done) {
            apiUtils.validate('test', {opts: apiUtils.browseDefaultOptions})(
                {context: 'stuff', include: 'stuff', page: 1, limit: 5}
            ).then(function (options) {
                options.should.not.have.ownProperty('data');
                options.should.have.ownProperty('context');
                options.context.should.eql('stuff');
                options.should.have.ownProperty('include');
                options.include.should.eql('stuff');
                options.should.have.ownProperty('page');
                options.page.should.eql(1);
                options.should.have.ownProperty('limit');
                options.limit.should.eql(5);
                done();
            }).catch(done);
        });

        it('should allow idDefaultOptions when passed', function (done) {
            // test read
            apiUtils.validate('test', {opts: apiUtils.idDefaultOptions})(
                {id: 5, context: 'stuff'}
            ).then(function (options) {
                options.should.not.have.ownProperty('data');
                options.should.not.have.ownProperty('include');
                options.should.not.have.ownProperty('page');
                options.should.not.have.ownProperty('limit');

                options.should.have.ownProperty('context');
                options.context.should.eql('stuff');
                options.should.have.ownProperty('id');
                options.id.should.eql(5);

                done();
            }).catch(done);
        });

        it('should reject if invalid options are passed', function (done) {
            apiUtils.validate('test', {opts: apiUtils.browseDefaultOptions})(
                {context: 'internal', include: 'stuff', page: 1, limit: 'none'}
            ).then(function () {
                done(new Error('Should have thrown a validation error'));
            }).catch(function (err) {
                err.should.have.enumerable('0').with.property('errorType', 'ValidationError');
                done();
            });
        });
    });

    describe('validateOptions', function () {
        var valid, invalid;

        function check(key, valid, invalid) {
            _.each(valid, function (value) {
                var options = {};
                options[key] = value;
                apiUtils.validateOptions(options).should.eql([]);
            });

            _.each(invalid, function (value) {
                var options = {}, errors;
                options[key] = value;

                errors = apiUtils.validateOptions(options);
                errors.should.be.an.Array.and.have.lengthOf(1);
                errors.should.have.enumerable('0').with.property('errorType', 'ValidationError');
            });
        }

        it('can validate `id`', function () {
            valid = [1, '1', 304, '304'];
            invalid = ['test', 'de305d54'];

            check('id', valid, invalid);
        });

        it('can validate `uuid`', function () {
            valid = ['de305d54-75b4-431b-adb2-eb6b9e546014'];
            invalid = ['de305d54-75b4-431b-adb2'];

            check('uuid', valid, invalid);
        });

        it('can validate `page`', function () {
            valid = [1, '1', 304, '304'];
            invalid = ['me', 'test', 'de305d54', -1, '-1'];

            check('page', valid, invalid);
        });

        it('can validate `limit`', function () {
            valid = [1, '1', 304, '304', 'all'];
            invalid = ['me', 'test', 'de305d54', -1, '-1'];

            check('limit', valid, invalid);
        });

        it('can validate `slug` or `status` or `author` etc as a-z, 0-9 and -', function () {
            valid = ['hello-world', 'hello', '1-2-3', 1, '-1', -1];
            invalid = ['hello_world', '!things', '?other-things', 'thing"', '`ticks`'];

            check('slug', valid, invalid);
            check('status', valid, invalid);
            check('author', valid, invalid);
        });

        it('gives no errors for `context`, `include` and `data`', function () {
            apiUtils.validateOptions({
                context: {user: 1},
                include: '"super,@random!,string?and',
                data: {object: 'thing'}
            }).should.eql([]);
        });
    });

    describe('prepareInclude', function () {
        it('should handle empty items', function () {
            apiUtils.prepareInclude('', []).should.eql([]);
        });

        it('should be empty if there are no allowed includes', function () {
            apiUtils.prepareInclude('a,b,c', []).should.eql([]);
        });

        it('should return correct includes', function () {
            apiUtils.prepareInclude('a,b,c', ['a']).should.eql(['a']);
            apiUtils.prepareInclude('a,b,c', ['a', 'c']).should.eql(['a', 'c']);
            apiUtils.prepareInclude('a,b,c', ['a', 'd']).should.eql(['a']);
            apiUtils.prepareInclude('a,b,c', ['d']).should.eql([]);
        });
    });

    describe('convertOptions', function () {
        it('should not call prepareInclude if there is no include option', function () {
            var prepareIncludeStub = sandbox.stub(apiUtils, 'prepareInclude');
            apiUtils.convertOptions(['a', 'b', 'c'])({}).should.eql({});
            prepareIncludeStub.called.should.be.false;
        });

        it('should pass options.include to prepareInclude if provided', function () {
            var expectedResult = ['a', 'b'],
                prepareIncludeStub = sandbox.stub(apiUtils, 'prepareInclude').returns(expectedResult),
                allowed = ['a', 'b', 'c'],
                options = {include: 'a,b'},
                actualResult;
            actualResult = apiUtils.convertOptions(allowed)(_.clone(options));

            prepareIncludeStub.calledOnce.should.be.true;
            prepareIncludeStub.calledWith(options.include, allowed).should.be.true;

            actualResult.should.have.hasOwnProperty('include');
            actualResult.include.should.be.an.Array;
            actualResult.include.should.eql(expectedResult);
        });
    });

    describe('checkObject', function () {
        it('throws an error if the object is empty', function (done) {
            apiUtils.checkObject({}, 'test').then(function () {
                done('This should have thrown an error');
            }).catch(function (error) {
                should.exist(error);
                error.errorType.should.eql('BadRequestError');
                done();
            });
        });

        it('throws an error if the object key is empty', function (done) {
            apiUtils.checkObject({test: []}, 'test').then(function () {
                done('This should have thrown an error');
            }).catch(function (error) {
                should.exist(error);
                error.errorType.should.eql('BadRequestError');
                done();
            });
        });

        it('throws an error if the object key is array with empty object', function (done) {
            apiUtils.checkObject({test: [{}]}, 'test').then(function () {
                done('This should have thrown an error');
            }).catch(function (error) {
                should.exist(error);
                error.errorType.should.eql('BadRequestError');
                done();
            });
        });

        it('passed through a simple, correct object', function (done) {
            var object = {test: [{id: 1}]};
            apiUtils.checkObject(_.cloneDeep(object), 'test').then(function (data) {
                should.exist(data);
                data.should.have.ownProperty('test');
                object.should.eql(data);
                done();
            }).catch(done);
        });

        it('should do author_id to author conversion for posts', function (done) {
            var object = {posts: [{id: 1, author: 4}]};
            apiUtils.checkObject(_.cloneDeep(object), 'posts').then(function (data) {
                should.exist(data);
                data.should.have.ownProperty('posts');
                data.should.not.eql(object);
                data.posts.should.be.an.Array;
                data.posts[0].should.have.ownProperty('author_id');
                data.posts[0].should.not.have.ownProperty('author');
                done();
            }).catch(done);
        });

        it('should not do author_id to author conversion for posts if not needed', function (done) {
            var object = {posts: [{id: 1, author_id: 4}]};
            apiUtils.checkObject(_.cloneDeep(object), 'posts').then(function (data) {
                should.exist(data);
                data.should.have.ownProperty('posts');
                data.should.eql(object);
                data.posts.should.be.an.Array;
                data.posts[0].should.have.ownProperty('author_id');
                data.posts[0].should.not.have.ownProperty('author');
                done();
            }).catch(done);
        });

        it('should throw error if invalid editId if provided', function (done) {
            var object = {test: [{id: 1}]};
            apiUtils.checkObject(_.cloneDeep(object), 'test', 3).then(function () {
                done('This should have thrown an error');
            }).catch(function (error) {
                should.exist(error);
                error.errorType.should.eql('BadRequestError');
                done();
            });
        });

        it('should ignore undefined editId', function (done) {
            var object = {test: [{id: 1}]};
            apiUtils.checkObject(_.cloneDeep(object), 'test', undefined).then(function (data) {
                should.exist(data);
                data.should.eql(object);
                done();
            }).catch(done);
        });

        it('should ignore editId if object has no id', function (done) {
            var object = {test: [{uuid: 1}]};
            apiUtils.checkObject(_.cloneDeep(object), 'test', 3).then(function (data) {
                should.exist(data);
                data.should.eql(object);
                done();
            }).catch(done);
        });
    });

    describe('checkFileExists', function () {
        it('should return true if file exists in input', function () {
            apiUtils.checkFileExists({test: {type: 'file', path: 'path'}}, 'test').should.be.true;
        });

        it('should return false if file does not exist in input', function () {
            apiUtils.checkFileExists({test: {type: 'file', path: 'path'}}, 'notthere').should.be.false;
        });

        it('should return false if file is incorrectly structured', function () {
            apiUtils.checkFileExists({test: 'notafile'}, 'test').should.be.false;
        });
    });

    describe('checkFileIsValid', function () {
        it('returns true if file has valid extension and type', function () {
            apiUtils.checkFileIsValid({name: 'test.txt', type: 'text'}, ['text'], ['.txt']).should.be.true;
            apiUtils.checkFileIsValid({name: 'test.jpg', type: 'jpeg'}, ['text', 'jpeg'], ['.txt', '.jpg']).should.be.true;
        });

        it('returns false if file has invalid extension', function () {
            apiUtils.checkFileIsValid({name: 'test.txt', type: 'text'}, ['text'], ['.tar']).should.be.false;
            apiUtils.checkFileIsValid({name: 'test', type: 'text'}, ['text'], ['.txt']).should.be.false;
        });

        it('returns false if file has invalid type', function () {
            apiUtils.checkFileIsValid({name: 'test.txt', type: 'text'}, ['archive'], ['.txt']).should.be.false;
        });
    });

    describe('isPublicContext', function () {
        it('should call out to permissions', function () {
            var permsStub = sandbox.stub(permissions, 'parseContext').returns({public: true});
            apiUtils.isPublicContext({context: 'test'}).should.be.true;
            permsStub.called.should.be.true;
            permsStub.calledWith('test').should.be.true;
        });
    });

    describe('applyPublicPermissions', function () {
        it('should call out to permissions', function () {
            var permsStub = sandbox.stub(permissions, 'applyPublicRules');
            apiUtils.applyPublicPermissions('test', {});
            permsStub.called.should.be.true;
            permsStub.calledWith('test', {}).should.be.true;
        });
    });

    describe('handlePublicPermissions', function () {
        it('should return empty options if passed empty options', function (done) {
            apiUtils.handlePublicPermissions('tests', 'test')({}).then(function (options) {
                options.should.eql({});
                done();
            }).catch(done);
        });

        it('should treat no context as public', function (done) {
            var aPPStub = sandbox.stub(apiUtils, 'applyPublicPermissions').returns(Promise.resolve({}));
            apiUtils.handlePublicPermissions('tests', 'test')({}).then(function (options) {
                aPPStub.calledOnce.should.eql(true);
                options.should.eql({});
                done();
            }).catch(done);
        });

        it('should treat user context as NOT public', function (done) {
            var cTMethodStub = {
                    test: {
                        test: sandbox.stub().returns(Promise.resolve())
                    }
                },
                cTStub = sandbox.stub(permissions, 'canThis').returns(cTMethodStub);

            apiUtils.handlePublicPermissions('tests', 'test')({context: {user: 1}}).then(function (options) {
                cTStub.calledOnce.should.eql(true);
                cTMethodStub.test.test.calledOnce.should.eql(true);
                options.should.eql({context: {user: 1}});
                done();
            }).catch(done);
        });

        it('should throw a permissions error if permission is not granted', function (done) {
            var cTMethodStub = {
                    test: {
                        test: sandbox.stub().returns(Promise.reject())
                    }
                },
                cTStub = sandbox.stub(permissions, 'canThis').returns(cTMethodStub);

            apiUtils.handlePublicPermissions('tests', 'test')({context: {user: 1}}).then(function () {
                done(new Error('should throw error when no permissions'));
            }).catch(function (err) {
                cTStub.calledOnce.should.eql(true);
                cTMethodStub.test.test.calledOnce.should.eql(true);
                err.errorType.should.eql('NoPermissionError');
                done();
            }).catch(done);
        });
    });
});
