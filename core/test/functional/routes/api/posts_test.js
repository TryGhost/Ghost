/*global describe, it, before, after */
/*jshint expr:true*/
var testUtils     = require('../../../utils'),
    should        = require('should'),
    supertest     = require('supertest'),
    _             = require('lodash'),

    ghost         = require('../../../../../core'),

    request;

describe('Post API', function () {
    var accesstoken = '';

    before(function (done) {
        // starting ghost automatically populates the db
        // TODO: prevent db init, and manage bringing up the DB with fixtures ourselves
        ghost().then(function (ghostServer) {
            request = supertest.agent(ghostServer.rootApp);
        }).then(function () {
            return testUtils.doAuth(request, 'posts');
        }).then(function (token) {
            accesstoken = token;
            done();
        }).catch(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });

    after(function (done) {
        testUtils.clearData().then(function () {
            done();
        }).catch(done);
    });

    describe('Browse', function () {
        it('retrieves all published posts only by default', function (done) {
            request.get(testUtils.API.getApiQuery('posts/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(5);
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                    _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                    _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                    done();
                });
        });

        it('can retrieve all published posts and pages', function (done) {
            request.get(testUtils.API.getApiQuery('posts/?staticPages=all'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(6);
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                    done();
                });
        });

        // Test bits of the API we don't use in the app yet to ensure the API behaves properly

        it('can retrieve all status posts and pages', function (done) {
            request.get(testUtils.API.getApiQuery('posts/?staticPages=all&status=all'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(8);
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                    done();
                });
        });

        it('can retrieve just published pages', function (done) {
            request.get(testUtils.API.getApiQuery('posts/?staticPages=true'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                    done();
                });
        });

        it('can retrieve just draft posts', function (done) {
            request.get(testUtils.API.getApiQuery('posts/?status=draft'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(1);
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                    done();
                });
        });
    });

    // ## Read
    describe('Read', function () {
        it('can retrieve a post by id', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    jsonResponse.posts[0].id.should.equal(1);
                    jsonResponse.posts[0].page.should.not.be.ok;
                    _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                    _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                    jsonResponse.posts[0].author.should.be.a.Number;
                    testUtils.API.isISO8601(jsonResponse.posts[0].created_at).should.be.true;
                    jsonResponse.posts[0].created_by.should.be.a.Number;
                    // Tags aren't included by default
                    should.not.exist(jsonResponse.posts[0].tags);
                    done();
                });
        });

        it('can retrieve a post by slug', function (done) {
            request.get(testUtils.API.getApiQuery('posts/slug/welcome-to-ghost/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    jsonResponse.posts[0].slug.should.equal('welcome-to-ghost');
                    jsonResponse.posts[0].page.should.not.be.ok;
                    _.isBoolean(jsonResponse.posts[0].featured).should.eql(true);
                    _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                    jsonResponse.posts[0].author.should.be.a.Number;
                    jsonResponse.posts[0].created_by.should.be.a.Number;
                    // Tags aren't included by default
                    should.not.exist(jsonResponse.posts[0].tags);
                    done();
                });
        });

        it('can retrieve a post with author, created_by, and tags', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/?include=author,tags,created_by'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post', 'tags');
                    jsonResponse.posts[0].page.should.not.be.ok;

                    jsonResponse.posts[0].author.should.be.an.Object;
                    testUtils.API.checkResponse(jsonResponse.posts[0].author, 'user');
                    jsonResponse.posts[0].tags[0].should.be.an.Object;
                    testUtils.API.checkResponse(jsonResponse.posts[0].tags[0], 'tag');
                    done();
                });
        });

        it('can retrieve next and previous posts', function (done) {
            request.get(testUtils.API.getApiQuery('posts/3/?include=next,previous'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post', ['next', 'previous']);
                    jsonResponse.posts[0].page.should.not.be.ok;

                    jsonResponse.posts[0].next.should.be.an.Object;
                    testUtils.API.checkResponse(jsonResponse.posts[0].next, 'post');
                    jsonResponse.posts[0].previous.should.be.an.Object;
                    testUtils.API.checkResponse(jsonResponse.posts[0].previous, 'post');
                    done();
                });
        });

        it('can retrieve a static page', function (done) {
            request.get(testUtils.API.getApiQuery('posts/7/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    jsonResponse.posts[0].page.should.be.ok;
                    _.isBoolean(jsonResponse.posts[0].page).should.eql(true);
                    done();
                });
        });

        it('can\'t retrieve non existent post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/99/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.errors.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                    done();
                });
        });

        it('can\'t retrieve a draft post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/5/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.errors.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                    done();
                });
        });

        it('can\'t retrieve a draft page', function (done) {
            request.get(testUtils.API.getApiQuery('posts/8/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.errors.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                    done();
                });
        });
    });

    // ## Add
    describe('Add', function () {
        it('can create a new draft, publish post, update post', function (done) {
            var newTitle = 'My Post',
                newTagName = 'My Tag',
                publishedState = 'published',
                newTag = {id: null, name: newTagName},
                newPost = {posts: [{status: 'draft', title: newTitle, markdown: 'my post', tags: [newTag]}]};

            request.post(testUtils.API.getApiQuery('posts/?include=tags'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send(newPost)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var draftPost = res.body;
                    res.headers.location.should.equal('/ghost/api/v0.1/posts/' + draftPost.posts[0].id + '/?status=draft');
                    draftPost.posts.should.exist;
                    draftPost.posts.length.should.be.above(0);
                    draftPost.posts[0].title.should.eql(newTitle);
                    draftPost.posts[0].status = publishedState;
                    testUtils.API.checkResponse(draftPost.posts[0], 'post', 'tags');

                    draftPost.posts[0].tags.should.exist;
                    draftPost.posts[0].tags.length.should.be.above(0);
                    draftPost.posts[0].tags[0].name.should.eql(newTagName);
                    testUtils.API.checkResponse(draftPost.posts[0].tags[0], 'tag');

                    request.put(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/?include=tags'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(draftPost)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var publishedPost = res.body;
                            _.has(res.headers, 'x-cache-invalidate').should.equal(true);
                            res.headers['x-cache-invalidate'].should.eql(
                                '/, /page/*, /rss/, /rss/*, /tag/*, /author/*, /sitemap-*.xml, /' + publishedPost.posts[0].slug + '/'
                            );

                            publishedPost.should.exist;
                            publishedPost.posts.should.exist;
                            publishedPost.posts.length.should.be.above(0);
                            publishedPost.posts[0].title.should.eql(newTitle);
                            publishedPost.posts[0].status.should.eql(publishedState);
                            testUtils.API.checkResponse(publishedPost.posts[0], 'post', 'tags');

                            publishedPost.posts[0].tags.should.exist;
                            publishedPost.posts[0].tags.length.should.be.above(0);
                            publishedPost.posts[0].tags[0].name.should.eql(newTagName);
                            testUtils.API.checkResponse(publishedPost.posts[0].tags[0], 'tag');

                            request.put(testUtils.API.getApiQuery('posts/' + publishedPost.posts[0].id + '/?include=tags'))
                                .set('Authorization', 'Bearer ' + accesstoken)
                                .send(publishedPost)
                                .expect('Content-Type', /json/)
                                .expect('Cache-Control', testUtils.cacheRules['private'])
                                .expect(200)
                                .end(function (err, res) {
                                    if (err) {
                                        return done(err);
                                    }

                                    var updatedPost = res.body;
                                    // Require cache invalidation when post was updated and published
                                    _.has(res.headers, 'x-cache-invalidate').should.equal(true);

                                    updatedPost.should.exist;
                                    updatedPost.posts.should.exist;
                                    updatedPost.posts.length.should.be.above(0);
                                    updatedPost.posts[0].title.should.eql(newTitle);
                                    testUtils.API.isISO8601(updatedPost.posts[0].created_at).should.be.true;
                                    testUtils.API.isISO8601(updatedPost.posts[0].updated_at).should.be.true;
                                    testUtils.API.checkResponse(updatedPost.posts[0], 'post', 'tags');

                                    updatedPost.posts[0].tags.should.exist;
                                    updatedPost.posts[0].tags.length.should.be.above(0);
                                    updatedPost.posts[0].tags[0].name.should.eql(newTagName);
                                    testUtils.API.checkResponse(updatedPost.posts[0].tags[0], 'tag');

                                    done();
                                });
                        });
                });
        });
    });

    // ## edit
    describe('Edit', function () {
        it('can edit a post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/?include=tags'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedTitle = 'My new Title',
                        changedAuthor = 2;
                    jsonResponse.posts[0].should.exist;
                    jsonResponse.posts[0].title = changedTitle;
                    jsonResponse.posts[0].author = changedAuthor;

                    request.put(testUtils.API.getApiQuery('posts/1/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;
                            _.has(res.headers, 'x-cache-invalidate').should.equal(true);
                            putBody.should.exist;
                            putBody.posts[0].title.should.eql(changedTitle);
                            putBody.posts[0].author.should.eql(changedAuthor);

                            testUtils.API.checkResponse(putBody.posts[0], 'post');
                            done();
                        });
                });
        });

        it('can edit a new draft and update post', function (done) {
            var newTitle = 'My Post',
                newTagName = 'My Tag',
                newTag = {id: null, name: newTagName},
                newPost = {posts: [{status: 'draft', title: newTitle, markdown: 'my post', tags: [newTag]}]};

            request.post(testUtils.API.getApiQuery('posts/?include=tags'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send(newPost)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var draftPost = res.body;
                    res.headers.location.should.equal('/ghost/api/v0.1/posts/' + draftPost.posts[0].id + '/?status=draft');
                    draftPost.posts.should.exist;
                    draftPost.posts.length.should.be.above(0);
                    draftPost.posts[0].title.should.eql(newTitle);
                    testUtils.API.checkResponse(draftPost.posts[0], 'post', 'tags');

                    draftPost.posts[0].title = 'Vote for Casper in red';

                    request.put(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/?include=tags'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(draftPost)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            // Updating a draft should not send x-cache-invalidate headers
                            _.has(res.headers, 'x-cache-invalidate').should.equal(false);
                            done();
                        });
                });
        });

        it('can edit a new published post and unpublish', function (done) {
            var newTitle = 'My Post',
                newTagName = 'My Tag',
                draftState = 'draft',
                newTag = {id: null, name: newTagName},
                newPost = {posts: [{status: 'published', title: newTitle, markdown: 'my post', tags: [newTag]}]};

            request.post(testUtils.API.getApiQuery('posts/?include=tags'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send(newPost)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var draftPost = res.body;
                    res.headers.location.should.equal('/ghost/api/v0.1/posts/' + draftPost.posts[0].id + '/?status=published');
                    draftPost.posts.should.exist;
                    draftPost.posts.length.should.be.above(0);
                    draftPost.posts[0].title.should.eql(newTitle);
                    testUtils.API.checkResponse(draftPost.posts[0], 'post', 'tags');

                    draftPost.posts[0].title = 'Vote for Casper in red';
                    draftPost.posts[0].status = draftState;

                    request.put(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/?include=tags'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(draftPost)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            // Unpublishing a post should send x-cache-invalidate headers
                            _.has(res.headers, 'x-cache-invalidate').should.equal(true);
                            done();
                        });
                });
        });

        it('can change a post to a static page', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/?include=tags'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;

                    jsonResponse.should.exist;
                    jsonResponse.posts[0].page.should.not.be.ok;
                    jsonResponse.posts[0].page = true;

                    request.put(testUtils.API.getApiQuery('posts/1/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;
                            _.has(res.headers, 'x-cache-invalidate').should.equal(true);
                            putBody.should.exist;
                            putBody.posts[0].page.should.be.ok;

                            testUtils.API.checkResponse(putBody.posts[0], 'post');
                            done();
                        });
                });
        });

        it('can change a static page to a post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/7/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;

                    jsonResponse.should.exist;
                    jsonResponse.posts[0].page.should.be.ok;
                    jsonResponse.posts[0].page = false;

                    request.put(testUtils.API.getApiQuery('posts/7/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;

                            _.has(res.headers, 'x-cache-invalidate').should.equal(true);
                            putBody.should.exist;
                            putBody.posts[0].page.should.not.be.ok;
                            testUtils.API.checkResponse(putBody.posts[0], 'post');
                            done();
                        });
                });
        });

        it('can\'t edit post with invalid page field', function (done) {
            request.get(testUtils.API.getApiQuery('posts/7/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedValue = 'invalid';
                    jsonResponse.should.exist;
                    jsonResponse.posts[0].page.should.eql(false);
                    jsonResponse.posts[0].page = changedValue;

                    request.put(testUtils.API.getApiQuery('posts/7/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(422)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            _.has(res.headers, 'x-cache-invalidate').should.equal(false);
                            jsonResponse = res.body;
                            jsonResponse.errors.should.exist;
                            testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                            done();
                        });
                });
        });

        it('can\'t edit a post with invalid accesstoken', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    /*jshint unused:false*/
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    request.put(testUtils.API.getApiQuery('posts/1/'))
                        .set('Authorization', 'Bearer ' + 'invalidtoken')
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(401)
                        .end(function (err, res) {
                            /*jshint unused:false*/
                            if (err) {
                                return done(err);
                            }

                            done();
                        });
                });
        });

        it('throws an error if there is an id mismatch', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    jsonResponse.should.exist;

                    request.put(testUtils.API.getApiQuery('posts/2/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(400)
                        .end(function (err, res) {
                            /*jshint unused:false*/
                            if (err) {
                                return done(err);
                            }

                            done();
                        });
                });
        });

        it('published_at = null', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/?include=tags'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedValue = 'My new Title';
                    jsonResponse.should.exist;
                    jsonResponse.title = changedValue;
                    jsonResponse.published_at = null;

                    request.put(testUtils.API.getApiQuery('posts/1/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;
                            _.has(res.headers, 'x-cache-invalidate').should.equal(true);
                            putBody.should.exist;
                            putBody.posts.should.exist;
                            putBody.posts[0].title.should.eql(changedValue);
                            if (_.isEmpty(putBody.posts[0].published_at)) {
                                should.fail('null', 'valid date', 'publish_at should not be empty');
                                done();
                            }
                            testUtils.API.checkResponse(putBody.posts[0], 'post');
                            done();
                        });
                });
        });

        it('can\'t edit non existent post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedValue = 'My new Title';
                    jsonResponse.posts[0].title.exist;
                    jsonResponse.posts[0].testvalue = changedValue;
                    jsonResponse.posts[0].id = 99;
                    request.put(testUtils.API.getApiQuery('posts/99/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(404)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            _.has(res.headers, 'x-cache-invalidate').should.equal(false);
                            jsonResponse = res.body;
                            jsonResponse.errors.should.exist;
                            testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                            done();
                        });
                });
        });
    });

    // ## delete
    describe('Delete', function () {
        it('can delete a post', function (done) {
            var deletePostId = 1;
            request.del(testUtils.API.getApiQuery('posts/' + deletePostId + '/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    res.headers['x-cache-invalidate'].should.eql(
                        '/, /page/*, /rss/, /rss/*, /tag/*, /author/*, /sitemap-*.xml, /' + jsonResponse.posts[0].slug + '/'
                    );
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    jsonResponse.posts[0].id.should.eql(deletePostId);
                    done();
                });
        });

        it('can\'t delete a non existent post', function (done) {
            request.del(testUtils.API.getApiQuery('posts/99/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.errors.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse.errors[0], ['message', 'type']);
                    done();
                });
        });

        it('can delete a new draft', function (done) {
            var newTitle = 'My Post',
                publishedState = 'draft',
                newPost = {posts: [{status: publishedState, title: newTitle, markdown: 'my post'}]};

            request.post(testUtils.API.getApiQuery('posts/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .send(newPost)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(201)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var draftPost = res.body;

                    draftPost.should.exist;
                    draftPost.posts[0].title.should.eql(newTitle);
                    draftPost.posts[0].status = publishedState;
                    testUtils.API.checkResponse(draftPost.posts[0], 'post');

                    request.del(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var jsonResponse = res.body;
                            jsonResponse.should.exist;
                            jsonResponse.posts.should.exist;
                            testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                            done();
                        });
                });
        });
    });

    describe('Dated Permalinks', function () {
        before(function (done) {
            request.get(testUtils.API.getApiQuery('settings/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    jsonResponse.permalinks = '/:year/:month/:day/:slug/';

                    request.put(testUtils.API.getApiQuery('settings/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .send(jsonResponse)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .end(function (err, res) {
                            /*jshint unused:false*/
                            if (err) {
                                return done(err);
                            }
                            done();
                        });
                });
        });

        after(function (done) {
            request.get(testUtils.API.getApiQuery('settings/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    jsonResponse.permalinks = '/:slug/';

                    request.put(testUtils.API.getApiQuery('settings/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .send(jsonResponse)
                        .end(function (err, res) {
                            /*jshint unused:false*/
                            if (err) {
                                return done(err);
                            }

                            done();
                        });
                });
        });

        it('Can read a post', function (done) {
            // nothing should have changed here
            request.get(testUtils.API.getApiQuery('posts/2/'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);

                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    jsonResponse.posts[0].slug.should.not.match(/^\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}/);
                    jsonResponse.posts[0].page.should.not.be.ok;
                    done();
                });
        });

        it('Can edit a post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/2/?include=tags'))
                .set('Authorization', 'Bearer ' + accesstoken)
                .expect('Content-Type', /json/)
                .expect('Cache-Control', testUtils.cacheRules['private'])
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedValue = 'My new Title';
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    jsonResponse.posts[0].title = changedValue;

                    request.put(testUtils.API.getApiQuery('posts/2/'))
                        .set('Authorization', 'Bearer ' + accesstoken)
                        .expect('Content-Type', /json/)
                        .expect('Cache-Control', testUtils.cacheRules['private'])
                        .send(jsonResponse)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }
                            var putBody = res.body;

                            _.has(res.headers, 'x-cache-invalidate').should.equal(true);
                            putBody.should.exist;
                            putBody.posts[0].title.should.eql(changedValue);

                            testUtils.API.checkResponse(putBody.posts[0], 'post');
                            done();
                        });
                });
        });
    });
});
