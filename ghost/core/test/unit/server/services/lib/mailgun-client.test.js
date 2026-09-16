const assert = require('node:assert/strict');
const nock = require('nock');
const sinon = require('sinon');

// module under test
const MailgunClient = require('../../../../../core/server/services/lib/mailgun-client');

// Some sample Mailgun API options we might want to use
const MAILGUN_OPTIONS = {
  event: 'delivered OR opened OR failed OR unsubscribed OR complained',
  limit: 300,
  tags: 'bulk-email',
  begin: 1606399301.266,
};

const createBatchCounter = (customHandler) => {
  const batchCounter = {
    events: 0,
    batches: 0,
  };

  batchCounter.batchHandler = async (events) => {
    batchCounter.events += events.length;
    batchCounter.batches += 1;
    if (customHandler) {
      await customHandler(events);
    }
  };

  return batchCounter;
};

const createEventsPage = ({ domain, nextPage, timestamps }) => ({
  items: timestamps.map((timestamp, index) => ({
    event: 'delivered',
    recipient: `recipient${index}@example.com`,
    'user-variables': {
      'email-id': '5fbe5d9607bdfa3765dc3819',
    },
    message: {
      headers: {
        'message-id': `message-${index}@${domain}`,
      },
    },
    timestamp,
  })),
  paging: {
    next: `https://api.mailgun.net/v3/${domain}/events/${nextPage}`,
  },
});

const mockEventsPage = ({ domain, mailgunOptions, nextPage, page, timestamps }) =>
  nock('https://api.mailgun.net')
    .get(`/v3/${domain}/events${page ? `/${page}` : ''}`)
    .query(mailgunOptions)
    .reply(200, createEventsPage({ domain, nextPage, timestamps }));

