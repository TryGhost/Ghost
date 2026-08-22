const assert = require('node:assert/strict');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const {
  CasperX402Adapter,
  parseCasperX402Config,
} = require('../../../../../core/server/services/machine-payments/adapters/casper-x402-adapter');

const WCSPR_PACKAGE_HASH = 'a'.repeat(64);

function validConfig(overrides = {}) {
  return {
    enabled: true,
    network: 'casper:casper',
    facilitatorUrl: 'https://x402-facilitator.cspr.cloud',
    payTo: '0203f1c4b9b1a1f4a2b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f6071829',
    asset: WCSPR_PACKAGE_HASH,
    ...overrides,
  };
}

function createCasperRuntimeFactory({ response } = {}) {
  let honoCreateCount = 0;

  return {
    get honoCreateCount() {
      return honoCreateCount;
    },
    factory: () => ({
      paymentMiddlewareFromConfig: () => () => {},
      HTTPFacilitatorClient: class {},
      ExactCasperScheme: class {},
      Hono: class {
        constructor() {
          honoCreateCount += 1;
        }

        use() {}

        get() {}

        on() {}

        fetch() {
          return Promise.resolve(
            response ? response() : new Response('', { status: 402 }),
          );
        }
      },
    }),
  };
}

function createCasperAdapter(overrides = {}) {
  return new CasperX402Adapter({
    facilitatorClient: {},
    configProvider: () => validConfig(),
    runtimeFactory: createCasperRuntimeFactory().factory,
    ...overrides,
  });
}

async function initCasperAdapter(overrides = {}) {
  const adapter = createCasperAdapter(overrides);
  await adapter.init();
  return adapter;
}

