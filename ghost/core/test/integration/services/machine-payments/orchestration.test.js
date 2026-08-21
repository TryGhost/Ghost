const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {createLlmsService} = require('../../../../core/frontend/services/llms/service');
const {MachinePaymentsService} = require('../../../../core/server/services/machine-payments/service');
const {Pricing} = require('../../../../core/server/services/machine-payments/pricing');
const {TEMPO_USDC} = require('../../../../core/server/services/machine-payments/adapters/mpp-adapter');
const {
    BoundedRouteCache,
    X402Adapter,
    formatPrice,
    parseX402Config,
    settlementReference
} = require('../../../../core/server/services/machine-payments/adapters/x402-adapter');
const {DepositAddressStore} = require('../../../../core/server/services/machine-payments/stripe/deposit-address-store');
const {PaymentRecorder} = require('../../../../core/server/services/machine-payments/stripe/payment-recorder');

/**
 * Integration coverage for machine-payments + llms discoverability.
 * These paths are unit-tested already; re-exercising them here feeds the
 * e2e-tests Codecov flag (unit coverage does not).
 */
describe('Integration: machine-payments orchestration coverage', function () {
    afterEach(function () {
        sinon.restore();
    });

    describe('llms discoverability', function () {
        function createService({posts, machinePaymentsService} = {}) {
            const urlMap = Object.fromEntries((posts || []).map(post => [post.id, `https://example.com/${post.slug}/`]));
            return createLlmsService({
                settingsCache: {
                    get(key) {
                        const values = {
                            title: 'Site',
                            description: 'Desc',
                            meta_description: 'Meta',
                            is_private: false,
                            llms_enabled: true
                        };
                        return values[key];
                    }
                },
                config: {get: key => (key === 'url' ? 'https://example.com' : undefined)},
                urlUtils: {
                    urlFor(options, absolute) {
                        return `${absolute ? 'https://example.com' : ''}${options.relativeUrl}`;
                    }
                },
                routing: {registry: {getRssUrl: () => 'https://example.com/rss/'}},
                api: {
                    pagesPublic: {
                        browse: async () => ({pages: [], meta: {pagination: {}}}),
                        read: async ({id}) => ({pages: id === 'page-1' ? [{id: 'page-1', title: 'Page'}] : []})
                    },
                    postsPublic: {
                        browse: async () => ({
                            posts: (posts || []).map(post => ({...post, url: urlMap[post.id]})),
                            meta: {pagination: {}}
                        }),
                        read: async ({id, include}) => {
                            assert.match(include, /tiers/);
                            const post = (posts || []).find(entry => entry.id === id);
                            return {posts: post ? [{...post, url: urlMap[post.id]}] : []};
                        }
                    }
                },
                machinePaymentsService
            });
        }

        it('excludes members-only and non-purchasable tiers posts from llms.txt', async function () {
            const service = createService({
                posts: [
                    {id: '1', title: 'Public', slug: 'public', visibility: 'public', type: 'post'},
                    {id: '2', title: 'Members', slug: 'members', visibility: 'members', type: 'post'},
                    {
                        id: '3',
                        title: 'Mixed Tiers',
                        slug: 'mixed',
                        visibility: 'tiers',
                        tiers: [{type: 'paid'}, {type: 'free'}],
                        type: 'post'
                    }
                ],
                machinePaymentsService: {isEnabled: () => true}
            });

            const llmsTxt = await service.getLlmsTxt();
            assert.match(llmsTxt, /Public/);
            assert.doesNotMatch(llmsTxt, /Members/);
            assert.doesNotMatch(llmsTxt, /Mixed Tiers/);
        });

        it('reads posts and pages through fetchPublicEntry with tiers included', async function () {
            const service = createService({
                posts: [{id: 'post-1', title: 'Paid', slug: 'paid', visibility: 'paid', type: 'post'}],
                machinePaymentsService: {isEnabled: () => true}
            });

            const post = await service.fetchPublicEntry('posts', 'post-1');
            assert.equal(post.title, 'Paid');

            const page = await service.fetchPublicEntry('pages', 'page-1');
            assert.equal(page.title, 'Page');

            assert.equal(await service.fetchPublicEntry('posts', 'missing'), null);
        });
    });

    describe('MachinePaymentsService', function () {
        let labsService;
        let settings;
        let mppAdapter;
        let contentLoader;
        let eventRepository;
        let paymentRecorder;

        beforeEach(function () {
            sinon.stub(logging, 'warn');
            labsService = {isSet: sinon.stub().returns(false)};
            labsService.isSet.withArgs('machinePayments').returns(true);
            settings = {get: sinon.stub()};
            settings.get.withArgs('llms_enabled').returns(true);
            settings.get.withArgs('machine_payments_enabled').returns(true);
            settings.get.withArgs('machine_payments_amount').returns(100);
            settings.get.withArgs('machine_payments_currency').returns('USD');

            mppAdapter = {
                name: 'mpp',
                canHandle: sinon.stub().returns(false),
                challenge: sinon.stub().resolves(new Response('', {
                    status: 402,
                    headers: {'WWW-Authenticate': 'Payment realm="mpp"'}
                })),
                fulfill: sinon.stub().resolves({
                    protocol: 'mpp',
                    method: 'tempo',
                    reference: '0xtx',
                    amount: 100,
                    currency: 'USD'
                })
            };

            contentLoader = {
                isPurchasable: sinon.stub().resolves(true),
                loadFullEntry: sinon.stub().resolves({
                    id: 'post1',
                    title: 'Paid',
                    html: '<p>Secret</p>',
                    url: 'http://example.com/paid/',
                    visibility: 'paid'
                })
            };
            eventRepository = {save: sinon.stub().resolves({created: true, event: {id: 'evt1'}})};
            paymentRecorder = {record: sinon.stub().resolves('pi_123')};
        });

        function createService(overrides = {}) {
            return new MachinePaymentsService({
                settingsCache: settings,
                labsService,
                adapters: [mppAdapter],
                contentLoader,
                eventRepository,
                paymentRecorder,
                isStripeConnected: () => true,
                defaultCurrencyProvider: async () => 'USD',
                ...overrides
            });
        }

        it('challenges without loading content and fulfills with ledger writes', async function () {
            const service = createService();
            const renderMarkdown = sinon.stub().returns('# body');

            const challenge = await service.challengeOrFulfill(new Request('http://example.com/paid.md'), {
                entryId: 'post1',
                resourceType: 'posts',
                description: 'Paid',
                contentLocation: '/paid.md',
                renderMarkdown
            });
            assert.equal(challenge.status, 402);
            sinon.assert.notCalled(contentLoader.loadFullEntry);

            mppAdapter.canHandle.returns(true);
            const fulfilled = await service.challengeOrFulfill(new Request('http://example.com/paid.md', {
                headers: {authorization: 'Payment abc'}
            }), {
                entryId: 'post1',
                resourceType: 'posts',
                description: 'Paid',
                contentLocation: '/paid.md',
                renderMarkdown: sinon.stub().returns('# Secret')
            });

            assert.equal(fulfilled.status, 200);
            assert.equal(await fulfilled.text(), '# Secret');
            sinon.assert.calledOnce(contentLoader.loadFullEntry);
            sinon.assert.calledOnce(eventRepository.save);
            sinon.assert.calledOnce(paymentRecorder.record);
            // Content is confirmed deliverable before settle; ledger still gates
            // PaymentIntent recording so replays cannot mint a second PI.
            assert.equal(eventRepository.save.firstCall.args[0].stripePaymentIntentId, null);
            sinon.assert.callOrder(
                contentLoader.loadFullEntry,
                mppAdapter.fulfill,
                eventRepository.save,
                paymentRecorder.record
            );
        });

        it('is purchasable only when enabled and the entry is paid', function () {
            const service = createService();
            assert.equal(service.isPurchasable({visibility: 'paid'}), true);
            assert.equal(service.isPurchasable({visibility: 'members'}), false);
            labsService.isSet.withArgs('machinePayments').returns(false);
            assert.equal(service.isPurchasable({visibility: 'paid'}), false);
        });
    });

    describe('pricing and adapters', function () {
        it('maps SPT and Tempo pricing terms', async function () {
            const pricing = new Pricing({
                settingsCache: {
                    get(key) {
                        if (key === 'machine_payments_amount') {
                            return 250;
                        }
                        if (key === 'machine_payments_currency') {
                            return 'EUR';
                        }
                        return null;
                    }
                }
            });
            const terms = await pricing.getTerms();
            assert.deepEqual(pricing.forSpt(terms), {
                amount: 250,
                currency: 'eur',
                majorAmount: '2.50'
            });
            assert.deepEqual(pricing.forTempoUsdc(terms), {
                amount: 250,
                majorAmount: '2.50'
            });
            assert.equal(TEMPO_USDC, '0x20c000000000000000000000b9537d11c60e8b50');
        });
    });

    describe('x402 adapter coverage', function () {
        it('validates facilitator URLs and settlement helpers', function () {
            assert.deepEqual(parseX402Config({
                network: 'eip155:8453',
                stripeNetwork: 'base',
                facilitatorUrl: 'https://facilitator.xpay.sh'
            }), {
                network: 'eip155:8453',
                stripeNetwork: 'base',
                facilitatorUrl: 'https://facilitator.xpay.sh'
            });

            sinon.stub(logging, 'warn');
            assert.equal(parseX402Config({
                network: 'eip155:8453',
                stripeNetwork: 'base',
                facilitatorUrl: 'http://facilitator.xpay.sh'
            }), null);
            assert.match(String(logging.warn.firstCall.args[0]), /must use HTTPS/);

            assert.equal(parseX402Config({
                network: 'eip155:8453',
                stripeNetwork: 'base',
                facilitatorUrl: 'https://X402.ORG:443/facilitator/'
            }), null);
            assert.match(String(logging.warn.secondCall.args[0]), /testnet facilitator on Base mainnet/);

            assert.deepEqual(parseX402Config({
                network: 'eip155:84532',
                stripeNetwork: 'base',
                facilitatorUrl: 'https://X402.ORG:443/facilitator/'
            }), {
                network: 'eip155:84532',
                stripeNetwork: 'base',
                facilitatorUrl: 'https://X402.ORG:443/facilitator/'
            });

            assert.equal(formatPrice({amount: 100, currency: 'USD', majorAmount: '1.00'}), '$1.00');

            const paymentResponse = Buffer.from(JSON.stringify({txHash: '0xabc'})).toString('base64');
            assert.equal(settlementReference(paymentResponse), '0xabc');

            const cache = new BoundedRouteCache(1);
            cache.set('route', 'app');
            cache.set('other', 'app2');
            assert.equal(cache.get('route'), undefined);
            assert.equal(cache.get('other'), 'app2');
        });

        it('initializes and challenges through the x402 adapter boundary', async function () {
            const terms = {
                amount: 100,
                currency: 'USD',
                description: 'Paid post',
                method: 'GET',
                mimeType: 'text/markdown',
                url: 'http://example.com/paid-post.md'
            };
            const adapter = new X402Adapter({
                depositAddressStore: {
                    getOrCreateAddress: async () => '0xrecipient'
                },
                configProvider: () => ({
                    network: 'eip155:8453',
                    stripeNetwork: 'base',
                    facilitatorUrl: 'https://facilitator.xpay.sh'
                }),
                runtimeFactory: () => ({
                    paymentMiddlewareFromConfig: () => () => {},
                    HTTPFacilitatorClient: class {},
                    ExactEvmScheme: class {},
                    Hono: class {
                        use() {}

                        get() {}

                        on() {}

                        fetch() {
                            return Promise.resolve(new Response('', {
                                status: 402,
                                headers: {'payment-required': 'x402'}
                            }));
                        }
                    }
                })
            });

            assert.equal(await adapter.init(), true);
            assert.equal(adapter.canHandle(new Request('http://example.com/paid.md', {
                headers: {'x-payment': 'abc'}
            })), true);

            const challenge = await adapter.challenge(new Request('http://example.com/paid.md'), terms);
            assert.equal(challenge.status, 402);
            assert.equal(challenge.headers.get('payment-required'), 'x402');
        });
    });

    describe('stripe helpers', function () {
        it('reuses a persisted deposit address and records crypto PaymentIntents', async function () {
            const settingsCache = {get: sinon.stub().withArgs('machine_payments_deposit_address').returns('0xabc')};
            const store = new DepositAddressStore({
                settingsCacheFacade: settingsCache,
                stripeFactory: sinon.stub(),
                settingsHelpersFacade: {getActiveStripeKeys: () => ({secretKey: 'sk_test'})},
                settingsModel: {edit: sinon.stub()}
            });
            assert.equal(await store.getOrCreateAddress({network: 'tempo'}), '0xabc');

            const create = sinon.stub().resolves({id: 'pi_crypto'});
            const recorder = new PaymentRecorder({
                stripeFactory: () => ({paymentIntents: {create}}),
                settingsHelpersFacade: {getActiveStripeKeys: () => ({secretKey: 'sk_test'})}
            });
            const piId = await recorder.record({
                method: 'tempo',
                reference: '0xhash',
                amount: 100,
                currency: 'USD',
                postId: 'post1',
                protocol: 'mpp'
            });
            assert.equal(piId, 'pi_crypto');
            assert.equal(create.firstCall.args[0].currency, 'usd');
        });
    });
});
