const assert = require('node:assert/strict');
const sinon = require('sinon');

const settingsHelpers = require('../../../../../core/server/services/settings-helpers');
const StripeDepositAddressProvider = require('../../../../../core/frontend/services/machine-payments/stripe-deposit-address-provider');

describe('Unit: frontend/services/machine-payments/stripe-deposit-address-provider', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('uses the active Stripe secret key when creating deposit addresses', async function () {
        sinon.stub(settingsHelpers, 'getActiveStripeKeys').returns({
            publicKey: 'pk_test_active',
            secretKey: 'sk_test_active'
        });

        const createPaymentIntent = sinon.stub().resolves({
            next_action: {
                crypto_display_details: {
                    deposit_addresses: {
                        base: {
                            address: '0x0000000000000000000000000000000000000001'
                        }
                    }
                }
            }
        });
        const stripeFactory = sinon.stub().returns({
            paymentIntents: {
                create: createPaymentIntent
            }
        });
        const provider = new StripeDepositAddressProvider({stripeFactory});

        const address = await provider.getAddress({
            amount: 100,
            currency: 'USD',
            network: 'base'
        });

        assert.equal(address, '0x0000000000000000000000000000000000000001');
        sinon.assert.calledOnceWithExactly(stripeFactory, 'sk_test_active');
        sinon.assert.calledOnce(settingsHelpers.getActiveStripeKeys);
    });

    it('reuses pending deposit addresses for the same amount, currency, and network', async function () {
        sinon.stub(settingsHelpers, 'getActiveStripeKeys').returns({
            publicKey: 'pk_test_active',
            secretKey: 'sk_test_active'
        });

        const createPaymentIntent = sinon.stub().resolves({
            next_action: {
                crypto_display_details: {
                    deposit_addresses: {
                        base: {
                            address: '0x0000000000000000000000000000000000000001'
                        }
                    }
                }
            }
        });
        const provider = new StripeDepositAddressProvider({
            stripeFactory: sinon.stub().returns({
                paymentIntents: {
                    create: createPaymentIntent
                }
            })
        });

        const firstAddress = await provider.getAddress({
            amount: 100,
            currency: 'USD',
            network: 'base'
        });
        const secondAddress = await provider.getAddress({
            amount: 100,
            currency: 'USD',
            network: 'base'
        });

        assert.equal(firstAddress, '0x0000000000000000000000000000000000000001');
        assert.equal(secondAddress, firstAddress);
        sinon.assert.calledOnce(createPaymentIntent);
    });

    it('throws when there are no active Stripe keys', async function () {
        sinon.stub(settingsHelpers, 'getActiveStripeKeys').returns(null);
        const provider = new StripeDepositAddressProvider({
            stripeFactory: sinon.stub()
        });

        await assert.rejects(provider.getAddress({
            amount: 100,
            currency: 'USD',
            network: 'base'
        }), {
            message: 'Stripe secret key is required for machine payments'
        });
    });
});
