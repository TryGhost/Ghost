const assert = require('node:assert/strict');
const sinon = require('sinon');
const ResourceService = require('../../../../../core/server/services/mentions/resource-service');
const UrlUtils = require('@tryghost/url-utils');

function buildUrlServiceWithStubbedFacade() {
    const resolveUrl = sinon.stub();

    resolveUrl.withArgs('/post-resource').resolves({
        type: 'posts',
        id: '63ce473f992390b739b00b01'
    });

    resolveUrl.withArgs('/tag-resource').resolves({
        type: 'tags',
        id: '63ce473f992390b739b00b02'
    });

    resolveUrl.withArgs('/no-resource').resolves(null);

    return {
        urlService: {facade: {resolveUrl}},
        resolveUrl
    };
}

describe('ResourceService', function () {
    describe('getByURL', function () {
        it('Correctly converts post resources', async function () {
            const urlUtils = new UrlUtils({
                getSiteUrl() {
                    return 'https://site.com/blah/';
                },
                getSubdir() {
                    return '/blah';
                },
                getAdminUrl() {
                    return 'https://admin.com';
                }
            });

            const {urlService, resolveUrl} = buildUrlServiceWithStubbedFacade();
            const resourceService = new ResourceService({
                urlUtils,
                urlService
            });

            const result = await resourceService.getByURL(
                new URL('https://site.com/blah/post-resource')
            );

            sinon.assert.calledWithExactly(resolveUrl, '/post-resource');

            assert.equal(result.type, 'post');
            assert.equal(result.id.toHexString(), '63ce473f992390b739b00b01');
        });

        it('Does not convert tag resources', async function () {
            const urlUtils = new UrlUtils({
                getSiteUrl() {
                    return 'https://site.com/blah/';
                },
                getSubdir() {
                    return '/blah';
                },
                getAdminUrl() {
                    return 'https://admin.com';
                }
            });

            const {urlService, resolveUrl} = buildUrlServiceWithStubbedFacade();
            const resourceService = new ResourceService({
                urlUtils,
                urlService
            });

            const result = await resourceService.getByURL(
                new URL('https://site.com/blah/tag-resource')
            );

            sinon.assert.calledWithExactly(resolveUrl, '/tag-resource');

            assert.equal(result.type, null);
            assert.equal(result.id, null);
        });

        it('Handles non-resources', async function () {
            const urlUtils = new UrlUtils({
                getSiteUrl() {
                    return 'https://site.com/blah/';
                },
                getSubdir() {
                    return '/blah';
                },
                getAdminUrl() {
                    return 'https://admin.com';
                }
            });

            const {urlService, resolveUrl} = buildUrlServiceWithStubbedFacade();
            const resourceService = new ResourceService({
                urlUtils,
                urlService
            });

            const result = await resourceService.getByURL(
                new URL('https://site.com/blah/no-resource')
            );

            sinon.assert.calledWithExactly(resolveUrl, '/no-resource');

            assert.equal(result.type, null);
            assert.equal(result.id, null);
        });
    });
});
