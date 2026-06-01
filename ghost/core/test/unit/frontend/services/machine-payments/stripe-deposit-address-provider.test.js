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

    it('rebuilds the Stripe client when the active secret key changes', async function () {
        const getActiveStripeKeys = sinon.stub(settingsHelpers, 'getActiveStripeKeys');
        getActiveStripeKeys.onFirstCall().returns({
            publicKey: 'pk_test_active',
            secretKey: 'sk_test_active'
        });
        getActiveStripeKeys.onSecondCall().returns({
            publicKey: 'pk_test_rotated',
            secretKey: 'sk_test_rotated'
        });

        const createStripeClient = address => ({
            paymentIntents: {
                create: sinon.stub().resolves({
                    next_action: {
                        crypto_display_details: {
                            deposit_addresses: {
                                base: {
                                    address
                                }
                            }
                        }
                    }
                })
            }
        });
        const stripeFactory = sinon.stub();
        stripeFactory.onFirstCall().returns(createStripeClient('0x0000000000000000000000000000000000000001'));
        stripeFactory.onSecondCall().returns(createStripeClient('0x0000000000000000000000000000000000000002'));
        const provider = new StripeDepositAddressProvider({stripeFactory});

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
        assert.equal(secondAddress, '0x0000000000000000000000000000000000000002');
        assert.deepEqual(stripeFactory.firstCall.args, ['sk_test_active']);
        assert.deepEqual(stripeFactory.secondCall.args, ['sk_test_rotated']);
    });

    it('rejects cached deposit addresses from a previous Stripe secret key', async function () {
        const getActiveStripeKeys = sinon.stub(settingsHelpers, 'getActiveStripeKeys');
        getActiveStripeKeys.onFirstCall().returns({
            publicKey: 'pk_test_active',
            secretKey: 'sk_test_active'
        });
        getActiveStripeKeys.onSecondCall().returns({
            publicKey: 'pk_test_rotated',
            secretKey: 'sk_test_rotated'
        });

        const stripeFactory = sinon.stub().returns({
            paymentIntents: {
                create: sinon.stub().resolves({
                    next_action: {
                        crypto_display_details: {
                            deposit_addresses: {
                                base: {
                                    address: '0x0000000000000000000000000000000000000001'
                                }
                            }
                        }
                    }
                })
            }
        });
        const provider = new StripeDepositAddressProvider({stripeFactory});
        const paymentHeader = Buffer.from(JSON.stringify({
            payload: {
                authorization: {
                    to: '0x0000000000000000000000000000000000000001'
                }
            }
        })).toString('base64');

        await provider.getAddress({
            amount: 100,
            currency: 'USD',
            network: 'base'
        });

        await assert.rejects(provider.getAddress({
            amount: 100,
            currency: 'USD',
            network: 'base',
            paymentHeader
        }), {
            message: 'Invalid machine payment deposit address'
        });
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
