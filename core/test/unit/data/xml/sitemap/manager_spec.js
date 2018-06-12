const should = require('should'),
    sinon = require('sinon'),

    // Stuff we are testing
    common = require('../../../../../server/lib/common'),
    SiteMapManager = require('../../../../../server/data/xml/sitemap/manager'),
    PostGenerator = require('../../../../../server/data/xml/sitemap/post-generator'),
    PageGenerator = require('../../../../../server/data/xml/sitemap/page-generator'),
    TagGenerator = require('../../../../../server/data/xml/sitemap/tag-generator'),
    UserGenerator = require('../../../../../server/data/xml/sitemap/user-generator'),
    IndexGenerator = require('../../../../../server/data/xml/sitemap/index-generator'),

    sandbox = sinon.sandbox.create();

describe('Unit: sitemap/manager', function () {
    let eventsToRemember;

    const makeStubManager = function () {
        let posts, pages, tags, authors, index;

        index = new IndexGenerator();
        posts = new PostGenerator();
        pages = new PageGenerator();
        tags = new TagGenerator();
        authors = new UserGenerator();

        return new SiteMapManager({posts: posts, pages: pages, tags: tags, authors: authors});
    };

    beforeEach(function () {
        eventsToRemember = {};

        sandbox.stub(common.events, 'on').callsFake(function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        sandbox.stub(PostGenerator.prototype, 'getXml');
        sandbox.stub(PostGenerator.prototype, 'addUrl');
        sandbox.stub(PostGenerator.prototype, 'removeUrl');
        sandbox.stub(IndexGenerator.prototype, 'getXml');
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('SiteMapManager', function () {
        let manager, fake;

        beforeEach(function () {
            manager = makeStubManager();
            fake = sandbox.stub();
        });

        it('create SiteMapManager with defaults', function () {
            const siteMapManager = new SiteMapManager();
            should.exist(siteMapManager.posts);
            should.exist(siteMapManager.pages);
            should.exist(siteMapManager.users);
            should.exist(siteMapManager.tags);
        });

        it('can create a SiteMapManager instance', function () {
            should.exist(manager);
            Object.keys(eventsToRemember).length.should.eql(3);
            should.exist(eventsToRemember['url.added']);
            should.exist(eventsToRemember['url.removed']);
            should.exist(eventsToRemember['router.created']);
        });

        describe('trigger url events', function () {
            it('url.added', function () {
                eventsToRemember['url.added']({
                    url: {
                        relative: '/test/',
                        absolute: 'https://myblog.com/test/'
                    },
                    resource: {
                        config: {
                            type: 'posts'
                        },
                        data: {}
                    }
                });

                PostGenerator.prototype.addUrl.calledOnce.should.be.true();
            });

            it('url.removed', function () {
                eventsToRemember['url.removed']({
                    url: {
                        relative: '/test/',
                        absolute: 'https://myblog.com/test/'
                    },
                    resource: {
                        config: {
                            type: 'posts'
                        },
                        data: {}
                    }
                });

                PostGenerator.prototype.removeUrl.calledOnce.should.be.true();
            });
        });

        it('fn: getSiteMapXml', function () {
            PostGenerator.prototype.getXml.returns('xml');
            manager.getSiteMapXml('posts').should.eql('xml');
            PostGenerator.prototype.getXml.calledOnce.should.be.true();
        });

        it('fn: getIndexXml', function () {
            IndexGenerator.prototype.getXml.returns('xml');
            manager.getIndexXml().should.eql('xml');
            IndexGenerator.prototype.getXml.calledOnce.should.be.true();
        });
    });
});
