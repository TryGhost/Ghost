/* eslint no-invalid-this:0 */
const _ = require('lodash');
const should = require('should');
const sinon = require('sinon');
const Promise = require('bluebird');
const testUtils = require('../../utils');
const knex = require('../../../server/data/db').knex;
const urlService = require('../../../server/services/url');
const schema = require('../../../server/data/schema');
const models = require('../../../server/models');
const common = require('../../../server/lib/common');
const security = require('../../../server/lib/security');
const sandbox = sinon.sandbox.create();

describe('Unit: models/post', function () {
    const mockDb = require('mock-knex');
    let tracker;

    before(function () {
        models.init();
        mockDb.mock(knex);
        tracker = mockDb.getTracker();
    });

    afterEach(function () {
        sandbox.restore();
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
                queries.length.should.eql(2);
                queries[0].sql.should.eql('select count(distinct posts.id) as aggregate from `posts` where ((`posts`.`id` != ? and `posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` where `tags`.`slug` in (?, ?))) and (`posts`.`page` = ? and `posts`.`status` = ?))');
                queries[0].bindings.should.eql([
                    testUtils.filterData.data.posts[3].id,
                    'photo',
                    'video',
                    false,
                    'published'
                ]);

                queries[1].sql.should.eql('select `posts`.* from `posts` where ((`posts`.`id` != ? and `posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` where `tags`.`slug` in (?, ?))) and (`posts`.`page` = ? and `posts`.`status` = ?)) order by (SELECT count(*) FROM posts_tags WHERE post_id = posts.id) DESC, CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                queries[1].bindings.should.eql([
                    testUtils.filterData.data.posts[3].id,
                    'photo',
                    'video',
                    false,
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
                queries.length.should.eql(2);
                queries[0].sql.should.eql('select count(distinct posts.id) as aggregate from `posts` where (((`posts`.`feature_image` is not null or `posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` where `tags`.`slug` = ?)) and `posts`.`id` in (select `posts_authors`.`post_id` from `posts_authors` inner join `users` as `authors` on `authors`.`id` = `posts_authors`.`author_id` where `authors`.`slug` in (?, ?))) and (`posts`.`page` = ? and `posts`.`status` = ?))');
                queries[0].bindings.should.eql([
                    'hash-audio',
                    'leslie',
                    'pat',
                    false,
                    'published'
                ]);

                queries[1].sql.should.eql('select `posts`.* from `posts` where (((`posts`.`feature_image` is not null or `posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` where `tags`.`slug` = ?)) and `posts`.`id` in (select `posts_authors`.`post_id` from `posts_authors` inner join `users` as `authors` on `authors`.`id` = `posts_authors`.`author_id` where `authors`.`slug` in (?, ?))) and (`posts`.`page` = ? and `posts`.`status` = ?)) order by (SELECT count(*) FROM posts_authors WHERE post_id = posts.id) DESC, CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                queries[1].bindings.should.eql([
                    'hash-audio',
                    'leslie',
                    'pat',
                    false,
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
                queries.length.should.eql(2);
                queries[0].sql.should.eql('select count(distinct posts.id) as aggregate from `posts` where (`posts`.`published_at` > ? and (`posts`.`page` = ? and `posts`.`status` = ?))');
                queries[0].bindings.should.eql([
                    '2015-07-20',
                    false,
                    'published'
                ]);

                queries[1].sql.should.eql('select `posts`.* from `posts` where (`posts`.`published_at` > ? and (`posts`.`page` = ? and `posts`.`status` = ?)) order by CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                queries[1].bindings.should.eql([
                    '2015-07-20',
                    false,
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
                    queries.length.should.eql(2);
                    queries[0].sql.should.eql('select count(distinct posts.id) as aggregate from `posts` where ((`posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` and `posts_tags`.`sort_order` = 0 where `tags`.`slug` = ? and `tags`.`visibility` = ?)) and (`posts`.`page` = ? and `posts`.`status` = ?))');
                    queries[0].bindings.should.eql([
                        'photo',
                        'public',
                        false,
                        'published'
                    ]);

                    queries[1].sql.should.eql('select `posts`.* from `posts` where ((`posts`.`id` in (select `posts_tags`.`post_id` from `posts_tags` inner join `tags` on `tags`.`id` = `posts_tags`.`tag_id` and `posts_tags`.`sort_order` = 0 where `tags`.`slug` = ? and `tags`.`visibility` = ?)) and (`posts`.`page` = ? and `posts`.`status` = ?)) order by CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                    queries[1].bindings.should.eql([
                        'photo',
                        'public',
                        false,
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
                    queries.length.should.eql(2);
                    queries[0].sql.should.eql('select count(distinct posts.id) as aggregate from `posts` where ((`posts`.`id` in (select `posts_authors`.`post_id` from `posts_authors` inner join `users` as `authors` on `authors`.`id` = `posts_authors`.`author_id` and `posts_authors`.`sort_order` = 0 where `authors`.`slug` = ? and `authors`.`visibility` = ?)) and (`posts`.`page` = ? and `posts`.`status` = ?))');
                    queries[0].bindings.should.eql([
                        'leslie',
                        'public',
                        false,
                        'published'
                    ]);

                    queries[1].sql.should.eql('select `posts`.* from `posts` where ((`posts`.`id` in (select `posts_authors`.`post_id` from `posts_authors` inner join `users` as `authors` on `authors`.`id` = `posts_authors`.`author_id` and `posts_authors`.`sort_order` = 0 where `authors`.`slug` = ? and `authors`.`visibility` = ?)) and (`posts`.`page` = ? and `posts`.`status` = ?)) order by CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC limit ?');
                    queries[1].bindings.should.eql([
                        'leslie',
                        'public',
                        false,
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
                    queries.length.should.eql(2);
                    queries[0].sql.should.eql('select count(distinct posts.id) as aggregate from `posts` where ((`posts`.`status` in (?, ?) and `posts`.`status` = ?) and (`posts`.`page` = ?))');
                    queries[0].bindings.should.eql([
                        'published',
                        'draft',
                        'published',
                        false,
                    ]);

                    queries[1].sql.should.eql('select `posts`.* from `posts` where ((`posts`.`status` in (?, ?) and `posts`.`status` = ?) and (`posts`.`page` = ?)) order by CASE WHEN posts.status = \'scheduled\' THEN 1 WHEN posts.status = \'draft\' THEN 2 ELSE 3 END ASC,CASE WHEN posts.status != \'draft\' THEN posts.published_at END DESC,posts.updated_at DESC,posts.id DESC');
                    queries[1].bindings.should.eql([
                        'published',
                        'draft',
                        'published',
                        false,
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
                mobiledoc: 'test',
                mobiledoc_revisions: [],
            };

            const json = toJSON(post, {formats: ['mobiledoc']});

            should.not.exist(json.mobiledoc_revisions);
            should.exist(json.mobiledoc);
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
            filter.should.eql('status:published');
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

            filter.should.equal('status:published');
        });

        it('returns no status filter for non public context', function () {
            const options = {
                context: {
                    internal: true
                }
            };

            const filter = enforcedFilters({}, options);

            should(filter).equal(null);
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

            should(filter).equal(null);
        });

        it('returns page:false filter for public context', function () {
            const options = {
                context: {
                    public: true
                }
            };

            const filter = defaultFilters({}, options);

            filter.should.equal('page:false');
        });

        it('returns page:false+status:published filter for non public context', function () {
            const options = {
                context: 'user'
            };

            const filter = defaultFilters({}, options);

            filter.should.equal('page:false+status:published');
        });
    });
});

describe('Unit: models/post: uses database (@TODO: fix me)', function () {
    before(function () {
        models.init();
    });

    before(testUtils.teardown);
    before(testUtils.setup('users:roles', 'posts'));

    beforeEach(function () {
        sandbox.stub(security.password, 'hash').resolves('$2a$10$we16f8rpbrFZ34xWj0/ZC.LTPUux8ler7bcdTs5qIleN6srRHhilG');
        sandbox.stub(urlService, 'getUrlByResourceId');
    });

    afterEach(function () {
        sandbox.restore();
    });

    after(function () {
        sandbox.restore();
    });

    describe('add', function () {
        describe('ensure full set of data for model events', function () {
            it('default', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.add({
                    title: 'My beautiful title.',
                    tags: [{
                        name: 'my-tag'
                    }]
                }, testUtils.context.editor)
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(post.hasOwnProperty(key));

                            if (['page', 'status', 'visibility', 'featured'].indexOf(key) !== -1) {
                                events.post[0].data[key].should.eql(schema.tables.posts[key].defaultTo);
                            }
                        });

                        should.not.exist(post.authors);
                        should.not.exist(post.primary_author);
                        should.not.exist(post.tags);
                        should.not.exist(post.primary_tag);

                        events.post[0].event.should.eql('added');

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(events.post[0].data.hasOwnProperty(key));

                            if (['page', 'status', 'visibility', 'featured'].indexOf(key) !== -1) {
                                events.post[0].data[key].should.eql(schema.tables.posts[key].defaultTo);
                            }
                        });

                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
            });

            it('with page:1', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.add({
                    title: 'My beautiful title.',
                    page: 1
                }, testUtils.context.editor)
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        // transformed 1 to true
                        post.page.should.eql(true);
                        events.post[0].data.page.should.eql(true);
                    });
            });

            it('use `withRelated=tags`', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.add({
                    title: 'My beautiful title.',
                    tags: [{
                        name: 'my-tag'
                    }]
                }, _.merge({
                    withRelated: ['tags']
                }, testUtils.context.editor))
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        should.not.exist(post.authors);
                        should.not.exist(post.primary_author);
                        should.exist(post.tags);
                        should.exist(post.primary_tag);

                        events.post[0].event.should.eql('added');
                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
            });

            it('use `withRelated=tags,authors`', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.add({
                    title: 'My beautiful title.',
                    tags: [{
                        name: 'my-tag'
                    }]
                }, _.merge({
                    withRelated: ['tags', 'authors']
                }, testUtils.context.editor))
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        should.exist(post.authors);
                        should.exist(post.primary_author);
                        should.exist(post.tags);
                        should.exist(post.primary_tag);

                        events.post[0].event.should.eql('added');

                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
            });

            it('use `columns=title`', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.add({
                    title: 'My beautiful title.',
                    tags: [{
                        name: 'my-tag'
                    }]
                }, _.merge({
                    columns: ['title']
                }, testUtils.context.editor))
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        _.each(_.keys(_.omit(schema.tables.posts, ['title', 'id'])), (key) => {
                            should.not.exist(post[key]);
                        });

                        should.exist(post.id);
                        should.exist(post.title);

                        should.not.exist(post.authors);
                        should.not.exist(post.primary_author);
                        should.not.exist(post.tags);
                        should.not.exist(post.primary_tag);

                        events.post[0].event.should.eql('added');

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(events.post[0].data.hasOwnProperty(key));
                        });

                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
            });

            it('use `formats=mobiledoc`', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.add({
                    title: 'My beautiful title.',
                    tags: [{
                        name: 'my-tag'
                    }]
                }, _.merge({
                    formats: ['mobiledoc']
                }, testUtils.context.editor))
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        _.each(_.keys(_.omit(schema.tables.posts, ['html', 'amp', 'plaintext'])), (key) => {
                            should.exist(post.hasOwnProperty(key));
                        });

                        should.not.exist(post.authors);
                        should.not.exist(post.primary_author);
                        should.not.exist(post.tags);
                        should.not.exist(post.primary_tag);

                        events.post[0].event.should.eql('added');

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(events.post[0].data.hasOwnProperty(key));
                        });

                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
            });
        });
    });

    describe('edit', function () {
        it('ensure `forUpdate` works', function (done) {
            const originalFn = models.Post.prototype.onSaving;
            let requestCanComeIn = false;
            let postId = testUtils.DataGenerator.forKnex.posts[4].id;

            testUtils.DataGenerator.forKnex.posts[4].featured.should.eql(true);

            // @NOTE: simulate that the onSaving hook takes longer
            sandbox.stub(models.Post.prototype, 'onSaving').callsFake(function () {
                var self = this,
                    args = arguments;

                models.Post.prototype.onSaving.restore();
                requestCanComeIn = true;
                return Promise.delay(2000)
                    .then(function () {
                        return originalFn.apply(self, args);
                    });
            });

            const interval = setInterval(function () {
                if (requestCanComeIn) {
                    clearInterval(interval);

                    // @NOTE: second call, should wait till the delay finished
                    models.Post.edit({title: 'Berlin'}, {id: postId, context: {internal: true}})
                        .then(function (post) {
                            post.id.should.eql(postId);
                            post.get('title').should.eql('Berlin');
                            post.get('status').should.eql('published');
                            post.get('featured').should.be.false();
                            done();
                        })
                        .catch(done);
                }
            }, 10);

            // @NOTE: first call to db locks the row (!)
            models.Post.edit({title: 'First', featured: false, status: 'published'}, _.merge({id: postId, migrating: true}, testUtils.context.editor));
        });

        it('update post with options.migrating', function () {
            const events = {
                post: [],
                tag: []
            };

            sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                events.post.push(event);
            });

            sandbox.stub(models.Tag.prototype, 'emitChange').callsFake(function (event) {
                events.tag.push(event);
            });

            let originalUpdatedAt;
            let originalUpdatedBy;

            return models.Post.findOne({
                id: testUtils.DataGenerator.forKnex.posts[3].id,
                status: 'draft'
            }, {withRelated: ['tags']})
                .then((post) => {
                    originalUpdatedAt = post.get('updated_at');
                    originalUpdatedBy = post.get('updated_by');

                    // post will be updated, tags relation not
                    return models.Post.edit({
                        html: 'changed html'
                    }, _.merge({id: testUtils.DataGenerator.forKnex.posts[3].id, migrating: true}, testUtils.context.editor));
                })
                .then((post) => {
                    post.get('updated_at').should.eql(originalUpdatedAt);
                    post.get('updated_by').should.eql(originalUpdatedBy);

                    events.post.should.eql(['edited']);
                    events.tag.should.eql([]);
                });
        });

        it('update post, relation has not changed', function () {
            const events = {
                post: [],
                tag: []
            };

            sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                events.post.push(event);
            });

            sandbox.stub(models.Tag.prototype, 'emitChange').callsFake(function (event) {
                events.tag.push(event);
            });

            return models.Post.findOne({
                id: testUtils.DataGenerator.forKnex.posts[3].id,
                status: 'draft'
            }, {withRelated: ['tags']})
                .then((post) => {
                    // post will be updated, tags relation not
                    return models.Post.edit({
                        title: 'change',
                        tags: post.related('tags').attributes
                    }, _.merge({id: testUtils.DataGenerator.forKnex.posts[3].id}, testUtils.context.editor));
                })
                .then((post) => {
                    post.updated('title').should.eql(testUtils.DataGenerator.forKnex.posts[3].title);
                    post.get('title').should.eql('change');

                    events.post.should.eql(['edited']);
                    events.tag.should.eql([]);
                });
        });

        it('update post, relation has changed', function () {
            const events = {
                post: [],
                tag: []
            };

            sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                events.post.push(event);
            });

            sandbox.stub(models.Tag.prototype, 'emitChange').callsFake(function (event) {
                events.tag.push(event);
            });

            return models.Post.findOne({
                id: testUtils.DataGenerator.forKnex.posts[3].id,
                status: 'draft'
            }, {withRelated: ['tags']})
                .then((post) => {
                    // post will be updated, tags relation not
                    return models.Post.edit({
                        title: 'change',
                        tags: [{id: post.related('tags').toJSON()[0].id, slug: 'after'}]
                    }, _.merge({id: testUtils.DataGenerator.forKnex.posts[3].id}, testUtils.context.editor));
                })
                .then((post) => {
                    post.updated('title').should.eql('change');
                    post.get('title').should.eql('change');

                    events.post.should.eql(['edited']);
                    events.tag.should.eql(['edited']);
                });
        });

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

        describe('ensure full set of data for model events', function () {
            it('default', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.edit({
                    title: 'My beautiful title.'
                }, _.merge({id: testUtils.DataGenerator.forKnex.posts[3].id}, testUtils.context.editor))
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(post.hasOwnProperty(key));
                        });

                        should.not.exist(post.authors);
                        should.not.exist(post.primary_author);
                        should.not.exist(post.tags);
                        should.not.exist(post.primary_tag);

                        events.post[0].event.should.eql('edited');

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(events.post[0].data.hasOwnProperty(key));
                        });

                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
            });

            it('use `withRelated=tags`', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.edit({
                    title: 'My beautiful title.'
                }, _.merge({
                    id: testUtils.DataGenerator.forKnex.posts[3].id,
                    withRelated: ['tags']
                }, testUtils.context.editor))
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(post.hasOwnProperty(key));
                        });

                        should.not.exist(post.authors);
                        should.not.exist(post.primary_author);
                        should.exist(post.tags);
                        should.exist(post.primary_tag);

                        events.post[0].event.should.eql('edited');

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(events.post[0].data.hasOwnProperty(key));
                        });

                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
            });

            it('use `withRelated=tags,authors`', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.edit({
                    title: 'My beautiful title.'
                }, _.merge({
                    id: testUtils.DataGenerator.forKnex.posts[3].id,
                    withRelated: ['tags', 'authors']
                }, testUtils.context.editor))
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(post.hasOwnProperty(key));
                        });

                        should.exist(post.authors);
                        should.exist(post.primary_author);
                        should.exist(post.tags);
                        should.exist(post.primary_tag);

                        events.post[0].event.should.eql('edited');

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(events.post[0].data.hasOwnProperty(key));
                        });

                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
            });

            it('use `columns=title`', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.edit({
                    title: 'My beautiful title.'
                }, _.merge({
                    id: testUtils.DataGenerator.forKnex.posts[3].id,
                    columns: ['title']
                }, testUtils.context.editor))
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        _.each(_.keys(_.omit(schema.tables.posts, ['title', 'id'])), (key) => {
                            should.not.exist(post[key]);
                        });

                        should.exist(post.id);
                        should.exist(post.title);

                        should.not.exist(post.authors);
                        should.not.exist(post.primary_author);
                        should.not.exist(post.tags);
                        should.not.exist(post.primary_tag);

                        events.post[0].event.should.eql('edited');

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(events.post[0].data.hasOwnProperty(key));
                        });

                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
            });

            it('use `formats=mobiledoc`', function () {
                const events = {
                    post: []
                };

                sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                    events.post.push({event: event, data: this.toJSON()});
                });

                return models.Post.edit({
                    title: 'My beautiful title.'
                }, _.merge({
                    id: testUtils.DataGenerator.forKnex.posts[3].id,
                    formats: ['mobiledoc']
                }, testUtils.context.editor))
                    .then((post) => {
                        post.get('title').should.eql('My beautiful title.');
                        post = post.toJSON();

                        _.each(_.keys(_.omit(schema.tables.posts, ['html', 'amp', 'plaintext'])), (key) => {
                            should.exist(post.hasOwnProperty(key));
                        });

                        should.not.exist(post.authors);
                        should.not.exist(post.primary_author);
                        should.not.exist(post.tags);
                        should.not.exist(post.primary_tag);

                        events.post[0].event.should.eql('edited');

                        _.each(_.keys(_.omit(schema.tables.posts, ['mobiledoc', 'amp', 'plaintext'])), (key) => {
                            should.exist(events.post[0].data.hasOwnProperty(key));
                        });

                        should.exist(events.post[0].data.authors);
                        should.exist(events.post[0].data.primary_author);
                        should.exist(events.post[0].data.tags);
                        should.exist(events.post[0].data.primary_tag);
                    });
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

                it('[not allowed] with empty authors ([]), without author_id', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    delete post.author_id;
                    post.authors = [];

                    return models.Post.add(post, {withRelated: ['author', 'authors']})
                        .then(function () {
                            'Expected error'.should.eql(false);
                        })
                        .catch(function (err) {
                            (err instanceof common.errors.ValidationError).should.eql(true);
                        });
                });

                it('[not allowed] with empty authors ([]), with author_id', function () {
                    const post = testUtils.DataGenerator.forKnex.createPost();
                    post.author_id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                    post.authors = [];

                    return models.Post.add(post, {withRelated: ['author', 'authors']})
                        .then(function () {
                            'Expected error'.should.eql(false);
                        })
                        .catch(function (err) {
                            (err instanceof common.errors.ValidationError).should.eql(true);
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
                    return models.Post.findOne({
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        status: 'draft'
                    }, {withRelated: []})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            should.not.exist(post.authors);
                            should.not.exist(post.author_id);
                        });
                });

                it('withRelated: [author]', function () {
                    return models.Post.findOne({
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        status: 'draft'
                    }, {withRelated: ['author']})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            should.not.exist(post.authors);
                        });
                });

                it('withRelated: [authors]', function () {
                    return models.Post.findOne({
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        status: 'draft'
                    }, {withRelated: ['authors']})
                        .then(function (post) {
                            post = post.toJSON();
                            post.author.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            post.authors.length.should.eql(2);
                            post.authors[0].id.should.eql(testUtils.DataGenerator.forKnex.users[0].id);
                            post.authors[1].id.should.eql(testUtils.DataGenerator.forKnex.users[2].id);
                        });
                });

                it('withRelated: [authors, author]', function () {
                    return models.Post.findOne({
                        id: testUtils.DataGenerator.forKnex.posts[3].id,
                        status: 'draft'
                    }, {withRelated: ['authors', 'author']})
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
                beforeEach(testUtils.teardown);
                beforeEach(testUtils.setup('users:roles', 'posts'));

                beforeEach(function () {
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
                        return models.Post.findOne({
                            id: testUtils.DataGenerator.forKnex.posts[3].id,
                            status: 'draft'
                        }, {withRelated: ['authors']});
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

                it('[unsupported] change post.plaintext', function () {
                    const data = {
                        plaintext: 'test'
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[2].id
                    }).then(function (post) {
                        post = post.toJSON({formats: ['mobiledoc', 'plaintext', 'html']});
                        post.plaintext.should.eql(testUtils.DataGenerator.forKnex.posts[2].plaintext);
                    });
                });

                it('[unsupported] change post.html', function () {
                    const data = {
                        html: 'test'
                    };

                    return models.Post.edit(data, {
                        id: testUtils.DataGenerator.forKnex.posts[2].id
                    }).then(function (post) {
                        post = post.toJSON({formats: ['mobiledoc', 'plaintext', 'html']});
                        post.html.should.eql(testUtils.DataGenerator.forKnex.posts[2].html);
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                        true,
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
                    true,
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
                    true,
                    true
                ).then(() => {
                    should(mockPostObj.get.called).be.false();
                });
            });
        });
    });

    describe('Mobiledoc conversion', function () {
        let labs = require('../../../server/services/labs');
        let origLabs = _.cloneDeep(labs);
        let events;

        beforeEach(function () {
            events = {
                post: []
            };

            sandbox.stub(models.Post.prototype, 'emitChange').callsFake(function (event) {
                events.post.push({event: event, data: this.toJSON()});
            });
        });

        it('converts correctly', function () {
            let newPost = testUtils.DataGenerator.forModel.posts[2];

            return models.Post.add(
                newPost,
                testUtils.context.editor
            ).then((post) => {
                should.exist(post);
                post.has('html').should.equal(true);
                post.get('html').should.equal('<h2 id="testing">testing</h2>\n<p>mctesters</p>\n<ul>\n<li>test</li>\n<li>line</li>\n<li>items</li>\n</ul>\n');
            });
        });
    });
});
