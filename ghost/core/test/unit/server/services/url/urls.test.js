const assert = require('node:assert/strict');
const sinon = require('sinon');
const Urls = require('../../../../../core/server/services/url/urls');
const logging = require('@tryghost/logging');

describe('Unit: services/url/Urls', function () {
    let urls;

    beforeEach(function () {
        urls = new Urls();

        urls.add({
            url: '/test/',
            resource: {
                data: {
                    id: 'object-id-1'
                }
            },
            generatorId: 2
        });

        urls.add({
            url: '/something/',
            resource: {
                data: {
                    id: 'object-id-2'
                }
            },
            generatorId: 1
        });

        urls.add({
            url: '/casper/',
            resource: {
                data: {
                    id: 'object-id-3'
                }
            },
            generatorId: 2
        });
    });

    afterEach(function () {
        sinon.restore();
    });

    it('fn: add', function () {
        urls.add({
            url: '/test/',
            resource: {
                data: {
                    id: 'object-id-x',
                    slug: 'a'
                }
            },
            generatorId: 1
        });

        assert.equal(urls.getByResourceId('object-id-x').resource.data.slug, 'a');

        sinon.stub(logging, 'error');
        // add duplicate
        urls.add({
            url: '/test/',
            resource: {
                data: {
                    id: 'object-id-x',
                    slug: 'b'
                }
            },
            generatorId: 1
        });

        assert.equal(urls.getByResourceId('object-id-x').resource.data.slug, 'b');
    });

    it('fn: getByResourceId', function () {
        assert.equal(urls.getByResourceId('object-id-2').url, '/something/');
        assert.ok(urls.getByResourceId('object-id-2').generatorId);
        assert.equal(urls.getByResourceId('object-id-2').generatorId, 1);
    });

    it('fn: getByGeneratorId', function () {
        assert.equal(urls.getByGeneratorId(2).length, 2);
    });

    it('fn: getByUrl', function () {
        assert.equal(urls.getByUrl('/something/').length, 1);
    });

    it('fn: removeResourceId', function () {
        const removed = urls.removeResourceId('object-id-2');
        assert.equal(removed.url, '/something/');
        assert.equal(urls.getByResourceId('object-id-2'), undefined);

        const notFound = urls.removeResourceId('does not exist');
        assert.equal(notFound, undefined);
    });
});
