
const _ = require('lodash');
const Promise = require('bluebird');
const should = require('should');
const jsonpath = require('jsonpath');
const sinon = require('sinon');
const UrlGenerator = require('../../../../server/services/url/UrlGenerator');
const sandbox = sinon.sandbox.create();

describe('Unit: services/url/UrlGenerator', function () {
    let queue, routingType, urls, resources, resource, resource2;

    beforeEach(function () {
        queue = {
            register: sandbox.stub(),
            start: sandbox.stub()
        };

        routingType = {
            getFilter: sandbox.stub(),
            addListener: sandbox.stub(),
            getType: sandbox.stub(),
            getPermalinks: sandbox.stub()
        };

        urls = {
            add: sandbox.stub(),
            getByUrl: sandbox.stub(),
            removeResourceId: sandbox.stub(),
            getByGeneratorId: sandbox.stub()
        };

        resources = {
            getAllByType: sandbox.stub(),
            getByIdAndType: sandbox.stub()
        };

        resource = {
            reserve: sandbox.stub(),
            release: sandbox.stub(),
            isReserved: sandbox.stub(),
            removeAllListeners: sandbox.stub(),
            addListener: sandbox.stub()
        };

        resource2 = {
            reserve: sandbox.stub(),
            release: sandbox.stub(),
            isReserved: sandbox.stub(),
            removeAllListeners: sandbox.stub(),
            addListener: sandbox.stub()
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('ensure listeners', function () {
        const urlGenerator = new UrlGenerator(routingType, queue);

        queue.register.calledTwice.should.be.true();
        routingType.addListener.calledOnce.should.be.true();
        should.not.exist(urlGenerator.filter);
    });

    it('routing type has filter', function () {
        routingType.getFilter.returns('featured:true');
        const urlGenerator = new UrlGenerator(routingType, queue);
        urlGenerator.filter.should.eql('$[?(@.featured == true)]');
    });

    it('routing type has changed', function () {
        const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);

        sandbox.stub(urlGenerator, '_try');

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

        routingType.addListener.args[0][1]();
        urls.removeResourceId.calledTwice.should.be.true();
        resource.release.calledOnce.should.be.true();
        resource2.release.calledOnce.should.be.true();
        urlGenerator._try.calledTwice.should.be.true();
    });

    describe('fn: _onInit', function () {
        it('1 resource', function () {
            routingType.getType.returns('posts');
            resources.getAllByType.withArgs('posts').returns([resource]);

            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            sandbox.stub(urlGenerator, '_try');

            urlGenerator._onInit();
            urlGenerator._try.calledOnce.should.be.true();
        });

        it('no resource', function () {
            routingType.getType.returns('posts');
            resources.getAllByType.withArgs('posts').returns([]);

            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            sandbox.stub(urlGenerator, '_try');

            urlGenerator._onInit();
            urlGenerator._try.called.should.be.false();
        });
    });

    describe('fn: _onAdded', function () {
        it('type is equal', function () {
            routingType.getType.returns('posts');
            resources.getByIdAndType.withArgs('posts', 1).returns(resource);

            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            sandbox.stub(urlGenerator, '_try');

            urlGenerator._onAdded({id: 1, type: 'posts'});
            urlGenerator._try.calledOnce.should.be.true();
        });

        it('type is not equal', function () {
            routingType.getType.returns('pages');

            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            sandbox.stub(urlGenerator, '_try');

            urlGenerator._onAdded({id: 1, type: 'posts'});
            urlGenerator._try.called.should.be.false();
        });
    });

    describe('fn: _try', function () {
        describe('no filter', function () {
            it('resource is not taken', function () {
                routingType.getFilter.returns(false);
                routingType.getType.returns('posts');
                resource.isReserved.returns(false);
                sandbox.stub(jsonpath, 'query');

                const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
                sandbox.stub(urlGenerator, '_generateUrl').returns('something');
                sandbox.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                urlGenerator._generateUrl.calledOnce.should.be.true();
                urlGenerator._resourceListeners.calledOnce.should.be.true();
                urls.add.calledOnce.should.be.true();
                resource.reserve.calledOnce.should.be.true();
                jsonpath.query.called.should.be.false();
            });

            it('resource is taken', function () {
                routingType.getFilter.returns(false);
                routingType.getType.returns('posts');
                resource.isReserved.returns(true);
                sandbox.stub(jsonpath, 'query');

                const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
                sandbox.stub(urlGenerator, '_generateUrl').returns('something');
                sandbox.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                urlGenerator._generateUrl.called.should.be.false();
                urlGenerator._resourceListeners.called.should.be.false();
                urls.add.called.should.be.false();
                resource.reserve.called.should.be.false();
                jsonpath.query.called.should.be.false();
            });
        });

        describe('custom filter', function () {
            it('matches', function () {
                routingType.getFilter.returns('featured:true');
                routingType.getType.returns('posts');
                resource.isReserved.returns(false);
                sandbox.stub(jsonpath, 'query').returns([true]);

                const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
                sandbox.stub(urlGenerator, '_generateUrl').returns('something');
                sandbox.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                urlGenerator._generateUrl.calledOnce.should.be.true();
                urlGenerator._resourceListeners.calledOnce.should.be.true();
                urls.add.calledOnce.should.be.true();
                resource.reserve.calledOnce.should.be.true();
                jsonpath.query.calledOnce.should.be.true();
            });

            it('no match', function () {
                routingType.getFilter.returns('featured:true');
                routingType.getType.returns('posts');
                resource.isReserved.returns(false);
                sandbox.stub(jsonpath, 'query').returns([]);

                const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
                sandbox.stub(urlGenerator, '_generateUrl').returns('something');
                sandbox.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                urlGenerator._generateUrl.calledOnce.should.be.true();
                urlGenerator._resourceListeners.called.should.be.false();
                urls.add.called.should.be.false();
                resource.reserve.called.should.be.false();
                jsonpath.query.calledOnce.should.be.true();
            });

            it('resource is taken', function () {
                routingType.getFilter.returns('featured:true');
                routingType.getType.returns('posts');
                resource.isReserved.returns(true);
                sandbox.stub(jsonpath, 'query').returns([]);

                const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
                sandbox.stub(urlGenerator, '_generateUrl').returns('something');
                sandbox.stub(urlGenerator, '_resourceListeners');

                urlGenerator._try(resource);

                urlGenerator._generateUrl.called.should.be.false();
                urlGenerator._resourceListeners.called.should.be.false();
                urls.add.called.should.be.false();
                resource.reserve.called.should.be.false();
                jsonpath.query.called.should.be.false();
            });
        });
    });

    describe('fn: _generateUrl', function () {
        it('returns url', function () {
            routingType.getPermalinks.returns({
                getValue: function () {
                    return '/:slug/';
                }
            });

            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            sandbox.stub(urlGenerator, '_replacePermalink').returns('/url');

            urlGenerator._generateUrl(resource).should.eql('/url');
            urlGenerator._replacePermalink.calledWith('/:slug/', resource).should.be.true();
        });
    });

    describe('fn: _replacePermalink', function () {
        it('/:slug/', function () {
            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            resource.data = {
                slug: 'welcome'
            };

            urlGenerator._replacePermalink('/:slug/', resource).should.eql('/welcome/');
        });

        it('/:year/:slug/', function () {
            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            resource.data = {
                slug: 'welcome',
                published_at: '2017-04-13T20:00:53.584Z'
            };

            urlGenerator._replacePermalink('/:year/:slug/', resource).should.eql('/2017/welcome/');
        });

        it('/:author/:slug/', function () {
            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            resource.data = {
                slug: 'welcome',
                primary_author: {
                    slug: 'joe'
                }
            };

            urlGenerator._replacePermalink('/:author/:slug/', resource).should.eql('/joe/welcome/');
        });

        it('/:primary_tag/:slug/', function () {
            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            resource.data = {
                slug: 'welcome',
                primary_tag: {
                    slug: 'football'
                }
            };

            urlGenerator._replacePermalink('/:primary_tag/:slug/', resource).should.eql('/football/welcome/');
        });
    });

    describe('fn: _resourceListeners', function () {
        it('ensure events', function () {
            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);

            urlGenerator._resourceListeners(resource);
            resource.removeAllListeners.calledOnce.should.be.true();
            resource.addListener.calledTwice.should.be.true();
        });

        it('url has not changed', function () {
            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            sandbox.stub(urlGenerator, '_generateUrl').returns('/welcome/');
            sandbox.stub(urlGenerator, '_try').returns(true);

            resource.data = {
                id: 'object-id'
            };

            urlGenerator._resourceListeners(resource);
            resource.addListener.args[0][1](resource);

            urlGenerator._try.called.should.be.true();
            urls.removeResourceId.called.should.be.true();
            resource.release.called.should.be.true();
            queue.start.called.should.be.false();
        });

        it('url has changed, but is still mine', function () {
            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            sandbox.stub(urlGenerator, '_generateUrl').returns('/salute/');
            sandbox.stub(urlGenerator, '_try').returns(true);

            resource.data = {
                id: 'object-id'
            };

            urlGenerator._resourceListeners(resource);
            resource.addListener.args[0][1](resource);

            urlGenerator._try.calledOnce.should.be.true();
            urls.removeResourceId.calledOnce.should.be.true();
            resource.release.calledOnce.should.be.true();
            queue.start.called.should.be.false();
        });

        it('url has changed and is no longer mine (e.g. filter does not match anymore)', function () {
            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
            sandbox.stub(urlGenerator, '_generateUrl').returns('/salute/');
            sandbox.stub(urlGenerator, '_try').returns(false);

            urlGenerator._resourceListeners(resource);

            resource.data = {
                id: 'object-id'
            };

            resource.addListener.args[0][1](resource);

            urlGenerator._try.calledOnce.should.be.true();
            urls.removeResourceId.calledOnce.should.be.true();
            resource.release.calledOnce.should.be.true();
            queue.start.calledOnce.should.be.true();
        });

        it('resource got removed', function () {
            const urlGenerator = new UrlGenerator(routingType, queue, resources, urls);
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
