const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {
    MppAdapter,
    TEMPO_USDC,
    TEMPO_DECIMALS,
    parseReceipt
} = require('../../../../../core/server/services/machine-payments/adapters/mpp-adapter');


function encodeReceipt(receipt) {
    return Buffer.from(JSON.stringify(receipt)).toString('base64url');
}

function createMppxFactory({
    tempoChargeConfig,
    stripeChargeConfig,
    createCalls,
    chargeCalls,
    payment
} = {}) {
    const captured = {
        tempoChargeConfig,
        stripeChargeConfig,
        createCalls: createCalls || [],
        chargeCalls: chargeCalls || []
    };

    const paymentResult = payment || {
        status: 402,
        challenge: new Response('', {
            status: 402,
            headers: {'WWW-Authenticate': 'Payment realm="mpp"'}
        })
    };

    const tempoHandler = options => {
        captured.chargeCalls.push({rail: 'tempo', options});
        return async () => paymentResult;
    };
    const stripeHandler = options => {
        captured.chargeCalls.push({rail: 'stripe', options});
        return async () => paymentResult;
    };

    return {
        captured,
        factory: () => ({
            Store: {
                memory: () => ({
                    tryClaim: async () => true
                })
            },
            tempo: {
                charge(config) {
                    captured.tempoChargeConfig = config;
                    return config;
                }
            },
            stripe: {
                charge(config) {
                    captured.stripeChargeConfig = config;
                    return config;
                }
            },
            Mppx: {
                create(options) {
                    captured.createCalls.push(options);
                    return {
                        tempo: {charge: tempoHandler},
                        stripe: {charge: stripeHandler},
                        compose: (...entries) => {
                            captured.composeEntries = entries;
                            return async () => paymentResult;
                        }
                    };
                }
            }
        })
    };
}

