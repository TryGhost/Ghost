/* eslint no-invalid-this:0 */
const assert = require('node:assert/strict');
const {assertExists} = require('../../../utils/assertions');
const errors = require('@tryghost/errors');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const knex = require('../../../../core/server/data/db').knex;
const urlService = require('../../../../core/server/services/url');
const models = require('../../../../core/server/models');
const security = require('@tryghost/security');

describe('Unit: models/post', function () {
    const mockDb = require('mock-knex');
    let tracker;

    before(function () {
        models.init();
        mockDb.mock(knex);
        tracker = mockDb.getTracker();
    });

    afterEach(function () {
        sinon.restore();
    });

    after(function () {
        mockDb.unmock(knex);
    });

    describe('filter', function () {
        it('generates correct query for - filter: tags: [photo, video] + id: -{id},limit of: 3, with related: tags', function () {
            const queries = [];
            tracker.install();

            tracker.on('query', (query) => {
                queries.push(query);
                query.response([]);
            });

            return models.Post.findPage({
                filter: 'tags:[photo, video]+id:-' + testUtils.filterData.data.posts[3].id,
                limit: 3,
                withRelated: ['tags']
            }).then(() => {
                assert.equal(queries.length, 2);
                assert.equal(queries[0].sql, 'select count(distinct posts.id) as aggregate from `posts` where ((`posts`.`id` != ? and `posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` where `tags`.`slug` in (?, ?))) and (`posts`.`type` = ? and `posts`.`status` = ?))');
                assert.deepEqual(queries[0].bindings, [
                    testUtils.filterData.data.posts[3].id,
                    'photo',
                    'video',
                    'post',
                    'published'
                ]);

                assert.equal(queries[1].sql, 'select `posts`.* from `posts` where ((`posts`.`id` != ? and `posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` where `tags`.`slug` in (?, ?))) and (`posts`.`type` = ? and `posts`.`status` = ?)) order by (SELECT count(*) FROM posts_tags WHERE post_id = posts.id) DESC, CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                assert.deepEqual(queries[1].bindings, [
                    testUtils.filterData.data.posts[3].id,
                    'photo',
                    'video',
                    'post',
                    'published',
                    3
                ]);
            });
        });

        it('generates correct query for - filter: authors:[leslie,pat]+(tag:hash-audio,feature_image:-null), with related: authors,tags', function () {
            const queries = [];
            tracker.install();

            tracker.on('query', (query) => {
                queries.push(query);
                query.response([]);
            });

            return models.Post.findPage({
                filter: 'authors:[leslie,pat]+(tag:hash-audio,feature_image:-null)',
                withRelated: ['authors', 'tags']
            }).then(() => {
                assert.equal(queries.length, 2);
                assert.equal(queries[0].sql, 'select count(distinct posts.id) as aggregate from `posts` where (((`posts`.`feature_image` is not null or `posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` where `tags`.`slug` = ?)) and `posts`.`id` in (select `posts_authors`.`post_id` from `posts_authors` inner join `users` as `authors` on `authors`.`id` = `posts_authors`.`author_id` where `authors`.`slug` in (?, ?))) and (`posts`.`type` = ? and `posts`.`status` = ?))');
                assert.deepEqual(queries[0].bindings, [
                    'hash-audio',
                    'leslie',
                    'pat',
                    'post',
                    'published'
                ]);

                assert.equal(queries[1].sql, 'select `posts`.* from `posts` where (((`posts`.`feature_image` is not null or `posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` where `tags`.`slug` = ?)) and `posts`.`id` in (select `posts_authors`.`post_id` from `posts_authors` inner join `users` as `authors` on `authors`.`id` = `posts_authors`.`author_id` where `authors`.`slug` in (?, ?))) and (`posts`.`type` = ? and `posts`.`status` = ?)) order by (SELECT count(*) FROM posts_authors WHERE post_id = posts.id) DESC, CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                assert.deepEqual(queries[1].bindings, [
                    'hash-audio',
                    'leslie',
                    'pat',
                    'post',
                    'published',
                    15
                ]);
            });
        });

        it('generates correct query for - filter: published_at:>\'2015-07-20\', limit of: 5, with related: tags', function () {
            const queries = [];
            tracker.install();

            tracker.on('query', (query) => {
                queries.push(query);
                query.response([]);
            });

            return models.Post.findPage({
                filter: 'published_at:>\'2015-07-20\'',
                limit: 5,
                withRelated: ['tags']
            }).then(() => {
                assert.equal(queries.length, 2);
                assert.equal(queries[0].sql, 'select count(distinct posts.id) as aggregate from `posts` where (`posts`.`published_at` > ? and (`posts`.`type` = ? and `posts`.`status` = ?))');
                assert.deepEqual(queries[0].bindings, [
                    '2015-07-20',
                    'post',
                    'published'
                ]);

                assert.equal(queries[1].sql, 'select `posts`.* from `posts` where (`posts`.`published_at` > ? and (`posts`.`type` = ? and `posts`.`status` = ?)) order by CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                assert.deepEqual(queries[1].bindings, [
                    '2015-07-20',
                    'post',
                    'published',
                    5
                ]);
            });
        });

        describe('primary_tag/primary_author', function () {
            it('generates correct query for - filter: primary_tag:photo, with related: tags', function () {
                const queries = [];
                tracker.install();

                tracker.on('query', (query) => {
                    queries.push(query);
                    query.response([]);
                });

                return models.Post.findPage({
                    filter: 'primary_tag:photo',
                    withRelated: ['tags']
                }).then(() => {
                    assert.equal(queries.length, 2);
                    assert.equal(queries[0].sql, 'select count(distinct posts.id) as aggregate from `posts` where ((`posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` and `posts_tags`.`sort_order` = 0 where `tags`.`slug` = ? and `tags`.`visibility` = ?)) and (`posts`.`type` = ? and `posts`.`status` = ?))');
                    assert.deepEqual(queries[0].bindings, [
                        'photo',
                        'public',
                        'post',
                        'published'
                    ]);

                    assert.equal(queries[1].sql, 'select `posts`.* from `posts` where ((`posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` and `posts_tags`.`sort_order` = 0 where `tags`.`slug` = ? and `tags`.`visibility` = ?)) and (`posts`.`type` = ? and `posts`.`status` = ?)) order by CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                    assert.deepEqual(queries[1].bindings, [
                        'photo',
                        'public',
                        'post',
                        'published',
                        15
                    ]);
                });
            });

            it('generates correct query for - filter: primary_author:leslie, with related: authors', function () {
                const queries = [];
                tracker.install();

                tracker.on('query', (query) => {
                    queries.push(query);
                    query.response([]);
                });

                return models.Post.findPage({
                    filter: 'primary_author:leslie',
                    withRelated: ['authors']
                }).then(() => {
                    assert.equal(queries.length, 2);
                    assert.equal(queries[0].sql, 'select count(distinct posts.id) as aggregate from `posts` where ((`posts`.`id` in (select `posts_authors`.`post_id` from `posts_authors` inner join `users` as `authors` on `authors`.`id` = `posts_authors`.`author_id` and `posts_authors`.`sort_order` = 0 where `authors`.`slug` = ? and `authors`.`visibility` = ?)) and (`posts`.`type` = ? and `posts`.`status` = ?))');
                    assert.deepEqual(queries[0].bindings, [
                        'leslie',
                        'public',
                        'post',
                        'published'
                    ]);

                    assert.equal(queries[1].sql, 'select `posts`.* from `posts` where ((`posts`.`id` in (select `posts_authors`.`post_id` from `posts_authors` inner join `users` as `authors` on `authors`.`id` = `posts_authors`.`author_id` and `posts_authors`.`sort_order` = 0 where `authors`.`slug` = ? and `authors`.`visibility` = ?)) and (`posts`.`type` = ? and `posts`.`status` = ?)) order by CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                    assert.deepEqual(queries[1].bindings, [
                        'leslie',
                        'public',
                        'post',
                        'published',
                        15
                    ]);
                });
            });
        });

        describe('bad behavior', function () {
            it('generates correct query for - filter: status:[published,draft], limit of: all', function () {
                const queries = [];
                tracker.install();

                tracker.on('query', (query) => {
                    queries.push(query);
                    query.response([]);
                });

                return models.Post.findPage({
                    filter: 'status:[published,draft]',
                    limit: 'all',
                    status: 'published',
                    where: {
                        statements: [{
                            prop: 'status',
                            op: '=',
                            value: 'published'
                        }]
                    }
                }).then(() => {
                    assert.equal(queries.length, 1);

                    assert.equal(queries[0].sql, 'select `posts`.* from `posts` where ((`posts`.`status` in (?, ?) and `posts`.`status` = ?) and (`posts`.`type` = ?)) order by CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC');
                    assert.deepEqual(queries[0].bindings, [
                        'published',
                        'draft',
                        'published',
                        'post'
                    ]);
                });
            });
        });
    });

    describe('toJSON', function () {
        const toJSON = function toJSON(model, options) {
            return new models.Post(model).toJSON(options);
        };

        it('ensure mobiledoc revisions are never exposed', function () {
            const post = {
                mobiledoc: '{}',
                mobiledoc_revisions: []
            };

            const json = toJSON(post, {formats: ['mobiledoc']});

            assert.equal(json.mobiledoc_revisions, undefined);
            assertExists(json.mobiledoc);
        });

        it('ensure post revisions are exposed', function () {
            const post = {
                lexical: '{}',
                post_revisions: []
            };

            const json = toJSON(post, {formats: ['lexical']});

            assertExists(json.post_revisions);
            assertExists(json.lexical);
        });
    });

    describe('extraFilters', function () {
        it('generates correct where statement when filter contains unpermitted values', function () {
            const options = {
                filter: 'status:[published,draft]',
                limit: 'all',
                status: 'published'
            };

            const filter = new models.Post().extraFilters(options);
            assert.equal(filter, 'status:published');
        });
    });

    describe('enforcedFilters', function () {
        const enforcedFilters = function enforcedFilters(model, options) {
            return new models.Post(model).enforcedFilters(options);
        };

        it('returns published status filter for public context', function () {
            const options = {
                context: {
                    public: true
                }
            };

            const filter = enforcedFilters({}, options);

            assert.equal(filter, 'status:published');
        });

        it('returns no status filter for non public context', function () {
            const options = {
                context: {
                    internal: true
                }
            };

            const filter = enforcedFilters({}, options);

            assert.equal(filter, null);
        });
    });

    describe('defaultFilters', function () {
        const defaultFilters = function defaultFilters(model, options) {
            return new models.Post(model).defaultFilters(options);
        };

        it('returns no default filter for internal context', function () {
            const options = {
                context: {
                    internal: true
                }
            };

            const filter = defaultFilters({}, options);

            assert.equal(filter, null);
        });

        it('returns type:post filter for public context', function () {
            const options = {
                context: {
                    public: true
                }
            };

            const filter = defaultFilters({}, options);

            assert.equal(filter, 'type:post');
        });

        it('returns type:post+status:published filter for non public context', function () {
            const options = {
                context: 'user'
            };

            const filter = defaultFilters({}, options);

            assert.equal(filter, 'type:post+status:published');
        });
    });

    describe('countRelations', function () {
        it('can include all count relations', function () {
            return models.Post.findAll({withRelated: ['count.signups', 'count.paid_conversions', 'count.clicks', 'count.sentiment', 'count.negative_feedback', 'count.positive_feedback']});
        });
    });
});

