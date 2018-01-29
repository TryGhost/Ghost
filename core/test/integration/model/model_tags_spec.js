var should = require('should'),
    sinon = require('sinon'),
    testUtils = require('../../utils'),
    _ = require('lodash'),

    // Stuff we are testing
    ModelsTag = require('../../../server/models/tag'),
    ModelsPost = require('../../../server/models/post'),
    common = require('../../../server/lib/common'),
    context = testUtils.context.admin,
    TagModel,
    PostModel,
    sandbox = sinon.sandbox.create();

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
        eventSpy = sandbox.spy(common.events, 'emit');
    });

    before(function () {
        TagModel = ModelsTag.Tag;
        PostModel = ModelsPost.Post;

        should.exist(TagModel);
        should.exist(PostModel);
    });

    it('uses Date objects for dateTime fields', function (done) {
        TagModel.add(testUtils.DataGenerator.forModel.tags[0], context).then(function (tag) {
            return TagModel.findOne({id: tag.id});
        }).then(function (tag) {
            should.exist(tag);
            tag.get('created_at').should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    it('returns count.posts if include count.posts', function (done) {
        testUtils.fixtures.insertPostsAndTags().then(function () {
            TagModel.findOne({slug: 'kitchen-sink'}, {withRelated: ['count.posts']}).then(function (tag) {
                should.exist(tag);
                tag.toJSON().count.posts.should.equal(2);

                done();
            }).catch(done);
        });
    });

    it('sets deleted feature_image to null when empty', function (done) {
        var context = testUtils.context.owner;
        var tagId = testUtils.DataGenerator.Content.tags[1].id;

        testUtils.fixtures.insertPostsAndTags().then(function () {
            TagModel.findOne({id: tagId}).then(function (results) {
                should.exist(results);
                var tag = results.toJSON();
                tag.id.should.equal(tagId);
                tag.feature_image.should.not.equal("");
                return TagModel.edit({feature_image: ""}, _.extend({}, context, {id: tagId}));
            }).then(function (edited) {
                should.exist(edited);
                should.equal(edited.get('feature_image'), null);
                done();
            }).catch(done);
        });
    });

    describe('findPage', function () {
        beforeEach(function (done) {
            testUtils.fixtures.insertPostsAndTags().then(function () {
                done();
            }).catch(done);
        });

        it('with limit all', function (done) {
            TagModel.findPage({limit: 'all'}).then(function (results) {
                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal('all');
                results.meta.pagination.pages.should.equal(1);
                results.tags.length.should.equal(5);

                done();
            }).catch(done);
        });

        it('with include count.posts', function (done) {
            TagModel.findPage({limit: 'all', withRelated: ['count.posts']}).then(function (results) {
                results.meta.pagination.page.should.equal(1);
                results.meta.pagination.limit.should.equal('all');
                results.meta.pagination.pages.should.equal(1);
                results.tags.length.should.equal(5);
                should.exist(results.tags[0].count.posts);

                done();
            }).catch(done);
        });
    });

    describe('findOne', function () {
        beforeEach(function (done) {
            testUtils.fixtures.insertPostsAndTags().then(function () {
                done();
            }).catch(done);
        });

        it('with slug', function (done) {
            var firstTag;

            TagModel.findPage().then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
                firstTag = results.tags[0];

                return TagModel.findOne({slug: firstTag.slug});
            }).then(function (found) {
                should.exist(found);

                done();
            }).catch(done);
        });
    });
});
