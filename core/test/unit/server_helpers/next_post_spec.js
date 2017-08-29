var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    Promise = require('bluebird'),
    markdownToMobiledoc = require('../../utils/fixtures/data-generator').markdownToMobiledoc,
// Stuff we are testing
    helpers = require('../../../server/helpers'),
    api = require('../../../server/api'),
    errors = require('../../../server/errors'),

    sandbox = sinon.sandbox.create();

describe('{{next_post}} helper', function () {
    var readPostStub;

    afterEach(function () {
        sandbox.restore();
    });

    describe('with valid post data - ', function () {
        beforeEach(function () {
            readPostStub = sandbox.stub(api.posts, 'read', function (options) {
                if (options.include.indexOf('next') === 0) {
                    return Promise.resolve({
                        posts: [{slug: '/current/', title: 'post 2', next: {slug: '/next/', title: 'post 3'}}]
                    });
                }
            });
        });

        it('shows \'if\' template with next post data', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post', fn: fn, inverse: inverse};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    created_at: new Date(0),
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.calledOnce.should.be.true();
                    inverse.calledOnce.should.be.false();

                    console.log(fn.firstCall.args);
                    fn.firstCall.args.should.have.lengthOf(2);
                    fn.firstCall.args[0].should.have.properties('slug', 'title');
                    fn.firstCall.args[1].should.be.an.Object().and.have.property('data');
                    readPostStub.calledOnce.should.be.true();
                    readPostStub.firstCall.args[0].include.should.eql('next,next.author,next.tags');
                    done();
                })
                .catch(done);
        });
    });

    describe('for valid post with no next post', function () {
        beforeEach(function () {
            readPostStub = sandbox.stub(api.posts, 'read', function (options) {
                if (options.include.indexOf('next') === 0) {
                    return Promise.resolve({posts: [{slug: '/current/', title: 'post 2'}]});
                }
            });
        });

        it('shows \'else\' template', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post', fn: fn, inverse: inverse};

            helpers.prev_post
                .call({
                    html: 'content',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    created_at: new Date(0),
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.called.should.be.false();
                    inverse.called.should.be.true();

                    console.log(inverse.firstCall.args);
                    inverse.firstCall.args.should.have.lengthOf(2);
                    inverse.firstCall.args[0].should.have.properties('slug', 'title');
                    inverse.firstCall.args[1].should.be.an.Object().and.have.property('data');

                    done();
                })
                .catch(done);
        });
    });

    describe('for invalid post data', function () {
        beforeEach(function () {
            readPostStub = sandbox.stub(api.posts, 'read', function (options) {
                if (options.include.indexOf('next') === 0) {
                    return Promise.resolve({});
                }
            });
        });

        it('shows \'else\' template', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post', fn: fn, inverse: inverse};

            helpers.prev_post
                .call({}, optionsData)
                .then(function () {
                    fn.called.should.be.false();
                    inverse.called.should.be.true();
                    readPostStub.called.should.be.false();
                    done();
                })
                .catch(done);
        });
    });

    describe('for unpublished post', function () {
        beforeEach(function () {
            readPostStub = sandbox.stub(api.posts, 'read', function (options) {
                if (options.include.indexOf('next') === 0) {
                    return Promise.resolve({
                        posts: [{slug: '/current/', title: 'post 2', next: {slug: '/next/', title: 'post 3'}}]
                    });
                }
            });
        });

        it('shows \'else\' template', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post', fn: fn, inverse: inverse};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'draft',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    created_at: new Date(0),
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.called.should.be.false();
                    inverse.called.should.be.true();
                    done();
                })
                .catch(done);
        });
    });

    describe('general error handling', function () {
        beforeEach(function () {
            readPostStub = sandbox.stub(api.posts, 'read', function () {
                return Promise.reject(new errors.NotFoundError({message: 'Something wasn\'t found'}));
            });
        });

        it('should handle error from the API', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post', fn: fn, inverse: inverse};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    created_at: new Date(0),
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.called.should.be.false();
                    inverse.calledOnce.should.be.true();

                    inverse.firstCall.args[1].should.be.an.Object().and.have.property('data');
                    inverse.firstCall.args[1].data.should.be.an.Object().and.have.property('error');
                    inverse.firstCall.args[1].data.error.should.match(/^Something wasn't found/);

                    done();
                })
                .catch(done);
        });

        it('should show warning for call without any options', function (done) {
            var fn = sinon.spy(),
                inverse = sinon.spy(),
                optionsData = {name: 'next_post'};

            helpers.prev_post
                .call(
                    {},
                    optionsData
                )
                .then(function () {
                    fn.called.should.be.false();
                    inverse.called.should.be.false();

                    done();
                })
                .catch(done);
        });
    });
});
