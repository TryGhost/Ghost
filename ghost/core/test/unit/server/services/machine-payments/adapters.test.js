const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {
  BoundedRouteCache,
  X402Adapter,
  formatPrice,
  parseX402Config,
  settlementReference,
} = require('../../../../../core/server/services/machine-payments/adapters/x402-adapter');
const {
  MppAdapter,
  TEMPO_USDC,
  TEMPO_DECIMALS,
  parseReceipt,
} = require('../../../../../core/server/services/machine-payments/adapters/mpp-adapter');

function encodeReceipt(receipt) {
  return Buffer.from(JSON.stringify(receipt)).toString('base64url');
}

function createX402Adapter(overrides = {}) {
  return new X402Adapter({
    depositAddressStore: {
      getOrCreateAddress: async () => '0xrecipient',
    },
    facilitatorClient: {},
    configProvider: () => ({
      network: 'eip155:8453',
      stripeNetwork: 'base',
      facilitatorUrl: 'https://facilitator.xpay.sh',
    }),
    ...overrides,
  });
}

async function initX402Adapter(overrides = {}) {
  const adapter = createX402Adapter(overrides);
  await adapter.init();
  return adapter;
}

function createX402RuntimeFactory({ onHonoCreate } = {}) {
  let honoCreateCount = 0;

  return {
    get honoCreateCount() {
      return honoCreateCount;
    },
    factory: () => ({
      paymentMiddlewareFromConfig: () => () => {},
      HTTPFacilitatorClient: class {},
      ExactEvmScheme: class {},
      Hono: class {
        constructor() {
          honoCreateCount += 1;
          onHonoCreate?.(honoCreateCount);
        }

        use() {}

        get() {}

        on() {}

        fetch() {
          return Promise.resolve(new Response('', { status: 402 }));
        }
      },
    }),
  };
}

function createMppxFactory({
  tempoChargeConfig,
  stripeChargeConfig,
  createCalls,
  chargeCalls,
  payment,
} = {}) {
  const captured = {
    tempoChargeConfig,
    stripeChargeConfig,
    createCalls: createCalls || [],
    chargeCalls: chargeCalls || [],
  };

  const paymentResult = payment || {
    status: 402,
    challenge: new Response('', {
      status: 402,
      headers: { 'WWW-Authenticate': 'Payment realm="mpp"' },
    }),
  };

  const tempoHandler = (options) => {
    captured.chargeCalls.push({ rail: 'tempo', options });
    return async () => paymentResult;
  };
  const stripeHandler = (options) => {
    captured.chargeCalls.push({ rail: 'stripe', options });
    return async () => paymentResult;
  };

  return {
    captured,
    factory: () => ({
      Store: {
        memory: () => ({
          tryClaim: async () => true,
        }),
      },
      tempo: {
        charge(config) {
          captured.tempoChargeConfig = config;
          return config;
        },
      },
      stripe: {
        charge(config) {
          captured.stripeChargeConfig = config;
          return config;
        },
      },
      Mppx: {
        create(options) {
          captured.createCalls.push(options);
          return {
            tempo: { charge: tempoHandler },
            stripe: { charge: stripeHandler },
            compose: (...entries) => {
              captured.composeEntries = entries;
              return async () => paymentResult;
            },
          };
        },
      },
    }),
  };
}

