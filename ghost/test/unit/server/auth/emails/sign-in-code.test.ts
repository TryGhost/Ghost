import assert from 'node:assert/strict';
import nock from 'nock';
import {
  createSignInCodeEmail,
  geolocateWithGeojs,
  getDeviceDetails,
} from '../../../../../core/server/auth/emails/sign-in-code';

const CHROME_ON_MAC =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

describe('sign-in code email', function () {
  function setup() {
    const sent: Array<{ to: string; subject: string; html: string }> = [];
    const lookups: string[] = [];
    const sendCode = createSignInCodeEmail({
      mailer: {
        send: async (message) => {
          sent.push(message);
        },
      },
      t: (key, options) =>
        key.replace(/\{(\w+)\}/g, (_, name) => String(options?.[name] ?? `{${name}}`)),
      getSiteTitle: () => 'My Site',
      getSiteLogo: () => 'https://example.com/logo.png',
      getSiteUrl: () => 'https://example.com/blog/',
      geolocate: async (ip) => {
        lookups.push(ip);
        return 'Lisbon, Portugal';
      },
    });
    return { sent, lookups, sendCode };
  }

  it('sends the legacy subject and the device details', async function () {
    const { sent, lookups, sendCode } = setup();

    await sendCode({
      email: 'staff@example.com',
      code: '012345',
      userAgent: CHROME_ON_MAC,
      ipAddress: '203.0.113.7',
      isEmailMfaRequired: false,
    });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, 'staff@example.com');
    assert.equal(sent[0].subject, '012345 is your Ghost sign in verification code');
    assert.match(sent[0].html, /012345/);
    assert.match(sent[0].html, /Chrome, Mac OS/);
    assert.match(sent[0].html, /Lisbon, Portugal/);
    assert.match(sent[0].html, /example\.com/);
    assert.deepEqual(lookups, ['203.0.113.7']);
  });

  it('does not look up a missing or malformed IP', async function () {
    const geolocate = async () => assert.fail('looked up');

    assert.equal((await getDeviceDetails(null, null, geolocate)).location, 'Unknown');
    assert.equal((await getDeviceDetails(null, 'not-an-ip', geolocate)).location, 'Unknown');
  });

  it('describes the device from the user agent', async function () {
    const details = await getDeviceDetails(CHROME_ON_MAC, null, async () => 'Unknown');

    assert.equal(details.device, 'Chrome, Mac OS');
    assert.match(details.time, /UTC/);
  });

  describe('geolocateWithGeojs', function () {
    afterEach(function () {
      nock.cleanAll();
    });

    it('joins the parts geojs returns', async function () {
      nock('https://get.geojs.io')
        .get('/v1/ip/geo/203.0.113.7.json')
        .reply(200, { city: 'Lisbon', country: 'Portugal' });

      assert.equal(await geolocateWithGeojs('203.0.113.7'), 'Lisbon, Portugal');
    });

    it('skips a malformed part', async function () {
      nock('https://get.geojs.io')
        .get('/v1/ip/geo/203.0.113.7.json')
        .reply(200, { city: {}, country: 'Portugal' });

      assert.equal(await geolocateWithGeojs('203.0.113.7'), 'Portugal');
    });

    it('answers Unknown when the lookup fails', async function () {
      nock('https://get.geojs.io').get('/v1/ip/geo/203.0.113.7.json').reply(500);

      assert.equal(await geolocateWithGeojs('203.0.113.7'), 'Unknown');
    });
  });
});
