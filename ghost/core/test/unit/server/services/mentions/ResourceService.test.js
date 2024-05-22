const assert = require('assert/strict');
const sinon = require('sinon');
const ResourceService = require('../../../../../core/server/services/mentions/ResourceService');
const UrlUtils = require('@tryghost/url-utils');
const UrlService = require('../../../../../core/server/services/url/UrlService');

function stubGetResource(urlService) {
    const getResource = sinon.stub(urlService, 'getResource');

    getResource.withArgs('/post-resource').returns({
        config: {
            type: 'posts'
        },
        data: {
            id: '63ce473f992390b739b00b01'
        }
    });

    getResource.withArgs('/tag-resource').returns({
        config: {
            type: 'tags'
        },
        data: {
            id: '63ce473f992390b739b00b02'
        }
    });

    getResource.withArgs('/no-resource').returns(null);

    return getResource;
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

            const urlService = new UrlService();
            const resourceService = new ResourceService({
                urlUtils,
                urlService
            });

            const getResource = stubGetResource(urlService);

            const result = await resourceService.getByURL(
                new URL('https://site.com/blah/post-resource')
            );

            assert(getResource.calledWithExactly('/post-resource'));

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

            const urlService = new UrlService();
            const resourceService = new ResourceService({
                urlUtils,
                urlService
            });

            const getResource = stubGetResource(urlService);

            const result = await resourceService.getByURL(
                new URL('https://site.com/blah/tag-resource')
            );

            assert(getResource.calledWithExactly('/tag-resource'));

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

            const urlService = new UrlService();
            const resourceService = new ResourceService({
                urlUtils,
                urlService
            });

            const getResource = stubGetResource(urlService);

            const result = await resourceService.getByURL(
                new URL('https://site.com/blah/no-resource')
            );

            assert(getResource.calledWithExactly('/no-resource'));

            assert.equal(result.type, null);
            assert.equal(result.id, null);
        });
    });
});
