var testUtils   = require('../../utils'),
    should      = require('should'),
    Promise     = require('bluebird'),
    _           = require('lodash'),
    // Stuff we are testing
    context     = testUtils.context,

    TagAPI      = require('../../../server/api/tags');

// there are some random generated tags in test database
// which can't be sorted easily using _.sortBy()
// so we filter them out and leave only pre-built fixtures
// usage: tags.filter(onlyFixtures)
function onlyFixtures(slug) {
    return testUtils.DataGenerator.Content.tags.indexOf(slug) >= 0;
}

describe('Tags API', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup('users:roles', 'perms:tag', 'perms:init', 'posts'));

    should.exist(TagAPI);

    describe('Add', function () {
        var newTag;

        beforeEach(function () {
            newTag = _.clone(testUtils.DataGenerator.forKnex.createTag(testUtils.DataGenerator.Content.tags[0]));
            Promise.resolve(newTag);
        });

        it('can add a tag (admin)', function () {
            return TagAPI.add({tags: [newTag]}, testUtils.context.admin)
            .then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
            });
        });

        it('can add a tag (editor)', function () {
            return TagAPI.add({tags: [newTag]}, testUtils.context.editor)
            .then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
            });
        });

        it('No-auth CANNOT add tag', function () {
            return TagAPI.add({tags: [newTag]}).then(function () {
                throw new Error('Add tag is not denied without authentication.');
            });
        });

        it('rejects invalid names with ValidationError', function () {
            var invalidTag = _.clone(newTag);

            invalidTag.name = ', starts with a comma';

            return TagAPI.add({tags: [invalidTag]}, testUtils.context.admin)
            .then(function () {
                throw new Error('Adding a tag with an invalid name is not rejected.');
            }).catch(function (errors) {
                errors.should.have.enumerable(0).with.property('errorType', 'ValidationError');
            });
        });
    });

    describe('Edit', function () {
        var newTagName = 'tagNameUpdated',
        firstTag = 1;

        it('can edit a tag (admin)', function () {
            return TagAPI.edit({tags: [{name: newTagName}]}, _.extend({}, context.admin, {id: firstTag}))
            .then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
            });
        });

        it('can edit a tag (editor)', function () {
            return TagAPI.edit({tags: [{name: newTagName}]}, _.extend({}, context.editor, {id: firstTag}))
            .then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
            });
        });

        it('No-auth CANNOT edit tag', function () {
            return TagAPI.edit({tags: [{name: newTagName}]}, _.extend({}, {id: firstTag}))
            .then(function () {
                throw new Error('Add tag is not denied without authentication.');
            });
        });

        it('rejects invalid names with ValidationError', function () {
            var invalidTagName = ', starts with a comma';

            return TagAPI.edit({tags: [{name: invalidTagName}]}, _.extend({}, context.editor, {id: firstTag}))
            .then(function () {
                throw new Error('Adding a tag with an invalid name is not rejected.');
            }).catch(function (errors) {
                errors.should.have.enumerable(0).with.property('errorType', 'ValidationError');
            });
        });
    });

    describe('Destroy', function () {
        var firstTag = 1;
        it('can destroy Tag', function () {
            return TagAPI.destroy(_.extend({}, testUtils.context.admin, {id: firstTag}))
            .then(function (results) {
                should.not.exist(results);
            });
        });
    });

    describe('Browse', function () {
        beforeEach(function () {
            return testUtils.fixtures.insertMoreTags();
        });

        it('can browse (internal)', function () {
            return TagAPI.browse(testUtils.context.internal).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.should.have.lengthOf(15);
                testUtils.API.checkResponse(results.tags[0], 'tag');
                results.tags[0].created_at.should.be.an.instanceof(Date);

                results.meta.pagination.should.have.property('page', 1);
                results.meta.pagination.should.have.property('limit', 15);
                results.meta.pagination.should.have.property('pages', 4);
                results.meta.pagination.should.have.property('total', 55);
                results.meta.pagination.should.have.property('next', 2);
                results.meta.pagination.should.have.property('prev', null);
            });
        });

        it('can browse page 2 (internal)', function () {
            return TagAPI.browse(_.extend({}, testUtils.context.internal, {page: 2})).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.should.have.lengthOf(15);
                testUtils.API.checkResponse(results.tags[0], 'tag');
                results.tags[0].created_at.should.be.an.instanceof(Date);

                results.meta.pagination.should.have.property('page', 2);
                results.meta.pagination.should.have.property('limit', 15);
                results.meta.pagination.should.have.property('pages', 4);
                results.meta.pagination.should.have.property('total', 55);
                results.meta.pagination.should.have.property('next', 3);
                results.meta.pagination.should.have.property('prev', 1);
            });
        });

        it('can browse (owner)', function () {
            return TagAPI.browse({context: {user: 1}}).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
                testUtils.API.checkResponse(results.tags[0], 'tag');
                results.tags[0].created_at.should.be.an.instanceof(Date);
            });
        });

        it('can browse (admin)', function () {
            return TagAPI.browse(testUtils.context.admin).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
                testUtils.API.checkResponse(results.tags[0], 'tag');
                results.tags[0].created_at.should.be.an.instanceof(Date);
            });
        });

        it('can browse (editor)', function () {
            return TagAPI.browse(testUtils.context.editor).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
                testUtils.API.checkResponse(results.tags[0], 'tag');
                results.tags[0].created_at.should.be.an.instanceof(Date);
            });
        });

        it('can browse (author)', function () {
            return TagAPI.browse(testUtils.context.author).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);
                testUtils.API.checkResponse(results.tags[0], 'tag');
                results.tags[0].created_at.should.be.an.instanceof(Date);
            });
        });

        it('can browse with include count.posts', function () {
            return TagAPI.browse({context: {user: 1}, include: 'count.posts'}).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.should.have.lengthOf(15);
                testUtils.API.checkResponse(results.tags[0], 'tag', 'count');
                should.exist(results.tags[0].count.posts);

                results.tags[0].count.posts.should.eql(2);
                results.tags[1].count.posts.should.eql(2);
                results.meta.pagination.should.have.property('page', 1);
                results.meta.pagination.should.have.property('limit', 15);
                results.meta.pagination.should.have.property('pages', 4);
                results.meta.pagination.should.have.property('total', 55);
                results.meta.pagination.should.have.property('next', 2);
                results.meta.pagination.should.have.property('prev', null);
            });
        });

        it('can browse page 4 with include count.posts', function () {
            return TagAPI.browse({context: {user: 1}, include: 'count.posts', page: 4}).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.should.have.lengthOf(10);
                testUtils.API.checkResponse(results.tags[0], 'tag', 'count');
                should.exist(results.tags[0].count.posts);

                results.meta.pagination.should.have.property('page', 4);
                results.meta.pagination.should.have.property('limit', 15);
                results.meta.pagination.should.have.property('pages', 4);
                results.meta.pagination.should.have.property('total', 55);
                results.meta.pagination.should.have.property('next', null);
                results.meta.pagination.should.have.property('prev', 3);
            });
        });

        it('can browse and order by slug using asc', function () {
            var expectedTags;

            return TagAPI.browse({context: {user: 1}})
            .then(function (results) {
                should.exist(results);

                expectedTags = _(results.tags).map('slug').filter(onlyFixtures).sortBy().value();

                return TagAPI.browse({context: {user: 1}, order: 'slug asc'});
            }).then(function (results) {
                var tags;

                should.exist(results);

                tags = _(results.tags).map('slug').filter(onlyFixtures).value();
                tags.should.eql(expectedTags);
            });
        });

        it('can browse and order by slug using desc', function () {
            var expectedTags;

            return TagAPI.browse({context: {user: 1}}).then(function (results) {
                should.exist(results);

                expectedTags = _(results.tags).map('slug').filter(onlyFixtures).sortBy().reverse().value();

                return TagAPI.browse({context: {user: 1}, order: 'slug desc'});
            }).then(function (results) {
                var tags;

                should.exist(results);

                tags = _(results.tags).map('slug').filter(onlyFixtures).value();
                tags.should.eql(expectedTags);
            });
        });
    });

    describe('Read', function () {
        function extractFirstTag(tags) {
            return _.filter(tags, {id: 1})[0];
        }

        it('returns count.posts with include count.posts', function () {
            return TagAPI.read({context: {user: 1}, include: 'count.posts', slug: 'kitchen-sink'}).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);

                testUtils.API.checkResponse(results.tags[0], 'tag', 'count');
                should.exist(results.tags[0].count.posts);
                results.tags[0].count.posts.should.equal(2);
            });
        });

        it('with slug', function () {
            return TagAPI.browse({context: {user: 1}}).then(function (results) {
                should.exist(results);
                should.exist(results.tags);
                results.tags.length.should.be.above(0);

                var firstTag = extractFirstTag(results.tags);

                return TagAPI.read({context: {user: 1}, slug: firstTag.slug});
            }).then(function (found) {
                should.exist(found);
                testUtils.API.checkResponse(found.tags[0], 'tag');
            });
        });

        // TODO: this should be a 422?
        it('cannot fetch a tag with an invalid slug', function () {
            return TagAPI.read({slug: 'invalid!'}).then(function () {
                throw new Error('Should not return a result with invalid slug');
            }).catch(function (err) {
                should.exist(err);
                err.message.should.eql('Tag not found.');
            });
        });
    });
});
