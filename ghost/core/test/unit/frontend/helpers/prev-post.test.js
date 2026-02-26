const errors = require('@tryghost/errors');
const sinon = require('sinon');
const markdownToMobiledoc = require('../../../utils/fixtures/data-generator').markdownToMobiledoc;
const prev_post = require('../../../../core/frontend/helpers/prev_post');
const api = require('../../../../core/frontend/services/proxy').api;
const logging = require('@tryghost/logging');

describe('{{prev_post}} helper', function () {
    let browsePostsStub;
    let locals;

    beforeEach(function () {
        locals = {
            root: {
                _locals: {},
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

        it('shows \'if\' template with previous post data', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/'
                }, optionsData);

            sinon.assert.calledOnceWithExactly(
                fn,
                sinon.match({
                    slug: sinon.match.string,
                    title: sinon.match.string
                }),
                sinon.match({data: sinon.match.any})
            );

            sinon.assert.notCalled(inverse);

            sinon.assert.calledOnceWithExactly(
                browsePostsStub,
                sinon.match({include: 'author,authors,tags,tiers'})
            );
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

        it('shows \'else\' template', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/'
                }, optionsData);

            sinon.assert.notCalled(fn);

            sinon.assert.calledOnceWithExactly(
                inverse,
                sinon.match({
                    slug: sinon.match.string,
                    title: sinon.match.string
                }),
                sinon.match({data: sinon.match.any})
            );
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

        it('shows \'else\' template', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            await prev_post
                .call({}, optionsData);

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
            sinon.assert.notCalled(browsePostsStub);
        });
    });

    describe('for page', function () {
        beforeEach(function () {
            locals = {
                root: {
                    _locals: {},
                    context: ['page']
                }
            };

            browsePostsStub = sinon.stub().callsFake(function (options) {
                if (options.filter.indexOf('published_at:<=') > -1) {
                    return Promise.resolve({posts: [{slug: '/previous/', title: 'post 1'}]});
                }
            });
        });

        it('shows \'else\' template', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/',
                    page: true
                }, optionsData);

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
        });
    });

    describe('for unpublished post', function () {
        beforeEach(function () {
            locals = {
                root: {
                    _locals: {},
                    context: ['preview', 'post']
                }
            };

            browsePostsStub = sinon.stub().callsFake(function (options) {
                if (options.filter.indexOf('published_at:<=') > -1) {
                    return Promise.resolve({posts: [{slug: '/previous/', title: 'post 1'}]});
                }
            });
        });

        it('shows \'else\' template', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            await prev_post
                .call({
                    html: 'content',
                    status: 'draft',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    created_at: new Date(0),
                    url: '/current/'
                }, optionsData);

            sinon.assert.notCalled(fn);
            sinon.assert.called(inverse);
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

        it('shows \'if\' template with prev post data with primary_tag set', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'primary_tag'}};

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    primary_tag: {slug: 'test'},
                    url: '/current/'
                }, optionsData);

            sinon.assert.calledOnceWithExactly(
                fn,
                sinon.match({
                    slug: sinon.match.string,
                    title: sinon.match.string
                }),
                sinon.match({data: sinon.match.any})
            );

            sinon.assert.notCalled(inverse);

            sinon.assert.calledOnceWithExactly(
                browsePostsStub,
                sinon.match({
                    include: 'author,authors,tags,tiers',
                    filter: sinon.match(/\+primary_tag:test/)
                })
            );
        });

        it('shows \'if\' template with prev post data with primary_author set', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'primary_author'}};

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    primary_author: {slug: 'hans'},
                    url: '/current/'
                }, optionsData);

            sinon.assert.calledOnceWithExactly(
                fn,
                sinon.match({
                    slug: sinon.match.string,
                    title: sinon.match.string
                }),
                sinon.match({data: sinon.match.any})
            );

            sinon.assert.notCalled(inverse);

            sinon.assert.calledOnceWithExactly(
                browsePostsStub,
                sinon.match({
                    include: 'author,authors,tags,tiers',
                    filter: sinon.match(/\+primary_author:hans/)
                })
            );
        });

        it('shows \'if\' template with prev post data with author set', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'author'}};

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    author: {slug: 'author-name'},
                    url: '/current/'
                }, optionsData);

            sinon.assert.calledOnceWithExactly(
                fn,
                sinon.match({
                    slug: sinon.match.string,
                    title: sinon.match.string
                }),
                sinon.match({data: sinon.match.any})
            );

            sinon.assert.notCalled(inverse);

            sinon.assert.calledOnceWithExactly(
                browsePostsStub,
                sinon.match({
                    include: 'author,authors,tags,tiers',
                    filter: sinon.match(/\+author:author-name/)
                })
            );
        });

        it('shows \'if\' template with prev post data & ignores in author if author isnt present', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'author'}};

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/'
                }, optionsData);

            sinon.assert.calledOnceWithExactly(
                fn,
                sinon.match({
                    slug: sinon.match.string,
                    title: sinon.match.string
                }),
                sinon.match({data: sinon.match.any})
            );

            sinon.assert.notCalled(inverse);

            sinon.assert.calledOnceWithExactly(
                browsePostsStub,
                sinon.match({
                    include: 'author,authors,tags,tiers',
                    filter: sinon.match(filter => !/\+author:/.test(filter))
                })
            );
        });

        it('shows \'if\' template with prev post data & ignores unknown in value', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse, hash: {in: 'magic'}};

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    author: {slug: 'author-name'},
                    url: '/current/'
                }, optionsData);

            sinon.assert.calledOnceWithExactly(
                fn,
                sinon.match({
                    slug: sinon.match.string,
                    title: sinon.match.string
                }),
                sinon.match({data: sinon.match.any})
            );

            sinon.assert.notCalled(inverse);

            sinon.assert.calledOnceWithExactly(
                browsePostsStub,
                sinon.match({
                    include: 'author,authors,tags,tiers',
                    filter: sinon.match(filter => !/\+magic/.test(filter))
                })
            );
        });
    });

    describe('general error handling', function () {
        beforeEach(function () {
            browsePostsStub = sinon.stub().callsFake(function () {
                return Promise.reject(new errors.NotFoundError({message: 'Something wasn\'t found'}));
            });
        });

        it('should handle error from the API', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};
            const loggingStub = sinon.stub(logging, 'error');

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/'
                }, optionsData);

            sinon.assert.notCalled(fn);

            sinon.assert.calledOnceWithExactly(
                inverse,
                sinon.match.any,
                sinon.match({
                    data: sinon.match({
                        error: sinon.match(/^Something wasn't found/)
                    })
                })
            );

            sinon.assert.calledOnce(loggingStub);
        });

        it('should show warning for call without any options', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: {root: {}}};

            await prev_post
                .call(
                    {},
                    optionsData
                );

            sinon.assert.notCalled(fn);
            sinon.assert.notCalled(inverse);
        });
    });

    describe('auth', function () {
        let member;

        beforeEach(function () {
            member = {uuid: 'test'};
            browsePostsStub = sinon.stub().callsFake(function () {
                return Promise.resolve({
                    posts: [{slug: '/next/', title: 'post 3'}]
                });
            });
            locals = {
                root: {
                    _locals: {},
                    context: ['post']
                },
                member
            };
        });

        it('should pass the member context', async function () {
            const fn = sinon.spy();
            const inverse = sinon.spy();
            const optionsData = {name: 'prev_post', data: locals, fn: fn, inverse: inverse};

            await prev_post
                .call({
                    html: 'content',
                    status: 'published',
                    mobiledoc: markdownToMobiledoc('ff'),
                    title: 'post2',
                    slug: 'current',
                    published_at: new Date(0),
                    url: '/current/'
                }, optionsData);

            sinon.assert.calledOnceWithExactly(
                fn,
                sinon.match({
                    slug: sinon.match.string,
                    title: sinon.match.string
                }),
                sinon.match({data: sinon.match.any})
            );

            sinon.assert.notCalled(inverse);

            sinon.assert.calledOnceWithExactly(
                browsePostsStub,
                sinon.match({
                    include: 'author,authors,tags,tiers',
                    // Check context passed
                    context: sinon.match({member})
                })
            );
        });
    });
});
