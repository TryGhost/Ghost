/*globals describe, before, beforeEach, afterEach, it */
/*jshint expr:true*/
var testUtils   = require('../../utils'),
    should      = require('should'),
    when        = require('when'),
    _           = require('lodash'),

    // Stuff we are testing
    Models      = require('../../../server/models'),
    TagModel    = Models.Tag,
    PostModel   = Models.Post,
    context     = testUtils.context.admin;

describe('Tag Model', function () {
    // Keep the DB clean
    before(testUtils.teardown);
    afterEach(testUtils.teardown);
    beforeEach(testUtils.setup());

    should.exist(TagModel);

    it('uses Date objects for dateTime fields', function (done) {
        TagModel.add(testUtils.DataGenerator.forModel.tags[0], context).then(function (tag) {
            return TagModel.findOne({ id: tag.id });
        }).then(function (tag) {
            should.exist(tag);
            tag.get('created_at').should.be.an.instanceof(Date);

            done();
        }).catch(done);
    });

    describe('a Post', function () {

        it('can add a tag', function (done) {
            var newPost = testUtils.DataGenerator.forModel.posts[0],
                newTag = testUtils.DataGenerator.forModel.tags[0],
                createdPostID;

            when.all([
                PostModel.add(newPost, context),
                TagModel.add(newTag, context)
            ]).then(function (models) {
                var createdPost = models[0],
                    createdTag = models[1];

                createdPostID = createdPost.id;
                return createdPost.tags().attach(createdTag);
            }).then(function () {
                return PostModel.findOne({id: createdPostID, status: 'all'}, { withRelated: ['tags']});
            }).then(function (postWithTag) {
                postWithTag.related('tags').length.should.equal(1);
                done();
            }).catch(done);

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
                PostModel.add(newPost, context),
                TagModel.add(newTag, context)
            ]).then(function (models) {
                var createdPost = models[0],
                    createdTag = models[1];

                createdPostID = createdPost.id;
                createdTagID = createdTag.id;
                return createdPost.tags().attach(createdTag);
            }).then(function () {
                return PostModel.findOne({id: createdPostID, status: 'all'}, { withRelated: ['tags']});
            }).then(function (postWithTag) {
                return postWithTag.tags().detach(createdTagID);
            }).then(function () {
                return PostModel.findOne({id: createdPostID, status: 'all'}, { withRelated: ['tags']});
            }).then(function (postWithoutTag) {
                postWithoutTag.related('tags').length.should.equal(0);
                done();
            }).catch(done);
        });

        describe('setting tags from an array on update', function () {
            // When a Post is updated, iterate through the existing tags, and detach any that have since been removed.
            // It can be assumed that any remaining tags in the update data are newly added.
            // Create new tags if needed, and attach them to the Post

            function seedTags(tagNames) {
                var createOperations = [
                    PostModel.add(testUtils.DataGenerator.forModel.posts[0], context)
                ];

                var tagModels = tagNames.map(function (tagName) { return TagModel.add({name: tagName}, context); });
                createOperations = createOperations.concat(tagModels);

                return when.all(createOperations).then(function (models) {
                    var postModel = models[0],
                        attachOperations;

                    attachOperations = [];
                    for (var i = 1; i < models.length; i += 1) {
                        attachOperations.push(postModel.tags().attach(models[i]));
                    }

                    return when.all(attachOperations).then(function () {
                        return postModel;
                    });
                }).then(function (postModel) {
                    return PostModel.findOne({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                });
            }

            it('does nothing if tags haven\'t changed', function (done) {
                var seededTagNames = ['tag1', 'tag2', 'tag3'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var existingTagData = seededTagNames.map(function (tagName, i) {
                        return {id: i + 1, name: tagName};
                    });

                    postModel = postModel.toJSON();
                    postModel.tags = existingTagData;

                    return PostModel.edit(postModel, _.extend(context, { id: postModel.id, withRelated: ['tags']}));
                }).then(function (postModel) {
                    var tagNames = postModel.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(seededTagNames);

                    return TagModel.findAll();
                }).then(function (tagsFromDB) {
                    tagsFromDB.length.should.eql(seededTagNames.length);

                    done();
                }).catch(done);
            });

            it('detaches tags that have been removed', function (done) {
                var seededTagNames = ['tag1', 'tag2', 'tag3'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // remove the second tag, and save
                    tagData.splice(1, 1);

                    postModel = postModel.toJSON();
                    postModel.tags = tagData;

                    return PostModel.edit(postModel, _.extend(context, { id: postModel.id, withRelated: ['tags']}));
                }).then(function (postModel) {
                    return PostModel.findOne({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagNames = reloadedPost.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(['tag1', 'tag3']);

                    done();
                }).catch(done);
            });

            it('attaches tags that are new to the post, but already exist in the database', function (done) {
                var seededTagNames = ['tag1', 'tag2'],
                    postModel;

                seedTags(seededTagNames).then(function (_postModel) {
                    postModel = _postModel;
                    return TagModel.add({name: 'tag3'}, context);
                }).then(function () {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // add the additional tag, and save
                    tagData.push({id: 3, name: 'tag3'});
                    postModel = postModel.toJSON();
                    postModel.tags = tagData;

                    return PostModel.edit(postModel, _.extend(context, { id: postModel.id, withRelated: ['tags']}));
                }).then(function () {
                    return PostModel.findOne({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagModels = reloadedPost.related('tags').models,
                        tagNames = tagModels.map(function (t) { return t.attributes.name; }),
                        tagIds = _.pluck(tagModels, 'id');
                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3']);

                    // make sure it hasn't just added a new tag with the same name
                    // Don't expect a certain order in results - check for number of items!
                    Math.max.apply(Math, tagIds).should.eql(3);

                    done();
                }).catch(done);
            });

            it('creates and attaches a tag that is new to the Tags table', function (done) {
                var seededTagNames = ['tag1', 'tag2'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // add the additional tag, and save
                    tagData.push({id: null, name: 'tag3'});
                    postModel = postModel.toJSON();
                    postModel.tags = tagData;

                    return PostModel.edit(postModel, _.extend(context, { id: postModel.id, withRelated: ['tags']}));
                }).then(function (postModel) {
                    return PostModel.findOne({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagNames = reloadedPost.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3']);

                    done();
                }).catch(done);
            });

            it('creates and attaches multiple tags that are new to the Tags table', function (done) {
                var seededTagNames = ['tag1'];

                seedTags(seededTagNames).then(function (postModel) {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // add the additional tags, and save
                    tagData.push({id: null, name: 'tag2'});
                    tagData.push({id: null, name: 'tag3'});

                    postModel = postModel.toJSON();
                    postModel.tags = tagData;

                    return PostModel.edit(postModel, _.extend(context, { id: postModel.id, withRelated: ['tags']}));
                }).then(function (postModel) {
                    return PostModel.findOne({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagNames = reloadedPost.related('tags').models.map(function (t) { return t.attributes.name; });
                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3']);

                    done();
                }).catch(done);
            });

            it('attaches one tag that exists in the Tags database and one tag that is new', function (done) {
                var seededTagNames = ['tag1'],
                    postModel;

                seedTags(seededTagNames).then(function (_postModel) {
                    postModel = _postModel;
                    return TagModel.add({name: 'tag2'}, context);
                }).then(function () {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // Add the tag that exists in the database
                    tagData.push({id: 2, name: 'tag2'});

                    // Add the tag that doesn't exist in the database
                    tagData.push({id: 3, name: 'tag3'});

                    postModel = postModel.toJSON();
                    postModel.tags = tagData;

                    return PostModel.edit(postModel, _.extend(context, { id: postModel.id, withRelated: ['tags']}));
                }).then(function () {
                    return PostModel.findOne({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagModels = reloadedPost.related('tags').models,
                        tagNames = tagModels.map(function (t) { return t.attributes.name; }),
                        tagIds = _.pluck(tagModels, 'id');

                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3']);

                    // make sure it hasn't just added a new tag with the same name
                    // Don't expect a certain order in results - check for number of items!
                    Math.max.apply(Math, tagIds).should.eql(3);

                    done();
                }).catch(done);
            });

            it('attaches one tag that exists in the Tags database and two tags that are new', function (done) {
                var seededTagNames = ['tag1'],
                    postModel;

                seedTags(seededTagNames).then(function (_postModel) {
                    postModel = _postModel;
                    return TagModel.add({name: 'tag2'}, context);
                }).then(function () {
                    // the tag API expects tags to be provided like {id: 1, name: 'draft'}
                    var tagData = seededTagNames.map(function (tagName, i) { return {id: i + 1, name: tagName}; });

                    // Add the tag that exists in the database
                    tagData.push({id: 2, name: 'tag2'});

                    // Add the tags that doesn't exist in the database
                    tagData.push({id: 3, name: 'tag3'});
                    tagData.push({id: 4, name: 'tag4'});

                    postModel = postModel.toJSON();
                    postModel.tags = tagData;

                    return PostModel.edit(postModel, _.extend(context, { id: postModel.id, withRelated: ['tags']}));
                }).then(function () {
                    return PostModel.findOne({id: postModel.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (reloadedPost) {
                    var tagModels = reloadedPost.related('tags').models,
                        tagNames = tagModels.map(function (t) { return t.get('name'); }),
                        tagIds = _.pluck(tagModels, 'id');

                    tagNames.sort().should.eql(['tag1', 'tag2', 'tag3', 'tag4']);

                    // make sure it hasn't just added a new tag with the same name
                    // Don't expect a certain order in results - check for number of items!
                    Math.max.apply(Math, tagIds).should.eql(4);

                    done();
                }).catch(done);
            });

            it('can add a tag to a post on creation', function (done) {
                var newPost = _.extend(testUtils.DataGenerator.forModel.posts[0], {tags: [{name: 'test_tag_1'}]});

                PostModel.add(newPost, context).then(function (createdPost) {
                    return PostModel.findOne({id: createdPost.id, status: 'all'}, { withRelated: ['tags']});
                }).then(function (postWithTag) {
                    postWithTag.related('tags').length.should.equal(1);
                    done();
                }).catch(done);
            });
        });
    });
});
