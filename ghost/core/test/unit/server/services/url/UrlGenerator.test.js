const should = require('should');
const sinon = require('sinon');
const urlUtils = require('../../../../../core/shared/url-utils');
const UrlGenerator = require('../../../../../core/server/services/url/UrlGenerator');

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

        queue.register.calledTwice.should.be.true();
        should.not.exist(urlGenerator.filter);
    });

    it('routing type has filter', function () {
        const urlGenerator = new UrlGenerator({
            router,
            filter: 'featured:true',
            queue
        });
        urlGenerator.filter.should.eql('featured:true');
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

        urls.removeResourceId.calledTwice.should.be.true();
        resource.release.calledOnce.should.be.true();
        resource2.release.calledOnce.should.be.true();
        urlGenerator._try.calledTwice.should.be.true();
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
            urlGenerator._try.calledOnce.should.be.true();
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
            urlGenerator._try.called.should.be.false();
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
            urlGenerator._try.calledOnce.should.be.true();
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
            urlGenerator._try.called.should.be.false();
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
                should.not.exist(urlGenerator.nql);

                sinon.stub(urlGenerator, '_generateUrl').returns('something');
                sinon.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                urlGenerator._generateUrl.calledOnce.should.be.true();
                urlGenerator._resourceListeners.calledOnce.should.be.true();
                urls.add.calledOnce.should.be.true();
                resource.reserve.calledOnce.should.be.true();
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
                should.not.exist(urlGenerator.nql);

                sinon.stub(urlGenerator, '_generateUrl').returns('something');
                sinon.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                urlGenerator._generateUrl.called.should.be.false();
                urlGenerator._resourceListeners.called.should.be.false();
                urls.add.called.should.be.false();
                resource.reserve.called.should.be.false();
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

                urlGenerator._generateUrl.calledOnce.should.be.true();
                urlGenerator._resourceListeners.calledOnce.should.be.true();
                urls.add.calledOnce.should.be.true();
                resource.reserve.calledOnce.should.be.true();
                urlGenerator.nql.queryJSON.called.should.be.true();
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

                urlGenerator._generateUrl.calledOnce.should.be.true();
                urlGenerator._resourceListeners.called.should.be.false();
                urls.add.called.should.be.false();
                resource.reserve.called.should.be.false();
                urlGenerator.nql.queryJSON.called.should.be.true();
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

                urlGenerator._generateUrl.called.should.be.false();
                urlGenerator._resourceListeners.called.should.be.false();
                urls.add.called.should.be.false();
                resource.reserve.called.should.be.false();
                urlGenerator.nql.queryJSON.called.should.be.false();
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

            urlGenerator._generateUrl(resource).should.eql('/url/');
            replacePermalink.calledWith('/:slug/', resource.data).should.be.true();
        });
    });

    describe('fn: _resourceListeners', function () {
        it('ensure events', function () {
            const urlGenerator = new UrlGenerator({router, queue, resources, urls});

            urlGenerator._resourceListeners(resource);
            resource.removeAllListeners.calledOnce.should.be.true();
            resource.addListener.calledTwice.should.be.true();
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

            urlGenerator._try.called.should.be.false();
            urls.removeResourceId.called.should.be.true();
            resource.release.called.should.be.true();
            queue.start.called.should.be.true();
        });

        it('resource got removed', function () {
            const urlGenerator = new UrlGenerator({router, queue, resources, urls});
            urlGenerator._resourceListeners(resource);

            resource.data = {
                id: 'object-id'
            };

            resource.addListener.args[1][1](resource);
            urls.removeResourceId.calledOnce.should.be.true();
            resource.release.calledOnce.should.be.true();
        });
    });
});
