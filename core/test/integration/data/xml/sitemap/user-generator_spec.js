var should = require('should'),
    sinon = require('sinon'),
    _ = require('lodash'),
    Promise = require('bluebird'),
    testUtils = require('../../../../utils'),
    events = require('../../../../../server/events'),
    models = require('../../../../../server/models'),
    SiteMapGenerator = require('../../../../../server/data/xml/sitemap/manager'),
    sandbox = sinon.sandbox.create(),
    sitemap;

should.equal(true, true);

describe('Integration: User Generator', function () {
    var activeUsers = {};

    afterEach(testUtils.teardown);
    afterEach(function () {
        sandbox.restore();
    });

    before(testUtils.teardown);
    beforeEach(testUtils.setup('perms:init', 'posts', 'users', 'users-posts:1', 'users-posts:2'));

    beforeEach(function () {
        sitemap = new SiteMapGenerator();

        // do not initialise the other generators
        sandbox.stub(sitemap.tags, 'init').returns(Promise.resolve());
        sandbox.stub(sitemap.pages, 'init').returns(Promise.resolve());
        sandbox.stub(sitemap.posts, 'init').returns(Promise.resolve());

        return sitemap.init();
    });

    beforeEach(function () {
        activeUsers = [];

        return models.User.findAll(_.merge({include: 'count.posts', status: 'active'}, testUtils.context.public))
            .then(function (userModels) {
                _.each(userModels.models, function (userModel) {
                    activeUsers[userModel.get('email')] = userModel;
                });

                Object.keys(activeUsers).length.should.eql(3);

                // only two users have posts connected
                activeUsers[testUtils.DataGenerator.Content.extraUsers[0].email].get('count__posts').should.eql(0);
                activeUsers[testUtils.DataGenerator.Content.extraUsers[1].email].get('count__posts').should.eql(2);
                activeUsers[testUtils.DataGenerator.Content.extraUsers[2].email].get('count__posts').should.eql(2);
            });
    });

    afterEach(function () {
        events.removeAllListeners();
    });

    it('initial tag state', function () {
        sitemap.getSiteMapXml('authors').match(/<url>/gi).length.should.eql(Object.keys(activeUsers).length - 1);
    });

    it('user get\'s suspended', function (done) {
        var timeout,
            userToChange = activeUsers[testUtils.DataGenerator.Content.extraUsers[1].email];

        sandbox.spy(sitemap.authors, 'removeUrl');

        models.User.edit({status: 'inactive'}, {id: userToChange.id})
            .then(function () {
                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.authors.removeUrl.calledOnce) {
                        sitemap.getSiteMapXml('authors').match(/<url>/gi).length.should.eql(Object.keys(activeUsers).length - 2);
                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('user get\'s suspended and activated right after', function (done) {
        var timeout,
            userToChange = activeUsers[testUtils.DataGenerator.Content.extraUsers[1].email];

        sandbox.spy(sitemap.authors, 'removeUrl');
        sandbox.spy(sitemap.authors, 'addOrUpdateUrl');

        models.User.edit({status: 'inactive'}, {id: userToChange.id})
            .then(function () {
                return new Promise(function (resolve) {
                    (function retry() {
                        clearTimeout(timeout);

                        if (sitemap.authors.removeUrl.calledOnce) {
                            sitemap.authors.addOrUpdateUrl.called.should.eql(false);
                            sitemap.getSiteMapXml('authors').match(/<url>/gi).length.should.eql(Object.keys(activeUsers).length - 2);
                            return resolve();
                        }

                        timeout = setTimeout(retry, 100);
                    }());
                });
            })
            .then(function () {
                return models.User.edit({status: 'active'}, {id: userToChange.id});
            })
            .then(function () {
                // reset, because deactivating a user triggers another `user.edited` event
                sitemap.authors.addOrUpdateUrl.reset();

                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.authors.addOrUpdateUrl.calledOnce) {
                        sitemap.getSiteMapXml('authors').match(/<url>/gi).length.should.eql(Object.keys(activeUsers).length - 1);
                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('slug changes', function (done) {
        var timeout,
            userToChange = activeUsers[testUtils.DataGenerator.Content.extraUsers[1].email],
            currentSlug = userToChange.get('slug'),
            newSlug = 'this-is-my-slug-now';

        // current slug exists, new slug doesn't
        (sitemap.getSiteMapXml('authors').match(new RegExp(currentSlug)) !== null).should.eql(true);
        (sitemap.getSiteMapXml('authors').match(new RegExp(newSlug)) === null).should.eql(true);

        sandbox.spy(sitemap.authors, 'removeUrl');
        sandbox.spy(sitemap.authors, 'addOrUpdateUrl');

        models.User.edit({slug: newSlug}, {id: userToChange.id})
            .then(function (userModel) {
                userModel.get('slug').should.eql(newSlug);

                (function retry() {
                    clearTimeout(timeout);

                    if (sitemap.authors.addOrUpdateUrl.calledOnce) {
                        sitemap.authors.removeUrl.called.should.eql(false);
                        sitemap.getSiteMapXml('authors').match(/<url>/gi).length.should.eql(Object.keys(activeUsers).length - 1);

                        (sitemap.getSiteMapXml('authors').match(new RegExp(currentSlug)) === null).should.eql(true);
                        (sitemap.getSiteMapXml('authors').match(new RegExp(newSlug)) !== null).should.eql(true);
                        return done();
                    }

                    timeout = setTimeout(retry, 100);
                }());
            })
            .catch(done);
    });

    it('delete 1 post, user has 2 posts', function (done) {
        var userToChange = activeUsers[testUtils.DataGenerator.Content.extraUsers[2].email];

        // has 2 posts
        userToChange.get('count__posts').should.eql(2);

        sandbox.spy(sitemap.authors, 'removeUrl');
        sandbox.spy(sitemap.authors, 'addOrUpdateUrl');

        models.Post.findOne({author_id: userToChange.id})
            .then(function (postModel) {
                return postModel.destroy();
            })
            .then(function () {
                return models.User.findOne({id: userToChange.id}, {include: 'count.posts'});
            })
            .then(function (userModel) {
                userModel.get('count__posts').should.eql(1);
                return Promise.delay(200);
            })
            .then(function () {
                sitemap.authors.addOrUpdateUrl.calledOnce.should.eql(true);
                sitemap.authors.removeUrl.called.should.eql(false);

                // author url is still present
                sitemap.getSiteMapXml('authors').match(/<url>/gi).length.should.eql(Object.keys(activeUsers).length - 1);
                done();
            })
            .catch(done);
    });

    it('delete 2 posts, user has 2 posts', function (done) {
        var userToChange = activeUsers[testUtils.DataGenerator.Content.extraUsers[2].email];

        // has 2 posts
        userToChange.get('count__posts').should.eql(2);

        sandbox.spy(sitemap.authors, 'removeUrl');
        sandbox.spy(sitemap.authors, 'addOrUpdateUrl');

        models.Post.findAll({filter: 'author_id:' + userToChange.id})
            .then(function (postModels) {
                return postModels.invokeThen('destroy');
            })
            .then(function () {
                return models.User.findOne({id: userToChange.id}, {include: 'count.posts'});
            })
            .then(function (userModel) {
                userModel.get('count__posts').should.eql(0);
            })
            .then(function () {
                sitemap.authors.addOrUpdateUrl.called.should.eql(false);
                sitemap.authors.removeUrl.calledTwice.should.eql(true);

                // author url was removed, author has 0 posts connected
                sitemap.getSiteMapXml('authors').match(/<url>/gi).length.should.eql(Object.keys(activeUsers).length - 2);
                done();
            })
            .catch(done);
    });

    it('publish post, user has 0 posts', function (done) {
        var userToChange = activeUsers[testUtils.DataGenerator.Content.extraUsers[0].email];

        // has 0 posts
        userToChange.get('count__posts').should.eql(0);

        sandbox.spy(sitemap.authors, 'removeUrl');
        sandbox.spy(sitemap.authors, 'addOrUpdateUrl');

        models.Post.add({author_id: userToChange.id, status: 'published'})
            .then(function () {
                return models.User.findOne({id: userToChange.id}, {include: 'count.posts'});
            })
            .then(function (userModel) {
                userModel.get('count__posts').should.eql(1);
            })
            .then(function () {
                sitemap.authors.addOrUpdateUrl.calledOnce.should.eql(true);
                sitemap.authors.removeUrl.called.should.eql(false);

                // another author url was added :)
                sitemap.getSiteMapXml('authors').match(/<url>/gi).length.should.eql(Object.keys(activeUsers).length);
                done();
            })
            .catch(done);
    });
});
