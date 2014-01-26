/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    _ = require("underscore"),
    when = require('when'),
    sequence = require('when/sequence'),
    should = require('should'),

    // Stuff we are testing
    Models = require('../../../server/models');

describe('Tag Model', function () {

    var TagModel = Models.Tag;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        testUtils.initData()
            .then(function () {
                done();
            }, done);
    });

    afterEach(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    describe('a Post', function () {
        var PostModel = Models.Post;

        it('can add a tag', function (done) {
            var newPost = testUtils.DataGenerator.forModel.posts[0],
                newTag = testUtils.DataGenerator.forModel.tags[0],
                createdPostID;

            when.all([
                PostModel.add(newPost),
                TagModel.add(newTag)
            ]).then(function (models) {
                var createdPost = models[0],
                    createdTag = models[1];

                createdPostID = createdPost.id;
                return createdPost.tags().attach(createdTag);
            }).then(function () {
                return PostModel.read({id: createdPostID, status: 'all'}, { withRelated: ['tags']});
            }).then(function (postWithTag) {
                postWithTag.related('tags').length.should.equal(1);
                done();
            }).then(null, done);

        });

        it('can remove a tag', function (done) {
            // The majority of this test is ripped from above, which is obviously a Bad Thing.
            // Would be nice to find a way to seed data with relations for cases like this,
            // because there are more DB hits than needed
            var newPost = testUtils.DataGenerator.forModel.posts[0],
                newTag = testUtils.DataGenerator.forModel.tags[0],
                createdTagID,
                createdPostID;

            when.all([
                PostModel.add(newPost),
                TagModel.add(newTag)
            ]).then(function (models) {
                var createdPost = models[0],
                    createdTag = models[1];

                createdPostID = createdPost.id;
                createdTagID = createdTag.id;
                return createdPost.tags().attach(createdTag);
            }).then(function () {
                return PostModel.read({id: createdPostID, status: 'all'}, { withRelated: ['tags']});
            }).then(function (postWithTag) {
                return postWithTag.tags().detach(createdTagID);
            }).then(function () {
                return PostModel.read({id: createdPostID, status: 'all'}, { withRelated: ['tags']});
            }).then(function (postWithoutTag) {
                postWithoutTag.related('tags').length.should.equal(0);
                done();
            }).then(null, done);
        });

        describe('setting tags from an array on update', function () {
            // When a Post is updated, iterate through the existing tags, and detach any that have since been removed.
            // It can be assumed that any remaining tags in the update data are newly added.
            // Create new tags if needed, and attach them to the Post

            function seedTags(tagNames) {
                var createOperations = [
                    PostModel.add(testUtils.DataGenerator.forModel.posts[0])
                ];

                var tagModels = tagNames.map(function (tagName) { return TagModel.add({name: tagName}); });
                createOperations = createOperations.concat(tagModels);

                return when.all(createOperations).then(function (models) {
                    var postModel = models[0],
                        attachOperations;

                    attachOperations = [];
                    for (var i = 1; i < models.length; i++) {
                        attachOperations.push(postModel.tags().attach(models[i]));
                    };

                    return when.all(attachOperations).then(function () {
                        return postModel;
                    });
                }).then(function (postModel) {
                    return PostModel.read({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                });
            }

            it('does nothing if tags haven\'t changed', function (done) {
                var seededTagNames = ['tag1', 'tag2', 'tag3'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var existingTagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });
                    postModel.set('tags', existingTagData);
                    return postModel.save();
                }).then(function (postModel) {
                    var tagNames = postModel.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(seededTagNames);

                    return TagModel.findAll();
                }).then(function (tagsFromDB) {
                    tagsFromDB.length.should.eql(seededTagNames.length + 1);

                    done();
                }).then(null, done);

            });

            it('detaches tags that have been removed', function (done) {
                var seededTagNames = ['tag1', 'tag2', 'tag3'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // remove the second tag, and save
                    tagData.splice(1, 1);
                    return postModel.set('tags', tagData).save();
                }).then(function (postModel) {
                    return PostModel.read({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagNames = reloadedPost.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(['tag1', 'tag3']);

                    done();
                }).then(null, done);
            });

            it('attaches tags that are new to the post, but already exist in the database', function (done) {
                var seededTagNames = ['tag1', 'tag2'],
                    postModel;

                seedTags(seededTagNames).then(function (_postModel) {
                    postModel = _postModel;
                    return TagModel.add({name: 'tag3'});
                }).then(function () {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // add the additional tag, and save
                    tagData.push({id: 3, name: 'tag3'});
                    return postModel.set('tags', tagData).save();
                }).then(function () {
                    return PostModel.read({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagModels = reloadedPost.related('tags').models,
                        tagNames = tagModels.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3']);
                    tagModels[2].id.should.eql(4); // make sure it hasn't just added a new tag with the same name

                    done();
                }).then(null, done);
            });

            it('creates and attaches a tag that is new to the Tags table', function (done) {
                var seededTagNames = ['tag1', 'tag2'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // add the additional tag, and save
                    tagData.push({id: null, name: 'tag3'});
                    return postModel.set('tags', tagData).save();
                }).then(function (postModel) {
                    return PostModel.read({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagNames = reloadedPost.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3']);

                    done();
                }).then(null, done);
            });

            it('creates and attaches multiple tags that are new to the Tags table', function (done) {
                var seededTagNames = ['tag1'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // add the additional tags, and save
                    tagData.push({id: null, name: 'tag2'});
                    tagData.push({id: null, name: 'tag3'});
                    return postModel.set('tags', tagData).save();
                }).then(function (postModel) {
                    return PostModel.read({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagNames = reloadedPost.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3']);

                    done();
                }).then(null, done);
            });

            it('attaches one tag that exists in the Tags database and one tag that is new to the Tags database', function (done) {
                var seededTagNames = ['tag1'],
                    postModel;

                seedTags(seededTagNames).then(function (_postModel) {
                    postModel = _postModel;
                    return TagModel.add({name: 'tag2'});
                }).then(function () {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // Add the tag that exists in the database
                    tagData.push({id: 2, name: 'tag2'});

                    // Add the tag that doesn't exist in the database
                    tagData.push({id: 3, name: 'tag3'});

                    return postModel.set('tags', tagData).save();
                }).then(function () {
                    return PostModel.read({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagModels = reloadedPost.related('tags').models,
                        tagNames = tagModels.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3']);
                    tagModels[2].id.should.eql(4); // make sure it hasn't just added a new tag with the same name

                    done();
                }).then(null, done);
            });

            it('attaches one tag that exists in the Tags database and two tags that are new to the Tags database', function (done) {
                var seededTagNames = ['tag1'],
                    postModel;

                seedTags(seededTagNames).then(function (_postModel) {
                    postModel = _postModel;
                    return TagModel.add({name: 'tag2'});
                }).then(function () {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // Add the tag that exists in the database
                    tagData.push({id: 2, name: 'tag2'});

                    // Add the tags that doesn't exist in the database
                    tagData.push({id: 3, name: 'tag3'});
                    tagData.push({id: 4, name: 'tag4'});

                    return postModel.set('tags', tagData).save();
                }).then(function () {
                    return PostModel.read({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagModels = reloadedPost.related('tags').models,
                        tagNames = tagModels.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3', 'tag4']);
                    tagModels[2].id.should.eql(4); // make sure it hasn't just added a new tag with the same name

                    done();
                }).then(null, done);
            });

            it('can add a tag to a post on creation', function (done) {
                var newPost = _.extend(testUtils.DataGenerator.forModel.posts[0], {tags: [{name: 'test_tag_1'}]})

                PostModel.add(newPost).then(function (createdPost) {
                    return PostModel.read({id: createdPost.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (postWithTag) {
                    postWithTag.related('tags').length.should.equal(1);
                    done();
                }).then(null, done);

            });
        });

    });

});