const assert = require('assert/strict');
const sinon = require('sinon');
const WebhookController = require('../../../../../core/server/services/stripe/WebhookController');

describe('WebhookController', function () {
    let controller;
    let deps;
    let req;
    let res;

    beforeEach(function () {
        deps = {
            subscriptionEventService: {handleSubscriptionEvent: sinon.stub()},
            invoiceEventService: {handleInvoiceEvent: sinon.stub()},
            checkoutSessionEventService: {handleEvent: sinon.stub(), handleDonationEvent: sinon.stub()},
            webhookManager: {parseWebhook: sinon.stub()}
        };

        controller = new WebhookController(deps);

        req = {
            body: {},
            headers: {
                'stripe-signature': 'valid-signature'
            }
        };

        res = {
            writeHead: sinon.stub(),
            end: sinon.stub()
        };
    });

    it('should return 400 if request body or signature is missing', async function () {
        req.body = null;
        await controller.handle(req, res);
        assert(res.writeHead.calledWith(400));
    });

    it('should return 401 if webhook signature is invalid', async function () {
        deps.webhookManager.parseWebhook.throws(new Error('Invalid signature'));
        await controller.handle(req, res);
        assert(res.writeHead.calledWith(401));
        assert(res.end.called);
    });

    it('should handle customer.subscription.created event', async function () {
        const event = {
            type: 'customer.subscription.created',
            data: {
                object: {customer: 'cust_123'}
            }
        };
        deps.webhookManager.parseWebhook.returns(event);

        await controller.handle(req, res);

        assert(deps.subscriptionEventService.handleSubscriptionEvent.calledOnce);
        assert(res.writeHead.calledWith(200));
        assert(res.end.called);
    });

    it('should handle invoice.payment_succeeded event', async function () {
        const event = {
            type: 'invoice.payment_succeeded',
            data: {
                object: {subscription: 'sub_123'}
            }
        };
        deps.webhookManager.parseWebhook.returns(event);

        await controller.handle(req, res);

        assert(deps.invoiceEventService.handleInvoiceEvent.calledOnce);
        assert(res.writeHead.calledWith(200));
        assert(res.end.called);

        // expect(deps.invoiceEventService.handleInvoiceEvent.calledOnce).to.be.true;
        // expect(res.writeHead.calledWith(200)).to.be.true;
        // expect(res.end.called).to.be.true;
    });

    it('should handle checkout.session.completed event', async function () {
        const event = {
            type: 'checkout.session.completed',
            data: {
                object: {customer: 'cust_123'}
            }
        };
        deps.webhookManager.parseWebhook.returns(event);

        await controller.handle(req, res);
        assert(deps.checkoutSessionEventService.handleEvent.calledOnce);
        assert(res.writeHead.calledWith(200));
        assert(res.end.called);
        // expect(deps.checkoutSessionEventService.handleEvent.calledOnce).to.be.true;
        // expect(res.writeHead.calledWith(200)).to.be.true;
        // expect(res.end.called).to.be.true;
    });

    it('should handle customer subscription updated event', async function () {
        const event = {
            type: 'customer.subscription.updated',
            data: {
                object: {customer: 'cust_123'}
            }
        };

        deps.webhookManager.parseWebhook.returns(event);

        await controller.handle(req, res);

        assert(deps.subscriptionEventService.handleSubscriptionEvent.calledOnce);
        assert(res.writeHead.calledWith(200));
        assert(res.end.called);
    });

    it('should handle customer.subscription.deleted event', async function () {
        const event = {
            type: 'customer.subscription.deleted',
            data: {
                object: {customer: 'cust_123'}
            }
        };

        deps.webhookManager.parseWebhook.returns(event);

        await controller.handle(req, res);

        assert(deps.subscriptionEventService.handleSubscriptionEvent.calledOnce);
        assert(res.writeHead.calledWith(200));
        assert(res.end.called);
    });

    it('should return 500 if an error occurs', async function () {
        const event = {
            type: 'customer.subscription.created',
            data: {
                object: {customer: 'cust_123'}
            }
        };

        deps.webhookManager.parseWebhook.returns(event);
        deps.subscriptionEventService.handleSubscriptionEvent.throws(new Error('Unexpected error'));

        await controller.handle(req, res);

        assert(res.writeHead.calledWith(500));
        assert(res.end.called);
    });

    it('should not handle unknown event type', async function () {
        const event = {
            type: 'invalid.event',
            data: {
                object: {customer: 'cust_123'}
            }
        };

        deps.webhookManager.parseWebhook.returns(event);

        await controller.handle(req, res);

        assert(res.writeHead.calledWith(200));
        assert(res.end.called);
    });
});
