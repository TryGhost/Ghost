import assert from 'node:assert/strict';
import sinon from 'sinon';

const membersService = require('../../../../core/server/services/members');
const urlUtils = require('../../../../core/shared/url-utils').default;
const controller = require('../../../../core/server/api/endpoints/members-stripe-connect');

describe('Members Stripe Connect controller', function () {
  beforeEach(function () {
    sinon.stub(urlUtils, 'getAdminUrl').returns('https://admin.example.com/');
    sinon
      .stub(membersService.stripeConnect, 'getStripeConnectOAuthUrl')
      .resolves(new URL('https://connect.stripe.com/oauth/authorize'));
  });

  afterEach(function () {
    sinon.restore();
  });

  // Starts a connection with these request headers: 'started' or 'refused'.
  async function start(headers: Record<string, string>): Promise<'started' | 'refused'> {
    const frame: {
      options: object;
      response?: (req: object, res: object, next: sinon.SinonStub) => Promise<void>;
    } = { options: { mode: 'test' } };
    controller.auth.query(frame);
    const req = { get: (name: string) => headers[name.toLowerCase()], session: {} };
    const res = { redirect: sinon.stub() };
    const next = sinon.stub();
    await frame.response!(req, res, next);
    if (res.redirect.called) {
      return 'started';
    }
    assert.equal(next.firstCall.args[0].errorType, 'NoPermissionError');
    return 'refused';
  }

  it('starts a connection that Fetch Metadata says came from Ghost Admin', async function () {
    assert.equal(
      await start({ 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'navigate' }),
      'started',
    );
    assert.equal(
      await start({ 'sec-fetch-site': 'none', 'sec-fetch-mode': 'navigate' }),
      'started',
    );
  });

  it('refuses a same-origin start that is not a navigation, such as an image or script', async function () {
    assert.equal(
      await start({ 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'no-cors' }),
      'refused',
    );
    assert.equal(
      await start({ 'sec-fetch-site': 'same-origin', 'sec-fetch-mode': 'cors' }),
      'refused',
    );
    assert.equal(await start({ 'sec-fetch-site': 'same-origin' }), 'refused');
  });

  it('refuses a start from another site, whatever its Referer says', async function () {
    assert.equal(
      await start({
        'sec-fetch-site': 'cross-site',
        'sec-fetch-mode': 'navigate',
        referer: 'https://admin.example.com/ghost/',
      }),
      'refused',
    );
  });

  it('without Fetch Metadata, starts only when Origin or Referer is the admin address', async function () {
    assert.equal(await start({ referer: 'https://admin.example.com/ghost/' }), 'started');
    assert.equal(await start({ origin: 'https://admin.example.com' }), 'started');
    assert.equal(await start({ referer: 'https://evil.example/' }), 'refused');
    assert.equal(await start({ origin: 'https://admin.example.com.evil.example' }), 'refused');
    assert.equal(await start({ referer: 'not a url' }), 'refused');
    assert.equal(await start({}), 'refused');
  });
});
