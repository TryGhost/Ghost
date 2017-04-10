var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),

    // Stuff we are testing
    events = require('../../../server/events'),
    SiteMapManager = require('../../../server/data/xml/sitemap/manager'),
    PostGenerator = require('../../../server/data/xml/sitemap/post-generator'),
    PageGenerator = require('../../../server/data/xml/sitemap/page-generator'),
    TagGenerator = require('../../../server/data/xml/sitemap/tag-generator'),
    UserGenerator = require('../../../server/data/xml/sitemap/user-generator'),

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
        events.removeAllListeners();
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
                events.on('page.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    // page add events are ignored, as these are drafts
                    manager.pages.addOrUpdateUrl.called.should.equal(false);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.edited', function () {
                    // page edit events are ignored, as these are drafts
                    manager.pages.addOrUpdateUrl.called.should.equal(false);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.published', function () {
                    // page published events are when a url gets added
                    manager.pages.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.published.edited', function () {
                    // page published.edited events are when a url gets updated
                    manager.pages.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.deleted', function () {
                    // page deleted events are ignored, as unpublished will be called if the page was published
                    manager.pages.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.pages.removeUrl.called.should.equal(false);
                });
                events.on('page.unpublished', function () {
                    // page unpublished events are when a url gets removed
                    manager.pages.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.pages.removeUrl.calledOnce.should.equal(true);
                });

                events.emit('page.added', fake);
                events.emit('page.edited', fake);
                events.emit('page.published', fake);
                events.emit('page.published.edited', fake);
                events.emit('page.deleted', fake);
                events.emit('page.unpublished', fake);

                done();
            }).catch(done);
        });

        it('updates post site map', function (done) {
            manager.init().then(function () {
                events.on('post.added', function (fakeModel) {
                    fakeModel.should.eql(fake);
                    // post add events are ignored, as these are drafts
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.edited', function () {
                    // post edit events are ignored, as these are drafts
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.published', function () {
                    // post published events are when a url gets added
                    manager.posts.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.published.edited', function () {
                    // post published.edited events are when a url gets updated
                    manager.posts.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.deleted', function () {
                    // post deleted events are ignored, as unpublished will be called if the post was published
                    manager.posts.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });
                events.on('post.unpublished', function () {
                    // post unpublished events are when a url gets removed
                    manager.posts.addOrUpdateUrl.calledTwice.should.equal(true);
                    manager.posts.removeUrl.calledOnce.should.equal(true);
                });

                events.emit('post.added', fake);
                events.emit('post.edited', fake);
                events.emit('post.published', fake);
                events.emit('post.published.edited', fake);
                events.emit('post.deleted', fake);
                events.emit('post.unpublished', fake);

                done();
            }).catch(done);
        });

        it('doesn\'t add posts until they are published', function (done) {
            manager.init().then(function () {
                events.on('post.added', function () {
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });

                events.on('post.edited', function () {
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.called.should.equal(false);
                });

                events.on('post.published', function () {
                    manager.posts.addOrUpdateUrl.calledOnce.should.equal(true);
                    manager.posts.removeUrl.called.should.equal(false);
                });

                events.emit('post.added', fake);
                events.emit('post.edited', fake);
                events.emit('post.published', fake);

                done();
            }).catch(done);
        });

        it('deletes posts that were unpublished', function (done) {
            manager.init().then(function () {
                events.on('post.unpublished', function () {
                    manager.posts.addOrUpdateUrl.called.should.equal(false);
                    manager.posts.removeUrl.calledOnce.should.equal(true);
                });

                events.emit('post.unpublished', fake);

                done();
            }).catch(done);
        });
    });
});
