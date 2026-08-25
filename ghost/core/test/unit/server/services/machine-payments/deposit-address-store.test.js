const assert = require('node:assert/strict');
const sinon = require('sinon');
const {
  DepositAddressStore,
} = require('../../../../../core/server/services/machine-payments/stripe/deposit-address-store');

describe('Unit: server/services/machine-payments/deposit-address-store', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('returns a persisted address for the requested network without creating a new one', async function () {
    const settingsCache = {
      get: sinon
        .stub()
        .withArgs('machine_payments_deposit_address')
        .returns(
          JSON.stringify({
            tempo: '0xtempo',
            base: '0xbase',
          }),
        ),
    };
    const stripeFactory = sinon.stub();
    const store = new DepositAddressStore({
      settingsCacheFacade: settingsCache,
      stripeFactory,
      settingsHelpersFacade: { getActiveStripeKeys: () => ({ secretKey: 'sk_test' }) },
      settingsModel: { edit: sinon.stub() },
    });

    assert.equal(await store.getOrCreateAddress({ network: 'tempo' }), '0xtempo');
    assert.equal(await store.getOrCreateAddress({ network: 'base' }), '0xbase');
    sinon.assert.notCalled(stripeFactory);
  });

  it('does not reuse a Tempo address for Base', async function () {
    const settingsCache = {
      get: sinon
        .stub()
        .withArgs('machine_payments_deposit_address')
        .returns(
          JSON.stringify({
            tempo: '0xtempo',
          }),
        ),
    };
    const edit = sinon.stub().resolves();
    const createCryptoDepositAddress = sinon.stub().resolves({ address: '0xbase' });
    const store = new DepositAddressStore({
      settingsCacheFacade: settingsCache,
      stripeFactory: sinon.stub().returns({ createCryptoDepositAddress }),
      settingsHelpersFacade: { getActiveStripeKeys: () => ({ secretKey: 'sk_test' }) },
      settingsModel: { edit },
    });

    assert.equal(await store.getOrCreateAddress({ network: 'tempo' }), '0xtempo');
    assert.equal(await store.getOrCreateAddress({ network: 'base' }), '0xbase');
    sinon.assert.calledOnce(createCryptoDepositAddress);
    assert.deepEqual(createCryptoDepositAddress.firstCall.args[0], { network: 'base' });
    const persisted = JSON.parse(edit.firstCall.args[0][0].value);
    assert.equal(persisted.tempo, '0xtempo');
    assert.equal(persisted.base, '0xbase');
  });

  it('deduplicates in-flight creates and persists the result', async function () {
    const settingsCache = { get: sinon.stub().returns(null) };
    const edit = sinon.stub().resolves();
    const createCryptoDepositAddress = sinon.stub().resolves({ address: '0xcreated' });
    const stripeFactory = sinon.stub().returns({ createCryptoDepositAddress });

    const store = new DepositAddressStore({
      settingsCacheFacade: settingsCache,
      stripeFactory,
      settingsHelpersFacade: { getActiveStripeKeys: () => ({ secretKey: 'sk_test' }) },
      settingsModel: { edit },
    });

    const [a, b] = await Promise.all([
      store.getOrCreateAddress({ network: 'tempo' }),
      store.getOrCreateAddress({ network: 'tempo' }),
    ]);

    assert.equal(a, '0xcreated');
    assert.equal(b, '0xcreated');
    sinon.assert.calledOnce(createCryptoDepositAddress);
    sinon.assert.calledOnce(edit);
  });

  it('never mints addresses via PaymentIntent create', async function () {
    const settingsCache = { get: sinon.stub().returns(null) };
    const createCryptoDepositAddress = sinon.stub().resolves({ address: '0xdirect' });
    const paymentIntentsCreate = sinon.stub();
    const store = new DepositAddressStore({
      settingsCacheFacade: settingsCache,
      stripeFactory: sinon.stub().returns({
        createCryptoDepositAddress,
        paymentIntents: { create: paymentIntentsCreate },
      }),
      settingsHelpersFacade: { getActiveStripeKeys: () => ({ secretKey: 'sk_test' }) },
      settingsModel: { edit: sinon.stub().resolves() },
    });

    assert.equal(await store.getOrCreateAddress({ network: 'tempo' }), '0xdirect');
    sinon.assert.calledOnce(createCryptoDepositAddress);
    sinon.assert.notCalled(paymentIntentsCreate);
  });
});
