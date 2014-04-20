/*global describe, it, before, after */
var supertest     = require('supertest'),
    express       = require('express'),
    should        = require('should'),
    _             = require('lodash'),
    testUtils     = require('../../../utils'),

    ghost         = require('../../../../../core'),

    httpServer,
    request,
    agent;


describe('Post API', function () {
    var user = testUtils.DataGenerator.forModel.users[0],
        csrfToken = '';

    before(function (done) {
        var app = express();

        ghost({app: app}).then(function (_httpServer) {
            httpServer = _httpServer;

            request = supertest.agent(app);

            testUtils.clearData()
                .then(function () {
                    return testUtils.initData();
                })
                .then(function () {
                    return testUtils.insertDefaultFixtures();
                })
                .then(function () {

                    request.get('/ghost/signin/')
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }
                            var pattern_meta = /<meta.*?name="csrf-param".*?content="(.*?)".*?>/i;
                            pattern_meta.should.exist;
                            csrfToken = res.text.match(pattern_meta)[1];

                            setTimeout(function () {
                                request.post('/ghost/signin/')
                                    .set('X-CSRF-Token', csrfToken)
                                    .send({email: user.email, password: user.password})
                                    .expect(200)
                                    .end(function (err, res) {
                                        if (err) {
                                            return done(err);
                                        }


                                        request.saveCookies(res);
                                        request.get('/ghost/')
                                            .expect(200)
                                            .end(function (err, res) {
                                                if (err) {
                                                    return done(err);
                                                }
                                                
                                                csrfToken = res.text.match(pattern_meta)[1];
                                                done();
                                            });
                                    });

                            }, 2000);

                        });
                }, done);
        }).otherwise(function (e) {
            console.log('Ghost Error: ', e);
            console.log(e.stack);
        });
    });    

    after(function () {
        httpServer.close();
    });


    describe('Browse', function () {

        it('retrieves all published posts only by default', function (done) {
            request.get(testUtils.API.getApiQuery('posts/'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
                    var jsonResponse = res.body;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse, 'posts');
                    jsonResponse.posts.should.have.length(5);
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    testUtils.API.checkResponse(jsonResponse.meta.pagination, 'pagination');
                    done();
                });
        });

        it('can retrieve all published posts and pages', function (done) {
            request.get(testUtils.API.getApiQuery('posts/?staticPages=all'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
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
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
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
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
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
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
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
        it('can retrieve a post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.should.have.status(200);
                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    jsonResponse.posts[0].page.should.eql(0);
                    done();
                });
        });

        it('can retrieve a static page', function (done) {
            request.get(testUtils.API.getApiQuery('posts/7/'))
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    jsonResponse.posts[0].page.should.eql(1);
                    done();
                });
        });

        it('can\'t retrieve non existent post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/99/'))
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse, ['error']);
                    done();
                });
        });

        it('can\'t retrieve a draft post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/5/'))
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse, ['error']);
                    done();
                });
        });

        it('can\'t retrieve a draft page', function (done) {
            request.get(testUtils.API.getApiQuery('posts/8/'))
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse, ['error']);
                    done();
                });
        });

    });

    // ## Add
    describe('Add', function () {
        it('can create a new draft, publish post, update post', function (done) {
            var newTitle = 'My Post',
                changedTitle = 'My Post changed',
                publishedState = 'published',
                newPost = {posts: [{status: 'draft', title: newTitle, markdown: 'my post'}]};

            request.post(testUtils.API.getApiQuery('posts/'))
                .set('X-CSRF-Token', csrfToken)
                .send(newPost)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.should.be.json;
                    var draftPost = res.body;
                    draftPost.posts.should.exist;
                    draftPost.posts[0].title.should.eql(newTitle);
                    draftPost.posts[0].status = publishedState;
                    testUtils.API.checkResponse(draftPost.posts[0], 'post');

                    request.put(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/'))
                        .set('X-CSRF-Token', csrfToken)
                        .send(draftPost)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var publishedPost = res.body;
                            res.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /tag/*, /' + publishedPost.posts[0].slug + '/');
                            res.should.be.json;
                            publishedPost.should.exist;
                            publishedPost.posts.should.exist;
                            publishedPost.posts[0].title.should.eql(newTitle);
                            publishedPost.posts[0].status.should.eql(publishedState);
                            testUtils.API.checkResponse(publishedPost.posts[0], 'post');

                            request.put(testUtils.API.getApiQuery('posts/' + publishedPost.posts[0].id + '/'))
                                .set('X-CSRF-Token', csrfToken)
                                .send(publishedPost)
                                .expect(200)
                                .end(function (err, res) {
                                    if (err) {
                                        return done(err);
                                    }

                                    var updatedPost = res.body;
                                    res.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /tag/*, /' + updatedPost.posts[0].slug + '/');
                                    res.should.be.json;
                                    updatedPost.should.exist;
                                    updatedPost.posts.should.exist;
                                    updatedPost.posts[0].title.should.eql(newTitle);
                                    testUtils.API.checkResponse(updatedPost.posts[0], 'post');
                                    done();
                                });
                        });

                });
        });

    });

    // ## edit
    describe('Edit', function () {
        it('can edit a post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedValue = 'My new Title';
                    jsonResponse.posts[0].should.exist;
                    jsonResponse.posts[0].title = changedValue;

                    request.put(testUtils.API.getApiQuery('posts/1/'))
                        .set('X-CSRF-Token', csrfToken)
                        .send(jsonResponse)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;
                            res.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /tag/*, /' + putBody.posts[0].slug + '/');
                            res.should.be.json;
                            putBody.should.exist;
                            putBody.posts[0].title.should.eql(changedValue);

                            testUtils.API.checkResponse(putBody.posts[0], 'post');
                            done();
                        });
                });
        });

        it('can change a post to a static page', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedValue = true;
                    jsonResponse.should.exist;
                    jsonResponse.posts[0].page.should.eql(0);
                    jsonResponse.posts[0].page = changedValue;

                    request.put(testUtils.API.getApiQuery('posts/1/'))
                        .set('X-CSRF-Token', csrfToken)
                        .send(jsonResponse)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;
                            res.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /tag/*, /' + putBody.posts[0].slug + '/');
                            res.should.be.json;
                            putBody.should.exist;
                            putBody.posts[0].page.should.eql(changedValue);

                            testUtils.API.checkResponse(putBody.posts[0], 'post');
                            done();
                        });
                });
        });


        it('can change a static page to a post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/7/'))
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body,
                        changedValue = false;
                    jsonResponse.should.exist;
                    jsonResponse.posts[0].page.should.eql(1);
                    jsonResponse.posts[0].page = changedValue;

                    request.put(testUtils.API.getApiQuery('posts/1/'))
                        .set('X-CSRF-Token', csrfToken)
                        .send(jsonResponse)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;
                            res.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /tag/*, /' + putBody.posts[0].slug + '/');
                            res.should.be.json;
                            putBody.should.exist;
                            putBody.posts[0].page.should.eql(changedValue);

                            testUtils.API.checkResponse(putBody.posts[0], 'post');
                            done();
                        });
                });
        });

        it('can\'t edit a post with invalid CSRF token', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    request.put(testUtils.API.getApiQuery('posts/1/'))
                        .set('X-CSRF-Token', 'invalid-token')
                        .send(jsonResponse)
                        .expect(403)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            done();
                        });
                });
        });

        it('published_at = null', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
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
                        .set('X-CSRF-Token', csrfToken)
                        .send(jsonResponse)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;
                            res.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /tag/*, /' + putBody.posts[0].slug + '/');
                            res.should.be.json;
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

    });

    // ## delete
    describe('Delete', function () {
        it('can\'t edit non existent post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/1/'))
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
                        .set('X-CSRF-Token', csrfToken)
                        .send(jsonResponse)
                        .expect(404)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            var putBody = res.body;
                            should.not.exist(res.headers['x-cache-invalidate']);
                            res.should.be.json;
                            testUtils.API.checkResponseValue(putBody, ['error']);
                            done();
                        });
                });
        });

        it('can delete a post', function (done) {
            var deletePostId = 1;
            request.del(testUtils.API.getApiQuery('posts/' + deletePostId + '/'))
                .set('X-CSRF-Token', csrfToken)
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    res.should.be.json;
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    res.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /tag/*, /' + jsonResponse.posts[0].slug + '/');
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    jsonResponse.posts[0].id.should.eql(deletePostId);
                    done();
                });
        });

        it('can\'t delete a non existent post', function (done) {
            request.del(testUtils.API.getApiQuery('posts/99/'))
                .set('X-CSRF-Token', csrfToken)
                .expect(404)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;
                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    testUtils.API.checkResponseValue(jsonResponse, ['error']);
                    done();
                });
        });

        it('can delete a new draft', function (done) {
            var newTitle = 'My Post',
                publishedState = 'draft',
                newPost = {posts: [{status: publishedState, title: newTitle, markdown: 'my post'}]};

            request.post(testUtils.API.getApiQuery('posts/'))
                .set('X-CSRF-Token', csrfToken)
                .send(newPost)
                .expect(200)
                .end(function (err ,res) {
                    if (err) {
                        return done(err);
                    }

                    var draftPost = res.body;

                    res.should.be.json;
                    draftPost.should.exist;
                    draftPost.posts[0].title.should.eql(newTitle);
                    draftPost.posts[0].status = publishedState;
                    testUtils.API.checkResponse(draftPost.posts[0], 'post');

                    request.del(testUtils.API.getApiQuery('posts/' + draftPost.posts[0].id + '/'))
                        .set('X-CSRF-Token', csrfToken)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }

                            res.should.be.json;
                            var jsonResponse = res.body
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
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    jsonResponse.permalinks = '/:year/:month/:day/:slug/';

                    request.put(testUtils.API.getApiQuery('settings/'))
                        .set('X-CSRF-Token', csrfToken)
                        .send(jsonResponse)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }
                            done();
                        });
                });
        });

        after(function (done) {
            request.get(testUtils.API.getApiQuery('settings/'))
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    var jsonResponse = res.body;
                    jsonResponse.permalinks = '/:slug/';

                    request.put(testUtils.API.getApiQuery('settings/'))
                        .set('X-CSRF-Token', csrfToken)
                        .send(jsonResponse)
                        .end(function (err, res) {
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
                .expect(200)
                .end(function (err, res) {
                    if (err) {
                        return done(err);
                    }

                    should.not.exist(res.headers['x-cache-invalidate']);
                    res.should.be.json;

                    var jsonResponse = res.body;
                    jsonResponse.should.exist;
                    jsonResponse.posts.should.exist;
                    testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                    jsonResponse.posts[0].slug.should.not.match(/^\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}/);
                    jsonResponse.posts[0].page.should.eql(0);
                    done();
                });
        });

        it('Can edit a post', function (done) {
            request.get(testUtils.API.getApiQuery('posts/2/'))
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
                        .set('X-CSRF-Token', csrfToken)
                        .send(jsonResponse)
                        .expect(200)
                        .end(function (err, res) {
                            if (err) {
                                return done(err);
                            }
                            var putBody = res.body;
                            var today = new Date(),
                                dd = ("0" + today.getDate()).slice(-2),
                                mm = ("0" + (today.getMonth() + 1)).slice(-2),
                                yyyy = today.getFullYear(),
                                postLink = '/' + yyyy + '/' + mm + '/' + dd + '/' + putBody.posts[0].slug + '/';

                            res.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /tag/*, ' + postLink);
                            res.should.be.json;
                            putBody.should.exist;
                            putBody.posts[0].title.should.eql(changedValue);

                            testUtils.API.checkResponse(putBody.posts[0], 'post');
                            done();
                        });
                });
        });


    });


});