describe('Unit: server/services/machine-payments/adapters/casper-x402-adapter', function () {
  const terms = {
    amount: 100,
    currency: 'USD',
    description: 'Paid post',
    method: 'GET',
    mimeType: 'text/markdown',
    url: 'http://example.com/paid-post.md',
  };

  afterEach(function () {
    sinon.restore();
  });

  describe('parseCasperX402Config', function () {
    it('accepts a valid mainnet config', function () {
      const parsed = parseCasperX402Config(validConfig());

      assert.equal(parsed.network, 'casper:casper');
      assert.equal(parsed.asset, WCSPR_PACKAGE_HASH);
      assert.equal(parsed.facilitatorUrl, 'https://x402-facilitator.cspr.cloud');
    });

    it('accepts a valid testnet config', function () {
      const parsed = parseCasperX402Config(validConfig({ network: 'casper:casper-test' }));

      assert.equal(parsed.network, 'casper:casper-test');
    });

    it('returns null when the rail is disabled', function () {
      assert.equal(parseCasperX402Config(validConfig({ enabled: false })), null);
    });

    it('rejects a non-HTTPS facilitator', function () {
      sinon.stub(logging, 'warn');

      assert.equal(
        parseCasperX402Config(validConfig({ facilitatorUrl: 'http://facilitator.example' })),
        null,
      );
      assert.match(String(logging.warn.firstCall.args[0]), /must use HTTPS/);
    });

    it('rejects a non-Casper CAIP-2 network', function () {
      sinon.stub(logging, 'warn');

      assert.equal(parseCasperX402Config(validConfig({ network: 'eip155:8453' })), null);
      assert.match(String(logging.warn.firstCall.args[0]), /CAIP-2 Casper network/);
    });

    it('rejects an unknown Casper chain name', function () {
      sinon.stub(logging, 'warn');

      assert.equal(parseCasperX402Config(validConfig({ network: 'casper:integration' })), null);
      assert.match(String(logging.warn.firstCall.args[0]), /casper:casper-test/);
    });

    it('rejects a missing payTo address', function () {
      sinon.stub(logging, 'warn');

      assert.equal(parseCasperX402Config(validConfig({ payTo: null })), null);
      assert.match(String(logging.warn.firstCall.args[0]), /payTo must be a Casper address/);
    });

    it('rejects an asset that is not a CEP-18 contract package hash', function () {
      sinon.stub(logging, 'warn');

      assert.equal(
        parseCasperX402Config(validConfig({ asset: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174' })),
        null,
      );
      assert.match(String(logging.warn.firstCall.args[0]), /CEP-18 contract package hash/);
    });
  });

  describe('CasperX402Adapter', function () {
    it('is named x402-casper and takes no deposit address store', function () {
      const adapter = new CasperX402Adapter();

      assert.equal(adapter.name, 'x402-casper');
      assert.equal(adapter.depositAddressStore, undefined);
    });

    it('is disabled by default', async function () {
      const adapter = new CasperX402Adapter({
        configProvider: () => ({}),
        runtimeFactory: createCasperRuntimeFactory().factory,
      });

      assert.equal(await adapter.init(), false);
      assert.equal(adapter.isReady, false);
      assert.equal(await adapter.challenge(new Request('http://example.com/paid.md'), terms), null);
    });

    it('stays disabled when payTo is not configured', async function () {
      sinon.stub(logging, 'warn');
      const adapter = new CasperX402Adapter({
        configProvider: () => validConfig({ payTo: '' }),
        runtimeFactory: createCasperRuntimeFactory().factory,
      });

      assert.equal(await adapter.init(), false);
      assert.equal(adapter.isReady, false);
    });

    it('stays disabled and warns when the Casper runtime cannot be loaded', async function () {
      sinon.stub(logging, 'warn');
      const adapter = createCasperAdapter({
        runtimeFactory: () => {
          throw new Error('Cannot find module @make-software/casper-x402/exact/server');
        },
      });

      assert.equal(await adapter.init(), false);
      assert.equal(adapter.isReady, false);
      assert.match(String(logging.warn.firstCall.args[0]), /casper-x402/);
    });

    it('initializes runtime modules and facilitator once at boot', async function () {
      let runtimeLoads = 0;
      const adapter = createCasperAdapter({
        runtimeFactory: () => {
          runtimeLoads += 1;
          return createCasperRuntimeFactory().factory();
        },
      });

      assert.equal(await adapter.init(), true);
      assert.equal(adapter.isReady, true);
      assert.equal(runtimeLoads, 1);

      await adapter.challenge(new Request('http://example.com/a.md'), terms);
      assert.equal(runtimeLoads, 1);
      assert.equal(await adapter.init(), true);
      assert.equal(runtimeLoads, 1);
    });

    it('detects x-payment and payment-signature credentials', function () {
      const adapter = new CasperX402Adapter();

      assert.equal(adapter.canHandle(new Request('http://example.com/paid.md')), false);
      assert.equal(
        adapter.canHandle(
          new Request('http://example.com/paid.md', { headers: { 'x-payment': 'abc' } }),
        ),
        true,
      );
      assert.equal(
        adapter.canHandle(
          new Request('http://example.com/paid.md', { headers: { 'payment-signature': 'abc' } }),
        ),
        true,
      );
    });

    it('returns the 402 challenge response', async function () {
      const adapter = await initCasperAdapter();

      const challenge = await adapter.challenge(new Request('http://example.com/paid.md'), terms);

      assert.ok(challenge);
      assert.equal(challenge.status, 402);
    });

    it('logs and returns null when the middleware does not produce a 402', async function () {
      sinon.stub(logging, 'warn');
      const adapter = await initCasperAdapter({
        runtimeFactory: createCasperRuntimeFactory({
          response: () => new Response('', { status: 500 }),
        }).factory,
      });

      const challenge = await adapter.challenge(new Request('http://example.com/paid.md'), terms);

      assert.equal(challenge, null);
      assert.match(String(logging.warn.firstCall.args[0]), /Casper x402 challenge unavailable/);
    });

    it('reuses the cached route app for identical terms', async function () {
      const runtime = createCasperRuntimeFactory();
      const adapter = await initCasperAdapter({ runtimeFactory: runtime.factory });

      await adapter.challenge(new Request('http://example.com/a.md'), terms);
      await adapter.challenge(new Request('http://example.com/a.md'), terms);
      await adapter.challenge(new Request('http://example.com/a.md'), terms);

      assert.equal(runtime.honoCreateCount, 1);

      await adapter.challenge(new Request('http://example.com/b.md'), {
        ...terms,
        url: 'http://example.com/b.md',
      });

      assert.equal(runtime.honoCreateCount, 2);
    });

    it('fulfills with protocol x402, method casper and the settlement reference', async function () {
      const paymentResponse = Buffer.from(
        JSON.stringify({ transaction: 'casper-deploy-hash' }),
      ).toString('base64');

      const adapter = await initCasperAdapter({
        runtimeFactory: createCasperRuntimeFactory({
          response: () =>
            new Response('ok', {
              status: 200,
              headers: { 'payment-response': paymentResponse },
            }),
        }).factory,
      });

      const fulfillment = await adapter.fulfill(
        new Request('http://example.com/paid.md', { headers: { 'x-payment': 'abc' } }),
        terms,
      );

      assert.equal(fulfillment.protocol, 'x402');
      assert.equal(fulfillment.method, 'casper');
      assert.equal(fulfillment.reference, 'casper-deploy-hash');
      assert.equal(fulfillment.amount, 100);
      assert.equal(fulfillment.currency, 'USD');
      assert.equal(fulfillment.stripePaymentIntentId, null);
      assert.equal(fulfillment.receiptHeaders['payment-response'], paymentResponse);
    });

    it('rejects fulfill when the rail is not ready', async function () {
      const adapter = new CasperX402Adapter({ configProvider: () => ({}) });
      await adapter.init();

      await assert.rejects(
        () =>
          adapter.fulfill(
            new Request('http://example.com/paid.md', { headers: { 'x-payment': 'abc' } }),
            terms,
          ),
        /Casper x402 payment credential rejected/,
      );
    });

    it('rejects fulfill on a 402 response', async function () {
      const adapter = await initCasperAdapter();

      await assert.rejects(
        () =>
          adapter.fulfill(
            new Request('http://example.com/paid.md', { headers: { 'x-payment': 'abc' } }),
            terms,
          ),
        /Payment required/,
      );
    });

    it('rejects fulfill on a non-2xx response', async function () {
      const adapter = await initCasperAdapter({
        runtimeFactory: createCasperRuntimeFactory({
          response: () => new Response('', { status: 500 }),
        }).factory,
      });

      await assert.rejects(
        () =>
          adapter.fulfill(
            new Request('http://example.com/paid.md', { headers: { 'x-payment': 'abc' } }),
            terms,
          ),
        /Casper x402 payment credential rejected/,
      );
    });

    it('rejects fulfill when the payment-response header is missing', async function () {
      const adapter = await initCasperAdapter({
        runtimeFactory: createCasperRuntimeFactory({
          response: () => new Response('ok', { status: 200 }),
        }).factory,
      });

      await assert.rejects(
        () =>
          adapter.fulfill(
            new Request('http://example.com/paid.md', { headers: { 'x-payment': 'abc' } }),
            terms,
          ),
        /stable settlement reference/,
      );
    });

    it('rejects non-USD terms', async function () {
      const adapter = await initCasperAdapter();

      await assert.rejects(
        () => adapter.fulfill(new Request('http://example.com/paid.md'), { ...terms, currency: 'EUR' }),
        /USD only/,
      );
    });
  });
});
