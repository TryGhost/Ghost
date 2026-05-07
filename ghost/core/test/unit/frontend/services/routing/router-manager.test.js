const assert = require('node:assert/strict');
const sinon = require('sinon');

const RouterManager = require('../../../../../../core/frontend/services/routing/router-manager');
const registry = require('../../../../../../core/frontend/services/routing/registry');

describe('Unit - services/routing/router-manager', function () {
    let manager;
    let mockUrlService;

    beforeEach(function () {
        mockUrlService = {
            ownsResource: sinon.stub(),
            getUrlForResource: sinon.stub(),
            getResourceById: sinon.stub(),
            onRouterAddedType: sinon.stub(),
            onRouterUpdated: sinon.stub()
        };

        manager = new RouterManager({registry});
        manager.urlService = mockUrlService;
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('ownsResource', function () {
        it('delegates to urlService.ownsResource with routerId and resource object', function () {
            const resource = {id: 'post-id-1', type: 'posts', slug: 'hello'};
            mockUrlService.ownsResource.withArgs('router-abc', resource).returns(true);

            const result = manager.ownsResource('router-abc', resource);

            assert.equal(result, true);
            sinon.assert.calledOnce(mockUrlService.ownsResource);
            sinon.assert.calledWithExactly(mockUrlService.ownsResource, 'router-abc', resource);
        });

        it('returns false when the resource is not owned by the router', function () {
            const resource = {id: 'post-id-2', type: 'posts', slug: 'world'};
            mockUrlService.ownsResource.returns(false);

            const result = manager.ownsResource('router-xyz', resource);

            assert.equal(result, false);
        });

        it('passes the full resource object (not just an id) through to the facade', function () {
            // Regression test: the old signature was `owns(routerId, id)`.
            // The new signature is `ownsResource(routerId, resource)`. The
            // router-manager must forward the resource object — not extract
            // resource.id — so the lazy facade can evaluate NQL filters
            // against the resource fields.
            const resource = {id: 'abc', type: 'posts', slug: 'my-post', featured: true};
            mockUrlService.ownsResource.returns(true);

            manager.ownsResource('router-id', resource);

            const [, passedResource] = mockUrlService.ownsResource.firstCall.args;
            assert.deepEqual(passedResource, resource);
            // Ensure we did NOT pass just the id string
            assert.notEqual(typeof passedResource, 'string');
        });
    });

    describe('getUrlForResource', function () {
        it('delegates to urlService.getUrlForResource with resource and options', function () {
            const resource = {id: 'post-id-1', type: 'posts', slug: 'hello-world'};
            const options = {absolute: true};
            mockUrlService.getUrlForResource.withArgs(resource, options).returns('https://example.com/hello-world/');

            const result = manager.getUrlForResource(resource, options);

            assert.equal(result, 'https://example.com/hello-world/');
            sinon.assert.calledOnce(mockUrlService.getUrlForResource);
            sinon.assert.calledWithExactly(mockUrlService.getUrlForResource, resource, options);
        });

        it('passes options through unchanged', function () {
            const resource = {id: 'tag-1', type: 'tags', slug: 'news'};
            const options = {withSubdirectory: true};
            mockUrlService.getUrlForResource.returns('/tag/news/');

            manager.getUrlForResource(resource, options);

            sinon.assert.calledWithExactly(mockUrlService.getUrlForResource, resource, options);
        });

        it('passes the full resource object (not just an id) through to the facade', function () {
            // Regression test: the old signature was `getUrlByResourceId(id, options)`.
            // The new signature is `getUrlForResource(resource, options)`. The
            // router-manager must forward the resource object — not extract
            // resource.id — so the lazy facade can evaluate permalink templates.
            const resource = {id: 'abc', type: 'posts', slug: 'my-post', published_at: '2024-01-01'};
            mockUrlService.getUrlForResource.returns('/my-post/');

            manager.getUrlForResource(resource, {});

            const [passedResource] = mockUrlService.getUrlForResource.firstCall.args;
            assert.deepEqual(passedResource, resource);
            assert.notEqual(typeof passedResource, 'string');
        });

        it('returns result from the urlService directly', function () {
            const resource = {id: 'p1', type: 'posts'};
            mockUrlService.getUrlForResource.returns('/test-url/');

            const result = manager.getUrlForResource(resource, {});

            assert.equal(result, '/test-url/');
        });
    });

    describe('getResourceById', function () {
        it('delegates to urlService.getResourceById', function () {
            const envelope = {config: {type: 'posts'}, data: {id: 'post-id-1', slug: 'hello'}};
            mockUrlService.getResourceById.withArgs('post-id-1').returns(envelope);

            const result = manager.getResourceById('post-id-1');

            assert.deepEqual(result, envelope);
            sinon.assert.calledOnce(mockUrlService.getResourceById);
            sinon.assert.calledWithExactly(mockUrlService.getResourceById, 'post-id-1');
        });

        it('returns null when resource is not found', function () {
            mockUrlService.getResourceById.returns(null);

            const result = manager.getResourceById('nonexistent-id');

            assert.equal(result, null);
        });
    });
});
