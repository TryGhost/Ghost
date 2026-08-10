const assert = require('node:assert/strict');
const sinon = require('sinon');
const DepositAddressStore = require('../../../../../core/server/services/machine-payments/stripe/deposit-address-store');

describe('Unit: server/services/machine-payments/deposit-address-store', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('returns a persisted address without creating a new one', async function () {
        const settingsCache = {get: sinon.stub().withArgs('machine_payments_deposit_address').returns('0xabc')};
        const stripeFactory = sinon.stub();
        const store = new DepositAddressStore({
            settingsCacheFacade: settingsCache,
            stripeFactory,
            settingsHelpersFacade: {getActiveStripeKeys: () => ({secretKey: 'sk_test'})},
            settingsModel: {edit: sinon.stub()}
        });

        const address = await store.getOrCreateAddress({network: 'tempo'});
        assert.equal(address, '0xabc');
        sinon.assert.notCalled(stripeFactory);
    });

    it('deduplicates in-flight creates and persists the result', async function () {
        const settingsCache = {get: sinon.stub().returns(null)};
        const edit = sinon.stub().resolves();
        const create = sinon.stub().resolves({
            id: 'pi_deposit',
            next_action: {
                crypto_display_details: {
                    deposit_addresses: {tempo: {address: '0xcreated'}}
                }
            }
        });
        const cancel = sinon.stub().resolves();
        const stripeFactory = sinon.stub().returns({
            paymentIntents: {create, cancel}
        });

        const store = new DepositAddressStore({
            settingsCacheFacade: settingsCache,
            stripeFactory,
            settingsHelpersFacade: {getActiveStripeKeys: () => ({secretKey: 'sk_test'})},
            settingsModel: {edit}
        });

        const [a, b] = await Promise.all([
            store.getOrCreateAddress({network: 'tempo'}),
            store.getOrCreateAddress({network: 'tempo'})
        ]);

        assert.equal(a, '0xcreated');
        assert.equal(b, '0xcreated');
        sinon.assert.calledOnce(create);
        sinon.assert.calledOnce(cancel);
        sinon.assert.calledOnce(edit);
    });
});
