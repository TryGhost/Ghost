const assert = require('node:assert/strict');
const sinon = require('sinon');
const urlUtils = require('../../../../../core/shared/url-utils');
const UrlGenerator = require('../../../../../core/server/services/url/url-generator');

describe('Unit: services/url/UrlGenerator', function () {
    let queue;
    let router;
    let urls;
    let resources;
    let resource;
    let resource2;

    beforeEach(function () {
        queue = {
            register: sinon.stub(),
            start: sinon.stub()
        };

        router = {
            addListener: sinon.stub(),
            getResourceType: sinon.stub(),
            getPermalinks: sinon.stub()
        };

        urls = {
            add: sinon.stub(),
            getByUrl: sinon.stub(),
            removeResourceId: sinon.stub(),
            getByGeneratorId: sinon.stub()
        };

        resources = {
            getAllByType: sinon.stub(),
            getByIdAndType: sinon.stub()
        };

        resource = {
            reserve: sinon.stub(),
            release: sinon.stub(),
            isReserved: sinon.stub(),
            removeAllListeners: sinon.stub(),
            addListener: sinon.stub()
        };

        resource2 = {
            reserve: sinon.stub(),
            release: sinon.stub(),
            isReserved: sinon.stub(),
            removeAllListeners: sinon.stub(),
            addListener: sinon.stub()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    it('ensure listeners', function () {
        const urlGenerator = new UrlGenerator({router, queue});

        assert.equal(queue.register.calledTwice, true);
        assert.equal(urlGenerator.filter, undefined);
    });

    it('routing type has filter', function () {
        const urlGenerator = new UrlGenerator({
            router,
            filter: 'featured:true',
            queue
        });
        assert.equal(urlGenerator.filter, 'featured:true');
    });

    it('routing type has changed', function () {
        const urlGenerator = new UrlGenerator({router, queue, resources, urls});

        sinon.stub(urlGenerator, '_try');

        urls.getByGeneratorId.returns([
            {
                url: '/something/',
                resource: resource
            },
            {
                url: '/else/',
                resource: resource2
            }]);

        resource.data = {
            id: 'object-id-1'
        };

        resource2.data = {
            id: 'object-id-1'
        };

        urlGenerator.regenerateResources();

        assert.equal(urls.removeResourceId.calledTwice, true);
        assert.equal(resource.release.calledOnce, true);
        assert.equal(resource2.release.calledOnce, true);
        assert.equal(urlGenerator._try.calledTwice, true);
    });

    describe('fn: _onInit', function () {
        it('1 resource', function () {
            resources.getAllByType.withArgs('posts').returns([resource]);

            const urlGenerator = new UrlGenerator({
                router,
                resourceType: 'posts',
                queue,
                resources,
                urls
            });
            sinon.stub(urlGenerator, '_try');

            urlGenerator._onInit();
            assert.equal(urlGenerator._try.calledOnce, true);
        });

        it('no resource', function () {
            resources.getAllByType.withArgs('posts').returns([]);

            const urlGenerator = new UrlGenerator({
                router,
                resourceType: 'posts',
                queue,
                resources,
                urls
            });
            sinon.stub(urlGenerator, '_try');

            urlGenerator._onInit();
            assert.equal(urlGenerator._try.called, false);
        });
    });

    describe('fn: _onAdded', function () {
        it('type is equal', function () {
            resources.getByIdAndType.withArgs('posts', 1).returns(resource);

            const urlGenerator = new UrlGenerator({
                router,
                resourceType: 'posts',
                queue,
                resources,
                urls
            });
            sinon.stub(urlGenerator, '_try');

            urlGenerator._onAdded({id: 1, type: 'posts'});
            assert.equal(urlGenerator._try.calledOnce, true);
        });

        it('type is not equal', function () {
            const urlGenerator = new UrlGenerator({
                router,
                resourceType: 'pages',
                queue,
                resources,
                urls
            });
            sinon.stub(urlGenerator, '_try');

            urlGenerator._onAdded({id: 1, type: 'posts'});
            assert.equal(urlGenerator._try.called, false);
        });
    });

    describe('fn: _try', function () {
        describe('no filter', function () {
            it('resource is not taken', function () {
                resource.isReserved.returns(false);

                const urlGenerator = new UrlGenerator({
                    router,
                    resourceType: 'posts',
                    queue,
                    resources,
                    urls
                });
                assert.equal(urlGenerator.nql, undefined);

                sinon.stub(urlGenerator, '_generateUrl').returns('something');
                sinon.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                assert.equal(urlGenerator._generateUrl.calledOnce, true);
                assert.equal(urlGenerator._resourceListeners.calledOnce, true);
                assert.equal(urls.add.calledOnce, true);
                assert.equal(resource.reserve.calledOnce, true);
            });

            it('resource is taken', function () {
                router.getResourceType.returns('posts');
                resource.isReserved.returns(true);

                const urlGenerator = new UrlGenerator({
                    router,
                    resourceType: 'posts',
                    queue,
                    resources,
                    urls
                });
                assert.equal(urlGenerator.nql, undefined);

                sinon.stub(urlGenerator, '_generateUrl').returns('something');
                sinon.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                assert.equal(urlGenerator._generateUrl.called, false);
                assert.equal(urlGenerator._resourceListeners.called, false);
                assert.equal(urls.add.called, false);
                assert.equal(resource.reserve.called, false);
            });
        });

        describe('custom filter', function () {
            it('matches', function () {
                resource.isReserved.returns(false);

                const urlGenerator = new UrlGenerator({
                    router,
                    filter: 'featured:true',
                    resourceType: 'posts',
                    queue,
                    resources,
                    urls
                });
                sinon.stub(urlGenerator.nql, 'queryJSON').returns(true);

                sinon.stub(urlGenerator, '_generateUrl').returns('something');
                sinon.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                assert.equal(urlGenerator._generateUrl.calledOnce, true);
                assert.equal(urlGenerator._resourceListeners.calledOnce, true);
                assert.equal(urls.add.calledOnce, true);
                assert.equal(resource.reserve.calledOnce, true);
                assert.equal(urlGenerator.nql.queryJSON.called, true);
            });

            it('no match', function () {
                resource.isReserved.returns(false);

                const urlGenerator = new UrlGenerator({
                    router,
                    filter: 'featured:true',
                    resourceType: 'posts',
                    queue,
                    resources,
                    urls
                });
                sinon.stub(urlGenerator.nql, 'queryJSON').returns(false);

                sinon.stub(urlGenerator, '_generateUrl').returns('something');
                sinon.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                assert.equal(urlGenerator._generateUrl.calledOnce, false);
                assert.equal(urlGenerator._resourceListeners.called, false);
                assert.equal(urls.add.called, false);
                assert.equal(resource.reserve.called, false);
                assert.equal(urlGenerator.nql.queryJSON.called, true);
            });

            it('resource is taken', function () {
                resource.isReserved.returns(true);

                const urlGenerator = new UrlGenerator({
                    router,
                    filter: 'featured:true',
                    resourceType: 'posts',
                    queue,
                    resources,
                    urls
                });
                sinon.stub(urlGenerator.nql, 'queryJSON').returns(true);

                sinon.stub(urlGenerator, '_generateUrl').returns('something');
                sinon.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                assert.equal(urlGenerator._generateUrl.called, false);
                assert.equal(urlGenerator._resourceListeners.called, false);
                assert.equal(urls.add.called, false);
                assert.equal(resource.reserve.called, false);
                assert.equal(urlGenerator.nql.queryJSON.called, false);
            });

            it('filter is malformed', function () {
                resource.isReserved.returns(false);

                const malformedFilter = 'tag:-foo,-bar';

                const urlGenerator = new UrlGenerator({
                    router,
                    filter: malformedFilter,
                    resourceType: 'posts',
                    queue,
                    resources,
                    urls
                });

                const queryJSONSpy = sinon.spy(urlGenerator.nql, 'queryJSON');

                // When the filter is malformed, the resource should not be reserved
                assert.equal(urlGenerator._try(resource), false);

                // Ensure the above false return is due to the malformed filter
                assert.throws(queryJSONSpy, new RegExp('Query Error: unexpected character in filter'));
                assert.throws(queryJSONSpy, new RegExp(malformedFilter));
            });
        });
    });

    describe('fn: _generateUrl', function () {
        it('returns url', function () {
            const urlGenerator = new UrlGenerator({
                router,
                permalink: '/:slug/',
                queue,
                resources,
                urls
            });
            const replacePermalink = sinon.stub().returns('/url/');
            sinon.stub(urlUtils, 'replacePermalink').get(() => replacePermalink);

            assert.equal(urlGenerator._generateUrl(resource), '/url/');
            assert.equal(replacePermalink.calledWith('/:slug/', resource.data), true);
        });
    });

    describe('fn: _resourceListeners', function () {
        it('ensure events', function () {
            const urlGenerator = new UrlGenerator({router, queue, resources, urls});

            urlGenerator._resourceListeners(resource);
            assert.equal(resource.removeAllListeners.calledOnce, true);
            assert.equal(resource.addListener.calledTwice, true);
        });

        it('resource was updated', function () {
            const urlGenerator = new UrlGenerator({router, queue, resources, urls});
            sinon.stub(urlGenerator, '_generateUrl').returns('/welcome/');
            sinon.stub(urlGenerator, '_try').returns(true);

            resource.data = {
                id: 'object-id'
            };

            urlGenerator._resourceListeners(resource);
            resource.addListener.args[0][1](resource);

            assert.equal(urlGenerator._try.called, false);
            assert.equal(urls.removeResourceId.called, true);
            assert.equal(resource.release.called, true);
            assert.equal(queue.start.called, true);
        });

        it('resource got removed', function () {
            const urlGenerator = new UrlGenerator({router, queue, resources, urls});
            urlGenerator._resourceListeners(resource);

            resource.data = {
                id: 'object-id'
            };

            resource.addListener.args[1][1](resource);
            assert.equal(urls.removeResourceId.calledOnce, true);
            assert.equal(resource.release.calledOnce, true);
        });
    });
});
