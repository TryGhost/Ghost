const assert = require('node:assert/strict');
const sinon = require('sinon');
const nock = require('nock');
const LimitService = require('@tryghost/limit-service');

const WebhookTrigger = require('../../../core/server/services/webhooks/webhook-trigger');
const configUtils = require('../../utils/config-utils');

// for dns stub needed by request-external
const dnsPromises = require('dns').promises;

const WEBHOOK_EVENT = 'post.added';
const WEBHOOK_TARGET = 'https://test-webhook-receiver.com';
const WEBHOOK_PATH = '/webhook-delivery/';

describe('Webhook delivery', function () {
    let models, payload, limitService;

    beforeEach(function () {
        models = {
            Webhook: {
                edit: sinon.stub().resolves(null),
                destroy: sinon.stub().resolves(null),
                findAllByEvent: sinon.stub()
            }
        };

        payload = sinon.stub().resolves({post: {current: {id: 1, title: 'Test'}, previous: {}}});

        const realLimitService = new LimitService();
        limitService = sinon.stub(realLimitService);
        limitService.isLimited.withArgs('customIntegrations').returns(false);

        // Stub DNS so request-external doesn't fail on fake domains
        if (!dnsPromises.lookup.restore) {
            sinon.stub(dnsPromises, 'lookup').resolves({address: '123.123.123.123', family: 4});
        }

        nock.disableNetConnect();
    });

    afterEach(async function () {
        nock.cleanAll();
        nock.enableNetConnect();
        await configUtils.restore();
        sinon.restore();
    });

    function setupWebhookModel(secret = '') {
        const webhookModel = {
            id: 'webhook-test-id',
            get: sinon.stub()
        };
        webhookModel.get.withArgs('event').returns(WEBHOOK_EVENT);
        webhookModel.get.withArgs('target_url').returns(WEBHOOK_TARGET + WEBHOOK_PATH);
        webhookModel.get.withArgs('secret').returns(secret);

        models.Webhook.findAllByEvent
            .withArgs(WEBHOOK_EVENT, {context: {internal: true}})
            .resolves({models: [webhookModel]});

        return webhookModel;
    }

    describe('using @tryghost/request (allowWebhookInternalIPs: true)', function () {
        it('delivers webhook payload via POST', async function () {
            configUtils.set('security:allowWebhookInternalIPs', true);
            setupWebhookModel();

            const scope = nock(WEBHOOK_TARGET)
                .post(WEBHOOK_PATH)
                .reply(200, {status: 'OK'});

            const trigger = new WebhookTrigger({models, payload, limitService});

            await trigger.trigger(WEBHOOK_EVENT, {});

            assert.ok(scope.isDone(), 'Expected webhook to be delivered as a POST request via @tryghost/request');
        });
    });

    describe('using request-external (allowWebhookInternalIPs: false)', function () {
        it('delivers webhook payload via POST', async function () {
            configUtils.set('security:allowWebhookInternalIPs', false);
            configUtils.set('env', 'development'); // bypass IP validation in request-external
            setupWebhookModel();

            const scope = nock(WEBHOOK_TARGET)
                .post(WEBHOOK_PATH)
                .reply(200, {status: 'OK'});

            const trigger = new WebhookTrigger({models, payload, limitService});

            await trigger.trigger(WEBHOOK_EVENT, {});

            assert.ok(scope.isDone(), 'Expected webhook to be delivered as a POST request via request-external');
        });
    });
});
