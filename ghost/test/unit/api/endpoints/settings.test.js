const assert = require('node:assert/strict');
const sinon = require('sinon');
const SettingsBREADService = require('../../../../core/server/services/settings/settings-bread-service');
const stripeConnect = require('../../../../core/server/services/members/stripe-connect');
const settingsController = require('../../../../core/server/api/endpoints/settings');

describe('Settings controller', function () {
  afterEach(function () {
    sinon.restore();
  });

  describe('#edit with a Stripe Connect secure key', function () {
    let session;

    beforeEach(async function () {
      sinon.stub(SettingsBREADService.prototype, 'edit').resolves({});
      sinon.stub(SettingsBREADService.prototype, 'browse').resolves([]);
      // The admin's session after clicking Connect with Stripe.
      session = {};
      await stripeConnect.getStripeConnectOAuthUrl((prop, value) => {
        session[prop] = value;
      }, 'test');
    });

    const edit = (secureKey) =>
      settingsController.edit.query({
        data: { settings: [{ key: 'stripe_connect_integration_token', value: secureKey }] },
        options: {},
        original: { session },
        setHeader() {},
      });

    const keyFor = (state) =>
      Buffer.from(
        JSON.stringify({ l: false, a: 'sk_test', p: 'pk_test', s: state, n: 'Co', i: 'acct_1' }),
      ).toString('base64');

    it('saves the key for the connection in progress, which then ends', async function () {
      const state = session[stripeConnect.STATE_PROP];
      await edit(keyFor(state));

      const stripeConnectData = SettingsBREADService.prototype.edit.firstCall.args[2];
      assert.equal(stripeConnectData.account_id, 'acct_1');
      assert.equal(session[stripeConnect.STATE_PROP], undefined);
    });

    it('refuses a key for another connection and keeps the one in progress', async function () {
      const state = session[stripeConnect.STATE_PROP];
      await assert.rejects(edit(keyFor('someone-elses-state')), { errorType: 'BadRequestError' });

      assert.equal(session[stripeConnect.STATE_PROP], state);
      sinon.assert.notCalled(SettingsBREADService.prototype.edit);
    });
  });
});
