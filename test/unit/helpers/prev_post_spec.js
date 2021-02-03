const errors = require('@tryghost/errors');
const sinon = require('sinon');
const Promise = require('bluebird');
const markdownToMobiledoc = require('../../utils/fixtures/data-generator').markdownToMobiledoc;
const helpers = require('../../../core/frontend/helpers');
const api = require('../../../core/server/api');

describe('{{prev_post}} helper', function () {
    let browsePostsStub;
    let locals;

    beforeEach(function () {
        locals = {
            root: {
                _locals: {
                    apiVersion: 'v3'
                },
                context: ['post']
            }
        };

        sinon.stub(api, 'postsPublic').get(() => {
            return {
                browse: browsePostsStub
            };
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('with valid post data - ', function () {
        beforeEach(function () {
            browsePostsStub = sinon.stub().callsFake(function (options) {
                if (options.filter.indexOf('published_at:<=') > -1) {
                    return Promise.resolve({
                        posts: [{slug: '/next/', title: 'post 3'}]
                    });
                }
            });
        });

        it('shows \'if\' template with previous post data', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.calledOnce.should.be.true();
                    inverse.calledOnce.should.be.false();

                    fn.firstCall.args.should.have.lengthOf(2);
                    fn.firstCall.args[0].should.have.properties('slug', 'title');
                    fn.firstCall.args[1].should.be.an.Object().and.have.property('data');
                    browsePostsStub.calledOnce.should.be.true();
                    browsePostsStub.firstCall.args[0].include.should.eql('author,authors,tags');

                    done();
                })
                .catch(done);
        });
    });

    describe('for valid post with no previous post', function () {
        beforeEach(function () {
            browsePostsStub = sinon.stub().callsFake(function (options) {
                if (options.filter.indexOf('published_at:<=') > -1) {
                    return Promise.resolve({posts: []});
                }
            });
        });

        it('shows \'else\' template', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.called.should.be.false();
                    inverse.called.should.be.true();

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
            browsePostsStub = sinon.stub().callsFake(function (options) {
                if (options.filter.indexOf('published_at:<=') > -1) {
                    return Promise.resolve({});
                }
            });
        });

        it('shows \'else\' template', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            helpers.prev_post
                .call({}, optionsData)
                .then(function () {
                    fn.called.should.be.false();
                    inverse.called.should.be.true();
                    browsePostsStub.called.should.be.false();

                    done();
                })
                .catch(done);
        });
    });

    describe('for page', function () {
        beforeEach(function () {
            locals = {
                root: {
                    _locals: {
                        apiVersion: 'v2'
                    },
                    context: ['page']
                }
            };

            browsePostsStub = sinon.stub().callsFake(function (options) {
                if (options.filter.indexOf('published_at:<=') > -1) {
                    return Promise.resolve({posts: [{slug: '/previous/', title: 'post 1'}]});
                }
            });
        });

        it('shows \'else\' template', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/',
                    page: true
                }, optionsData)
                .then(function () {
                    fn.called.should.be.false();
                    inverse.called.should.be.true();

                    done();
                })
                .catch(done);
        });
    });

    describe('for unpublished post', function () {
        beforeEach(function () {
            locals = {
                root: {
                    _locals: {
                        apiVersion: 'v2'
                    },
                    context: ['preview', 'post']
                }
            };

            browsePostsStub = sinon.stub().callsFake(function (options) {
                if (options.filter.indexOf('published_at:<=') > -1) {
                    return Promise.resolve({posts: [{slug: '/previous/', title: 'post 1'}]});
                }
            });
        });

        it('shows \'else\' template', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

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

    describe('with "in" option', function () {
        beforeEach(function () {
            browsePostsStub = sinon.stub().callsFake(function (options) {
                if (options.filter.indexOf('published_at:<=') > -1) {
                    return Promise.resolve({
                        posts: [{slug: '/previous/', title: 'post 1'}]
                    });
                }
            });
        });

        it('shows \'if\' template with prev post data with primary_tag set', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'primary_tag'}};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    primary_tag: {slug: 'test'},
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.calledOnce.should.be.true();
                    inverse.calledOnce.should.be.false();

                    fn.firstCall.args.should.have.lengthOf(2);
                    fn.firstCall.args[0].should.have.properties('slug', 'title');
                    fn.firstCall.args[1].should.be.an.Object().and.have.property('data');
                    browsePostsStub.calledOnce.should.be.true();
                    browsePostsStub.firstCall.args[0].include.should.eql('author,authors,tags');
                    browsePostsStub.firstCall.args[0].filter.should.match(/\+primary_tag:test/);

                    done();
                })
                .catch(done);
        });

        it('shows \'if\' template with prev post data with primary_author set', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'primary_author'}};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    primary_author: {slug: 'hans'},
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.calledOnce.should.be.true();
                    inverse.calledOnce.should.be.false();

                    fn.firstCall.args.should.have.lengthOf(2);
                    fn.firstCall.args[0].should.have.properties('slug', 'title');
                    fn.firstCall.args[1].should.be.an.Object().and.have.property('data');
                    browsePostsStub.calledOnce.should.be.true();
                    browsePostsStub.firstCall.args[0].include.should.eql('author,authors,tags');
                    browsePostsStub.firstCall.args[0].filter.should.match(/\+primary_author:hans/);

                    done();
                })
                .catch(done);
        });

        it('shows \'if\' template with prev post data with author set', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'author'}};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    author: {slug: 'author-name'},
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.calledOnce.should.be.true();
                    inverse.calledOnce.should.be.false();

                    fn.firstCall.args.should.have.lengthOf(2);
                    fn.firstCall.args[0].should.have.properties('slug', 'title');
                    fn.firstCall.args[1].should.be.an.Object().and.have.property('data');
                    browsePostsStub.calledOnce.should.be.true();
                    browsePostsStub.firstCall.args[0].include.should.eql('author,authors,tags');
                    browsePostsStub.firstCall.args[0].filter.should.match(/\+author:author-name/);

                    done();
                })
                .catch(done);
        });

        it('shows \'if\' template with prev post data & ignores in author if author isnt present', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'author'}};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.calledOnce.should.be.true();
                    inverse.calledOnce.should.be.false();

                    fn.firstCall.args.should.have.lengthOf(2);
                    fn.firstCall.args[0].should.have.properties('slug', 'title');
                    fn.firstCall.args[1].should.be.an.Object().and.have.property('data');
                    browsePostsStub.calledOnce.should.be.true();
                    browsePostsStub.firstCall.args[0].include.should.eql('author,authors,tags');
                    browsePostsStub.firstCall.args[0].filter.should.not.match(/\+author:/);

                    done();
                })
                .catch(done);
        });

        it('shows \'if\' template with prev post data & ignores unknown in value', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'magic'}};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    author: {slug: 'author-name'},
                    url: '/current/'
                }, optionsData)
                .then(function () {
                    fn.calledOnce.should.be.true();
                    inverse.calledOnce.should.be.false();

                    fn.firstCall.args.should.have.lengthOf(2);
                    fn.firstCall.args[0].should.have.properties('slug', 'title');
                    fn.firstCall.args[1].should.be.an.Object().and.have.property('data');
                    browsePostsStub.calledOnce.should.be.true();
                    browsePostsStub.firstCall.args[0].include.should.eql('author,authors,tags');
                    browsePostsStub.firstCall.args[0].filter.should.not.match(/\+magic/);

                    done();
                })
                .catch(done);
        });
    });

    describe('general error handling', function () {
        beforeEach(function () {
            browsePostsStub = sinon.stub().callsFake(function (options) {
                return Promise.reject(new errors.NotFoundError({message: 'Something wasn\'t found'}));
            });
        });

        it('should handle error from the API', function (done) {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            helpers.prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
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
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: {root: {}}};

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
