/*globals describe, before, after, beforeEach, afterEach, it */
var testUtils = require('../../utils'),
    should = require('should'),
    _ = require('underscore'),
    request = require('request');

request = request.defaults({jar: true});

describe('Post API', function () {

    var user = testUtils.DataGenerator.forModel.users[0],
        csrfToken = '';

    before(function (done) {
        testUtils.clearData()
            .then(function () {
                return testUtils.initData();
            })
            .then(function () {
                return testUtils.insertDefaultFixtures();
            })
            .then(function () {
                request.get(testUtils.API.getSigninURL(), function (error, response, body) {
                    response.should.have.status(200);
                    var pattern_meta = /<meta.*?name="csrf-param".*?content="(.*?)".*?>/i;
                    pattern_meta.should.exist;
                    csrfToken = body.match(pattern_meta)[1];
                    setTimeout((function () {
                        request.post({uri: testUtils.API.getSigninURL(),
                                headers: {'X-CSRF-Token': csrfToken}}, function (error, response, body) {
                            response.should.have.status(200);
                            request.get(testUtils.API.getAdminURL(), function (error, response, body) {
                                response.should.have.status(200);
                                csrfToken = body.match(pattern_meta)[1];
                                done();
                            });
                        }).form({email: user.email, password: user.password});
                    }), 2000);
                });
            }, done);
    });

    // ## Browse
    describe('Browse', function () {

        it('retrieves all published posts only by default', function (done) {
            request.get(testUtils.API.getApiURL('posts/'), function (error, response, body) {
                response.should.have.status(200);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.posts.should.exist;
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(5);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                done();
            });
        });

        it('can retrieve all published posts and pages', function (done) {
            request.get(testUtils.API.getApiURL('posts/?staticPages=all'), function (error, response, body) {
                response.should.have.status(200);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.posts.should.exist;
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(6);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                done();
            });
        });

        // Test bits of the API we don't use in the app yet to ensure the API behaves properly

        it('can retrieve all status posts and pages', function (done) {
            request.get(testUtils.API.getApiURL('posts/?staticPages=all&status=all'), function (error, response, body) {
                response.should.have.status(200);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.posts.should.exist;
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(8);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                done();
            });
        });

        it('can retrieve just published pages', function (done) {
            request.get(testUtils.API.getApiURL('posts/?staticPages=true'), function (error, response, body) {
                response.should.have.status(200);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.posts.should.exist;
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(1);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                done();
            });
        });

        it('can retrieve just draft posts', function (done) {
            request.get(testUtils.API.getApiURL('posts/?status=draft'), function (error, response, body) {
                response.should.have.status(200);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.posts.should.exist;
                testUtils.API.checkResponse(jsonResponse, 'posts');
                jsonResponse.posts.should.have.length(1);
                testUtils.API.checkResponse(jsonResponse.posts[0], 'post');
                done();
            });
        });
    });

    // ## Read
    describe('Read', function () {
        it('can retrieve a post', function (done) {
            request.get(testUtils.API.getApiURL('posts/1/'), function (error, response, body) {
                response.should.have.status(200);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.should.exist;
                testUtils.API.checkResponse(jsonResponse, 'post');
                jsonResponse.page.should.eql(0);
                done();
            });
        });

        it('can retrieve a static page', function (done) {
            request.get(testUtils.API.getApiURL('posts/7/'), function (error, response, body) {
                response.should.have.status(200);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.should.exist;
                testUtils.API.checkResponse(jsonResponse, 'post');
                jsonResponse.page.should.eql(1);
                done();
            });
        });

        it('can\'t retrieve non existent post', function (done) {
            request.get(testUtils.API.getApiURL('posts/99/'), function (error, response, body) {
                response.should.have.status(404);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.should.exist;
                testUtils.API.checkResponseValue(jsonResponse, ['error']);
                done();
            });
        });

        it('can\'t retrieve a draft post', function (done) {
            request.get(testUtils.API.getApiURL('posts/5/'), function (error, response, body) {
                response.should.have.status(404);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.should.exist;
                testUtils.API.checkResponseValue(jsonResponse, ['error']);
                done();
            });
        });

        it('can\'t retrieve a draft page', function (done) {
            request.get(testUtils.API.getApiURL('posts/8/'), function (error, response, body) {
                response.should.have.status(404);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
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
                newPost = {status: 'draft', title: newTitle, markdown: 'my post'};

            request.post({uri: testUtils.API.getApiURL('posts/'),
                headers: {'X-CSRF-Token': csrfToken},
                json: newPost}, function (error, response, draftPost) {
                response.should.have.status(200);
                //TODO: do drafts really need a x-cache-invalidate header
                response.should.be.json;
                draftPost.should.exist;
                draftPost.title.should.eql(newTitle);
                draftPost.status = publishedState;
                testUtils.API.checkResponse(draftPost, 'post');
                request.put({uri: testUtils.API.getApiURL('posts/' + draftPost.id + '/'),
                    headers: {'X-CSRF-Token': csrfToken},
                    json: draftPost}, function (error, response, publishedPost) {
                    response.should.have.status(200);
                    response.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /' + publishedPost.slug + '/');
                    response.should.be.json;
                    publishedPost.should.exist;
                    publishedPost.title.should.eql(newTitle);
                    publishedPost.status.should.eql(publishedState);
                    testUtils.API.checkResponse(publishedPost, 'post');
                    request.put({uri: testUtils.API.getApiURL('posts/' + publishedPost.id + '/'),
                        headers: {'X-CSRF-Token': csrfToken},
                        json: publishedPost}, function (error, response, updatedPost) {
                        response.should.have.status(200);
                        response.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /' + updatedPost.slug + '/');
                        response.should.be.json;
                        updatedPost.should.exist;
                        updatedPost.title.should.eql(newTitle);
                        testUtils.API.checkResponse(updatedPost, 'post');
                        done();
                    });
                });
            });
        });
    });

    // ## edit
    describe('Edit', function () {
        it('can edit a post', function (done) {
            request.get(testUtils.API.getApiURL('posts/1/'), function (error, response, body) {
                var jsonResponse = JSON.parse(body),
                    changedValue = 'My new Title';
                jsonResponse.should.exist;
                jsonResponse.title = changedValue;

                request.put({uri: testUtils.API.getApiURL('posts/1/'),
                    headers: {'X-CSRF-Token': csrfToken},
                    json: jsonResponse}, function (error, response, putBody) {
                    response.should.have.status(200);
                    response.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /' + putBody.slug + '/');
                    response.should.be.json;
                    putBody.should.exist;
                    putBody.title.should.eql(changedValue);

                    testUtils.API.checkResponse(putBody, 'post');
                    done();
                });
            });
        });
    });

    // ## delete
    describe('Delete', function () {
        it('can\'t edit non existent post', function (done) {
            request.get(testUtils.API.getApiURL('posts/1/'), function (error, response, body) {
                var jsonResponse = JSON.parse(body),
                    changedValue = 'My new Title';
                jsonResponse.title.exist;
                jsonResponse.testvalue = changedValue;
                jsonResponse.id = 99;
                request.put({uri: testUtils.API.getApiURL('posts/99/'),
                    headers: {'X-CSRF-Token': csrfToken},
                    json: jsonResponse}, function (error, response, putBody) {
                    response.should.have.status(404);
                    should.not.exist(response.headers['x-cache-invalidate']);
                    response.should.be.json;
                    testUtils.API.checkResponseValue(putBody, ['error']);
                    done();
                });
            });
        });

        it('can delete a post', function (done) {
            var deletePostId = 1;
            request.del({uri: testUtils.API.getApiURL('posts/' + deletePostId + '/'),
                headers: {'X-CSRF-Token': csrfToken}}, function (error, response, body) {
                response.should.have.status(200);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.should.exist;
                response.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, /' + jsonResponse.slug + '/');
                testUtils.API.checkResponse(jsonResponse, 'post');
                jsonResponse.id.should.eql(deletePostId);
                done();
            });
        });

        it('can\'t delete a non existent post', function (done) {
            request.del({uri: testUtils.API.getApiURL('posts/99/'),
                headers: {'X-CSRF-Token': csrfToken}}, function (error, response, body) {
                response.should.have.status(404);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;
                var jsonResponse = JSON.parse(body);
                jsonResponse.should.exist;
                testUtils.API.checkResponseValue(jsonResponse, ['error']);
                done();
            });
        });

        it('can delete a new draft', function (done) {
            var newTitle = 'My Post',
                publishedState = 'draft',
                newPost = {status: publishedState, title: newTitle, markdown: 'my post'};

            request.post({uri: testUtils.API.getApiURL('posts/'),
                headers: {'X-CSRF-Token': csrfToken},
                json: newPost}, function (error, response, draftPost) {
                response.should.have.status(200);
                //TODO: do drafts really need a x-cache-invalidate header
                response.should.be.json;
                draftPost.should.exist;
                draftPost.title.should.eql(newTitle);
                draftPost.status = publishedState;
                testUtils.API.checkResponse(draftPost, 'post');
                request.del({uri: testUtils.API.getApiURL('posts/' + draftPost.id + '/'),
                    headers: {'X-CSRF-Token': csrfToken}}, function (error, response, body) {
                    response.should.have.status(200);
                    //TODO: do drafts really need a x-cache-invalidate header
                    response.should.be.json;
                    var jsonResponse = JSON.parse(body);
                    jsonResponse.should.exist;
                    testUtils.API.checkResponse(jsonResponse, 'post');
                    done();
                });
            });
        });
    });

    describe('Dated Permalinks', function () {
        before(function (done) {
            request.get(testUtils.API.getApiURL('settings'), function (error, response, body) {
                if (error) { done(error); }
                var jsonResponse = JSON.parse(body);
                jsonResponse.permalinks = '/:year/:month/:day/:slug/';

                request.put({
                    uri: testUtils.API.getApiURL('settings/'),
                    headers: {'X-CSRF-Token': csrfToken},
                    json: jsonResponse
                }, function (error, response, putBody) {
                    if (error) { done(error); }
                    done();
                });
            });
        });

        after(function (done) {
            request.get(testUtils.API.getApiURL('settings'), function (error, response, body) {
                if (error) { done(error); }
                var jsonResponse = JSON.parse(body);
                jsonResponse.permalinks = '/:slug/';

                request.put({
                    uri: testUtils.API.getApiURL('settings/'),
                    headers: {'X-CSRF-Token': csrfToken},
                    json: jsonResponse
                }, function (error, response, putBody) {
                    if (error) { done(error); }
                    done();
                });
            });
        });

        it('Can read a post', function (done) {
            // nothing should have changed here
            request.get(testUtils.API.getApiURL('posts/2/'), function (error, response, body) {
                if (error) { done(error); }
                response.should.have.status(200);
                should.not.exist(response.headers['x-cache-invalidate']);
                response.should.be.json;

                var jsonResponse = JSON.parse(body);
                jsonResponse.should.exist;
                testUtils.API.checkResponse(jsonResponse, 'post');
                jsonResponse.slug.should.not.match(/^\/[0-9]{4}\/[0-9]{2}\/[0-9]{2}/);
                jsonResponse.page.should.eql(0);
                done();
            });
        });

        it('Can edit a post', function (done) {
            request.get(testUtils.API.getApiURL('posts/2/'), function (error, response, body) {
                if (error) { done(error); }
                var jsonResponse = JSON.parse(body),
                    changedValue = 'My new Title';
                jsonResponse.should.exist;
                jsonResponse.title = changedValue;

                request.put({
                    uri: testUtils.API.getApiURL('posts/2/'),
                    headers: {'X-CSRF-Token': csrfToken},
                    json: jsonResponse
                }, function (error, response, putBody) {
                    if (error) { done(error); }
                    var today = new Date(),
                        dd = ("0" + today.getDate()).slice(-2),
                        mm = ("0" + (today.getMonth() + 1)).slice(-2),
                        yyyy = today.getFullYear(),
                        postLink = '/' + yyyy + '/' + mm + '/' + dd + '/' + putBody.slug + '/';

                    response.should.have.status(200);
                    response.headers['x-cache-invalidate'].should.eql('/, /page/*, /rss/, /rss/*, ' + postLink);
                    response.should.be.json;
                    putBody.should.exist;
                    putBody.title.should.eql(changedValue);

                    testUtils.API.checkResponse(putBody, 'post');
                    done();
                });
            });
        });
    });
});