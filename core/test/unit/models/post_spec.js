'use strict';

const should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    knex = require('../../../server/data/db').knex,
    models = require('../../../server/models'),
    common = require('../../../server/lib/common'),
    security = require('../../../server/lib/security'),
    utils = require('../../utils'),
    sandbox = sinon.sandbox.create();

describe('Unit: models/post', function () {
    let knexMock;

    before(function () {
        models.init();
    });

    before(function () {
        knexMock = new testUtils.mocks.knex();
        knexMock.mock();
    });

    beforeEach(function () {
        sandbox.stub(security.password, 'hash').resolves('$2a$10$we16f8rpbrFZ34xWj0/ZC.LTPUux8ler7bcdTs5qIleN6srRHhilG');
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        knexMock.unmock();
    });

    after(function () {
        sandbox.restore();
    });

    describe('Edit', function () {
        it('resets given empty value to null', function () {
            return models.Post.findOne({slug: 'html-ipsum'})
                .then(function (post) {
                    post.get('slug').should.eql('html-ipsum');
                    post.get('feature_image').should.eql('https://example.com/super_photo.jpg');
                    post.set('feature_image', '');
                    post.set('custom_excerpt', '');
                    return post.save();
                })
                .then(function (post) {
                    should(post.get('feature_image')).be.null();
                    post.get('custom_excerpt').should.eql('');
                });
        });
    });

    describe('Relations', function () {
        describe('author/authors', function () {
            describe('add', function () {
                it('with invalid post.author_id', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    post.author_id = '12345';

                    return models.Post.add(post, {
                        context: {user: testUtils.DataGenerator.forKnex.users[2].id},
                        withRelated: ['author', 'authors']
                    }).then(function () {
                        'Expected error'.should.eql(false);
                    }).catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.eql(true);
                    });
                });

                it('with invalid post.authors[0].id', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    delete post.author_id;
                    delete post.author;

                    post.authors = [{
                        id: '12345'
                    }];

                    return models.Post.add(post, {
                        context: {user: testUtils.DataGenerator.forKnex.users[2].id},
                        withRelated: ['author', 'authors']
                    }).then(function () {
                        'Expected error'.should.eql(false);
                    }).catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.eql(true);
                    });
                });

                // NOTE: this can be supported as soon as we remove the deprecation for post.author_id
                it('[unsupported] insert post.authors[0]', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    delete post.author_id;
                    delete post.author;

                    post.authors = [{
                        name: 'Gregor'
                    }];

                    return models.Post.add(post, {
                        context: {user: testUtils.DataGenerator.forKnex.users[2].id},
                        withRelated: ['author', 'authors']
                    }).then(function () {
                        'Expected error'.should.eql(false);
                    }).catch(function (err) {
                        (err[0] instanceof common.errors.ValidationError).should.eql(true);
                    });
                });

                it('with invalid post.author_id', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    post.author_id = '12345';

                    return models.Post.add(post, {
                        context: {user: testUtils.DataGenerator.forKnex.users[2].id},
                        withRelated: ['author', 'authors']
                    }).then(function () {
                        'Expected error'.should.eql(false);
                    }).catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.eql(true);
                    });
                });

                it('without author_id/author/authors', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    delete post.author_id;
                    delete post.author;
                    delete post.authors;

                    return models.Post.add(post, {
                        context: {user: testUtils.DataGenerator.forKnex.users[2].id},
                        withRelated: ['author', 'authors']
                    }).then(function (post) {
                        post = post.toJSON();
                        post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                        post.authors.length.should.eql(1);
                        post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                    });
                });

                it('without author/authors', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    post.author_id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);

                    return models.Post.add(post, {withRelated: ['author', 'authors']})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            post.authors.length.should.eql(1);
                            post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                        });
                });

                it('without author/authors', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    post.author_id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);

                    return models.Post.add(post, {withRelated: ['author']})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            should.not.exist(post.authors);
                        });
                });

                it('with author, with author_id', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    post.author_id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                    post.author = {
                        id: testUtils.DataGenerator.forKnex.users[1].id
                    };

                    return models.Post.add(post, {withRelated: ['author']})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            should.not.exist(post.authors);
                        });
                });

                it('[unsupported] with author, without author_id', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    delete post.author_id;
                    post.author = {
                        id: testUtils.DataGenerator.forKnex.users[2].id
                    };

                    return models.Post.add(post, {
                        withRelated: ['author'],
                        context: {user: testUtils.DataGenerator.forKnex.users[0].id}
                    }).then(function (post) {
                        post = post.toJSON();

                        // no update happened, because `post.author` is ignored
                        post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                        should.not.exist(post.authors);
                    });
                });

                it('with authors, with author_id', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    post.author_id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                    post.authors = [{
                        id: testUtils.DataGenerator.forKnex.users[0].id
                    }];

                    return models.Post.add(post, {withRelated: ['author', 'authors']})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            post.authors.length.should.eql(1);
                            post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                        });
                });

                it('with authors, without author_id', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    delete post.author_id;
                    post.authors = [{
                        id: testUtils.DataGenerator.forKnex.users[0].id
                    }];

                    return models.Post.add(post, {
                        context: {user: testUtils.DataGenerator.forKnex.users[0].id},
                        withRelated: ['author', 'authors']
                    }).then(function (post) {
                        post = post.toJSON();
                        post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                        post.authors.length.should.eql(1);
                        post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                    });
                });
            });

            describe('findOne', function () {
                it('withRelated: []', function () {
                    return models.Post.findOne({id: testUtils.DataGenerator.forKnex.posts[3].id}, {withRelated: []})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            should.not.exist(post.authors);
                            should.not.exist(post.author_id);
                        });
                });

                it('withRelated: [author]', function () {
                    return models.Post.findOne({id: testUtils.DataGenerator.forKnex.posts[3].id}, {withRelated: ['author']})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            should.not.exist(post.authors);
                        });
                });

                it('withRelated: [authors]', function () {
                    return models.Post.findOne({id: testUtils.DataGenerator.forKnex.posts[3].id}, {withRelated: ['authors']})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            post.authors.length.should.eql(2);
                            post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            post.authors[1].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                        });
                });

                it('withRelated: [authors, author]', function () {
                    return models.Post.findOne({id: testUtils.DataGenerator.forKnex.posts[3].id}, {withRelated: ['authors', 'author']})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            post.authors.length.should.eql(2);
                            post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            post.authors[1].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                        });
                });
            });

            describe('edit', function () {
                beforeEach(function () {
                    knexMock.resetDb();

                    // posts[3] has the following author_id
                    testUtils.DataGenerator.forKnex.posts[3].author_id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);

                    // posts[3] has two authors relations
                    testUtils.DataGenerator.forKnex.posts_authors[3].post_id.should.eql(testUtils.DataGenerator.forKnex.posts[3].id);
                    testUtils.DataGenerator.forKnex.posts_authors[3].author_id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                    testUtils.DataGenerator.forKnex.posts_authors[4].post_id.should.eql(testUtils.DataGenerator.forKnex.posts[3].id);
                    testUtils.DataGenerator.forKnex.posts_authors[4].author_id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                });

                it('[not allowed] post.authors = []', function () {
                    const data = {
                        authors: []
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        withRelated: ['authors', 'author']
                    }).then(function () {
                        'Expected Error'.should.eql(true);
                    }).catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.be.true;
                    });
                });

                it('[not allowed] primary authors are not equal', function () {
                    const data = {
                        author_id: testUtils.DataGenerator.forKnex.users[2].id,
                        authors: [{
                            id: testUtils.DataGenerator.forKnex.users[1].id
                        }]
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        withRelated: ['authors', 'author']
                    }).then(function () {
                        'Expected Error'.should.eql(true);
                    }).catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.be.true;
                    });
                });

                it('[not allowed] primary authors are not equal', function () {
                    const data = {
                        author: {
                            id: testUtils.DataGenerator.forKnex.users[2].id
                        },
                        authors: [{
                            id: testUtils.DataGenerator.forKnex.users[1].id
                        }]
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        withRelated: ['authors', 'author']
                    }).then(function () {
                        'Expected Error'.should.eql(true);
                    }).catch(function (err) {
                        (err instanceof common.errors.ValidationError).should.be.true;
                    });
                });

                it('change post.author_id [has existing post.authors]', function () {
                    const data = {
                        author_id: testUtils.DataGenerator.forKnex.users[1].id
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        withRelated: ['authors', 'author']
                    }).then(function (post) {
                        post = post.toJSON();
                        post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[1].id);
                        post.authors.length.should.eql(2);
                        post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[1].id);
                        post.authors[1].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                    });
                });

                it('change post.author_id [has existing post.authors] [without `withRelated`]', function () {
                    const data = {
                        author_id: testUtils.DataGenerator.forKnex.users[1].id
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id
                    }).then(function (post) {
                        post = post.toJSON();
                        post.author.should.eql(testUtils.DataGenerator.forKnex.users[1].id);
                        should.not.exist(post.authors);
                        return models.Post.findOne({id: testUtils.DataGenerator.forKnex.posts[3].id}, {withRelated: ['authors']});
                    }).then(function (post) {
                        post = post.toJSON();
                        post.authors.length.should.eql(2);
                        post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[1].id);
                        post.authors[1].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                    });
                });

                it('change post.authors', function () {
                    testUtils.DataGenerator.forKnex.posts[3].author_id.should.not.equal(testUtils.DataGenerator.forKnex.users[3].id);

                    const data = {
                        authors: [
                            {
                                id: testUtils.DataGenerator.forKnex.users[3].id
                            },
                            {
                                id: testUtils.DataGenerator.forKnex.users[2].id
                            }
                        ]
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        withRelated: ['authors', 'author']
                    }).then(function (post) {
                        post = post.toJSON();
                        post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[3].id);
                        post.authors.length.should.eql(2);
                        post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[3].id);
                        post.authors[1].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                    });
                });

                it('change post.authors, do not include `author`', function () {
                    testUtils.DataGenerator.forKnex.posts[3].author_id.should.not.equal(testUtils.DataGenerator.forKnex.users[3].id);

                    const data = {
                        authors: [
                            {
                                id: testUtils.DataGenerator.forKnex.users[3].id
                            },
                            {
                                id: testUtils.DataGenerator.forKnex.users[2].id
                            }
                        ]
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        withRelated: ['authors']
                    }).then(function (post) {
                        post = post.toJSON();
                        post.author.should.eql(testUtils.DataGenerator.forKnex.users[3].id);
                        post.authors.length.should.eql(2);
                        post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[3].id);
                        post.authors[1].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                    });
                });

                it('change post.authors and post.author_id (different primary author)', function () {
                    const data = {
                        authors: [
                            {
                                id: testUtils.DataGenerator.forKnex.users[1].id
                            }
                        ],
                        author_id: testUtils.DataGenerator.forKnex.users[4].id
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        withRelated: ['authors', 'author']
                    }).then(function (post) {
                        post = post.toJSON();
                        post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[1].id);
                        post.authors.length.should.eql(1);
                        post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[1].id);
                    });
                });

                it('change order of existing post.authors', function () {
                    const data = {
                        authors: [
                            {
                                id: testUtils.DataGenerator.forKnex.users[2].id
                            },
                            {
                                id: testUtils.DataGenerator.forKnex.users[0].id
                            }
                        ]
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        withRelated: ['authors', 'author']
                    }).then(function (post) {
                        post = post.toJSON();
                        post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                        post.authors.length.should.eql(2);
                        post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                        post.authors[1].id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                    });
                });

                it('[unsupported] change post.author', function () {
                    const data = {
                        author: {
                            id: testUtils.DataGenerator.forKnex.users[4].id
                        }
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        withRelated: ['authors', 'author']
                    }).then(function (post) {
                        post = post.toJSON();
                        post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                        post.authors.length.should.eql(2);
                        post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                        post.authors[1].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                    });
                });
            });

            describe('destroy', function () {
                it('by author', function () {
                    const authorId = testUtils.DataGenerator.forKnex.users[0].id;

                    return knex('posts_authors')
                        .where('author_id', authorId)
                        .then(function (postAuthors) {
                            postAuthors.length.should.eql(8);

                            return models.Post.destroyByAuthor({id: authorId});
                        })
                        .then(function () {
                            return knex('posts_authors')
                                .where('author_id', authorId);
                        })
                        .then(function (postAuthors) {
                            postAuthors.length.should.eql(0);
                        });
                });
            });
        });
    });

    describe('Permissible', function () {
        describe('As Contributor', function () {
            describe('Editing', function () {
                it('rejects if changing status', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'published'};

                    mockPostObj.get.withArgs('status').returns('draft');
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        false
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        should(mockPostObj.related.calledOnce).be.true();
                        done();
                    });
                });

                it('rejects if changing author id', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', author_id: 2};

                    mockPostObj.get.withArgs('author_id').returns(1);

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.calledOnce).be.true();
                        should(mockPostObj.related.called).be.false();
                        done();
                    });
                });

                it('rejects if changing authors.0', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', authors: [{id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        should(mockPostObj.related.calledTwice).be.false();
                        done();
                    });
                });

                it('ignores if changes authors.1', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', authors: [{id: 1}, {id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});
                    mockPostObj.get.withArgs('status').returns('draft');

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then((result) => {
                        should.exist(result);
                        should(result.excludedAttrs).deepEqual(['authors', 'tags']);
                        should(mockPostObj.get.callCount).eql(2);
                        should(mockPostObj.related.callCount).eql(2);
                        done();
                    }).catch(done);
                });

                it('rejects if post is not draft', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'published', author_id: 1};

                    mockPostObj.get.withArgs('status').returns('published');
                    mockPostObj.get.withArgs('author_id').returns(1);
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.callCount).eql(3);
                        should(mockPostObj.related.callCount).eql(1);
                        done();
                    });
                });

                it('rejects if contributor is not author of post', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', author_id: 2};

                    mockPostObj.get.withArgs('status').returns('draft');
                    mockPostObj.get.withArgs('author_id').returns(1);
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.callCount).eql(1);
                        should(mockPostObj.related.callCount).eql(0);
                        done();
                    });
                });

                it('resolves if none of the above cases are true', function () {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', author_id: 1};

                    mockPostObj.get.withArgs('status').returns('draft');
                    mockPostObj.get.withArgs('author_id').returns(1);
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    return models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then((result) => {
                        should.exist(result);
                        should(result.excludedAttrs).deepEqual(['authors', 'tags']);
                        should(mockPostObj.get.callCount).eql(3);
                        should(mockPostObj.related.callCount).eql(1);
                    });
                });
            });

            describe('Adding', function () {
                it('rejects if "published" status', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'published', author_id: 1};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        done();
                    });
                });

                it('rejects if different author id', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', author_id: 2};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        done();
                    });
                });

                it('rejects if different logged in user and `authors.0`', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', authors: [{id: 2}]};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        done();
                    });
                });

                it('rejects if same logged in user and `authors.0`, but different author_id', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', author_id: 3, authors: [{id: 1}]};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        done();
                    });
                });

                it('rejects if different logged in user and `authors.0`, but correct author_id', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', author_id: 1, authors: [{id: 2}]};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        done();
                    });
                });

                it('resolves if same logged in user and `authors.0`', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', authors: [{id: 1}]};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then((result) => {
                        should.exist(result);
                        should(result.excludedAttrs).deepEqual(['authors', 'tags']);
                        should(mockPostObj.get.called).be.false();
                        done();
                    }).catch(done);
                });

                it('resolves if none of the above cases are true', function () {
                    var mockPostObj = {
                            get: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {status: 'draft', author_id: 1};

                    return models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then((result) => {
                        should.exist(result);
                        should(result.excludedAttrs).deepEqual(['authors', 'tags']);
                        should(mockPostObj.get.called).be.false();
                    });
                });
            });

            describe('Destroying', function () {
                it('rejects if destroying another author\'s post', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'destroy',
                        context,
                        {},
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.calledOnce).be.true();
                        should(mockPostObj.related.calledOnce).be.true();
                        done();
                    });
                });

                it('rejects if destroying a published post', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});
                    mockPostObj.get.withArgs('status').returns('published');

                    models.Post.permissible(
                        mockPostObj,
                        'destroy',
                        context,
                        {},
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.calledOnce).be.true();
                        should(mockPostObj.related.calledOnce).be.true();
                        done();
                    });
                });

                it('resolves if none of the above cases are true', function () {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1};

                    mockPostObj.get.withArgs('status').returns('draft');
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    return models.Post.permissible(
                        mockPostObj,
                        'destroy',
                        context,
                        {},
                        testUtils.permissions.contributor,
                        false,
                        true
                    ).then((result) => {
                        should.exist(result);
                        should(result.excludedAttrs).deepEqual(['authors', 'tags']);
                        should(mockPostObj.get.calledOnce).be.true();
                        should(mockPostObj.related.calledOnce).be.true();
                    });
                });
            });
        });

        describe('As Author', function () {
            describe('Editing', function () {
                it('rejects if editing another\'s post', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {author_id: 2};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 2}]});
                    mockPostObj.get.withArgs('author_id').returns(2);

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        should(mockPostObj.related.calledOnce).be.true();
                        done();
                    });
                });

                it('rejects if editing another\'s post (using `authors`)', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {authors: [{id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        should(mockPostObj.related.calledTwice).be.true();
                        done();
                    });
                });

                it('rejects if changing author', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {author_id: 2};

                    mockPostObj.get.withArgs('author_id').returns(1);
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.calledOnce).be.true();
                        should(mockPostObj.related.calledOnce).be.true();
                        done();
                    });
                });

                it('rejects if changing authors', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {authors: [{id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        should(mockPostObj.related.calledTwice).be.true();
                        done();
                    });
                });

                it('rejects if changing authors and author_id', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {authors: [{id: 1}], author_id: 2};

                    mockPostObj.get.withArgs('author_id').returns(1);
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.calledOnce).be.true();
                        should(mockPostObj.related.calledOnce).be.true();
                        done();
                    });
                });

                it('rejects if changing authors and author_id', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {authors: [{id: 2}], author_id: 1};

                    mockPostObj.get.withArgs('author_id').returns(1);
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        mockPostObj.get.callCount.should.eql(1);
                        mockPostObj.related.callCount.should.eql(2);
                        done();
                    });
                });

                it('resolves if none of the above cases are true', function () {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {author_id: 1};

                    mockPostObj.get.withArgs('author_id').returns(1);
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    return models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        should(mockPostObj.get.calledOnce).be.true();
                        should(mockPostObj.related.calledOnce).be.true();
                    });
                });
            });

            describe('Adding', function () {
                it('rejects if different author id', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {author_id: 2};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        done();
                    });
                });

                it('rejects if different authors', function (done) {
                    var mockPostObj = {
                            get: sandbox.stub(),
                            related: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {authors: [{id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        error.should.be.an.instanceof(common.errors.NoPermissionError);
                        should(mockPostObj.get.called).be.false();
                        done();
                    });
                });

                it('resolves if none of the above cases are true', function () {
                    var mockPostObj = {
                            get: sandbox.stub()
                        },
                        context = {user: 1},
                        unsafeAttrs = {author_id: 1};

                    return models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true
                    ).then(() => {
                        should(mockPostObj.get.called).be.false();
                    });
                });
            });
        });

        describe('Everyone Else', function () {
            it('rejects if hasUserPermissions is false and not current owner', function (done) {
                var mockPostObj = {
                        get: sandbox.stub(),
                        related: sandbox.stub()
                    },
                    context = {user: 1},
                    unsafeAttrs = {author_id: 2};

                mockPostObj.related.withArgs('authors').returns({models: [{id: 2}]});
                mockPostObj.get.withArgs('author_id').returns(2);

                models.Post.permissible(
                    mockPostObj,
                    'edit',
                    context,
                    unsafeAttrs,
                    testUtils.permissions.editor,
                    false,
                    true
                ).then(() => {
                    done(new Error('Permissible function should have rejected.'));
                }).catch((error) => {
                    error.should.be.an.instanceof(common.errors.NoPermissionError);
                    should(mockPostObj.get.called).be.false();
                    should(mockPostObj.related.calledOnce).be.true();
                    done();
                });
            });

            it('resolves if hasUserPermission is true', function () {
                var mockPostObj = {
                        get: sandbox.stub()
                    },
                    context = {user: 1},
                    unsafeAttrs = {author_id: 2};

                mockPostObj.get.withArgs('author_id').returns(2);

                return models.Post.permissible(
                    mockPostObj,
                    'edit',
                    context,
                    unsafeAttrs,
                    testUtils.permissions.editor,
                    true,
                    true
                ).then(() => {
                    should(mockPostObj.get.called).be.false();
                });
            });
        });
    });
});
