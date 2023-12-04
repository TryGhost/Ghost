const nock = require('nock');
const GeolocationService = require('../../../lib/services/GeolocationService');

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

            scope.isDone().should.eql(true, 'request was not made');
            should.exist(result, 'nothing was returned');
            result.should.deepEqual(RESPONSE, 'result didn\'t match expected response');
        });

        it('fetches from geojs.io with IPv6 address', async function () {
            const scope = nock('https://get.geojs.io')
                .get('/v1/ip/geo/2a01%3A4c8%3A43a%3A13c9%3A8d6%3A128e%3A1fd5%3A6aad.json')
                .reply(200, RESPONSE);

            const result = await service.getGeolocationFromIP('2a01:4c8:43a:13c9:8d6:128e:1fd5:6aad');

            scope.isDone().should.eql(true, 'request was not made');
            should.exist(result, 'nothing was returned');
            result.should.deepEqual(RESPONSE, 'result didn\'t match expected response');
        });

        it('handles non-IP addresses', async function () {
            let scope = nock('https://get.geojs.io').get('/v1/ip/geo/.json').reply(200, {test: true});
            let result = await service.getGeolocationFromIP('');
            scope.isDone().should.eql(false);
            should.equal(undefined, result);

            scope = nock('https://get.geojs.io').get('/v1/ip/geo/null.json').reply(200, {test: true});
            result = await service.getGeolocationFromIP(null);
            scope.isDone().should.eql(false);
            should.equal(undefined, result);

            scope = nock('https://get.geojs.io').get('/v1/ip/geo/undefined.json').reply(200, {test: true});
            result = await service.getGeolocationFromIP(undefined);
            scope.isDone().should.eql(false);
            should.equal(undefined, result);

            scope = nock('https://get.geojs.io').get('/v1/ip/geo/test.json').reply(200, {test: true});
            result = await service.getGeolocationFromIP('test');
            scope.isDone().should.eql(false);
            should.equal(undefined, result);
        });
    });
});
