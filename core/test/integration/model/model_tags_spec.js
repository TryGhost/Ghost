var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    testUtils = require('../../utils'),

    // Stuff we are testing
    db = require('../../../server/data/db'),
    models = require('../../../server/models'),
    common = require('../../../server/lib/common'),
    context = testUtils.context.admin,
    sandbox = sinon.sandbox.create();

describe('Tag Model', function () {
    var eventSpy;

    // Keep the DB clean
    before(testUtils.teardown);
    after(testUtils.teardown);
    before(testUtils.setup('users:roles', 'posts'));

    afterEach(function () {
        sandbox.restore();
    });

    beforeEach(function () {
        eventSpy = sandbox.spy(common.events, 'emit');
    });

    describe('findPage', function () {
        it('with limit all', function (done) {
            models.Tag.findPage({limit: 'all'})
                .then(function (results) {
                    results.meta.pagination.page.should.equal(1);
                    results.meta.pagination.limit.should.equal('all');
                    results.meta.pagination.pages.should.equal(1);
                    results.data.length.should.equal(5);

                    done();
                })
                .catch(done);
        });

        it('with include count.posts', function (done) {
            models.Tag.findPage({limit: 'all', withRelated: ['count.posts']})
                .then(function (results) {
                    results.meta.pagination.page.should.equal(1);
                    results.meta.pagination.limit.should.equal('all');
                    results.meta.pagination.pages.should.equal(1);
                    results.data.length.should.equal(5);
                    should.exist(results.data[0].toJSON().count.posts);

                    done();
                })
                .catch(done);
        });
    });

    describe('findOne', function () {
        it('with slug', function (done) {
            var firstTag;

            models.Tag.findPage()
                .then(function (results) {
                    should.exist(results);
                    should.exist(results.data);
                    results.data.length.should.be.above(0);
                    firstTag = results.data[0].toJSON();

                    return models.Tag.findOne({slug: firstTag.slug});
                })
                .then(function (found) {
                    should.exist(found);

                    done();
                })
                .catch(done);
        });
    });

    describe('add', function () {
        it('uses Date objects for dateTime fields', function (done) {
            models.Tag.add(_.omit(testUtils.DataGenerator.forModel.tags[0], 'id'), context)
                .then(function (tag) {
                    return models.Tag.findOne({id: tag.id});
                })
                .then(function (tag) {
                    should.exist(tag);
                    tag.get('created_at').should.be.an.instanceof(Date);

                    done();
                })
                .catch(done);
        });

        it('returns count.posts if include count.posts', function (done) {
            models.Tag.findOne({slug: 'kitchen-sink'}, {withRelated: ['count.posts']})
                .then(function (tag) {
                    should.exist(tag);
                    tag.toJSON().count.posts.should.equal(2);

                    done();
                })
                .catch(done);
        });

        it('can strip invisible unicode from slug', function (done) {
            const tag = Object.assign(_.omit(testUtils.DataGenerator.forModel.tags[0], 'id'), {
                slug: 'abc\u0008',
            });
            models.Tag.add(tag, context)
                .then(function (newTag) {
                    should.exist(newTag);
                    newTag.get('slug').should.equal('abc');
                    done();
                }).catch(done);
        });
    });

    describe('destroy', function () {
        it('can destroy Tag (using transaction)', function () {
            var firstTag = testUtils.DataGenerator.Content.tags[0].id;

            return db.knex('posts_tags').where('tag_id', firstTag)
                .then(function (response) {
                    response.length.should.eql(2);
                })
                .then(function () {
                    return db.knex.transaction(function (transacting) {
                        return models.Tag.destroy({
                            id: firstTag,
                            transacting: transacting
                        });
                    });
                })
                .then(function () {
                    return db.knex('posts_tags').where('tag_id', firstTag);
                })
                .then(function (response) {
                    response.length.should.eql(0);
                });
        });
    });
});
