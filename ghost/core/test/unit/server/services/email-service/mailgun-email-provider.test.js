const MailgunEmailProvider = require('../../../../../core/server/services/email-service/mailgun-email-provider');
const sinon = require('sinon');
const assert = require('node:assert/strict');

describe('Mailgun Email Provider', function () {
  describe('send', function () {
    let mailgunClient;
    let sendStub;
    let config;

    beforeEach(function () {
      sendStub = sinon.stub().resolves({
        id: 'provider-123',
      });

      mailgunClient = {
        send: sendStub,
      };
      config = {
        get: sinon.stub(),
      };
    });

    afterEach(function () {
      sinon.restore();
    });

    it('calls mailgun client with correct data', async function () {
      config.get.withArgs('bulkEmail:mailgun:tag').returns('newsletter-email');

      const mailgunEmailProvider = new MailgunEmailProvider({
        mailgunClient,
        config,
      });

      const deliveryTime = new Date();

      const response = await mailgunEmailProvider.send(
        {
          subject: 'Hi',
          html: '<html><body>Hi {{name}}</body></html>',
          plaintext: 'Hi',
          from: 'ghost@example.com',
          replyTo: 'ghost@example.com',
          emailId: '123',
          domainOverride: undefined,
          recipients: [
            {
              email: 'member@example.com',
              replacements: [
                {
                  id: 'name',
                  token: '{{name}}',
                  value: 'John',
                },
              ],
            },
          ],
          replacementDefinitions: [
            {
              id: 'name',
              token: '{{name}}',
              getValue: () => 'John',
            },
          ],
        },
        {
          clickTrackingEnabled: true,
          openTrackingEnabled: true,
          deliveryTime,
        },
      );
      assert.equal(response.id, 'provider-123');
      sinon.assert.calledOnce(sendStub);
      sinon.assert.calledWith(
        sendStub,
        {
          subject: 'Hi',
          html: '<html><body>Hi %recipient.name_html%</body></html>',
          plaintext: 'Hi',
          from: 'ghost@example.com',
          replyTo: 'ghost@example.com',
          id: '123',
          domainOverride: undefined,
          deliveryTime,
          track_opens: true,
          track_clicks: true,
          tags: ['bulk-email', 'newsletter-email'],
        },
        { 'member@example.com': { name: 'John', name_html: 'John' } },
        [],
      );
    });

    it('does not html-escape trusted replacements', async function () {
      const mailgunEmailProvider = new MailgunEmailProvider({
        mailgunClient,
        config,
      });

      const unsubscribeUrl = 'http://127.0.0.1:2369/unsubscribe/?uuid=abc&key=def';

      await mailgunEmailProvider.send(
        {
          subject: 'Hi',
          html: '<html><body><a href="{{unsubscribe_url}}">Hi {{name}}</a></body></html>',
          plaintext: '{{unsubscribe_url}} {{name}}',
          from: 'ghost@example.com',
          replyTo: 'ghost@example.com',
          emailId: '123',
          domainOverride: undefined,
          recipients: [
            {
              email: 'member@example.com',
              replacements: [
                {
                  id: 'unsubscribe_url',
                  token: '{{unsubscribe_url}}',
                  value: unsubscribeUrl,
                },
                {
                  id: 'name',
                  token: '{{name}}',
                  value: '<script>alert(1)</script>',
                },
              ],
            },
          ],
          replacementDefinitions: [
            {
              id: 'unsubscribe_url',
              token: '{{unsubscribe_url}}',
              getValue: () => unsubscribeUrl,
              trusted: true,
            },
            {
              id: 'name',
              token: '{{name}}',
              getValue: () => '<script>alert(1)</script>',
            },
          ],
        },
        {
          clickTrackingEnabled: true,
          openTrackingEnabled: true,
        },
      );

      const [messageData, recipientData] = sendStub.firstCall.args;

      // The trusted url keeps the plain variable in both bodies, so its query
      // string isn't entity-encoded inside the href
      assert.equal(
        messageData.html,
        '<html><body><a href="%recipient.unsubscribe_url%">Hi %recipient.name_html%</a></body></html>',
      );
      assert.equal(messageData.plaintext, '%recipient.unsubscribe_url% %recipient.name%');

      assert.deepEqual(recipientData['member@example.com'], {
        unsubscribe_url: unsubscribeUrl,
        name: '<script>alert(1)</script>',
        name_html: '&lt;script&gt;alert(1)&lt;/script&gt;',
      });
    });

    it('handles mailgun client error correctly', async function () {
      const mailgunErr = new Error('Bad Request');
      mailgunErr.details = 'Invalid domain';
      mailgunErr.status = 400;
      sendStub = sinon.stub().throws({
        error: mailgunErr,
        messageData: {},
      });

      mailgunClient = {
        send: sendStub,
      };

      const mailgunEmailProvider = new MailgunEmailProvider({
        mailgunClient,
        config,
      });
      await assert.rejects(
        async () => {
          await mailgunEmailProvider.send(
            {
              subject: 'Hi',
              html: '<html><body>Hi {{name}}</body></html>',
              plaintext: 'Hi',
              from: 'ghost@example.com',
              replyTo: 'ghost@example.com',
              emailId: '123',
              recipients: [
                {
                  email: 'member@example.com',
                  replacements: [
                    {
                      id: 'name',
                      token: '{{name}}',
                      value: 'John',
                    },
                  ],
                },
              ],
              replacementDefinitions: [
                {
                  id: 'name',
                  token: '{{name}}',
                  getValue: () => 'John',
                },
              ],
            },
            {},
          );
          assert.fail();
        },
        {
          message: 'Bad Request: Invalid domain',
          statusCode: 400,
          errorDetails: '{"error":{"details":"Invalid domain","status":400},"messageData":{}}',
        },
      );
    });

    it('handles unknown error correctly', async function () {
      const mailgunErr = new Error('Unknown Error');
      sendStub = sinon.stub().throws(mailgunErr);

      mailgunClient = {
        send: sendStub,
      };

      const mailgunEmailProvider = new MailgunEmailProvider({
        mailgunClient,
        config,
      });
      await assert.rejects(
        async () => {
          await mailgunEmailProvider.send(
            {
              subject: 'Hi',
              html: '<html><body>Hi {{name}}</body></html>',
              plaintext: 'Hi',
              from: 'ghost@example.com',
              replyTo: 'ghost@example.com',
              emailId: '123',
              recipients: [
                {
                  email: 'member@example.com',
                  replacements: [
                    {
                      id: 'name',
                      token: '{{name}}',
                      value: 'John',
                    },
                  ],
                },
              ],
              replacementDefinitions: [
                {
                  id: 'name',
                  token: '{{name}}',
                  getValue: () => 'John',
                },
              ],
            },
            {},
          );
          assert.fail();
        },
        {
          message: 'Unknown Error',
          errorDetails: undefined,
        },
      );
    });

    it('handles empty error correctly', async function () {
      const mailgunErr = new Error('');
      sendStub = sinon.stub().throws(mailgunErr);

      mailgunClient = {
        send: sendStub,
      };

      const mailgunEmailProvider = new MailgunEmailProvider({
        mailgunClient,
        config,
      });
      await assert.rejects(
        async () => {
          await mailgunEmailProvider.send(
            {
              subject: 'Hi',
              html: '<html><body>Hi {{name}}</body></html>',
              plaintext: 'Hi',
              from: 'ghost@example.com',
              replyTo: 'ghost@example.com',
              emailId: '123',
              recipients: [
                {
                  email: 'member@example.com',
                  replacements: [
                    {
                      id: 'name',
                      token: '{{name}}',
                      value: 'John',
                    },
                  ],
                },
              ],
              replacementDefinitions: [
                {
                  id: 'name',
                  token: '{{name}}',
                  getValue: () => 'John',
                },
              ],
            },
            {},
          );
          assert.fail();
        },
        {
          message: 'Mailgun Error',
          errorDetails: undefined,
        },
      );
    });
  });

  describe('getMaximumRecipients', function () {
    let mailgunClient;
    let getBatchSizeStub;

    it('returns 1000', function () {
      getBatchSizeStub = sinon.stub().returns(1000);

      mailgunClient = {
        getBatchSize: getBatchSizeStub,
      };

      const provider = new MailgunEmailProvider({
        mailgunClient,
      });
      assert.equal(provider.getMaximumRecipients(), 1000);
    });
  });

  describe('getTargetDeliveryWindow', function () {
    let mailgunClient;
    let getTargetDeliveryWindowStub;

    it('returns the configured target delivery window', function () {
      getTargetDeliveryWindowStub = sinon.stub().returns(0);

      mailgunClient = {
        getTargetDeliveryWindow: getTargetDeliveryWindowStub,
      };

      const provider = new MailgunEmailProvider({
        mailgunClient,
      });
      assert.equal(provider.getTargetDeliveryWindow(), 0);
    });
  });
});
