const _ = require('lodash');
const should = require('should');
const sinon = require('sinon');
const rewire = require('rewire');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');
const models = require('../../../core/server/models');
const common = require('../../../core/server/lib/common');
const themes = require('../../../core/frontend/services/themes');
const UrlService = rewire('../../../core/frontend/services/url/UrlService');

describe('Integration: services/url/UrlService', function () {
    let urlService;

    before(function () {
        models.init();

        sinon.stub(themes, 'getActive').returns({
            engine: () => 'v2'
        });
    });

    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts'));
    after(testUtils.teardownDb);

    after(function () {
        sinon.restore();
    });

    describe('functional: default routing set', function () {
        let router1, router2, router3, router4;

        before(function (done) {
            urlService = new UrlService();

            router1 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'post collection';
                }
            };

            router2 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'authors';
                }
            };

            router3 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'tags';
                }
            };

            router4 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'static pages';
                }
            };

            router1.getFilter.returns('featured:false');
            router1.getResourceType.returns('posts');
            router1.getPermalinks.returns({
                getValue: function () {
                    return '/:slug/';
                }
            });

            router2.getFilter.returns(false);
            router2.getResourceType.returns('authors');
            router2.getPermalinks.returns({
                getValue: function () {
                    return '/author/:slug/';
                }
            });

            router3.getFilter.returns(false);
            router3.getResourceType.returns('tags');
            router3.getPermalinks.returns({
                getValue: function () {
                    return '/tag/:slug/';
                }
            });

            router4.getFilter.returns(false);
            router4.getResourceType.returns('pages');
            router4.getPermalinks.returns({
                getValue: function () {
                    return '/:slug/';
                }
            });

            common.events.emit('router.created', router1);
            common.events.emit('router.created', router2);
            common.events.emit('router.created', router3);
            common.events.emit('router.created', router4);

            common.events.emit('db.ready');

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        after(function () {
            urlService.reset();
        });

        it('check url generators', function () {
            urlService.urlGenerators.length.should.eql(4);
            urlService.urlGenerators[0].router.should.eql(router1);
            urlService.urlGenerators[1].router.should.eql(router2);
            urlService.urlGenerators[2].router.should.eql(router3);
            urlService.urlGenerators[3].router.should.eql(router4);
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.router.getResourceType() === 'posts') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.router.getResourceType() === 'pages') {
                    generator.getUrls().length.should.eql(1);
                }

                if (generator.router.getResourceType() === 'tags') {
                    generator.getUrls().length.should.eql(3);
                }

                if (generator.router.getResourceType() === 'authors') {
                    generator.getUrls().length.should.eql(2);
                }
            });

            let url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[0].id);
            url.should.eql('/html-ipsum/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[1].id);
            url.should.eql('/ghostly-kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[2].id);
            url.should.eql('/404/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[0].id);
            url.should.eql('/tag/kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[1].id);
            url.should.eql('/tag/bacon/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[2].id);
            url.should.eql('/tag/chorizo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[3].id);
            url.should.eql('/404/'); // tags with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[0].id);
            url.should.eql('/author/joe-bloggs/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[1].id);
            url.should.eql('/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[2].id);
            url.should.eql('/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[3].id);
            url.should.eql('/author/slimer-mcectoplasm/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[4].id);
            url.should.eql('/404/'); // users with no posts should not be public
        });

        it('getResource', function () {
            let resource = urlService.getResource('/html-ipsum/');
            resource.data.id.should.eql(testUtils.DataGenerator.forKnex.posts[0].id);

            resource = urlService.getResource('/does-not-exist/');
            should.not.exist(resource);
        });
    });

    describe('functional: extended/modified routing set', function () {
        let router1, router2, router3, router4, router5;

        before(testUtils.teardownDb);
        before(testUtils.setup('users:roles', 'posts'));

        before(function () {
            urlService.resetGenerators();
        });

        before(function (done) {
            urlService = new UrlService();

            router1 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'post collection 1';
                }
            };

            router2 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'post collection 2';
                }
            };

            router3 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'authors';
                }
            };

            router4 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'tags';
                }
            };

            router5 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'static pages';
                }
            };

            router1.getFilter.returns('featured:true');
            router1.getResourceType.returns('posts');
            router1.getPermalinks.returns({
                getValue: function () {
                    return '/podcast/:slug/';
                }
            });

            router2.getFilter.returns('page:false');
            router2.getResourceType.returns('posts');
            router2.getPermalinks.returns({
                getValue: function () {
                    return '/collection/:year/:slug/';
                }
            });

            router3.getFilter.returns(false);
            router3.getResourceType.returns('authors');
            router3.getPermalinks.returns({
                getValue: function () {
                    return '/persons/:slug/';
                }
            });

            router4.getFilter.returns(false);
            router4.getResourceType.returns('tags');
            router4.getPermalinks.returns({
                getValue: function () {
                    return '/category/:slug/';
                }
            });

            router5.getFilter.returns(false);
            router5.getResourceType.returns('pages');
            router5.getPermalinks.returns({
                getValue: function () {
                    return '/:slug/';
                }
            });

            common.events.emit('router.created', router1);
            common.events.emit('router.created', router2);
            common.events.emit('router.created', router3);
            common.events.emit('router.created', router4);
            common.events.emit('router.created', router5);

            common.events.emit('db.ready');

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        after(function () {
            urlService.resetGenerators();
        });

        it('check url generators', function () {
            urlService.urlGenerators.length.should.eql(5);
            urlService.urlGenerators[0].router.should.eql(router1);
            urlService.urlGenerators[1].router.should.eql(router2);
            urlService.urlGenerators[2].router.should.eql(router3);
            urlService.urlGenerators[3].router.should.eql(router4);
            urlService.urlGenerators[4].router.should.eql(router5);
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.router.getResourceType() === 'posts' && generator.router.getFilter() === 'page:false') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.router.getResourceType() === 'posts' && generator.router.getFilter() === 'featured:true') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.router.getResourceType() === 'pages') {
                    generator.getUrls().length.should.eql(1);
                }

                if (generator.router.getResourceType() === 'tags') {
                    generator.getUrls().length.should.eql(3);
                }

                if (generator.router.getResourceType() === 'authors') {
                    generator.getUrls().length.should.eql(2);
                }
            });

            let url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[0].id);
            url.should.eql('/collection/2015/html-ipsum/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[1].id);
            url.should.eql('/collection/2015/ghostly-kitchen-sink/');

            // featured
            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[2].id);
            url.should.eql('/podcast/short-and-sweet/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[0].id);
            url.should.eql('/category/kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[1].id);
            url.should.eql('/category/bacon/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[2].id);
            url.should.eql('/category/chorizo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[3].id);
            url.should.eql('/404/'); // tags with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[0].id);
            url.should.eql('/persons/joe-bloggs/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[1].id);
            url.should.eql('/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[2].id);
            url.should.eql('/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[3].id);
            url.should.eql('/persons/slimer-mcectoplasm/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[4].id);
            url.should.eql('/404/'); // users with no posts should not be public
        });
    });

    describe('functional: subdirectory', function () {
        let router1, router2, router3, router4, router5;

        beforeEach(function (done) {
            configUtils.set('url', 'http://localhost:2388/blog/');

            urlService = new UrlService();

            router1 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'post collection 1';
                }
            };

            router2 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'post collection 2';
                }
            };

            router3 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'authors';
                }
            };

            router4 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'tags';
                }
            };

            router5 = {
                getFilter: sinon.stub(),
                addListener: sinon.stub(),
                getResourceType: sinon.stub(),
                getPermalinks: sinon.stub(),
                toString: function () {
                    return 'static pages';
                }
            };

            router1.getFilter.returns('featured:false');
            router1.getResourceType.returns('posts');
            router1.getPermalinks.returns({
                getValue: function () {
                    return '/collection/:year/:slug/';
                }
            });

            router2.getFilter.returns('featured:true');
            router2.getResourceType.returns('posts');
            router2.getPermalinks.returns({
                getValue: function () {
                    return '/podcast/:slug/';
                }
            });

            router3.getFilter.returns(false);
            router3.getResourceType.returns('authors');
            router3.getPermalinks.returns({
                getValue: function () {
                    return '/persons/:slug/';
                }
            });

            router4.getFilter.returns(false);
            router4.getResourceType.returns('tags');
            router4.getPermalinks.returns({
                getValue: function () {
                    return '/category/:slug/';
                }
            });

            router5.getFilter.returns(false);
            router5.getResourceType.returns('pages');
            router5.getPermalinks.returns({
                getValue: function () {
                    return '/:slug/';
                }
            });

            common.events.emit('router.created', router1);
            common.events.emit('router.created', router2);
            common.events.emit('router.created', router3);
            common.events.emit('router.created', router4);
            common.events.emit('router.created', router5);

            common.events.emit('db.ready');

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        afterEach(function () {
            urlService.resetGenerators();
            configUtils.restore();
        });

        it('check url generators', function () {
            urlService.urlGenerators.length.should.eql(5);
            urlService.urlGenerators[0].router.should.eql(router1);
            urlService.urlGenerators[1].router.should.eql(router2);
            urlService.urlGenerators[2].router.should.eql(router3);
            urlService.urlGenerators[3].router.should.eql(router4);
            urlService.urlGenerators[4].router.should.eql(router5);
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.router.getResourceType() === 'posts' && generator.router.getFilter() === 'featured:false') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.router.getResourceType() === 'posts' && generator.router.getFilter() === 'featured:true') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.router.getResourceType() === 'pages') {
                    generator.getUrls().length.should.eql(1);
                }

                if (generator.router.getResourceType() === 'tags') {
                    generator.getUrls().length.should.eql(3);
                }

                if (generator.router.getResourceType() === 'authors') {
                    generator.getUrls().length.should.eql(2);
                }
            });

            let url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[0].id);
            url.should.eql('/collection/2015/html-ipsum/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[1].id);
            url.should.eql('/collection/2015/ghostly-kitchen-sink/');

            // featured
            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.posts[2].id);
            url.should.eql('/podcast/short-and-sweet/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[0].id);
            url.should.eql('/category/kitchen-sink/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[1].id);
            url.should.eql('/category/bacon/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[2].id);
            url.should.eql('/category/chorizo/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.tags[3].id);
            url.should.eql('/404/'); // tags with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[0].id);
            url.should.eql('/persons/joe-bloggs/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[1].id);
            url.should.eql('/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[2].id);
            url.should.eql('/404/'); // users with no posts should not be public

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[3].id);
            url.should.eql('/persons/slimer-mcectoplasm/');

            url = urlService.getUrlByResourceId(testUtils.DataGenerator.forKnex.users[4].id);
            url.should.eql('/404/'); // users with no posts should not be public
        });
    });
});
