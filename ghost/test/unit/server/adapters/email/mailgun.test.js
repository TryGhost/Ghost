const Mailgun = require('../../../../../core/server/adapters/email/Mailgun');
const EmailProviderBase = require('../../../../../core/server/adapters/email/EmailProviderBase');
const sinon = require('sinon');
const assert = require('node:assert/strict');

describe('Mailgun Adapter', function () {
  let emailProvider;
  let analyticsProvider;

  beforeEach(function () {
    // Test double for MailgunEmailProvider
    emailProvider = {
      send: sinon.stub().resolves({ id: 'msg-123' }),
      getMaximumRecipients: sinon.stub().returns(1000),
      getTargetDeliveryWindow: sinon.stub().returns(3600000),
    };

    // Test double for EmailAnalyticsProviderMailgun
    analyticsProvider = {
      fetchLatest: sinon.stub().resolves(),
    };
  });

  afterEach(function () {
    sinon.restore();
  });

  it('extends EmailProviderBase', function () {
    const adapter = new Mailgun({
      configService: { get: sinon.stub() },
      settingsCache: { get: sinon.stub() },
      labs: {},
    });

    assert.ok(adapter instanceof EmailProviderBase);
  });

  it('delegates send to MailgunEmailProvider', async function () {
    const adapter = new Mailgun({ emailProvider });

    const data = {
      subject: 'Test',
      html: '<html><body>Test</body></html>',
      recipients: [{ email: 'test@example.com', replacements: [] }],
      replacementDefinitions: [],
    };
    const options = { openTrackingEnabled: true };

    const result = await adapter.send(data, options);

    assert.ok(emailProvider.send.calledOnce);
    assert.ok(emailProvider.send.calledWith(data, options));
    assert.deepEqual(result, { id: 'msg-123' });
  });

  it('delegates getMaximumRecipients to MailgunEmailProvider', function () {
    const adapter = new Mailgun({ emailProvider });

    const result = adapter.getMaximumRecipients();

    assert.ok(emailProvider.getMaximumRecipients.calledOnce);
    assert.equal(result, 1000);
  });

  it('delegates getTargetDeliveryWindow to MailgunEmailProvider', function () {
    const adapter = new Mailgun({ emailProvider });

    const result = adapter.getTargetDeliveryWindow();

    assert.ok(emailProvider.getTargetDeliveryWindow.calledOnce);
    assert.equal(result, 3600000);
  });

  it('delegates fetchLatest to EmailAnalyticsProviderMailgun', async function () {
    const adapter = new Mailgun({ analyticsProvider });

    const batchHandler = sinon.stub();
    const options = {
      maxEvents: 100,
      begin: new Date('2024-01-01'),
      end: new Date('2024-01-31'),
    };

    await adapter.fetchLatest(batchHandler, options);

    assert.ok(analyticsProvider.fetchLatest.calledOnce);
    assert.ok(analyticsProvider.fetchLatest.calledWith(batchHandler, options));
  });

  it('throws when send is called before initialization', async function () {
    const adapter = new Mailgun({});

    await assert.rejects(async () => await adapter.send({}, {}), {
      message: 'Mailgun adapter not initialized. Please provide configService and settingsCache.',
    });
  });

  it('creates providers with correct dependencies', function () {
    const configService = { get: sinon.stub() };
    const settingsCache = { get: sinon.stub() };
    const labs = { isSet: sinon.stub() };
    const errorHandler = sinon.stub();

    const adapter = new Mailgun({
      configService,
      settingsCache,
      labs,
      errorHandler,
    });

    // Verify adapter was created successfully
    assert.ok(adapter);
    assert.ok(adapter instanceof EmailProviderBase);
  });
});
