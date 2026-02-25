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

        sinon.assert.calledTwice(queue.register);
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

        sinon.assert.calledTwice(urls.removeResourceId);
        sinon.assert.calledOnce(resource.release);
        sinon.assert.calledOnce(resource2.release);
        sinon.assert.calledTwice(urlGenerator._try);
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
            sinon.assert.calledOnce(urlGenerator._try);
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
            sinon.assert.notCalled(urlGenerator._try);
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
            sinon.assert.calledOnce(urlGenerator._try);
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
            sinon.assert.notCalled(urlGenerator._try);
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

                sinon.assert.calledOnce(urlGenerator._generateUrl);
                sinon.assert.calledOnce(urlGenerator._resourceListeners);
                sinon.assert.calledOnce(urls.add);
                sinon.assert.calledOnce(resource.reserve);
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

                sinon.assert.notCalled(urlGenerator._generateUrl);
                sinon.assert.notCalled(urlGenerator._resourceListeners);
                sinon.assert.notCalled(urls.add);
                sinon.assert.notCalled(resource.reserve);
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

                sinon.assert.calledOnce(urlGenerator._generateUrl);
                sinon.assert.calledOnce(urlGenerator._resourceListeners);
                sinon.assert.calledOnce(urls.add);
                sinon.assert.calledOnce(resource.reserve);
                sinon.assert.called(urlGenerator.nql.queryJSON);
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

                sinon.assert.notCalled(urlGenerator._generateUrl);
                sinon.assert.notCalled(urlGenerator._resourceListeners);
                sinon.assert.notCalled(urls.add);
                sinon.assert.notCalled(resource.reserve);
                sinon.assert.called(urlGenerator.nql.queryJSON);
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

                sinon.assert.notCalled(urlGenerator._generateUrl);
                sinon.assert.notCalled(urlGenerator._resourceListeners);
                sinon.assert.notCalled(urls.add);
                sinon.assert.notCalled(resource.reserve);
                sinon.assert.notCalled(urlGenerator.nql.queryJSON);
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
            sinon.assert.calledWith(replacePermalink, '/:slug/', resource.data);
        });
    });

    describe('fn: _resourceListeners', function () {
        it('ensure events', function () {
            const urlGenerator = new UrlGenerator({router, queue, resources, urls});

            urlGenerator._resourceListeners(resource);
            sinon.assert.calledOnce(resource.removeAllListeners);
            sinon.assert.calledTwice(resource.addListener);
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

            sinon.assert.notCalled(urlGenerator._try);
            sinon.assert.called(urls.removeResourceId);
            sinon.assert.called(resource.release);
            sinon.assert.called(queue.start);
        });

        it('resource got removed', function () {
            const urlGenerator = new UrlGenerator({router, queue, resources, urls});
            urlGenerator._resourceListeners(resource);

            resource.data = {
                id: 'object-id'
            };

            resource.addListener.args[1][1](resource);
            sinon.assert.calledOnce(urls.removeResourceId);
            sinon.assert.calledOnce(resource.release);
        });
    });
});
