/*globals describe, before, beforeEach, afterEach, it */
var testUtils = require('./testUtils'),
    _ = require("underscore"),
    when = require('when'),
    sequence = require('when/sequence'),
    should = require('should'),

    // Stuff we are testing
    Models = require('../../server/models');

describe('Tag Model', function () {

    var TagModel = Models.Tag;

    before(function (done) {
        testUtils.clearData().then(function () {
            done();
        }, done);
    });

    beforeEach(function (done) {
        this.timeout(5000);
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
            var newPost = {title: 'Test Title 1', markdown: 'Test Content 1'},
                newTag = {name: 'tag1'},
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
                return PostModel.read({id: createdPostID}, { withRelated: ['tags']});
            }).then(function (postWithTag) {
                postWithTag.related('tags').length.should.equal(1);
                done();
            }).then(null, done);

        });

        it('can remove a tag', function (done) {
            // The majority of this test is ripped from above, which is obviously a Bad Thing.
            // Would be nice to find a way to seed data with relations for cases like this,
            // because there are more DB hits than needed
            var newPost = {title: 'Test Title 1', markdown: 'Test Content 1'},
                newTag = {name: 'tag1'},
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
                return PostModel.read({id: createdPostID}, { withRelated: ['tags']});
            }).then(function (postWithTag) {
                return postWithTag.tags().detach(createdTagID);
            }).then(function () {
                return PostModel.read({id: createdPostID}, { withRelated: ['tags']});
            }).then(function (postWithoutTag) {
                postWithoutTag.related('tags').should.be.empty;
                done();
            }).then(null, done);
        });

        describe('setting tags from an array on update', function () {
            // When a Post is updated, iterate through the existing tags, and detach any that have since been removed.
            // It can be assumed that any remaining tags in the update data are newly added.
            // Create new tags if needed, and attach them to the Post

            function seedTags(tagNames) {
                var createOperations = [
                    PostModel.add({title: 'title', markdown: 'content'})
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
                    return PostModel.read({id: postModel.id}, { withRelated: ['tags']});
                });
            }

            it('does nothing if tags havent changed', function (done) {
                var seededTagNames = ['tag1', 'tag2', 'tag3'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var existingTagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });
                    postModel.set('tags', existingTagData);
                    return postModel.save();
                }).then(function (postModel) {
                    var tagNames = postModel.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.should.eql(seededTagNames);

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
                    return PostModel.read({id: postModel.id}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagNames = reloadedPost.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.should.eql(['tag1', 'tag3']);

                    done();
                }).then(null, done);
            });

            it('attaches tags that are new to the post, but aleady exist in the database', function (done) {
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
                    return PostModel.read({id: postModel.id}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagModels = reloadedPost.related('tags').models,
                        tagNames = tagModels.map(function (t) { return t.attributes.name; });
                    tagNames.should.eql(['tag1', 'tag2', 'tag3']);
                    tagModels[2].id.should.eql(4); // make sure it hasn't just added a new tag with the same name

                    done();
                }).then(null, done);
            });

            it('creates and attaches tags that are new to the Tags table', function (done) {
                var seededTagNames = ['tag1', 'tag2'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // add the additional tag, and save
                    tagData.push({id: null, name: 'tag3'});
                    return postModel.set('tags', tagData).save();
                }).then(function (postModel) {
                    return PostModel.read({id: postModel.id}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagNames = reloadedPost.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.should.eql(['tag1', 'tag2', 'tag3']);

                    done();
                }).then(null, done);
            });


            it('can add a tag to a post on creation', function (done) {
                var newPost = {title: 'Test Title 1', markdown: 'Test Content 1', tags: [{name: 'test_tag_1'}]};

                PostModel.add(newPost).then(function (createdPost) {
                    return PostModel.read({id: createdPost.id}, { withRelated: ['tags']});
                }).then(function (postWithTag) {
                    postWithTag.related('tags').length.should.equal(1);
                    done();
                }).then(null, done);

            });
        });

    });

});
