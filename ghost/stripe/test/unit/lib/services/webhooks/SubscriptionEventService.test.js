const chai = require('chai');
const sinon = require('sinon');
const {expect} = chai;

const SubscriptionEventService = require('../../../../../lib/services/webhook/SubscriptionEventService');

describe('SubscriptionEventService', function () {
    let service;
    let memberRepository;

    beforeEach(function () {
        memberRepository = {get: sinon.stub(), linkSubscription: sinon.stub()};

        service = new SubscriptionEventService({memberRepository});
    });

    it('should throw BadRequestError if subscription has no price item', async function () {
        const subscription = {
            items: {
                data: []
            }
        };

        try {
            await service.handleSubscriptionEvent(subscription);
            expect.fail('Expected BadRequestError');
        } catch (err) {
            expect(err.message).to.equal('Subscription should have exactly 1 price item');
        }
    });

    it('should throw ConflictError if linkSubscription fails with ER_DUP_ENTRY', async function () {
        const subscription = {
            items: {
                data: [{price: {id: 'price_123'}}]
            },
            customer: 'cust_123'
        };

        memberRepository.get.resolves({id: 'member_123'});
        memberRepository.linkSubscription.rejects({code: 'ER_DUP_ENTRY'});

        try {
            await service.handleSubscriptionEvent(subscription);
            expect.fail('Expected ConflictError');
        } catch (err) {
            expect(err.name).to.equal('ConflictError');
        }
    });

    it('should throw ConflictError if linkSubscription fails with SQLITE_CONSTRAINT', async function () {
        const subscription = {
            items: {
                data: [{price: {id: 'price_123'}}]
            },
            customer: 'cust_123'
        };

        memberRepository.get.resolves({id: 'member_123'});
        memberRepository.linkSubscription.rejects({code: 'SQLITE_CONSTRAINT'});

        try {
            await service.handleSubscriptionEvent(subscription);
            expect.fail('Expected ConflictError');
        } catch (err) {
            expect(err.name).to.equal('ConflictError');
        }
    });

    it('should throw if linkSubscription fails with unexpected error', async function () {
        const subscription = {
            items: {
                data: [{price: {id: 'price_123'}}]
            },
            customer: 'cust_123'
        };

        memberRepository.get.resolves({id: 'member_123'});
        memberRepository.linkSubscription.rejects(new Error('Unexpected error'));

        try {
            await service.handleSubscriptionEvent(subscription);
            expect.fail('Expected error');
        } catch (err) {
            expect(err.message).to.equal('Unexpected error');
        }
    });

    it('should catch and rethrow unexpected errors from member repository', async function () {
        memberRepository.get.rejects(new Error('Unexpected error'));

        try {
            await service.handleSubscriptionEvent({items: {data: [{price: {id: 'price_123'}}]}});
            expect.fail('Expected error');
        } catch (err) {
            expect(err.message).to.equal('Unexpected error');
        }
    });

    it('should call linkSubscription with correct arguments', async function () {
        const subscription = {
            items: {
                data: [{price: {id: 'price_123'}}]
            },
            customer: 'cust_123'
        };

        memberRepository.get.resolves({id: 'member_123'});

        await service.handleSubscriptionEvent(subscription);

        expect(memberRepository.linkSubscription.calledWith({id: 'member_123', subscription})).to.be.true;
    });
});
