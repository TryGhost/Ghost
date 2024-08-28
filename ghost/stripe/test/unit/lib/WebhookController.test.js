const chai = require('chai');
const sinon = require('sinon');
const {expect} = chai;
const WebhookController = require('../../../lib/WebhookController');
// const {DonationPaymentEvent} = require('@tryghost/donations');

describe('WebhookController', function () {
    let controller;
    let deps;
    let req;
    let res;

    beforeEach(function () {
        deps = {
            api: {getSubscription: sinon.stub(), getCustomer: sinon.stub(), getSetupIntent: sinon.stub(), attachPaymentMethodToCustomer: sinon.stub(), updateSubscriptionDefaultPaymentMethod: sinon.stub()},
            webhookManager: {parseWebhook: sinon.stub()},
            eventRepository: {registerPayment: sinon.stub()},
            memberRepository: {get: sinon.stub(), create: sinon.stub(), update: sinon.stub(), linkSubscription: sinon.stub(), upsertCustomer: sinon.stub()},
            donationRepository: {save: sinon.stub()},
            productRepository: {get: sinon.stub()},
            staffServiceEmails: {notifyDonationReceived: sinon.stub()},
            sendSignupEmail: sinon.stub()
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
        expect(res.writeHead.calledWith(400)).to.be.true;
        expect(res.end.called).to.be.true;
    });

    it('should return 401 if webhook signature is invalid', async function () {
        deps.webhookManager.parseWebhook.throws(new Error('Invalid signature'));
        await controller.handle(req, res);
        expect(res.writeHead.calledWith(401)).to.be.true;
        expect(res.end.called).to.be.true;
    });

    it('should handle customer.subscription.created event', async function () {
        const event = {
            type: 'customer.subscription.created',
            data: {
                object: {customer: 'cust_123', items: {data: [{price: {id: 'price_123'}}]}}
            }
        };
        deps.webhookManager.parseWebhook.returns(event);
        deps.memberRepository.get.resolves({id: 'member_123'});

        await controller.handle(req, res);

        expect(deps.memberRepository.get.calledWith({customer_id: 'cust_123'})).to.be.true;
        expect(deps.memberRepository.linkSubscription.calledOnce).to.be.true;
        expect(res.writeHead.calledWith(200)).to.be.true;
        expect(res.end.called).to.be.true;
    });

    it('should handle a donation in checkoutSessionEvent', async function () {
        const session = {
            mode: 'payment',
            metadata: {
                ghost_donation: true,
                attribution_id: 'attr_123',
                attribution_url: 'https://example.com',
                attribution_type: 'referral',
                referrer_source: 'google',
                referrer_medium: 'cpc',
                referrer_url: 'https://referrer.com'
            },
            amount_total: 5000,
            currency: 'usd',
            customer: 'cust_123',
            customer_details: {
                name: 'John Doe',
                email: 'john@example.com'
            },
            custom_fields: [{
                key: 'donation_message',
                text: {
                    value: 'Thank you for the awesome newsletter!'
                }
            }]
        };

        const member = {
            id: 'member_123',
            get: sinon.stub()
        };

        member.get.withArgs('name').returns('John Doe');
        member.get.withArgs('email').returns('john@example.com');

        deps.memberRepository.get.resolves(member);

        await controller.checkoutSessionEvent(session);

        expect(deps.memberRepository.get.calledWith({customer_id: 'cust_123'})).to.be.true;
        expect(deps.donationRepository.save.calledOnce).to.be.true;
        expect(deps.staffServiceEmails.notifyDonationReceived.calledOnce).to.be.true;
    
        const savedDonationEvent = deps.donationRepository.save.getCall(0).args[0];
        expect(savedDonationEvent.amount).to.equal(5000);
        expect(savedDonationEvent.currency).to.equal('usd');
        expect(savedDonationEvent.name).to.equal('John Doe');
        expect(savedDonationEvent.email).to.equal('john@example.com');
        expect(savedDonationEvent.donationMessage).to.equal('Thank you for the awesome newsletter!');
        expect(savedDonationEvent.attributionId).to.equal('attr_123');
        expect(savedDonationEvent.attributionUrl).to.equal('https://example.com');
        expect(savedDonationEvent.attributionType).to.equal('referral');
        expect(savedDonationEvent.referrerSource).to.equal('google');
        expect(savedDonationEvent.referrerMedium).to.equal('cpc');
        expect(savedDonationEvent.referrerUrl).to.equal('https://referrer.com');
    });

    it('donation message is null if string is empty', async function () {
        const session = {
            mode: 'payment',
            metadata: {
                ghost_donation: true,
                attribution_id: 'attr_123',
                attribution_url: 'https://example.com',
                attribution_type: 'referral',
                referrer_source: 'google',
                referrer_medium: 'cpc',
                referrer_url: 'https://referrer.com'
            },
            amount_total: 5000,
            currency: 'usd',
            customer: 'cust_123',
            customer_details: {
                name: 'JW',
                email: 'jw@ily.co'
            },
            custom_fields: [{
                key: 'donation_message',
                text: {
                    value: ''
                }
            }]
        };

        const member = {
            id: 'member_123',
            get: sinon.stub()
        };

        member.get.withArgs('name').returns('JW');
        member.get.withArgs('email').returns('jw@ily.co');

        deps.memberRepository.get.resolves(member);

        await controller.checkoutSessionEvent(session);

        expect(deps.memberRepository.get.calledWith({customer_id: 'cust_123'})).to.be.true;

        const savedDonationEvent = deps.donationRepository.save.getCall(0).args[0];

        expect(savedDonationEvent.donationMessage).to.equal(null);
    });
});
