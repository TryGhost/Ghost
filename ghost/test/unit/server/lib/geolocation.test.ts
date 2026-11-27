import assert from 'node:assert/strict';
import nock from 'nock';
import { lookupGeolocation } from '../../../../core/server/lib/geolocation';

describe('lib/geolocation', function () {
  afterEach(function () {
    nock.cleanAll();
  });

  it('returns the fields Ghost reads', async function () {
    nock('https://get.geojs.io').get('/v1/ip/geo/203.0.113.7.json').reply(200, {
      city: 'Lisbon',
      region: 'Lisbon',
      country: 'Portugal',
      country_code: 'PT',
      latitude: '38.7',
    });

    assert.deepEqual(await lookupGeolocation('203.0.113.7'), {
      city: 'Lisbon',
      region: 'Lisbon',
      country: 'Portugal',
      country_code: 'PT',
    });
  });

  it('looks up a compressed IPv6 address', async function () {
    const scope = nock('https://get.geojs.io')
      .get(`/v1/ip/geo/${encodeURIComponent('2001:db8::1')}.json`)
      .reply(200, { country: 'Portugal' });

    assert.deepEqual(await lookupGeolocation('2001:db8::1'), { country: 'Portugal' });
    assert.equal(scope.isDone(), true);
  });

  it('makes no request for a missing or malformed address', async function () {
    const scope = nock('https://get.geojs.io').get(/.*/).reply(200, {});

    for (const ip of [undefined, null, '', 'test', '999.1.1.1']) {
      assert.equal(await lookupGeolocation(ip), undefined);
    }
    assert.equal(scope.isDone(), false);
  });

  it('drops a malformed field and keeps the rest', async function () {
    nock('https://get.geojs.io')
      .get('/v1/ip/geo/203.0.113.7.json')
      .reply(200, { city: 7, country: 'Portugal', country_code: 'PT' });

    assert.deepEqual(await lookupGeolocation('203.0.113.7'), {
      city: undefined,
      country: 'Portugal',
      country_code: 'PT',
    });
  });

  it('rejects a response that is not an object', async function () {
    nock('https://get.geojs.io').get('/v1/ip/geo/203.0.113.7.json').reply(200, '[]');

    await assert.rejects(lookupGeolocation('203.0.113.7'));
  });

  it('rejects a failed lookup without retrying', async function () {
    const scope = nock('https://get.geojs.io')
      .get('/v1/ip/geo/203.0.113.7.json')
      .reply(500)
      .get('/v1/ip/geo/203.0.113.7.json')
      .reply(200, { country: 'Portugal' });

    await assert.rejects(lookupGeolocation('203.0.113.7'));
    assert.equal(scope.pendingMocks().length, 1);
  });
});