describe('MailgunClient', function () {
  let config, settings;

  beforeEach(function () {
    // options objects that can be stubbed or spied
    config = { get() {} };
    settings = { get() {} };
  });

  afterEach(function () {
    sinon.restore();
  });

  describe('getBatchSize', function () {
    it('reads the batch size from config if available', function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1234,
      });

      const mailgunClient = new MailgunClient({ config, settings });
      assert.equal(mailgunClient.getBatchSize(), 1234);
    });

    it('has a default batch size if missing from config', function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
      });

      const mailgunClient = new MailgunClient({ config, settings });
      assert.equal(mailgunClient.getBatchSize(), 1000);
    });
  });

  it('exports a number for configurable target delivery window', function () {
    const configStub = sinon.stub(config, 'get');
    configStub.withArgs('bulkEmail').returns({
      mailgun: {
        apiKey: 'apiKey',
        domain: 'domain.com',
        baseUrl: 'https://api.mailgun.net/v3',
      },
      batchSize: 1000,
      targetDeliveryWindow: 300,
    });

    const mailgunClient = new MailgunClient({ config, settings });
    assert.equal(mailgunClient.getTargetDeliveryWindow(), 300);
  });

  it('exports a number — 0 — for configurable target delivery window if not set', function () {
    const configStub = sinon.stub(config, 'get');
    configStub.withArgs('bulkEmail').returns({
      mailgun: {
        apiKey: 'apiKey',
        domain: 'domain.com',
        baseUrl: 'https://api.mailgun.net/v3',
      },
      batchSize: 1000,
    });

    const mailgunClient = new MailgunClient({ config, settings });
    assert.equal(mailgunClient.getTargetDeliveryWindow(), 0);
  });

  it('exports a number - 0 - for configurable target delivery window if an invalid value is set', function () {
    const configStub = sinon.stub(config, 'get');
    configStub.withArgs('bulkEmail').returns({
      mailgun: {
        apiKey: 'apiKey',
        domain: 'domain.com',
        baseUrl: 'https://api.mailgun.net/v3',
      },
      batchSize: 1000,
      targetDeliveryWindow: 'invalid',
    });
    const mailgunClient = new MailgunClient({ config, settings });
    assert.equal(mailgunClient.getTargetDeliveryWindow(), 0);
  });

  it('exports a number - 0 - for configurable target delivery window if a negative value is set', function () {
    const configStub = sinon.stub(config, 'get');
    configStub.withArgs('bulkEmail').returns({
      mailgun: {
        apiKey: 'apiKey',
        domain: 'domain.com',
        baseUrl: 'https://api.mailgun.net/v3',
      },
      batchSize: 1000,
      targetDeliveryWindow: -3000,
    });
    const mailgunClient = new MailgunClient({ config, settings });
    assert.equal(mailgunClient.getTargetDeliveryWindow(), 0);
  });

  it('can connect via config', function () {
    const configStub = sinon.stub(config, 'get');
    configStub.withArgs('bulkEmail').returns({
      mailgun: {
        apiKey: 'apiKey',
        domain: 'domain.com',
        baseUrl: 'https://api.mailgun.net/v3',
      },
      batchSize: 1000,
    });

    const mailgunClient = new MailgunClient({ config, settings });
    assert.equal(mailgunClient.isConfigured(), true);
  });

  it('can connect via settings', function () {
    const settingsStub = sinon.stub(settings, 'get');
    settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey');
    settingsStub.withArgs('mailgun_domain').returns('settingsdomain.com');
    settingsStub.withArgs('mailgun_base_url').returns('https://example.com/v3');

    const mailgunClient = new MailgunClient({ config, settings });
    assert.equal(mailgunClient.isConfigured(), true);
  });

  it('cannot configure Mailgun if config/settings missing', function () {
    const mailgunClient = new MailgunClient({ config, settings });
    assert.equal(mailgunClient.isConfigured(), false);
  });

  it('respects changes in settings', async function () {
    const settingsStub = sinon.stub(settings, 'get');
    settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey');
    settingsStub.withArgs('mailgun_domain').returns('settingsdomain.com');
    settingsStub.withArgs('mailgun_base_url').returns('https://api.mailgun.net');

    const eventsMock1 = nock('https://api.mailgun.net')
      .get('/v3/settingsdomain.com/events')
      .query(MAILGUN_OPTIONS)
      .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
        'Content-Type': 'application/json',
      });

    const mailgunClient = new MailgunClient({ config, settings });
    await mailgunClient.fetchEvents(MAILGUN_OPTIONS, () => {});

    settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey2');
    settingsStub.withArgs('mailgun_domain').returns('settingsdomain2.com');
    settingsStub.withArgs('mailgun_base_url').returns('https://api.mailgun.net');

    const eventsMock2 = nock('https://api.mailgun.net')
      .get('/v3/settingsdomain2.com/events')
      .query(MAILGUN_OPTIONS)
      .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
        'Content-Type': 'application/json',
      });

    await mailgunClient.fetchEvents(MAILGUN_OPTIONS, () => {});

    assert.equal(eventsMock1.isDone(), true);
    assert.equal(eventsMock2.isDone(), true);
  });

  it('prioritises config values over settings', async function () {
    const configStub = sinon.stub(config, 'get');
    configStub.withArgs('bulkEmail').returns({
      mailgun: {
        apiKey: 'apiKey',
        domain: 'configdomain.com',
        baseUrl: 'https://api.mailgun.net',
      },
      batchSize: 1000,
    });

    const settingsStub = sinon.stub(settings, 'get');
    settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey');
    settingsStub.withArgs('mailgun_domain').returns('settingsdomain.com');
    settingsStub.withArgs('mailgun_base_url').returns('https://api.mailgun.net');

    const configApiMock = nock('https://api.mailgun.net')
      .get('/v3/configdomain.com/events')
      .query(MAILGUN_OPTIONS)
      .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
        'Content-Type': 'application/json',
      });

    const settingsApiMock = nock('https://api.mailgun.net')
      .get('/v3/settingsdomain.com/events')
      .query(MAILGUN_OPTIONS)
      .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
        'Content-Type': 'application/json',
      });

    const mailgunClient = new MailgunClient({ config, settings });
    await mailgunClient.fetchEvents(MAILGUN_OPTIONS, () => {});

    assert.equal(configApiMock.isDone(), true);
    assert.equal(settingsApiMock.isDone(), false);
  });

  describe('send()', function () {
    it('does not send if not configured', async function () {
      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send({}, {}, []);

      assert.equal(response, null);
    });

    it('sends a basic email', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
        tags: ['another-tag'],
        disable_tracking: true,
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
        },
      };
      // Request body is multipart/form-data, so we need to check the body manually with some regex
      // We can't use nock's JSON body matching because it doesn't support multipart/form-data
      const sendMock = nock('https://api.mailgun.net')
        // .post('/v3/domain.com/messages', /form-data; name="subject"[^]*Test Subject/m)
        .post('/v3/domain.com/messages', function (body) {
          const regexList = [
            /form-data; name="subject"[^]*Test Subject/m,
            /form-data; name="from"[^]*from@example.com/m,
            /form-data; name="h:Reply-To"[^]*replyTo@example.com/m,
            /form-data; name="html"[^]*<p>Test Content<\/p>/m,
            /form-data; name="text"[^]*Test Content/m,
            /form-data; name="to"[^]*test@example.com/m,
            /form-data; name="recipient-variables"[^]*\{"test@example.com":\{"name":"Test User"\}\}/m,
            /form-data; name="o:tag"\r?\n\r?\nghost-email\r?\n--/m,
            /form-data; name="o:tag"\r?\n\r?\nanother-tag\r?\n--/m,
            /form-data; name="o:tracking"\r?\n\r?\nno\r?\n--/m,
            /form-data; name="o:tracking-clicks"\r?\n\r?\nno\r?\n--/m,
            /form-data; name="o:tracking-opens"\r?\n\r?\nno\r?\n--/m,
          ];
          return regexList.every((regex) => regex.test(body));
        })
        .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
          'Content-Type': 'application/json',
        });

      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send(message, recipientData, []);
      assert(response.id === 'message-id');
      assert(sendMock.isDone());
    });

    it('throws an error if sending to more than the batch size', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 2,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
        },
        'test+1@example.com': {
          name: 'Test User',
        },
        'test+2@example.com': {
          name: 'Test User',
        },
      };

      const mailgunClient = new MailgunClient({ config, settings });

      await assert.rejects(mailgunClient.send(message, recipientData, []));
    });

    it('sends an email with list unsubscribe headers', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
          unsubscribe_url: 'https://example.com/unsubscribe',
          list_unsubscribe: 'https://example.com/unsubscribe',
        },
      };
      // Request body is multipart/form-data, so we need to check the body manually with some regex
      // We can't use nock's JSON body matching because it doesn't support multipart/form-data
      const sendMock = nock('https://api.mailgun.net')
        // .post('/v3/domain.com/messages', /form-data; name="subject"[^]*Test Subject/m)
        .post('/v3/domain.com/messages', function (body) {
          const regexList = [
            /form-data; name="h:List-Unsubscribe"[^]*<%recipient.list_unsubscribe%>, <%tag_unsubscribe_email%>/m,
            /form-data; name="h:List-Unsubscribe-Post"[^]*List-Unsubscribe=One-Click/m,
          ];
          return regexList.every((regex) => regex.test(body));
        })
        .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
          'Content-Type': 'application/json',
        });

      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send(message, recipientData, []);
      assert(response.id === 'message-id');
      assert(sendMock.isDone());
    });

    it('sends an email with email id', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
        id: 'email-id',
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
          unsubscribe_url: 'https://example.com/unsubscribe',
          list_unsubscribe: 'https://example.com/unsubscribe',
        },
      };
      // Request body is multipart/form-data, so we need to check the body manually with some regex
      // We can't use nock's JSON body matching because it doesn't support multipart/form-data
      const sendMock = nock('https://api.mailgun.net')
        // .post('/v3/domain.com/messages', /form-data; name="subject"[^]*Test Subject/m)
        .post('/v3/domain.com/messages', function (body) {
          const regexList = [/form-data; name="v:email-id"[^]*email-id/m];
          return regexList.every((regex) => regex.test(body));
        })
        .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
          'Content-Type': 'application/json',
        });

      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send(message, recipientData, []);
      assert(response.id === 'message-id');
      assert(sendMock.isDone());
    });

    it('sends an email in test mode', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
          testmode: true,
        },
        batchSize: 1000,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
          unsubscribe_url: 'https://example.com/unsubscribe',
          list_unsubscribe: 'https://example.com/unsubscribe',
        },
      };
      // Request body is multipart/form-data, so we need to check the body manually with some regex
      // We can't use nock's JSON body matching because it doesn't support multipart/form-data
      const sendMock = nock('https://api.mailgun.net')
        // .post('/v3/domain.com/messages', /form-data; name="subject"[^]*Test Subject/m)
        .post('/v3/domain.com/messages', function (body) {
          const regexList = [/form-data; name="o:testmode"[^]*yes/m];
          return regexList.every((regex) => regex.test(body));
        })
        .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
          'Content-Type': 'application/json',
        });

      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send(message, recipientData, []);
      assert(response.id === 'message-id');
      assert(sendMock.isDone());
    });

    it('sends an email with a custom tag', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
          tag: 'ignored-tag',
        },
        batchSize: 1000,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
        tags: ['custom-tag'],
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
          unsubscribe_url: 'https://example.com/unsubscribe',
          list_unsubscribe: 'https://example.com/unsubscribe',
        },
      };
      // Request body is multipart/form-data, so we need to check the body manually with some regex
      // We can't use nock's JSON body matching because it doesn't support multipart/form-data
      const sendMock = nock('https://api.mailgun.net')
        // .post('/v3/domain.com/messages', /form-data; name="subject"[^]*Test Subject/m)
        .post('/v3/domain.com/messages', function (body) {
          const regexList = [/form-data; name="o:tag"[^]*custom-tag/m];
          return regexList.every((regex) => regex.test(body)) && !body.includes('ignored-tag');
        })
        .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
          'Content-Type': 'application/json',
        });

      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send(message, recipientData, []);
      assert(response.id === 'message-id');
      assert(sendMock.isDone());
    });

    it('sends an email with tracking opens enabled', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
        track_opens: true,
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
          unsubscribe_url: 'https://example.com/unsubscribe',
          list_unsubscribe: 'https://example.com/unsubscribe',
        },
      };
      // Request body is multipart/form-data, so we need to check the body manually with some regex
      // We can't use nock's JSON body matching because it doesn't support multipart/form-data
      const sendMock = nock('https://api.mailgun.net')
        // .post('/v3/domain.com/messages', /form-data; name="subject"[^]*Test Subject/m)
        .post('/v3/domain.com/messages', function (body) {
          const regexList = [/form-data; name="o:tracking-opens"[^]*yes/m];
          return regexList.every((regex) => regex.test(body));
        })
        .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
          'Content-Type': 'application/json',
        });

      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send(message, recipientData, []);
      assert(response.id === 'message-id');
      assert(sendMock.isDone());
    });

    it('sends an email with delivery time', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
        deliveryTime: new Date('2021-01-01T00:00:00Z'),
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
          unsubscribe_url: 'https://example.com/unsubscribe',
          list_unsubscribe: 'https://example.com/unsubscribe',
        },
      };
      // Request body is multipart/form-data, so we need to check the body manually with some regex
      // We can't use nock's JSON body matching because it doesn't support multipart/form-data
      const sendMock = nock('https://api.mailgun.net')
        // .post('/v3/domain.com/messages', /form-data; name="subject"[^]*Test Subject/m)
        .post('/v3/domain.com/messages', function (body) {
          const regexList = [/form-data; name="o:deliverytime"[^]*Fri, 01 Jan 2021 00:00:00 GMT/m];
          return regexList.every((regex) => regex.test(body));
        })
        .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
          'Content-Type': 'application/json',
        });

      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send(message, recipientData, []);
      assert(response.id === 'message-id');
      assert(sendMock.isDone());
    });

    it('omits the deliverytime if it is not provided', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
          testmode: true,
        },
        batchSize: 1000,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
          unsubscribe_url: 'https://example.com/unsubscribe',
          list_unsubscribe: 'https://example.com/unsubscribe',
        },
      };
      // Request body is multipart/form-data, so we need to check the body manually with some regex
      // We can't use nock's JSON body matching because it doesn't support multipart/form-data
      const sendMock = nock('https://api.mailgun.net')
        // .post('/v3/domain.com/messages', /form-data; name="subject"[^]*Test Subject/m)
        .post('/v3/domain.com/messages', function (body) {
          const regexList = [/form-data; name="o:deliverytime"[^]*/m];
          return regexList.every((regex) => !regex.test(body));
        })
        .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
          'Content-Type': 'application/json',
        });

      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send(message, recipientData, []);
      assert(response.id === 'message-id');
      assert(sendMock.isDone());
    });

    it('omits the deliverytime if it is not a valid date', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });
      const message = {
        subject: 'Test Subject',
        from: 'from@example.com',
        replyTo: 'replyTo@example.com',
        html: '<p>Test Content</p>',
        plaintext: 'Test Content',
        deliveryTime: 'not a date',
      };
      const recipientData = {
        'test@example.com': {
          name: 'Test User',
          unsubscribe_url: 'https://example.com/unsubscribe',
          list_unsubscribe: 'https://example.com/unsubscribe',
        },
      };
      // Request body is multipart/form-data, so we need to check the body manually with some regex
      // We can't use nock's JSON body matching because it doesn't support multipart/form-data
      const sendMock = nock('https://api.mailgun.net')
        // .post('/v3/domain.com/messages', /form-data; name="subject"[^]*Test Subject/m)
        .post('/v3/domain.com/messages', function (body) {
          const regexList = [/form-data; name="o:deliverytime"[^]*/m];
          return regexList.every((regex) => !regex.test(body));
        })
        .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
          'Content-Type': 'application/json',
        });

      const mailgunClient = new MailgunClient({ config, settings });
      const response = await mailgunClient.send(message, recipientData, []);
      assert(response.id === 'message-id');
      assert(sendMock.isDone());
    });

    describe('per-recipient Message-Id', function () {
      const EMAIL_ID = '64f0c7a5e2b3a1d4c5b6a7f8';

      // value of one multipart/form-data field: between the blank line after its header and the next boundary
      const getFormField = (body, name) => {
        const fieldStart = body.indexOf(`name="${name}"`);
        if (fieldStart === -1) {
          return undefined;
        }
        const valueStart = body.indexOf('\r\n\r\n', fieldStart) + '\r\n\r\n'.length;
        const valueEnd = body.indexOf('\r\n--', valueStart);
        return body.slice(valueStart, valueEnd);
      };

      const assertMessageIdShape = (messageId, emailId, suffixShape) => {
        assert.ok(messageId.startsWith(`${emailId}.`), `unexpected prefix in ${messageId}`);
        assert.match(messageId.slice(emailId.length + 1), suffixShape);
      };

      const stubMailgunConfig = () => {
        sinon
          .stub(config, 'get')
          .withArgs('bulkEmail')
          .returns({
            mailgun: {
              apiKey: 'apiKey',
              domain: 'domain.com',
              baseUrl: 'https://api.mailgun.net/v3',
            },
            batchSize: 1000,
          });
      };

      const createRecipientData = () => ({
        'first@example.com': { name: 'First', list_unsubscribe: 'https://example.com/unsub/1' },
        'second@example.com': { name: 'Second', list_unsubscribe: 'https://example.com/unsub/2' },
      });

      const captureSend = (domain = 'domain.com') => {
        const captured = {};
        const sendMock = nock('https://api.mailgun.net')
          .post(`/v3/${domain}/messages`, function (body) {
            captured.body = body;
            return true;
          })
          .replyWithFile(200, `${__dirname}/fixtures/send-success.json`, {
            'Content-Type': 'application/json',
          });
        return { captured, sendMock };
      };

      it('sends a per-recipient Message-Id header when requested', async function () {
        stubMailgunConfig();
        const message = {
          subject: 'Test Subject',
          from: 'from@example.com',
          html: '<p>Test Content</p>',
          plaintext: 'Test Content',
          id: EMAIL_ID,
          perRecipientMessageId: true,
        };
        const { captured, sendMock } = captureSend();

        const mailgunClient = new MailgunClient({ config, settings });
        const response = await mailgunClient.send(message, createRecipientData(), []);

        assert(response.id === 'message-id');
        assert(sendMock.isDone());
        assert.equal(getFormField(captured.body, 'h:Message-Id'), '<%recipient.message_id%>');

        const recipientVariables = JSON.parse(getFormField(captured.body, 'recipient-variables'));
        const first = recipientVariables['first@example.com'];
        const second = recipientVariables['second@example.com'];
        assertMessageIdShape(first.message_id, EMAIL_ID, /^[a-f0-9]{32}@domain\.com$/);
        assertMessageIdShape(second.message_id, EMAIL_ID, /^[a-f0-9]{32}@domain\.com$/);
        assert.notEqual(first.message_id, second.message_id);
        assert.equal(first.name, 'First');
        assert.equal(first.list_unsubscribe, 'https://example.com/unsub/1');
        assert.equal(second.name, 'Second');
        assert.equal(getFormField(captured.body, 'v:email-id'), EMAIL_ID);
        assert.equal(
          getFormField(captured.body, 'h:List-Unsubscribe'),
          '<%recipient.list_unsubscribe%>, <%tag_unsubscribe_email%>',
        );
      });

      it('uses the overridden sending domain for per-recipient Message-Ids', async function () {
        stubMailgunConfig();
        const message = {
          subject: 'Test Subject',
          from: 'from@example.com',
          html: '<p>Test Content</p>',
          plaintext: 'Test Content',
          id: EMAIL_ID,
          domainOverride: 'fallback.example.net',
          perRecipientMessageId: true,
        };
        const { captured, sendMock } = captureSend('fallback.example.net');

        const mailgunClient = new MailgunClient({ config, settings });
        await mailgunClient.send(message, createRecipientData(), []);

        assert(sendMock.isDone());
        const recipientVariables = JSON.parse(getFormField(captured.body, 'recipient-variables'));
        assert.ok(
          recipientVariables['first@example.com'].message_id.endsWith('@fallback.example.net'),
        );
        assert.ok(
          recipientVariables['second@example.com'].message_id.endsWith('@fallback.example.net'),
        );
      });

      it('does not add a Message-Id header or variable unless requested', async function () {
        stubMailgunConfig();
        const message = {
          subject: 'Test Subject',
          from: 'from@example.com',
          html: '<p>Test Content</p>',
          plaintext: 'Test Content',
          id: EMAIL_ID,
        };
        const recipientData = createRecipientData();
        const { captured, sendMock } = captureSend();

        const mailgunClient = new MailgunClient({ config, settings });
        await mailgunClient.send(message, recipientData, []);

        assert(sendMock.isDone());
        assert.ok(!captured.body.includes('name="h:Message-Id"'));
        assert.equal(
          getFormField(captured.body, 'recipient-variables'),
          JSON.stringify(recipientData),
        );
      });

      it('ignores a non-boolean opt-in', async function () {
        stubMailgunConfig();
        const recipientData = createRecipientData();
        const { captured, sendMock } = captureSend();

        const mailgunClient = new MailgunClient({ config, settings });
        await mailgunClient.send(
          {
            subject: 'Test Subject',
            from: 'from@example.com',
            html: '<p>Test Content</p>',
            plaintext: 'Test Content',
            id: EMAIL_ID,
            perRecipientMessageId: 'true',
          },
          recipientData,
          [],
        );

        assert(sendMock.isDone());
        assert.ok(!captured.body.includes('name="h:Message-Id"'));
        assert.equal(
          getFormField(captured.body, 'recipient-variables'),
          JSON.stringify(recipientData),
        );
      });

      it('reports no provider id when Mailgun echoes the header template', async function () {
        stubMailgunConfig();
        const message = {
          subject: 'Test Subject',
          from: 'from@example.com',
          html: '<p>Test Content</p>',
          plaintext: 'Test Content',
          id: EMAIL_ID,
          perRecipientMessageId: true,
        };
        // Mailgun returns the Message-Id it was given, so a per-recipient template comes back
        // unsubstituted and identifies nothing
        const sendMock = nock('https://api.mailgun.net')
          .post('/v3/domain.com/messages')
          .reply(200, { id: '<%recipient.message_id%>', message: 'Queued. Thank you.' });

        const mailgunClient = new MailgunClient({ config, settings });
        const response = await mailgunClient.send(message, createRecipientData(), []);

        assert(sendMock.isDone());
        assert.equal(response.id, null);
      });

      it('keeps a real provider id from Mailgun', async function () {
        stubMailgunConfig();
        const message = {
          subject: 'Test Subject',
          from: 'from@example.com',
          html: '<p>Test Content</p>',
          plaintext: 'Test Content',
          id: EMAIL_ID,
          perRecipientMessageId: true,
        };
        const sendMock = nock('https://api.mailgun.net')
          .post('/v3/domain.com/messages')
          .reply(200, { id: '<20260916041835.abc@domain.com>', message: 'Queued. Thank you.' });

        const mailgunClient = new MailgunClient({ config, settings });
        const response = await mailgunClient.send(message, createRecipientData(), []);

        assert(sendMock.isDone());
        assert.equal(response.id, '<20260916041835.abc@domain.com>');
      });

      it('does not mutate the recipient data passed in', async function () {
        stubMailgunConfig();
        const message = {
          subject: 'Test Subject',
          from: 'from@example.com',
          html: '<p>Test Content</p>',
          plaintext: 'Test Content',
          id: EMAIL_ID,
          perRecipientMessageId: true,
        };
        const recipientData = createRecipientData();
        const snapshot = JSON.stringify(recipientData);
        const { sendMock } = captureSend();

        const mailgunClient = new MailgunClient({ config, settings });
        await mailgunClient.send(message, recipientData, []);

        assert(sendMock.isDone());
        assert.equal(JSON.stringify(recipientData), snapshot);
      });
    });
  });

  describe('fetchEvents()', function () {
    it('does not fetch if not configured', async function () {
      const counter = createBatchCounter();
      const mailgunClient = new MailgunClient({ config, settings });
      await mailgunClient.fetchEvents(MAILGUN_OPTIONS, counter.batchHandler);
      assert.equal(counter.events, 0);
      assert.equal(counter.batches, 0);
    });

    it('fetches from now and works backwards', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });

      const firstPageMock = nock('https://api.mailgun.net')
        .get('/v3/domain.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1.json`, {
          'Content-Type': 'application/json',
        });

      const secondPageMock = nock('https://api.mailgun.net')
        .get('/v3/domain.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-2.json`, {
          'Content-Type': 'application/json',
        });

      // requests continue until an empty items set is returned
      nock('https://api.mailgun.net')
        .get('/v3/domain.com/events/all-2-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
          'Content-Type': 'application/json',
        });

      const counter = createBatchCounter();

      const mailgunClient = new MailgunClient({ config, settings });
      await mailgunClient.fetchEvents(MAILGUN_OPTIONS, counter.batchHandler);

      assert.equal(firstPageMock.isDone(), true);
      assert.equal(secondPageMock.isDone(), true);
      assert.equal(counter.batches, 2);
      assert.equal(counter.events, 6);
    });

    // This tests the deadlock possibility (if we would stop after x events, we would retry the same events again and again)
    it('keeps fetching over the limit if events have the same timestamp as begin', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });

      const firstPageMock = nock('https://api.mailgun.net')
        .get('/v3/domain.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1.json`, {
          'Content-Type': 'application/json',
        });

      const secondPageMock = nock('https://api.mailgun.net')
        .get('/v3/domain.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-2.json`, {
          'Content-Type': 'application/json',
        });

      // requests continue until an empty items set is returned
      nock('https://api.mailgun.net')
        .get('/v3/domain.com/events/all-2-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
          'Content-Type': 'application/json',
        });

      const counter = createBatchCounter();

      const maxEvents = 3;

      const mailgunClient = new MailgunClient({ config, settings });

      await mailgunClient.fetchEvents(MAILGUN_OPTIONS, counter.batchHandler, { maxEvents });
      assert.equal(counter.batches, 2);
      assert.equal(counter.events, 6);
      assert.equal(firstPageMock.isDone(), true);
      assert.equal(secondPageMock.isDone(), true);
    });

    it('fetches with a limit and stops if timestamp difference reached', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });

      const firstPageMock = nock('https://api.mailgun.net')
        .get('/v3/domain.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1-timestamp.json`, {
          'Content-Type': 'application/json',
        });

      const secondPageMock = nock('https://api.mailgun.net')
        .get('/v3/domain.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-2.json`, {
          'Content-Type': 'application/json',
        });

      // requests continue until an empty items set is returned
      nock('https://api.mailgun.net')
        .get('/v3/domain.com/events/all-2-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
          'Content-Type': 'application/json',
        });

      const counter = createBatchCounter();

      const maxEvents = 3;

      const mailgunClient = new MailgunClient({ config, settings });

      await mailgunClient.fetchEvents(MAILGUN_OPTIONS, counter.batchHandler, { maxEvents });
      assert.equal(counter.batches, 1);
      assert.equal(counter.events, 4);
      assert.equal(firstPageMock.isDone(), true);
      assert.equal(secondPageMock.isDone(), false);
    });

    it('logs errors and rethrows during processing', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });

      const firstPageMock = nock('https://api.mailgun.net')
        .get('/v3/domain.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1-timestamp.json`, {
          'Content-Type': 'application/json',
        });

      const secondPageMock = nock('https://api.mailgun.net')
        .get('/v3/domain.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-2.json`, {
          'Content-Type': 'application/json',
        });

      // requests continue until an empty items set is returned
      nock('https://api.mailgun.net')
        .get('/v3/domain.com/events/all-2-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
          'Content-Type': 'application/json',
        });

      const counter = createBatchCounter(() => {
        throw new Error('test error');
      });

      const mailgunClient = new MailgunClient({ config, settings });

      await assert.rejects(
        mailgunClient.fetchEvents(MAILGUN_OPTIONS, counter.batchHandler),
        /test error/,
      );
      assert.equal(counter.batches, 1);
      assert.equal(counter.events, 4);
      assert.equal(firstPageMock.isDone(), true);
      assert.equal(secondPageMock.isDone(), false);
    });

    it('supports EU Mailgun domain', async function () {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'domain.com',
          baseUrl: 'https://api.eu.mailgun.net/v3',
        },
        batchSize: 1000,
      });

      const firstPageMock = nock('https://api.eu.mailgun.net')
        .get('/v3/domain.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1-eu.json`, {
          'Content-Type': 'application/json',
        });

      const secondPageMock = nock('https://api.eu.mailgun.net')
        .get('/v3/domain.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-2-eu.json`, {
          'Content-Type': 'application/json',
        });

      // requests continue until an empty items set is returned
      nock('https://api.eu.mailgun.net')
        .get('/v3/domain.com/events/all-2-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
          'Content-Type': 'application/json',
        });

      const batchHandler = sinon.spy();

      const mailgunClient = new MailgunClient({ config, settings });
      await mailgunClient.fetchEvents(MAILGUN_OPTIONS, batchHandler);

      assert.equal(firstPageMock.isDone(), true);
      assert.equal(secondPageMock.isDone(), true);
      sinon.assert.calledTwice(batchHandler); // one per page
    });
  });

  describe('normalizeEvent()', function () {
    it('works', function () {
      const event = {
        id: 'pl271FzxTTmGRW8Uj3dUWw',
        event: 'testEvent',
        severity: 'testSeverity',
        recipient: 'testRecipient',
        timestamp: 1614275662,
        message: {
          headers: {
            'message-id': 'testProviderId',
          },
        },
        'user-variables': {
          'email-id': 'testEmailId',
        },
      };

      const mailgunClient = new MailgunClient({ config, settings });
      const result = mailgunClient.normalizeEvent(event);

      assert.deepEqual(result, {
        type: 'testEvent',
        severity: 'testSeverity',
        recipientEmail: 'testRecipient',
        emailId: 'testEmailId',
        providerId: 'testProviderId',
        timestamp: new Date('2021-02-25T17:54:22.000Z'),
        error: null,
        id: 'pl271FzxTTmGRW8Uj3dUWw',
      });
    });

    it('works for errors', function () {
      const event = {
        event: 'failed',
        id: 'pl271FzxTTmGRW8Uj3dUWw',
        'log-level': 'error',
        severity: 'permanent',
        reason: 'suppress-bounce',
        envelope: {
          sender: 'john@example.org',
          transport: 'smtp',
          targets: 'joan@example.com',
        },
        flags: {
          'is-routed': false,
          'is-authenticated': true,
          'is-system-test': false,
          'is-test-mode': false,
        },
        'delivery-status': {
          'attempt-no': 1,
          message: '',
          code: 605,
          description: 'Not delivering to previously bounced address',
          'session-seconds': 0.0,
        },
        message: {
          headers: {
            to: 'joan@example.com',
            'message-id': 'testProviderId',
            from: 'john@example.org',
            subject: 'Test Subject',
          },
          attachments: [],
          size: 867,
        },
        storage: {
          url: 'https://se.api.mailgun.net/v3/domains/example.org/messages/eyJwI...',
          key: 'eyJwI...',
        },
        recipient: 'testRecipient',
        'recipient-domain': 'mailgun.com',
        campaigns: [],
        tags: [],
        'user-variables': {},
        timestamp: 1614275662,
      };

      const mailgunClient = new MailgunClient({ config, settings });
      const result = mailgunClient.normalizeEvent(event);

      assert.deepEqual(result, {
        type: 'failed',
        severity: 'permanent',
        recipientEmail: 'testRecipient',
        emailId: undefined,
        providerId: 'testProviderId',
        timestamp: new Date('2021-02-25T17:54:22.000Z'),
        error: {
          code: 605,
          enhancedCode: null,
          message: 'Not delivering to previously bounced address',
        },
        id: 'pl271FzxTTmGRW8Uj3dUWw',
      });
    });

    it('works for enhanced errors', function () {
      const event = {
        event: 'failed',
        id: 'pl271FzxTTmGRW8Uj3dUWw',
        'log-level': 'error',
        severity: 'permanent',
        reason: 'suppress-bounce',
        envelope: {
          sender: 'john@example.org',
          transport: 'smtp',
          targets: 'joan@example.com',
        },
        flags: {
          'is-routed': false,
          'is-authenticated': true,
          'is-system-test': false,
          'is-test-mode': false,
        },
        'delivery-status': {
          tls: true,
          'mx-host': 'hotmail-com.olc.protection.outlook.com',
          code: 451,
          description: '',
          'session-seconds': 0.7517080307006836,
          utf8: true,
          'retry-seconds': 600,
          'enhanced-code': '4.7.652',
          'attempt-no': 1,
          message:
            '4.7.652 The mail server [xxx.xxx.xxx.xxx] has exceeded the maximum number of connections.',
          'certificate-verified': true,
        },
        message: {
          headers: {
            to: 'joan@example.com',
            'message-id': 'testProviderId',
            from: 'john@example.org',
            subject: 'Test Subject',
          },
          attachments: [],
          size: 867,
        },
        storage: {
          url: 'https://se.api.mailgun.net/v3/domains/example.org/messages/eyJwI...',
          key: 'eyJwI...',
        },
        recipient: 'testRecipient',
        'recipient-domain': 'mailgun.com',
        campaigns: [],
        tags: [],
        'user-variables': {},
        timestamp: 1614275662,
      };

      const mailgunClient = new MailgunClient({ config, settings });
      const result = mailgunClient.normalizeEvent(event);

      assert.deepEqual(result, {
        type: 'failed',
        severity: 'permanent',
        recipientEmail: 'testRecipient',
        emailId: undefined,
        providerId: 'testProviderId',
        timestamp: new Date('2021-02-25T17:54:22.000Z'),
        error: {
          code: 451,
          enhancedCode: '4.7.652',
          message:
            '4.7.652 The mail server [xxx.xxx.xxx.xxx] has exceeded the maximum number of connections.',
        },
        id: 'pl271FzxTTmGRW8Uj3dUWw',
      });
    });
  });

  describe('fetchEvents() - Domain Warming', function () {
    // Helper to setup config with domain warming
    const setupDomainWarmingConfig = (
      domainWarmingEnabled = true,
      fallbackDomain = 'fallback.com',
    ) => {
      const configStub = sinon.stub(config, 'get');
      configStub.withArgs('bulkEmail').returns({
        mailgun: {
          apiKey: 'apiKey',
          domain: 'primary.com',
          baseUrl: 'https://api.mailgun.net/v3',
        },
        batchSize: 1000,
      });
      configStub
        .withArgs('hostSettings:managedEmail:fallbackDomain')
        .returns(domainWarmingEnabled ? fallbackDomain : null);

      return configStub;
    };

    beforeEach(function () {
      nock.cleanAll();
    });

    it('returns the capped fallback cursor when the primary domain is exhausted further ahead', async function () {
      setupDomainWarmingConfig(true);

      const begin = 1606399300;
      const mailgunOptions = { ...MAILGUN_OPTIONS, begin };

      const primaryPageMock = mockEventsPage({
        domain: 'primary.com',
        mailgunOptions,
        nextPage: 'primary-next',
        timestamps: [begin + 10],
      });
      const primaryEmptyPageMock = mockEventsPage({
        domain: 'primary.com',
        mailgunOptions,
        nextPage: 'primary-empty',
        page: 'primary-next',
        timestamps: [],
      });
      const fallbackPageMock = mockEventsPage({
        domain: 'fallback.com',
        mailgunOptions,
        nextPage: 'fallback-unconsumed',
        timestamps: [begin + 1, begin + 2],
      });
      const fallbackNextPageMock = mockEventsPage({
        domain: 'fallback.com',
        mailgunOptions,
        nextPage: 'fallback-empty',
        page: 'fallback-unconsumed',
        timestamps: [begin + 3],
      });

      const processedTimestamps = [];

      const result = await new MailgunClient({ config, settings }).fetchEvents(
        mailgunOptions,
        (events) => {
          processedTimestamps.push(...events.map((event) => event.timestamp));
        },
        { maxEvents: 2 },
      );

      assert.equal(primaryPageMock.isDone(), true);
      assert.equal(primaryEmptyPageMock.isDone(), true);
      assert.equal(fallbackPageMock.isDone(), true);
      assert.equal(fallbackNextPageMock.isDone(), false);
      assert.deepEqual(processedTimestamps, [
        new Date((begin + 10) * 1000),
        new Date((begin + 1) * 1000),
        new Date((begin + 2) * 1000),
      ]);
      assert.deepEqual(result, {
        safeCursor: new Date((begin + 2) * 1000),
      });
    });

    it('returns the capped primary cursor when the fallback domain is exhausted further ahead', async function () {
      setupDomainWarmingConfig(true);

      const begin = 1606399300;
      const mailgunOptions = { ...MAILGUN_OPTIONS, begin };

      const primaryPageMock = mockEventsPage({
        domain: 'primary.com',
        mailgunOptions,
        nextPage: 'primary-unconsumed',
        timestamps: [begin + 1, begin + 2],
      });
      const primaryNextPageMock = mockEventsPage({
        domain: 'primary.com',
        mailgunOptions,
        nextPage: 'primary-empty',
        page: 'primary-unconsumed',
        timestamps: [begin + 3],
      });
      const fallbackPageMock = mockEventsPage({
        domain: 'fallback.com',
        mailgunOptions,
        nextPage: 'fallback-next',
        timestamps: [begin + 10],
      });
      const fallbackEmptyPageMock = mockEventsPage({
        domain: 'fallback.com',
        mailgunOptions,
        nextPage: 'fallback-empty',
        page: 'fallback-next',
        timestamps: [],
      });

      const processedTimestamps = [];
      const result = await new MailgunClient({ config, settings }).fetchEvents(
        mailgunOptions,
        (events) => {
          processedTimestamps.push(...events.map((event) => event.timestamp));
        },
        { maxEvents: 2 },
      );

      assert.equal(primaryPageMock.isDone(), true);
      assert.equal(primaryNextPageMock.isDone(), false);
      assert.equal(fallbackPageMock.isDone(), true);
      assert.equal(fallbackEmptyPageMock.isDone(), true);
      assert.deepEqual(processedTimestamps, [
        new Date((begin + 1) * 1000),
        new Date((begin + 2) * 1000),
        new Date((begin + 10) * 1000),
      ]);
      assert.deepEqual(result, {
        safeCursor: new Date((begin + 2) * 1000),
      });
    });

    it('returns the earliest capped cursor when both domains reach their limits', async function () {
      setupDomainWarmingConfig(true);

      const begin = 1606399300;
      const mailgunOptions = { ...MAILGUN_OPTIONS, begin };

      mockEventsPage({
        domain: 'primary.com',
        mailgunOptions,
        nextPage: 'primary-unconsumed',
        timestamps: [begin + 5, begin + 6],
      });
      const primaryNextPageMock = mockEventsPage({
        domain: 'primary.com',
        mailgunOptions,
        nextPage: 'primary-empty',
        page: 'primary-unconsumed',
        timestamps: [begin + 7],
      });
      mockEventsPage({
        domain: 'fallback.com',
        mailgunOptions,
        nextPage: 'fallback-unconsumed',
        timestamps: [begin + 1, begin + 2],
      });
      const fallbackNextPageMock = mockEventsPage({
        domain: 'fallback.com',
        mailgunOptions,
        nextPage: 'fallback-empty',
        page: 'fallback-unconsumed',
        timestamps: [begin + 3],
      });

      const result = await new MailgunClient({ config, settings }).fetchEvents(
        mailgunOptions,
        () => {},
        { maxEvents: 2 },
      );

      assert.equal(primaryNextPageMock.isDone(), false);
      assert.equal(fallbackNextPageMock.isDone(), false);
      assert.deepEqual(result, {
        safeCursor: new Date((begin + 2) * 1000),
      });
    });

    it('fetches from both primary and fallback domains when enabled', async function () {
      setupDomainWarmingConfig(true);

      const primaryMock = nock('https://api.mailgun.net')
        .get('/v3/primary.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1.json`);
      nock('https://api.mailgun.net')
        .get('/v3/primary.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`);
      const fallbackMock = nock('https://api.mailgun.net')
        .get('/v3/fallback.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-2.json`);
      nock('https://api.mailgun.net')
        .get('/v3/fallback.com/events/all-2-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`);

      const counter = createBatchCounter();
      const mailgunClient = new MailgunClient({ config, settings });
      const result = await mailgunClient.fetchEvents(MAILGUN_OPTIONS, counter.batchHandler);

      assert.equal(primaryMock.isDone(), true);
      assert.equal(fallbackMock.isDone(), true);
      assert.equal(counter.batches, 2);
      assert.equal(counter.events, 6);
      assert.deepEqual(result, { safeCursor: undefined });
    });

    it('only fetches from primary when disabled', async function () {
      setupDomainWarmingConfig(false);

      const primaryMock = nock('https://api.mailgun.net')
        .get('/v3/primary.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1.json`);
      nock('https://api.mailgun.net')
        .get('/v3/primary.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`);
      const fallbackMock = nock('https://api.mailgun.net')
        .get('/v3/fallback.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-2.json`);

      const counter = createBatchCounter();
      await new MailgunClient({ config, settings }).fetchEvents(
        MAILGUN_OPTIONS,
        counter.batchHandler,
      );

      assert.equal(primaryMock.isDone(), true);
      assert.equal(fallbackMock.isDone(), false);
      assert.equal(counter.events, 4);
    });

    it('only fetches from primary when no fallback configured', async function () {
      setupDomainWarmingConfig(true, null);

      const primaryMock = nock('https://api.mailgun.net')
        .get('/v3/primary.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1.json`);
      nock('https://api.mailgun.net')
        .get('/v3/primary.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`);

      const counter = createBatchCounter();
      await new MailgunClient({ config, settings }).fetchEvents(
        MAILGUN_OPTIONS,
        counter.batchHandler,
      );

      assert.equal(primaryMock.isDone(), true);
      assert.equal(counter.events, 4);
    });

    it('only fetches from primary when fallback matches primary', async function () {
      setupDomainWarmingConfig(true, 'primary.com');

      const primaryMock = nock('https://api.mailgun.net')
        .get('/v3/primary.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1.json`);
      nock('https://api.mailgun.net')
        .get('/v3/primary.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`);

      const counter = createBatchCounter();
      await new MailgunClient({ config, settings }).fetchEvents(
        MAILGUN_OPTIONS,
        counter.batchHandler,
      );

      assert.equal(primaryMock.isDone(), true);
      assert.equal(counter.events, 4);
    });

    it('stops on error from primary domain', async function () {
      setupDomainWarmingConfig(true);

      nock('https://api.mailgun.net')
        .get('/v3/primary.com/events')
        .query(MAILGUN_OPTIONS)
        .reply(500);
      const fallbackMock = nock('https://api.mailgun.net')
        .get('/v3/fallback.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-2.json`);

      await assert.rejects(
        new MailgunClient({ config, settings }).fetchEvents(MAILGUN_OPTIONS, () => {}),
      );

      assert.equal(fallbackMock.isDone(), false);
    });

    it('fetches multiple pages from both domains', async function () {
      setupDomainWarmingConfig(true);

      nock('https://api.mailgun.net')
        .get('/v3/primary.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1.json`);
      nock('https://api.mailgun.net')
        .get('/v3/primary.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-2.json`);
      nock('https://api.mailgun.net')
        .get('/v3/primary.com/events/all-2-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`);
      nock('https://api.mailgun.net')
        .get('/v3/fallback.com/events')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/all-1.json`);
      nock('https://api.mailgun.net')
        .get('/v3/fallback.com/events/all-1-next')
        .query(MAILGUN_OPTIONS)
        .replyWithFile(200, `${__dirname}/fixtures/empty.json`);

      const counter = createBatchCounter();
      await new MailgunClient({ config, settings }).fetchEvents(
        MAILGUN_OPTIONS,
        counter.batchHandler,
      );

      assert.equal(counter.batches, 3);
      assert(counter.events >= 8);
    });
  });
});
