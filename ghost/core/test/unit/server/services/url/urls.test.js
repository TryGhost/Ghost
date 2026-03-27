const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const sinon = require('sinon');
const events = require('../../../../../core/server/lib/common/events');
const Urls = require('../../../../../core/server/services/url/urls');
const config = require('../../../../../core/shared/config');
const logging = require('@tryghost/logging');

describe('Unit: services/url/Urls', function () {
    let urls;
    let eventsToRemember;

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

        eventsToRemember = {};
        sinon.stub(events, 'emit').callsFake(function (eventName, data) {
            eventsToRemember[eventName] = data;
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

        assertExists(eventsToRemember['url.added']);
        assert.equal(eventsToRemember['url.added'].url.absolute, `${config.get('url')}/test/`);
        assert.equal(eventsToRemember['url.added'].url.relative, '/test/');
        assertExists(eventsToRemember['url.added'].resource);
        assertExists(eventsToRemember['url.added'].resource.data);

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

        assertExists(eventsToRemember['url.added']);

        assert.equal(urls.getByResourceId('object-id-x').resource.data.slug, 'b');
    });

    it('fn: getByResourceId', function () {
        assert.equal(urls.getByResourceId('object-id-2').url, '/something/');
        assertExists(urls.getByResourceId('object-id-2').generatorId);
        assert.equal(urls.getByResourceId('object-id-2').generatorId, 1);
    });

    it('fn: getByGeneratorId', function () {
        assert.equal(urls.getByGeneratorId(2).length, 2);
    });

    it('fn: getByUrl', function () {
        assert.equal(urls.getByUrl('/something/').length, 1);
    });

    it('fn: removeResourceId', function () {
        urls.removeResourceId('object-id-2');
        assert.equal(urls.getByResourceId('object-id-2'), undefined);

        urls.removeResourceId('does not exist');
    });
});
