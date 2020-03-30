const should = require('should'),
    sinon = require('sinon'),

    // Stuff we are testing
    common = require('../../../../../core/server/lib/common'),
    SiteMapManager = require('../../../../../core/frontend/services/sitemap/manager'),
    PostGenerator = require('../../../../../core/frontend/services/sitemap/post-generator'),
    PageGenerator = require('../../../../../core/frontend/services/sitemap/page-generator'),
    TagGenerator = require('../../../../../core/frontend/services/sitemap/tag-generator'),
    UserGenerator = require('../../../../../core/frontend/services/sitemap/user-generator'),
    IndexGenerator = require('../../../../../core/frontend/services/sitemap/index-generator');

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

        sinon.stub(common.events, 'on').callsFake(function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        sinon.stub(PostGenerator.prototype, 'getXml');
        sinon.stub(PostGenerator.prototype, 'addUrl');
        sinon.stub(PostGenerator.prototype, 'removeUrl');
        sinon.stub(IndexGenerator.prototype, 'getXml');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('SiteMapManager', function () {
        let manager, fake;

        beforeEach(function () {
            manager = makeStubManager();
            fake = sinon.stub();
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
            Object.keys(eventsToRemember).length.should.eql(4);
            should.exist(eventsToRemember['url.added']);
            should.exist(eventsToRemember['url.removed']);
            should.exist(eventsToRemember['router.created']);
            should.exist(eventsToRemember['routers.reset']);
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
