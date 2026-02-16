const should = require('should');
const sinon = require('sinon');
const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');

// Stuff we are testing
const DomainEvents = require('@tryghost/domain-events');
const {URLResourceUpdatedEvent} = require('../../../../../core/shared/events');

const events = require('../../../../../core/server/lib/common/events');

const SiteMapManager = require('../../../../../core/frontend/services/sitemap/site-map-manager');
const PostGenerator = require('../../../../../core/frontend/services/sitemap/post-map-generator');
const PageGenerator = require('../../../../../core/frontend/services/sitemap/page-map-generator');
const TagGenerator = require('../../../../../core/frontend/services/sitemap/tags-map-generator');
const UserGenerator = require('../../../../../core/frontend/services/sitemap/user-map-generator');
const IndexGenerator = require('../../../../../core/frontend/services/sitemap/site-map-index-generator');

describe('Unit: sitemap/manager', function () {
    let eventsToRemember;

    const makeStubManager = function () {
        let posts;
        let pages;
        let tags;
        let authors;

        posts = new PostGenerator();
        pages = new PageGenerator();
        tags = new TagGenerator();
        authors = new UserGenerator();

        return new SiteMapManager({posts: posts, pages: pages, tags: tags, authors: authors});
    };

    before(function () {
        eventsToRemember = {};

        // @NOTE: the pattern of faking event call is not great, we should be
        //        ideally tasting on real events instead of faking them
        sinon.stub(events, 'on').callsFake(function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });

        sinon.stub(PostGenerator.prototype, 'getXml');
        sinon.stub(PostGenerator.prototype, 'addUrl');
        sinon.stub(PostGenerator.prototype, 'removeUrl');
        sinon.stub(IndexGenerator.prototype, 'getXml');
    });

    after(function () {
        sinon.restore();
    });

    describe('SiteMapManager', function () {
        let manager;

        before(function () {
            manager = makeStubManager();
        });

        it('can create a SiteMapManager instance', function () {
            assertExists(manager);
            assert.equal(Object.keys(eventsToRemember).length, 4);
            assertExists(eventsToRemember['url.added']);
            assertExists(eventsToRemember['url.removed']);
            assertExists(eventsToRemember['router.created']);
            assertExists(eventsToRemember['routers.reset']);
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

                assert.equal(PostGenerator.prototype.addUrl.calledOnce, true);
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

                assert.equal(PostGenerator.prototype.removeUrl.calledOnce, true);
            });

            it('Listens to URLResourceUpdatedEvent event', async function () {
                sinon.stub(PostGenerator.prototype, 'updateURL').resolves(true);
                DomainEvents.dispatch(URLResourceUpdatedEvent.create({
                    id: 'post_id',
                    resourceType: 'posts'
                }));
                await DomainEvents.allSettled();

                assert.ok(PostGenerator.prototype.updateURL.calledOnce);
            });
        });

        it('fn: getSiteMapXml', function () {
            PostGenerator.prototype.getXml.returns('xml');
            assert.equal(manager.getSiteMapXml('posts'), 'xml');
            assert.equal(PostGenerator.prototype.getXml.calledOnce, true);
        });

        it('fn: getIndexXml', function () {
            IndexGenerator.prototype.getXml.returns('xml');
            assert.equal(manager.getIndexXml(), 'xml');
            assert.equal(IndexGenerator.prototype.getXml.calledOnce, true);
        });
    });
});
