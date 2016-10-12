var testUtils   = require('../../utils'),
    should      = require('should'),
    sinon       = require('sinon'),

    // Stuff we are testing
    ModelsTag   = require('../../../server/models/tag'),
    ModelsPost  = require('../../../server/models/post'),
    events      = require('../../../server/events'),
    context     = testUtils.context.admin,
    TagModel,
    PostModel,
    sandbox         = sinon.sandbox.create();

describe('Tag Model', function () {
    var eventSpy;

    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup());

    afterEach(function () {
        sandbox.restore();
    });
    beforeEach(function () {
        eventSpy = sandbox.spy(events, 'emit');
    });

    before(function () {
        TagModel    = ModelsTag.Tag;
        PostModel   = ModelsPost.Post;

        should.exist(TagModel);
        should.exist(PostModel);
    });

    it('uses Date objects for dateTime fields', function () {
        return TagModel.add(testUtils.DataGenerator.forModel.tags[0], context).then(function (tag) {
            return TagModel.findOne({id: tag.id});
        }).then(function (tag) {
            should.exist(tag);
            tag.get('created_at').should.be.an.instanceof(Date);
        });
    });

    it('returns count.posts if include count.posts', function () {
        return testUtils.fixtures.insertPostsAndTags().then(function () {
            return TagModel.findOne({slug: 'kitchen-sink'}, {include: 'count.posts'}).then(function (tag) {
                should.exist(tag);
                tag.toJSON().count.posts.should.equal(2);
            });
        });
    });

    describe('findPage', function () {
        beforeEach(function () {
            return testUtils.fixtures.insertPostsAndTags();
        });

        it('with limit all', function () {
            return TagModel.findPage({limit: 'all'}).then(function (results) {
                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal('all');
                results.meta.pagination.pages.should.equal(1);
                results.tags.length.should.equal(5);
            });
        });

        it('with include count.posts', function () {
            return TagModel.findPage({limit: 'all', include: 'count.posts'}).then(function (results) {
                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal('all');
                results.meta.pagination.pages.should.equal(1);
                results.tags.length.should.equal(5);
                should.exist(results.tags[0].count.posts);
            });
        });
    });

    describe('findOne', function () {
        beforeEach(function () {
            return testUtils.fixtures.insertPostsAndTags();
        });

        it('with slug', function () {
            var firstTag;

            return TagModel.findPage().then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
                firstTag = results.tags[0];

                return TagModel.findOne({slug: firstTag.slug});
            }).then(function (found) {
                should.exist(found);
            });
        });
    });
});
