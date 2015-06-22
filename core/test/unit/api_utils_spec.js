/*globals describe, it, beforeEach, afterEach */
/*jshint expr:true*/
var should  = require('should'),
    sinon   = require('sinon'),
    _       = require('lodash'),
    Promise = require('bluebird'),

    apiUtils = require('../../server/api/utils');

describe('API Utils', function () {
    var sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('validate', function () {
        it('should create options when passed no args', function (done) {
            apiUtils.validate()().then(function (options) {
                options.should.eql({});
                done();
            }).catch(done);
        });

        it('should pick data attrs when passed them', function (done) {
            apiUtils.validate('test', ['id'])(
                {id: 'test', status: 'all', uuid: 'other-test'}
            ).then(function (options) {
                options.should.have.ownProperty('data');
                options.data.should.have.ownProperty('id');
                options.should.not.have.ownProperty('id');
                options.data.id.should.eql('test');

                options.data.should.not.have.ownProperty('status');
                options.should.have.ownProperty('status');
                options.status.should.eql('all');

                options.should.have.ownProperty('uuid');
                options.uuid.should.eql('other-test');
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
});
