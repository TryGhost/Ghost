'use strict';

// jshint unused: false
const _ = require('lodash');
const Promise = require('bluebird');
const should = require('should');
const jsonpath = require('jsonpath');
const sinon = require('sinon');
const common = require('../../../../server/lib/common');
const Urls = require('../../../../server/services/url/Urls');
const sandbox = sinon.sandbox.create();

describe('Unit: services/url/Urls', function () {
    let urls, eventsToRemember;

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
        sandbox.stub(common.events, 'emit').callsFake(function (eventName, callback) {
            eventsToRemember[eventName] = callback;
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('fn: add', function () {
        urls.add({
            url: '/test/',
            resource: {
                data: {
                    id: 'object-id-x'
                }
            },
            generatorId: 1
        });

        should.exist(eventsToRemember['url.added']);
    });

    it('fn: getByResourceId', function () {
        urls.getByResourceId('object-id-2').url.should.eql('/something/');
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
    });
});