describe('Unit: server/services/machine-payments/adapters', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('formats USD x402 prices with a dollar prefix', function () {
    assert.equal(formatPrice({ amount: 100, currency: 'USD' }), '$1.00');
  });

  it('rejects non-USD x402 prices', function () {
    assert.throws(() => formatPrice({ amount: 250, currency: 'EUR' }), /USD only/);
  });

  it('exports the Tempo USDC contract address and 6-decimal precision', function () {
    assert.equal(TEMPO_USDC, '0x20c000000000000000000000b9537d11c60e8b50');
    assert.equal(TEMPO_DECIMALS, 6);
  });

  it('extracts an x402 settlement hash instead of storing the whole header', function () {
    const header = Buffer.from(
      JSON.stringify({
        success: true,
        transaction: '0xabc123',
        network: 'base',
        payer: '0xpayer',
      }),
    ).toString('base64');

    assert.equal(settlementReference(header), '0xabc123');
    assert.equal(settlementReference('x'.repeat(300)).length, 64);
  });

  it('prefers txHash and nested settlement.transaction for x402 references', function () {
    const txHashHeader = Buffer.from(JSON.stringify({ txHash: '0xtxhash' })).toString('base64');
    const nestedHeader = Buffer.from(
      JSON.stringify({
        settlement: { transaction: '0xnested' },
      }),
    ).toString('base64');

    assert.equal(settlementReference(txHashHeader), '0xtxhash');
    assert.equal(settlementReference(nestedHeader), '0xnested');
  });

  it('hashes malformed x402 settlement payloads instead of trusting invalid fields', function () {
    const malformed = Buffer.from(JSON.stringify({ transaction: 12345 })).toString('base64');

    assert.equal(settlementReference(malformed).length, 64);
    assert.notEqual(settlementReference(malformed), '12345');
  });

  it('accepts supported x402 config values', function () {
    assert.deepEqual(
      parseX402Config({
        network: 'eip155:8453',
        stripeNetwork: 'base',
        facilitatorUrl: 'https://facilitator.xpay.sh',
      }),
      {
        network: 'eip155:8453',
        stripeNetwork: 'base',
        facilitatorUrl: 'https://facilitator.xpay.sh',
      },
    );
  });

  it('rejects unsupported x402 network and mainnet x402.org facilitator pairings', function () {
    sinon.stub(logging, 'warn');

    assert.equal(
      parseX402Config({
        network: 'eip155:1',
        stripeNetwork: 'base',
        facilitatorUrl: 'https://facilitator.xpay.sh',
      }),
      null,
    );

    assert.equal(
      parseX402Config({
        network: 'eip155:8453',
        stripeNetwork: 'base',
        facilitatorUrl: 'https://x402.org/facilitator',
      }),
      null,
    );

    assert.match(String(logging.warn.firstCall.args[0]), /must be eip155:8453 or eip155:84532/);
    assert.match(String(logging.warn.secondCall.args[0]), /testnet facilitator on Base mainnet/);
  });

  it('rejects HTTP facilitator URLs and normalized mainnet x402.org variants', function () {
    sinon.stub(logging, 'warn');

    assert.equal(
      parseX402Config({
        network: 'eip155:8453',
        stripeNetwork: 'base',
        facilitatorUrl: 'http://facilitator.xpay.sh',
      }),
      null,
    );
    assert.match(String(logging.warn.firstCall.args[0]), /must use HTTPS/);

    for (const facilitatorUrl of [
      'https://X402.ORG/facilitator',
      'https://x402.org:443/facilitator/',
      'https://X402.ORG:443/facilitator/',
    ]) {
      assert.equal(
        parseX402Config({
          network: 'eip155:8453',
          stripeNetwork: 'base',
          facilitatorUrl,
        }),
        null,
        `expected mainnet rejection for ${facilitatorUrl}`,
      );
    }

    assert.match(String(logging.warn.secondCall.args[0]), /testnet facilitator on Base mainnet/);
  });

  it('accepts normalized x402.org facilitator URLs on Base Sepolia', function () {
    for (const facilitatorUrl of [
      'https://x402.org/facilitator',
      'https://X402.ORG/facilitator',
      'https://x402.org:443/facilitator/',
    ]) {
      assert.deepEqual(
        parseX402Config({
          network: 'eip155:84532',
          stripeNetwork: 'base',
          facilitatorUrl,
        }),
        {
          network: 'eip155:84532',
          stripeNetwork: 'base',
          facilitatorUrl,
        },
        `expected testnet acceptance for ${facilitatorUrl}`,
      );
    }
  });

  it('evicts the oldest cached route when the bounded cache is full', function () {
    const cache = new BoundedRouteCache(2);

    cache.set('a', 1);
    cache.set('b', 2);
    assert.equal(cache.size, 2);

    cache.get('a');
    cache.set('c', 3);

    assert.equal(cache.size, 2);
    assert.equal(cache.get('a'), 1);
    assert.equal(cache.get('b'), undefined);
    assert.equal(cache.get('c'), 3);
  });

  describe('X402Adapter', function () {
    const terms = {
      amount: 100,
      currency: 'USD',
      description: 'Paid post',
      method: 'GET',
      mimeType: 'text/markdown',
      url: 'http://example.com/paid-post.md',
    };

    it('detects x-payment and payment-signature credentials', function () {
      const adapter = new X402Adapter({
        depositAddressStore: {
          getOrCreateAddress: async () => '0xrecipient',
        },
      });

      assert.equal(adapter.canHandle(new Request('http://example.com/paid.md')), false);
      assert.equal(
        adapter.canHandle(
          new Request('http://example.com/paid.md', {
            headers: { 'x-payment': 'abc' },
          }),
        ),
        true,
      );
      assert.equal(
        adapter.canHandle(
          new Request('http://example.com/paid.md', {
            headers: { 'payment-signature': 'abc' },
          }),
        ),
        true,
      );
    });

    it('initializes runtime modules and facilitator at boot', async function () {
      let runtimeLoads = 0;
      const adapter = createX402Adapter({
        runtimeFactory: () => {
          runtimeLoads += 1;
          return createX402RuntimeFactory().factory();
        },
      });

      assert.equal(await adapter.init(), true);
      assert.equal(adapter.isReady, true);
      assert.equal(runtimeLoads, 1);

      await adapter.challenge(new Request('http://example.com/a.md'), terms);
      assert.equal(runtimeLoads, 1);
    });

    it('skips registration when x402 config is invalid', async function () {
      sinon.stub(logging, 'warn');
      const adapter = new X402Adapter({
        depositAddressStore: {
          getOrCreateAddress: async () => '0xrecipient',
        },
        facilitatorClient: {},
        configProvider: () => ({
          network: 'eip155:8453',
          stripeNetwork: 'tempo',
          facilitatorUrl: 'https://facilitator.xpay.sh',
        }),
        runtimeFactory: createX402RuntimeFactory().factory,
      });

      assert.equal(await adapter.init(), false);
      assert.equal(adapter.isReady, false);
      assert.equal(await adapter.challenge(new Request('http://example.com/paid.md'), terms), null);
    });

    it('reuses cached route apps and evicts stale routes when the cache is full', async function () {
      const runtime = createX402RuntimeFactory();
      const adapter = await initX402Adapter({
        maxCachedApps: 2,
        runtimeFactory: runtime.factory,
      });

      await adapter.challenge(new Request('http://example.com/a.md'), terms);
      await adapter.challenge(new Request('http://example.com/b.md'), {
        ...terms,
        url: 'http://example.com/b.md',
      });
      await adapter.challenge(new Request('http://example.com/c.md'), {
        ...terms,
        url: 'http://example.com/c.md',
      });
      await adapter.challenge(new Request('http://example.com/a.md'), terms);

      assert.equal(runtime.honoCreateCount, 4);
    });

    it('logs and returns null when the x402 middleware does not produce a 402', async function () {
      sinon.stub(logging, 'warn');
      const adapter = await initX402Adapter({
        runtimeFactory: () => ({
          paymentMiddlewareFromConfig: () => () => {},
          HTTPFacilitatorClient: class {},
          ExactEvmScheme: class {},
          Hono: class {
            use() {}

            get() {}

            on() {}

            fetch() {
              return Promise.resolve(new Response('', { status: 500 }));
            }
          },
        }),
      });

      const challenge = await adapter.challenge(new Request('http://example.com/paid.md'), terms);

      assert.equal(challenge, null);
      assert.match(String(logging.warn.firstCall.args[0]), /x402 challenge unavailable/);
    });

    it('fulfills with a validated settlement reference header', async function () {
      const paymentResponse = Buffer.from(
        JSON.stringify({
          transaction: '0xfulfilled',
        }),
      ).toString('base64');

      const adapter = await initX402Adapter({
        runtimeFactory: () => ({
          paymentMiddlewareFromConfig: () => () => {},
          HTTPFacilitatorClient: class {},
          ExactEvmScheme: class {},
          Hono: class {
            use() {}

            get() {}

            on() {}

            fetch() {
              return Promise.resolve(
                new Response('', {
                  status: 200,
                  headers: { 'payment-response': paymentResponse },
                }),
              );
            }
          },
        }),
      });

      const fulfillment = await adapter.fulfill(
        new Request('http://example.com/paid.md', {
          headers: { 'x-payment': 'abc' },
        }),
        terms,
      );

      assert.equal(fulfillment.protocol, 'x402');
      assert.equal(fulfillment.method, 'base');
      assert.equal(fulfillment.reference, '0xfulfilled');
      assert.equal(fulfillment.receiptHeaders['payment-response'], paymentResponse);
    });

    it('accepts any successful 2xx fulfill response', async function () {
      const paymentResponse = Buffer.from(
        JSON.stringify({
          transaction: '0xfulfilled',
        }),
      ).toString('base64');

      const adapter = await initX402Adapter({
        runtimeFactory: () => ({
          paymentMiddlewareFromConfig: () => () => {},
          HTTPFacilitatorClient: class {},
          ExactEvmScheme: class {},
          Hono: class {
            use() {}

            get() {}

            on() {}

            fetch() {
              return Promise.resolve(
                new Response(null, {
                  status: 204,
                  headers: { 'payment-response': paymentResponse },
                }),
              );
            }
          },
        }),
      });

      const fulfillment = await adapter.fulfill(
        new Request('http://example.com/paid.md', {
          headers: { 'x-payment': 'abc' },
        }),
        terms,
      );

      assert.equal(fulfillment.reference, '0xfulfilled');
    });

    it('rejects non-2xx fulfill responses', async function () {
      const adapter = await initX402Adapter({
        runtimeFactory: () => ({
          paymentMiddlewareFromConfig: () => () => {},
          HTTPFacilitatorClient: class {},
          ExactEvmScheme: class {},
          Hono: class {
            use() {}

            get() {}

            on() {}

            fetch() {
              return Promise.resolve(new Response('', { status: 401 }));
            }
          },
        }),
      });

      await assert.rejects(
        () =>
          adapter.fulfill(
            new Request('http://example.com/paid.md', {
              headers: { 'x-payment': 'abc' },
            }),
            terms,
          ),
        /credential rejected/,
      );
    });
  });

  it('parses a Payment-Receipt header from withReceipt', function () {
    const receipt = { method: 'tempo', reference: '0xtxhash' };
    assert.deepEqual(parseReceipt(encodeReceipt(receipt)), receipt);
  });

  describe('MppAdapter', function () {
    const terms = { amount: 100, currency: 'USD' };
    const request = new Request('http://example.com/paid-post.md', {
      headers: { authorization: 'Payment abc' },
    });

    it('fulfills from withReceipt and uses Tempo 6 decimals', async function () {
      const receipt = { method: 'tempo', reference: '0xtxhash' };
      const { factory, captured } = createMppxFactory({
        payment: {
          status: 200,
          withReceipt(response) {
            const headers = new Headers(response.headers);
            headers.set('payment-receipt', encodeReceipt(receipt));
            return new Response('', { status: 200, headers });
          },
        },
      });

      const adapter = new MppAdapter({
        depositAddressStore: {
          getOrCreateAddress: async () => '0xrecipient',
        },
        settingsCache: { get: () => null },
        stripeClientFactory: () => null,
        mppxFactory: factory,
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
      const { factory, captured } = createMppxFactory({
        payment: {
          status: 200,
          withReceipt(response) {
            const headers = new Headers(response.headers);
            headers.set('payment-receipt', encodeReceipt({ method: 'tempo', reference: '0xtx' }));
            return new Response('', { status: 200, headers });
          },
        },
      });
      const adapter = new MppAdapter({
        depositAddressStore: {
          getOrCreateAddress: async () => '0xrecipient',
        },
        settingsCache: { get: () => null },
        stripeClientFactory: () => null,
        mppxFactory: factory,
      });

      await adapter.fulfill(request, terms);
      await adapter.fulfill(request, terms);

      assert.equal(captured.createCalls.length, 1);
    });

    it('composes Tempo and SPT when both rails are available', async function () {
      const { factory, captured } = createMppxFactory();
      const adapter = new MppAdapter({
        depositAddressStore: {
          getOrCreateAddress: async () => '0xrecipient',
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
          },
        },
        stripeClientFactory: () => ({ id: 'stripe' }),
        mppxFactory: factory,
      });

      await adapter.challenge(request, terms);

      assert.equal(captured.createCalls[0].methods.length, 2);
      assert.deepEqual(captured.composeEntries, [
        ['tempo/charge', { amount: '1.00', recipient: '0xrecipient', scope: '/paid-post.md' }],
        ['stripe/charge', { amount: '1.00', currency: 'usd', scope: '/paid-post.md' }],
      ]);
    });

    it('still offers SPT when deposit-address creation fails', async function () {
      sinon.stub(logging, 'warn');
      const { factory, captured } = createMppxFactory({
        payment: {
          status: 402,
          challenge: new Response('', { status: 402 }),
        },
      });
      const adapter = new MppAdapter({
        depositAddressStore: {
          getOrCreateAddress: async () => {
            throw new Error('crypto not approved');
          },
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
          },
        },
        stripeClientFactory: () => ({ id: 'stripe' }),
        mppxFactory: factory,
      });

      const challenge = await adapter.challenge(new Request('http://example.com/paid.md'), terms);
      assert.equal(challenge.status, 402);
      assert.equal(captured.tempoChargeConfig, undefined);
      assert.equal(captured.stripeChargeConfig.decimals, 2);
      assert.equal(captured.createCalls[0].methods.length, 1);
    });

    it('rejects a successful payment that has no withReceipt settlement reference', async function () {
      const { factory } = createMppxFactory({
        payment: {
          status: 200,
          withReceipt() {
            return new Response('', { status: 200 });
          },
        },
      });
      const adapter = new MppAdapter({
        depositAddressStore: {
          getOrCreateAddress: async () => '0xrecipient',
        },
        settingsCache: { get: () => null },
        stripeClientFactory: () => null,
        mppxFactory: factory,
      });

      await assert.rejects(() => adapter.fulfill(request, terms), /stable settlement reference/);
    });

    it('rejects a successful payment that has no settlement method', async function () {
      const { factory } = createMppxFactory({
        payment: {
          status: 200,
          withReceipt(response) {
            const headers = new Headers(response.headers);
            headers.set('payment-receipt', encodeReceipt({ reference: '0xtx' }));
            return new Response('', { status: 200, headers });
          },
        },
      });
      const adapter = new MppAdapter({
        depositAddressStore: {
          getOrCreateAddress: async () => '0xrecipient',
        },
        settingsCache: { get: () => null },
        stripeClientFactory: () => null,
        mppxFactory: factory,
      });

      await assert.rejects(() => adapter.fulfill(request, terms), /settlement method/);
    });
  });
});