describe('Unit: models/post: uses database (@TODO: fix me)', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        sinon.stub(security.password, 'hash').resolves('$2a$10$we16f8rpbrFZ34xWj0/ZC.LTPUux8ler7bcdTs5qIleN6srRHhilG');
        sinon.stub(urlService, 'getUrlByResourceId');
    });

    afterEach(function () {
        sinon.restore();
    });

    after(function () {
        sinon.restore();
    });

    describe('Permissible', function () {
        describe('As Contributor', function () {
            describe('Editing', function () {
                it('rejects if changing status', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'published'};

                    mockPostObj.get.withArgs('status').returns('draft');
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        false
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        done();
                    }).catch(done);
                });

                it('rejects if changing visibility', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {visibility: 'public'};

                    mockPostObj.get.withArgs('visibility').returns('paid');
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        false
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        done();
                    }).catch(done);
                });

                it('rejects if changing authors.0', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'draft', authors: [{id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        false
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        assert.equal(mockPostObj.related.calledTwice, false);
                        done();
                    });
                });

                it('ignores if changes authors.1', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'draft', authors: [{id: 1}, {id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});
                    mockPostObj.get.withArgs('status').returns('draft');

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        false
                    ).then((result) => {
                        assertExists(result);
                        assert.deepEqual(result.excludedAttrs, ['authors', 'tags']);
                        sinon.assert.calledTwice(mockPostObj.get);
                        sinon.assert.calledTwice(mockPostObj.related);
                        done();
                    }).catch(done);
                });

                it('rejects if post is not draft', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'published'};

                    mockPostObj.get.withArgs('status').returns('published');
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        false
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.calledTwice(mockPostObj.get);
                        sinon.assert.calledOnce(mockPostObj.related);
                        done();
                    });
                });

                it('rejects if contributor is not author of post', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'draft', authors: [{id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        false
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.calledOnce(mockPostObj.related);
                        done();
                    });
                });

                it('resolves if none of the above cases are true', function () {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'draft'};

                    mockPostObj.get.withArgs('status').returns('draft');
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    return models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        false
                    ).then((result) => {
                        assertExists(result);
                        assert.deepEqual(result.excludedAttrs, ['authors', 'tags']);
                        sinon.assert.calledTwice(mockPostObj.get);
                        sinon.assert.calledOnce(mockPostObj.related);
                    });
                });
            });

            describe('Adding', function () {
                it('rejects if "published" status', function (done) {
                    const mockPostObj = {
                        get: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'published', authors: [{id: 1}]};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        done();
                    });
                });

                it('rejects if different author id', function (done) {
                    const mockPostObj = {
                        get: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'draft', authors: [{id: 2}]};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        done();
                    });
                });

                it('rejects if different logged in user and `authors.0`', function (done) {
                    const mockPostObj = {
                        get: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'draft', authors: [{id: 2}]};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        done();
                    });
                });

                it('resolves if same logged in user and `authors.0`', function (done) {
                    const mockPostObj = {
                        get: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {status: 'draft', authors: [{id: 1}]};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.contributor,
                        true,
                        true,
                        true
                    ).then((result) => {
                        assertExists(result);
                        assert.deepEqual(result.excludedAttrs, ['authors', 'tags']);
                        sinon.assert.notCalled(mockPostObj.get);
                        done();
                    }).catch(done);
                });
            });

            describe('Destroying', function () {
                it('rejects if destroying another author\'s post', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'destroy',
                        context,
                        {},
                        testUtils.permissions.contributor,
                        true,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.calledOnce(mockPostObj.get);
                        sinon.assert.calledOnce(mockPostObj.related);
                        done();
                    });
                });

                it('rejects if destroying a published post', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});
                    mockPostObj.get.withArgs('status').returns('published');

                    models.Post.permissible(
                        mockPostObj,
                        'destroy',
                        context,
                        {},
                        testUtils.permissions.contributor,
                        true,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.calledOnce(mockPostObj.get);
                        sinon.assert.calledOnce(mockPostObj.related);
                        done();
                    });
                });

                it('resolves if none of the above cases are true', function () {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};

                    mockPostObj.get.withArgs('status').returns('draft');
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    return models.Post.permissible(
                        mockPostObj,
                        'destroy',
                        context,
                        {},
                        testUtils.permissions.contributor,
                        true,
                        true,
                        true
                    ).then((result) => {
                        assertExists(result);
                        assert.deepEqual(result.excludedAttrs, ['authors', 'tags']);
                        sinon.assert.calledOnce(mockPostObj.get);
                        sinon.assert.calledOnce(mockPostObj.related);
                    });
                });
            });
        });

        describe('As Author', function () {
            describe('Editing', function () {
                it('rejects if editing another\'s post', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {authors: {id: 2}};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 2}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        sinon.assert.calledOnce(mockPostObj.related);
                        done();
                    });
                });

                it('rejects if changing visibility', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {visibility: 'public'};

                    mockPostObj.get.withArgs('visibility').returns('paid');
                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        false,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        sinon.assert.calledOnce(mockPostObj.related);
                        done();
                    });
                });

                it('rejects if editing another\'s post (using `authors`)', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {authors: [{id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        sinon.assert.calledTwice(mockPostObj.related);
                        done();
                    });
                });

                it('rejects if changing authors', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {authors: [{id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        sinon.assert.calledTwice(mockPostObj.related);
                        done();
                    });
                });

                it('resolves if none of the above cases are true', function () {
                    const mockPostObj = {
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    return models.Post.permissible(
                        mockPostObj,
                        'edit',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true,
                        true
                    ).then(() => {
                        sinon.assert.calledOnce(mockPostObj.related);
                    });
                });
            });

            describe('Adding', function () {
                it('rejects if different author id', function (done) {
                    const mockPostObj = {
                        get: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {authors: [{id: 2}]};

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        done();
                    });
                });

                it('rejects if different authors', function (done) {
                    const mockPostObj = {
                        get: sinon.stub(),
                        related: sinon.stub()
                    };
                    const context = {user: 1};
                    const unsafeAttrs = {authors: [{id: 2}]};

                    mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                    models.Post.permissible(
                        mockPostObj,
                        'add',
                        context,
                        unsafeAttrs,
                        testUtils.permissions.author,
                        false,
                        true,
                        true
                    ).then(() => {
                        done(new Error('Permissible function should have rejected.'));
                    }).catch((error) => {
                        assert(error instanceof errors.NoPermissionError);
                        sinon.assert.notCalled(mockPostObj.get);
                        done();
                    });
                });
            });
        });

        describe('Everyone Else', function () {
            it('rejects if hasUserPermissions is false and not current owner', function (done) {
                const mockPostObj = {
                    get: sinon.stub(),
                    related: sinon.stub()
                };
                const context = {user: 1};
                const unsafeAttrs = {authors: [{id: 2}]};

                mockPostObj.related.withArgs('authors').returns({models: [{id: 2}]});

                models.Post.permissible(
                    mockPostObj,
                    'edit',
                    context,
                    unsafeAttrs,
                    testUtils.permissions.editor,
                    false,
                    true,
                    true
                ).then(() => {
                    done(new Error('Permissible function should have rejected.'));
                }).catch((error) => {
                    assert(error instanceof errors.NoPermissionError);
                    sinon.assert.notCalled(mockPostObj.get);
                    sinon.assert.calledOnce(mockPostObj.related);
                    done();
                });
            });

            it('resolves if hasUserPermission is true', function () {
                const mockPostObj = {
                    get: sinon.stub()
                };
                const context = {user: 1};
                const unsafeAttrs = {authors: [{id: 2}]};

                return models.Post.permissible(
                    mockPostObj,
                    'edit',
                    context,
                    unsafeAttrs,
                    testUtils.permissions.editor,
                    true,
                    true,
                    true
                ).then(() => {
                    sinon.assert.notCalled(mockPostObj.get);
                });
            });

            it('resolves if changing visibility as owner', function (done) {
                const mockPostObj = {
                    get: sinon.stub(),
                    related: sinon.stub()
                };
                const context = {user: 1};
                const unsafeAttrs = {visibility: 'public'};

                mockPostObj.get.withArgs('visibility').returns('paid');
                mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                models.Post.permissible(
                    mockPostObj,
                    'edit',
                    context,
                    unsafeAttrs,
                    testUtils.permissions.owner,
                    false,
                    true,
                    true
                ).then(() => {
                    sinon.assert.notCalled(mockPostObj.get);
                    sinon.assert.calledOnce(mockPostObj.related);
                    done();
                }).catch(() => {
                    done(new Error('Permissible function should have passed for owner.'));
                });
            });

            it('resolves if changing visibility as administrator', function (done) {
                const mockPostObj = {
                    get: sinon.stub(),
                    related: sinon.stub()
                };
                const context = {user: 1};
                const unsafeAttrs = {visibility: 'public'};

                mockPostObj.get.withArgs('visibility').returns('paid');
                mockPostObj.related.withArgs('authors').returns({models: [{id: 1}]});

                models.Post.permissible(
                    mockPostObj,
                    'edit',
                    context,
                    unsafeAttrs,
                    testUtils.permissions.admin,
                    false,
                    true,
                    true
                ).then(() => {
                    sinon.assert.notCalled(mockPostObj.get);
                    sinon.assert.calledOnce(mockPostObj.related);
                    done();
                }).catch(() => {
                    done(new Error('Permissible function should have passed for administrator.'));
                });
            });
        });
    });
});
