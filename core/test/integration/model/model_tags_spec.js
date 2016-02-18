/*globals describe, before, beforeEach, afterEach, it */
var testUtils   = require('../../utils'),
    should      = require('should'),
    sinon       = require('sinon'),
    Promise     = require('bluebird'),
    _           = require('lodash'),

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
        testUtils.fixtures.insertPosts().then(function () {
            TagModel.findOne({slug: 'kitchen-sink'}, {include: 'count.posts'}).then(function (tag) {
                should.exist(tag);
                tag.toJSON().count.posts.should.equal(2);

                done();
            }).catch(done);
        });
    });

    describe('findPage', function () {
        beforeEach(function (done) {
            testUtils.fixtures.insertPosts().then(function () {
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
            TagModel.findPage({limit: 'all', include: 'count.posts'}).then(function (results) {
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
            testUtils.fixtures.insertPosts().then(function () {
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

    describe('Post tag handling, post with NO tags', function () {
        var postJSON,
            tagJSON,
            editOptions,
            createTag = testUtils.DataGenerator.forKnex.createTag;

        beforeEach(function (done) {
            tagJSON = [];

            var post = testUtils.DataGenerator.forModel.posts[0],
                extraTag1 = createTag({name: 'existing tag a'}),
                extraTag2 = createTag({name: 'existing-tag-b'}),
                extraTag3 = createTag({name: 'existing_tag_c'});

            return Promise.props({
                post: PostModel.add(post, _.extend({}, context, {withRelated: ['tags']})),
                tag1: TagModel.add(extraTag1, context),
                tag2: TagModel.add(extraTag2, context),
                tag3: TagModel.add(extraTag3, context)
            }).then(function (result) {
                postJSON = result.post.toJSON({include: ['tags']});
                tagJSON.push(result.tag1.toJSON());
                tagJSON.push(result.tag2.toJSON());
                tagJSON.push(result.tag3.toJSON());
                editOptions = _.extend({}, context, {id: postJSON.id, withRelated: ['tags']});

                done();
            }).catch(done);
        });

        it('should create the test data correctly', function () {
            // creates two test tags
            should.exist(tagJSON);
            tagJSON.should.be.an.Array().with.lengthOf(3);
            tagJSON.should.have.enumerable(0).with.property('name', 'existing tag a');
            tagJSON.should.have.enumerable(1).with.property('name', 'existing-tag-b');
            tagJSON.should.have.enumerable(2).with.property('name', 'existing_tag_c');

            // creates a test post with no tags
            should.exist(postJSON);
            postJSON.title.should.eql('HTML Ipsum');
            should.exist(postJSON.tags);
        });

        describe('Adding brand new tags', function () {
            it('can add a single tag', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add a single tag to the end of the array
                newJSON.tags.push(createTag({name: 'tag1'}));

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(1);
                    updatedPost.tags.should.have.enumerable(0).with.property('name', 'tag1');

                    done();
                }).catch(done);
            });

            it('can add multiple tags', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add a bunch of tags to the end of the array
                newJSON.tags.push(createTag({name: 'tag1'}));
                newJSON.tags.push(createTag({name: 'tag2'}));
                newJSON.tags.push(createTag({name: 'tag3'}));
                newJSON.tags.push(createTag({name: 'tag4'}));
                newJSON.tags.push(createTag({name: 'tag5'}));

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(5);
                    updatedPost.tags.should.have.enumerable(0).with.property('name', 'tag1');
                    updatedPost.tags.should.have.enumerable(1).with.property('name', 'tag2');
                    updatedPost.tags.should.have.enumerable(2).with.property('name', 'tag3');
                    updatedPost.tags.should.have.enumerable(3).with.property('name', 'tag4');
                    updatedPost.tags.should.have.enumerable(4).with.property('name', 'tag5');

                    done();
                }).catch(done);
            });

            it('can add multiple tags with conflicting slugs', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add conflicting tags to the end of the array
                newJSON.tags.push({name: 'C'});
                newJSON.tags.push({name: 'C++'});
                newJSON.tags.push({name: 'C#'});

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(3);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'C', slug: 'c'});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'C++', slug: 'c-2'});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'C#', slug: 'c-3'});

                    done();
                }).catch(done);
            });
        });

        describe('Adding pre-existing tags', function () {
            it('can add a single tag', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add a single pre-existing tag
                newJSON.tags.push(tagJSON[0]);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(1);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'existing tag a', id: tagJSON[0].id});

                    done();
                }).catch(done);
            });

            it('can add multiple tags', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add many preexisting tags
                newJSON.tags.push(tagJSON[0]);
                newJSON.tags.push(tagJSON[1]);
                newJSON.tags.push(tagJSON[2]);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(3);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'existing tag a', id: tagJSON[0].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'existing-tag-b', id: tagJSON[1].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'existing_tag_c', id: tagJSON[2].id});

                    done();
                }).catch(done);
            });

            it('can add multiple tags in wrong order', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add tags to the array
                newJSON.tags.push(tagJSON[2]);
                newJSON.tags.push(tagJSON[0]);
                newJSON.tags.push(tagJSON[1]);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(3);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'existing_tag_c', id: tagJSON[2].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'existing tag a', id: tagJSON[0].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'existing-tag-b', id: tagJSON[1].id});

                    done();
                }).catch(done);
            });
        });

        describe('Adding combinations', function () {
            it('can add a combination of new and pre-existing tags', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add a bunch of new and existing tags to the array
                newJSON.tags.push({name: 'tag1'});
                newJSON.tags.push({name: 'existing tag a'});
                newJSON.tags.push({name: 'tag3'});
                newJSON.tags.push({name: 'existing-tag-b'});
                newJSON.tags.push({name: 'tag5'});
                newJSON.tags.push({name: 'existing_tag_c'});

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(6);
                    updatedPost.tags.should.have.enumerable(0).with.property('name', 'tag1');
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'existing tag a', id: tagJSON[0].id});
                    updatedPost.tags.should.have.enumerable(2).with.property('name', 'tag3');
                    updatedPost.tags.should.have.enumerable(3).with.properties({name: 'existing-tag-b', id: tagJSON[1].id});
                    updatedPost.tags.should.have.enumerable(4).with.property('name', 'tag5');
                    updatedPost.tags.should.have.enumerable(5).with.properties({name: 'existing_tag_c', id: tagJSON[2].id});

                    done();
                }).catch(done);
            });
        });
    });

    describe('Post tag handling, post with tags', function () {
        var postJSON,
            tagJSON,
            editOptions,
            createTag = testUtils.DataGenerator.forKnex.createTag;

        beforeEach(function (done) {
            tagJSON = [];

            var post = testUtils.DataGenerator.forModel.posts[0],
                postTags = [
                    createTag({name: 'tag1'}),
                    createTag({name: 'tag2'}),
                    createTag({name: 'tag3'})
                ],
                extraTags = [
                    createTag({name: 'existing tag a'}),
                    createTag({name: 'existing-tag-b'}),
                    createTag({name: 'existing_tag_c'})
                ];

            post.tags = postTags;

            return Promise.props({
                post: PostModel.add(post, _.extend({}, context, {withRelated: ['tags']})),
                tag1: TagModel.add(extraTags[0], context),
                tag2: TagModel.add(extraTags[1], context),
                tag3: TagModel.add(extraTags[2], context)
            }).then(function (result) {
                postJSON = result.post.toJSON({include: ['tags']});
                tagJSON.push(result.tag1.toJSON());
                tagJSON.push(result.tag2.toJSON());
                tagJSON.push(result.tag3.toJSON());
                editOptions = _.extend({}, context, {id: postJSON.id, withRelated: ['tags']});

                done();
            });
        });

        it('should create the test data correctly', function () {
            // creates a test tag
            should.exist(tagJSON);
            tagJSON.should.be.an.Array().with.lengthOf(3);
            tagJSON.should.have.enumerable(0).with.property('name', 'existing tag a');
            tagJSON.should.have.enumerable(1).with.property('name', 'existing-tag-b');
            tagJSON.should.have.enumerable(2).with.property('name', 'existing_tag_c');

            // creates a test post with an array of tags in the correct order
            should.exist(postJSON);
            postJSON.title.should.eql('HTML Ipsum');
            should.exist(postJSON.tags);
            postJSON.tags.should.be.an.Array().and.have.lengthOf(3);
            postJSON.tags.should.have.enumerable(0).with.property('name', 'tag1');
            postJSON.tags.should.have.enumerable(1).with.property('name', 'tag2');
            postJSON.tags.should.have.enumerable(2).with.property('name', 'tag3');
        });

        describe('Adding brand new tags', function () {
            it('can add a single tag to the end of the tags array', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add a single tag to the end of the array
                newJSON.tags.push(createTag({name: 'tag4'}));

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(4);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'tag1', id: postJSON.tags[0].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag3', id: postJSON.tags[2].id});
                    updatedPost.tags.should.have.enumerable(3).with.property('name', 'tag4');

                    done();
                }).catch(done);
            });

            it('can add a single tag to the beginning of the tags array', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add a single tag to the beginning of the array
                newJSON.tags = [createTag({name: 'tag4'})].concat(postJSON.tags);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(4);
                    updatedPost.tags.should.have.enumerable(0).with.property('name', 'tag4');
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag1', id: postJSON.tags[0].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(3).with.properties({name: 'tag3', id: postJSON.tags[2].id});

                    done();
                }).catch(done);
            });
        });

        describe('Adding pre-existing tags', function () {
            it('can add a single tag to the end of the tags array', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add a single pre-existing tag to the end of the array
                newJSON.tags.push(tagJSON[0]);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(4);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'tag1', id: postJSON.tags[0].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag3', id: postJSON.tags[2].id});
                    updatedPost.tags.should.have.enumerable(3).with.properties({name: 'existing tag a', id: tagJSON[0].id});

                    done();
                }).catch(done);
            });

            it('can add a single tag to the beginning of the tags array', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add an existing tag to the beginning of the array
                newJSON.tags = [tagJSON[0]].concat(postJSON.tags);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(4);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'existing tag a', id: tagJSON[0].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag1', id: postJSON.tags[0].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(3).with.properties({name: 'tag3', id: postJSON.tags[2].id});

                    done();
                }).catch(done);
            });

            it('can add a single tag to the middle of the tags array', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Add a single pre-existing tag to the middle of the array
                newJSON.tags = postJSON.tags.slice(0, 1).concat([tagJSON[0]]).concat(postJSON.tags.slice(1));

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(4);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'tag1', id: postJSON.tags[0].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'existing tag a', id: tagJSON[0].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(3).with.properties({name: 'tag3', id: postJSON.tags[2].id});

                    done();
                }).catch(done);
            });
        });

        describe('Removing tags', function () {
            it('can remove a single tag from the end of the tags array', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Remove a single tag from the end of the array
                newJSON.tags = postJSON.tags.slice(0, -1);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(2);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'tag1', id: postJSON.tags[0].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag2', id: postJSON.tags[1].id});

                    done();
                }).catch(done);
            });

            it('can remove a single tag from the beginning of the tags array', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Remove a single tag from the beginning of the array
                newJSON.tags = postJSON.tags.slice(1);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(2);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag3', id: postJSON.tags[2].id});

                    done();
                }).catch(done);
            });

            it('can remove all tags', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Remove all the tags
                newJSON.tags = [];

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(0);

                    done();
                }).catch(done);
            });
        });

        describe('Reordering tags', function () {
            it('can reorder the first tag to be the last', function (done) {
                var newJSON = _.cloneDeep(postJSON),
                    firstTag = [postJSON.tags[0]];

                // Reorder the tags, so that the first tag is moved to the end
                newJSON.tags = postJSON.tags.slice(1).concat(firstTag);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(3);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag3', id: postJSON.tags[2].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag1', id: postJSON.tags[0].id});

                    done();
                }).catch(done);
            });

            it('can reorder the last tag to be the first', function (done) {
                var newJSON = _.cloneDeep(postJSON),
                    lastTag = [postJSON.tags[2]];

                // Reorder the tags, so that the last tag is moved to the beginning
                newJSON.tags = lastTag.concat(postJSON.tags.slice(0, -1));

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(3);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'tag3', id: postJSON.tags[2].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag1', id: postJSON.tags[0].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag2', id: postJSON.tags[1].id});

                    done();
                }).catch(done);
            });
        });

        describe('Combination updates', function () {
            it('can add a combination of new and pre-existing tags', function (done) {
                var newJSON = _.cloneDeep(postJSON);

                // Push a bunch of new and existing tags to the end of the array
                newJSON.tags.push({name: 'tag4'});
                newJSON.tags.push({name: 'existing tag a'});
                newJSON.tags.push({name: 'tag5'});
                newJSON.tags.push({name: 'existing-tag-b'});
                newJSON.tags.push({name: 'bob'});
                newJSON.tags.push({name: 'existing_tag_c'});

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(9);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'tag1', id: postJSON.tags[0].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag3', id: postJSON.tags[2].id});
                    updatedPost.tags.should.have.enumerable(3).with.property('name', 'tag4');
                    updatedPost.tags.should.have.enumerable(4).with.properties({name: 'existing tag a', id: tagJSON[0].id});
                    updatedPost.tags.should.have.enumerable(5).with.property('name', 'tag5');
                    updatedPost.tags.should.have.enumerable(6).with.properties({name: 'existing-tag-b', id: tagJSON[1].id});
                    updatedPost.tags.should.have.enumerable(7).with.property('name', 'bob');
                    updatedPost.tags.should.have.enumerable(8).with.properties({name: 'existing_tag_c', id: tagJSON[2].id});

                    done();
                }).catch(done);
            });

            it('can reorder the first tag to be the last and add a tag to the beginning', function (done) {
                var newJSON = _.cloneDeep(postJSON),
                    firstTag = [postJSON.tags[0]];

                // Add a new tag to the beginning, and move the original first tag to the end
                newJSON.tags = [tagJSON[0]].concat(postJSON.tags.slice(1)).concat(firstTag);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(4);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'existing tag a', id: tagJSON[0].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag3', id: postJSON.tags[2].id});
                    updatedPost.tags.should.have.enumerable(3).with.properties({name: 'tag1', id: postJSON.tags[0].id});

                    done();
                }).catch(done);
            });

            it('can reorder the first tag to be the last, remove the original last tag & add a tag to the beginning', function (done) {
                var newJSON = _.cloneDeep(postJSON),
                    firstTag = [newJSON.tags[0]];

                // And an existing tag to the beginning of the array, move the original first tag to the end and remove the original last tag
                newJSON.tags = [tagJSON[0]].concat(newJSON.tags.slice(1, -1)).concat(firstTag);

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(3);
                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'existing tag a', id: tagJSON[0].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag1', id: postJSON.tags[0].id});

                    done();
                }).catch(done);
            });

            it('can reorder original tags, remove one, and add new and existing tags', function (done) {
                var newJSON = _.cloneDeep(postJSON),
                    firstTag = [newJSON.tags[0]];

                // Reorder original 3 so that first is at the end
                newJSON.tags = newJSON.tags.slice(1).concat(firstTag);

                // add an existing tag in the middle
                newJSON.tags = newJSON.tags.slice(0, 1).concat({name: 'existing-tag-b'}).concat(newJSON.tags.slice(1));

                // add a brand new tag in the middle
                newJSON.tags = newJSON.tags.slice(0, 3).concat({name: 'betty'}).concat(newJSON.tags.slice(3));

                // Add some more tags to the end
                newJSON.tags.push({name: 'bob'});
                newJSON.tags.push({name: 'existing tag a'});

                // Edit the post
                return PostModel.edit(newJSON, editOptions).then(function (updatedPost) {
                    updatedPost = updatedPost.toJSON({include: ['tags']});

                    updatedPost.tags.should.have.lengthOf(7);

                    updatedPost.tags.should.have.enumerable(0).with.properties({name: 'tag2', id: postJSON.tags[1].id});
                    updatedPost.tags.should.have.enumerable(1).with.properties({name: 'existing-tag-b', id: tagJSON[1].id});
                    updatedPost.tags.should.have.enumerable(2).with.properties({name: 'tag3', id: postJSON.tags[2].id});
                    updatedPost.tags.should.have.enumerable(3).with.property('name', 'betty');
                    updatedPost.tags.should.have.enumerable(4).with.properties({name: 'tag1', id: postJSON.tags[0].id});
                    updatedPost.tags.should.have.enumerable(5).with.property('name', 'bob');
                    updatedPost.tags.should.have.enumerable(6).with.properties({name: 'existing tag a', id: tagJSON[0].id});

                    done();
                }).catch(done);
            });
        });
    });
});
