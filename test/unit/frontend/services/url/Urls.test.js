const should = require('should');
const sinon = require('sinon');
const events = require('../../../../../core/server/lib/common/events');
const Urls = require('../../../../../core/server/services/url/Urls');

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

        should.exist(eventsToRemember['url.added']);
        eventsToRemember['url.added'].url.absolute.should.eql('http://127.0.0.1:2369/test/');
        eventsToRemember['url.added'].url.relative.should.eql('/test/');
        should.exist(eventsToRemember['url.added'].resource);
        should.exist(eventsToRemember['url.added'].resource.data);

        urls.getByResourceId('object-id-x').resource.data.slug.should.eql('a');

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

        should.exist(eventsToRemember['url.added']);

        urls.getByResourceId('object-id-x').resource.data.slug.should.eql('b');
    });

    it('fn: getByResourceId', function () {
        urls.getByResourceId('object-id-2').url.should.eql('/something/');
        should.exist(urls.getByResourceId('object-id-2').generatorId);
        urls.getByResourceId('object-id-2').generatorId.should.eql(1);
    });

    it('fn: getByGeneratorId', function () {
        urls.getByGeneratorId(2).length.should.eql(2);
    });

    it('fn: getByUrl', function () {
        urls.getByUrl('/something/').length.should.eql(1);
    });

    it('fn: removeResourceId', function () {
        urls.removeResourceId('object-id-2');
        should.not.exist(urls.getByResourceId('object-id-2'));

        urls.removeResourceId('does not exist');
    });
});
