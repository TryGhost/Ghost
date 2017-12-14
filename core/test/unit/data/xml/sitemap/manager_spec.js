var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),

    // Stuff we are testing
    common = require('../../../../../server/lib/common'),
    SiteMapManager = require('../../../../../server/data/xml/sitemap/manager'),
    PostGenerator = require('../../../../../server/data/xml/sitemap/post-generator'),
    PageGenerator = require('../../../../../server/data/xml/sitemap/page-generator'),
    TagGenerator = require('../../../../../server/data/xml/sitemap/tag-generator'),
    UserGenerator = require('../../../../../server/data/xml/sitemap/user-generator'),

    sandbox = sinon.sandbox.create();

describe('Sitemap', function () {
    var makeStubManager = function () {
        var posts, pages, tags, authors;
        sandbox.stub(PostGenerator.prototype, 'refreshAll').returns(Promise.resolve());
        sandbox.stub(PageGenerator.prototype, 'refreshAll').returns(Promise.resolve());
        sandbox.stub(TagGenerator.prototype, 'refreshAll').returns(Promise.resolve());
        sandbox.stub(UserGenerator.prototype, 'refreshAll').returns(Promise.resolve());

        posts = new PostGenerator();
        pages = new PageGenerator();
        tags = new TagGenerator();
        authors = new UserGenerator();

        sandbox.spy(posts, 'init');
        sandbox.spy(pages, 'init');
        sandbox.spy(tags, 'init');
        sandbox.spy(authors, 'init');

        sandbox.stub(posts, 'addOrUpdateUrl');
        sandbox.stub(pages, 'addOrUpdateUrl');
        sandbox.stub(tags, 'addOrUpdateUrl');
        sandbox.stub(authors, 'addOrUpdateUrl');

        sandbox.stub(posts, 'removeUrl');
        sandbox.stub(pages, 'removeUrl');
        sandbox.stub(tags, 'removeUrl');
        sandbox.stub(authors, 'removeUrl');

        return new SiteMapManager({posts: posts, pages: pages, tags: tags, authors: authors});
    };

    afterEach(function () {
        sandbox.restore();
        common.events.removeAllListeners();
    });

    describe('SiteMapManager', function () {
        var manager, fake;

        should.exist(SiteMapManager);

        beforeEach(function () {
            manager = makeStubManager();
            fake = sandbox.stub();
        });

        it('can create a SiteMapManager instance', function () {
            should.exist(manager);
        });

        it('can initialize', function (done) {
            manager.initialized.should.equal(false);
            manager.init().then(function () {
                manager.posts.init.called.should.equal(true);
                manager.pages.init.called.should.equal(true);
                manager.authors.init.called.should.equal(true);
                manager.tags.init.called.should.equal(true);

                manager.initialized.should.equal(true);

                done();
            }).catch(done);
        });

        it('updates page site map correctly', function (done) {
            manager.init().then(function () {
                common.events.on('page.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    // page add events are ignored, as these are drafts
                    manager.pages.addOrUpdateUrl.called.should.equal(false);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                common.events.on('page.edited', function () {
                    // page edit events are ignored, as these are drafts
                    manager.pages.addOrUpdateUrl.called.should.equal(false);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                common.events.on('page.published', function () {
                    // page published events are when a url gets added
                    manager.pages.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                common.events.on('page.published.edited', function () {
                    // page published.edited events are when a url gets updated
                    manager.pages.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                common.events.on('page.deleted', function () {
                    // page deleted events are ignored, as unpublished will be called if the page was published
                    manager.pages.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                common.events.on('page.unpublished', function () {
                    // page unpublished events are when a url gets removed
                    manager.pages.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.pages.removeUrl.calledOnce.should.equal(true);
                });

                common.events.emit('page.added', fake);
                common.events.emit('page.edited', fake);
                common.events.emit('page.published', fake);
                common.events.emit('page.published.edited', fake);
                common.events.emit('page.deleted', fake);
                common.events.emit('page.unpublished', fake);

                done();
            }).catch(done);
        });

        it('updates post site map', function (done) {
            manager.init().then(function () {
                common.events.on('post.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    // post add events are ignored, as these are drafts
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                common.events.on('post.edited', function () {
                    // post edit events are ignored, as these are drafts
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                common.events.on('post.published', function () {
                    // post published events are when a url gets added
                    manager.posts.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                common.events.on('post.published.edited', function () {
                    // post published.edited events are when a url gets updated
                    manager.posts.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                common.events.on('post.deleted', function () {
                    // post deleted events are ignored, as unpublished will be called if the post was published
                    manager.posts.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                common.events.on('post.unpublished', function () {
                    // post unpublished events are when a url gets removed
                    manager.posts.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.posts.removeUrl.calledOnce.should.equal(true);
                });

                common.events.emit('post.added', fake);
                common.events.emit('post.edited', fake);
                common.events.emit('post.published', fake);
                common.events.emit('post.published.edited', fake);
                common.events.emit('post.deleted', fake);
                common.events.emit('post.unpublished', fake);

                done();
            }).catch(done);
        });

        it('doesn\'t add posts until they are published', function (done) {
            manager.init().then(function () {
                common.events.on('post.added', function () {
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });

                common.events.on('post.edited', function () {
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });

                common.events.on('post.published', function () {
                    manager.posts.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });

                common.events.emit('post.added', fake);
                common.events.emit('post.edited', fake);
                common.events.emit('post.published', fake);

                done();
            }).catch(done);
        });

        it('deletes posts that were unpublished', function (done) {
            manager.init().then(function () {
                common.events.on('post.unpublished', function () {
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.calledOnce.should.equal(true);
                });

                common.events.emit('post.unpublished', fake);

                done();
            }).catch(done);
        });

        it('updates authors site map', function (done) {
            manager.init().then(function () {
                common.events.on('user.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    // user added is ignored as this may be an invited user
                    manager.authors.addOrUpdateUrl.called.should.equal(false);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                common.events.on('user.edited', function () {
                    // user edited is ignored as this may be an invited user
                    manager.authors.addOrUpdateUrl.called.should.equal(false);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                common.events.on('user.activated', function () {
                    // user activated is the point we know the user can be added
                    manager.authors.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                common.events.on('user.activated.edited', function () {
                    // user activated.edited means we can be sure the user is active
                    manager.authors.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                common.events.on('user.deleted', function () {
                    // user deleted is ignored as this may be an invited user
                    manager.authors.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.authors.removeUrl.called.should.equal(false);
                });
                common.events.on('user.deactivated', function () {
                    // user deleted is ignored as this may be an invited user
                    manager.authors.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.authors.removeUrl.calledOnce.should.equal(true);
                });

                common.events.emit('user.added', fake);
                common.events.emit('user.edited', fake);
                common.events.emit('user.activated', fake);
                common.events.emit('user.activated.edited', fake);
                common.events.emit('user.deleted', fake);
                common.events.emit('user.deactivated', fake);

                done();
            }).catch(done);
        });

        it('updates tags site map', function (done) {
            manager.init().then(function () {
                common.events.on('tag.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    manager.tags.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.tags.removeUrl.called.should.equal(false);
                });
                common.events.on('tag.edited', function () {
                    manager.tags.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.tags.removeUrl.called.should.equal(false);
                });
                common.events.on('tag.deleted', function () {
                    manager.tags.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.tags.removeUrl.calledOnce.should.equal(true);
                });

                common.events.emit('tag.added', fake);
                common.events.emit('tag.edited', fake);
                common.events.emit('tag.deleted', fake);

                done();
            }).catch(done);
        });
    });
});
