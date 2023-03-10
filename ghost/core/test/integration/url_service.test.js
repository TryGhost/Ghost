const should = require('should');
const sinon = require('sinon');
const testUtils = require('../utils');
const configUtils = require('../utils/configUtils');
const models = require('../../core/server/models');
const UrlService = require('../../core/server/services/url/UrlService');

describe('Integration: services/url/UrlService', function () {
    let urlService;

    before(function () {
        models.init();
    });

    before(testUtils.teardownDb);
    before(testUtils.setup('users:roles', 'posts'));
    after(testUtils.teardownDb);

    after(function () {
        sinon.restore();
    });

    describe('functional: default routing set', function () {
        before(function (done) {
            urlService = new UrlService();

            urlService.onRouterAddedType('unique-id-1', 'featured:false', 'posts', '/:slug/');
            urlService.onRouterAddedType('unique-id-2', null, 'authors', '/author/:slug/');
            urlService.onRouterAddedType('unique-id-3', null, 'tags', '/tag/:slug/');
            urlService.onRouterAddedType('unique-id-4', null, 'pages', '/:slug/');

            // We can't use our url service utils here, because this is a local copy of the urlService, not the singletone
            urlService.init();

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

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.resourceType === 'posts') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.resourceType === 'pages') {
                    generator.getUrls().length.should.eql(1);
                }

                if (generator.resourceType === 'tags') {
                    generator.getUrls().length.should.eql(3);
                }

                if (generator.resourceType === 'authors') {
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
        before(testUtils.teardownDb);
        before(testUtils.setup('users:roles', 'posts'));

        before(function () {
            urlService.resetGenerators();
        });

        before(function (done) {
            urlService = new UrlService();

            urlService.onRouterAddedType('unique-id-1', 'featured:true', 'posts', '/podcast/:slug/');
            urlService.onRouterAddedType('unique-id-2', 'type:post', 'posts', '/collection/:year/:slug/');
            urlService.onRouterAddedType('unique-id-3', null, 'authors', '/persons/:slug/');
            urlService.onRouterAddedType('unique-id-4', null, 'tags', '/category/:slug/');
            urlService.onRouterAddedType('unique-id-5', null, 'pages', '/:slug/');

            // We can't use our url service utils here, because this is a local copy of the urlService, not the singletone
            urlService.init();

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

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.resourceType === 'posts' && generator.filter === 'type:post') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.resourceType === 'posts' && generator.filter === 'featured:true') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.resourceType === 'pages') {
                    generator.getUrls().length.should.eql(1);
                }

                if (generator.resourceType === 'tags') {
                    generator.getUrls().length.should.eql(3);
                }

                if (generator.resourceType === 'authors') {
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
        beforeEach(function (done) {
            configUtils.set('url', 'http://localhost:2388/blog/');

            urlService = new UrlService();

            urlService.onRouterAddedType('unique-id-1', 'featured:false', 'posts', '/collection/:year/:slug/');
            urlService.onRouterAddedType('unique-id-2', 'featured:true', 'posts', '/podcast/:slug/');
            urlService.onRouterAddedType('unique-id-3', null, 'authors', '/persons/:slug/');
            urlService.onRouterAddedType('unique-id-4', null, 'tags', '/category/:slug/');
            urlService.onRouterAddedType('unique-id-5', null, 'pages', '/:slug/');

            // We can't use our url service utils here, because this is a local copy of the urlService, not the singletone
            urlService.init();

            let timeout;
            (function retry() {
                clearTimeout(timeout);

                if (urlService.hasFinished()) {
                    return done();
                }

                setTimeout(retry, 50);
            })();
        });

        afterEach(async function () {
            urlService.resetGenerators();
            await configUtils.restore();
        });

        it('getUrl', function () {
            urlService.urlGenerators.forEach(function (generator) {
                if (generator.resourceType === 'posts' && generator.filter === 'featured:false') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.resourceType === 'posts' && generator.filter === 'featured:true') {
                    generator.getUrls().length.should.eql(2);
                }

                if (generator.resourceType === 'pages') {
                    generator.getUrls().length.should.eql(1);
                }

                if (generator.resourceType === 'tags') {
                    generator.getUrls().length.should.eql(3);
                }

                if (generator.resourceType === 'authors') {
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
