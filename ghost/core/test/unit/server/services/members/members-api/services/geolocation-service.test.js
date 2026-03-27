const assert = require('node:assert/strict');
const {assertExists} = require('../../../../../../utils/assertions');
const nock = require('nock');
const GeolocationService = require('../../../../../../../core/server/services/members/members-api/services/geolocation-service');

const RESPONSE = {
    longitude: '-2.2417',
    city: 'Kidderminster',
    timezone: 'Europe/London',
    accuracy: 200,
    asn: 8468,
    region: 'England',
    organization_name: 'Entanet',
    organization: 'AS8468 Entanet',
    country_code: 'GB',
    ip: '188.39.113.90',
    latitude: '52.375',
    area_code: '0',
    continent_code: 'EU',
    country: 'United Kingdom',
    country_code3: 'GBR'
};

const service = new GeolocationService();

describe('lib/geolocation', function () {
    describe('getGeolocationFromIP', function () {
        afterEach(function () {
            nock.abortPendingRequests();
            nock.cleanAll();
        });

        it('fetches from geojs.io with IPv4 address', async function () {
            const scope = nock('https://get.geojs.io')
                .get('/v1/ip/geo/188.39.113.90.json')
                .reply(200, RESPONSE);

            const result = await service.getGeolocationFromIP('188.39.113.90');

            assert.equal(scope.isDone(), true, 'request was not made');
            assertExists(result, 'nothing was returned');
            assert.deepEqual(result, RESPONSE, 'result didn\'t match expected response');
        });

        it('fetches from geojs.io with IPv6 address', async function () {
            const scope = nock('https://get.geojs.io')
                .get('/v1/ip/geo/2a01%3A4c8%3A43a%3A13c9%3A8d6%3A128e%3A1fd5%3A6aad.json')
                .reply(200, RESPONSE);

            const result = await service.getGeolocationFromIP('2a01:4c8:43a:13c9:8d6:128e:1fd5:6aad');

            assert.equal(scope.isDone(), true, 'request was not made');
            assertExists(result, 'nothing was returned');
            assert.deepEqual(result, RESPONSE, 'result didn\'t match expected response');
        });

        it('handles non-IP addresses', async function () {
            let scope = nock('https://get.geojs.io').get('/v1/ip/geo/.json').reply(200, {test: true});
            let result = await service.getGeolocationFromIP('');
            assert.equal(scope.isDone(), false);
            assert.equal(undefined, result);

            scope = nock('https://get.geojs.io').get('/v1/ip/geo/null.json').reply(200, {test: true});
            result = await service.getGeolocationFromIP(null);
            assert.equal(scope.isDone(), false);
            assert.equal(undefined, result);

            scope = nock('https://get.geojs.io').get('/v1/ip/geo/undefined.json').reply(200, {test: true});
            result = await service.getGeolocationFromIP(undefined);
            assert.equal(scope.isDone(), false);
            assert.equal(undefined, result);

            scope = nock('https://get.geojs.io').get('/v1/ip/geo/test.json').reply(200, {test: true});
            result = await service.getGeolocationFromIP('test');
            assert.equal(scope.isDone(), false);
            assert.equal(undefined, result);
        });
    });
});