describe('Unit: server/services/machine-payments/adapters', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('exports the Tempo USDC contract address and 6-decimal precision', function () {
        assert.equal(TEMPO_USDC, '0x20c000000000000000000000b9537d11c60e8b50');
        assert.equal(TEMPO_DECIMALS, 6);
    });

    it('parses a Payment-Receipt header from withReceipt', function () {
        const receipt = {method: 'tempo', reference: '0xtxhash'};
        assert.deepEqual(parseReceipt(encodeReceipt(receipt)), receipt);
    });

    describe('MppAdapter', function () {
        const terms = {amount: 100, currency: 'USD'};
        const request = new Request('http://example.com/paid-post.md', {
            headers: {authorization: 'Payment abc'}
        });

        it('fulfills from withReceipt and uses Tempo 6 decimals', async function () {
            const receipt = {method: 'tempo', reference: '0xtxhash'};
            const {factory, captured} = createMppxFactory({
                payment: {
                    status: 200,
                    withReceipt(response) {
                        const headers = new Headers(response.headers);
                        headers.set('payment-receipt', encodeReceipt(receipt));
                        return new Response('', {status: 200, headers});
                    }
                }
            });

            const adapter = new MppAdapter({
                depositAddressStore: {
                    getOrCreateAddress: async () => '0xrecipient'
                },
                settingsCache: {get: () => null},
                stripeClientFactory: () => null,
                mppxFactory: factory
            });

            const fulfillment = await adapter.fulfill(request, terms);

            assert.equal(fulfillment.protocol, 'mpp');
            assert.equal(fulfillment.method, 'tempo');
            assert.equal(fulfillment.reference, '0xtxhash');
            assert.equal(captured.tempoChargeConfig.decimals, 6);
            assert.equal(captured.chargeCalls[0].options.scope, '/paid-post.md');
            assert.ok(captured.tempoChargeConfig.store);
        });

        it('reuses a single Mppx instance across requests', async function () {
            const {factory, captured} = createMppxFactory({
                payment: {
                    status: 200,
                    withReceipt(response) {
                        const headers = new Headers(response.headers);
                        headers.set('payment-receipt', encodeReceipt({method: 'tempo', reference: '0xtx'}));
                        return new Response('', {status: 200, headers});
                    }
                }
            });
            const adapter = new MppAdapter({
                depositAddressStore: {
                    getOrCreateAddress: async () => '0xrecipient'
                },
                settingsCache: {get: () => null},
                stripeClientFactory: () => null,
                mppxFactory: factory
            });

            await adapter.fulfill(request, terms);
            await adapter.fulfill(request, terms);

            assert.equal(captured.createCalls.length, 1);
        });

        it('composes Tempo and SPT when both rails are available', async function () {
            const {factory, captured} = createMppxFactory();
            const adapter = new MppAdapter({
                depositAddressStore: {
                    getOrCreateAddress: async () => '0xrecipient'
                },
                settingsCache: {
                    get(key) {
                        if (key === 'machine_payments_stripe_profile_id') {
                            return 'profile_123';
                        }
                        if (key === 'machine_payments_secret') {
                            return 'a'.repeat(32);
                        }
                        return null;
                    }
                },
                stripeClientFactory: () => ({id: 'stripe'}),
                mppxFactory: factory
            });

            await adapter.challenge(request, terms);

            assert.equal(captured.createCalls[0].methods.length, 2);
            assert.deepEqual(captured.composeEntries, [
                ['tempo/charge', {amount: '1.00', recipient: '0xrecipient', scope: '/paid-post.md'}],
                ['stripe/charge', {amount: '1.00', currency: 'usd', scope: '/paid-post.md'}]
            ]);
        });

        it('still offers SPT when deposit-address creation fails', async function () {
            sinon.stub(logging, 'warn');
            const {factory, captured} = createMppxFactory({
                payment: {
                    status: 402,
                    challenge: new Response('', {status: 402})
                }
            });
            const adapter = new MppAdapter({
                depositAddressStore: {
                    getOrCreateAddress: async () => {
                        throw new Error('crypto not approved');
                    }
                },
                settingsCache: {
                    get(key) {
                        if (key === 'machine_payments_stripe_profile_id') {
                            return 'profile_123';
                        }
                        if (key === 'machine_payments_secret') {
                            return 'a'.repeat(32);
                        }
                        return null;
                    }
                },
                stripeClientFactory: () => ({id: 'stripe'}),
                mppxFactory: factory
            });

            const challenge = await adapter.challenge(new Request('http://example.com/paid.md'), terms);
            assert.equal(challenge.status, 402);
            assert.equal(captured.tempoChargeConfig, undefined);
            assert.equal(captured.stripeChargeConfig.decimals, 2);
            assert.equal(captured.createCalls[0].methods.length, 1);
        });

        it('rejects a successful payment that has no withReceipt settlement reference', async function () {
            const {factory} = createMppxFactory({
                payment: {
                    status: 200,
                    withReceipt() {
                        return new Response('', {status: 200});
                    }
                }
            });
            const adapter = new MppAdapter({
                depositAddressStore: {
                    getOrCreateAddress: async () => '0xrecipient'
                },
                settingsCache: {get: () => null},
                stripeClientFactory: () => null,
                mppxFactory: factory
            });

            await assert.rejects(
                () => adapter.fulfill(request, terms),
                /stable settlement reference/
            );
        });

        it('rejects a successful payment that has no settlement method', async function () {
            const {factory} = createMppxFactory({
                payment: {
                    status: 200,
                    withReceipt(response) {
                        const headers = new Headers(response.headers);
                        headers.set('payment-receipt', encodeReceipt({reference: '0xtx'}));
                        return new Response('', {status: 200, headers});
                    }
                }
            });
            const adapter = new MppAdapter({
                depositAddressStore: {
                    getOrCreateAddress: async () => '0xrecipient'
                },
                settingsCache: {get: () => null},
                stripeClientFactory: () => null,
                mppxFactory: factory
            });

            await assert.rejects(
                () => adapter.fulfill(request, terms),
                /settlement method/
            );
        });
    });
});
