const sinon = require('sinon');
const assert = require('assert/strict');

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
            assert.fail('Expected BadRequestError');
        } catch (err) {
            assert.equal(err.message, 'Subscription should have exactly 1 price item');
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
            assert.fail('Expected ConflictError');
        } catch (err) {
            assert(err.name, 'ConflictError');
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
            assert.fail('Expected ConflictError');
        } catch (err) {
            assert(err.name, 'ConflictError');
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
            assert.fail('Expected error');
        } catch (err) {
            assert.equal(err.message, 'Unexpected error');
        }
    });

    it('should catch and rethrow unexpected errors from member repository', async function () {
        memberRepository.get.rejects(new Error('Unexpected error'));

        try {
            await service.handleSubscriptionEvent({items: {data: [{price: {id: 'price_123'}}]}});
            assert.fail('Expected error');
        } catch (err) {
            assert.equal(err.message, 'Unexpected error');
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

        assert(memberRepository.linkSubscription.calledWith({id: 'member_123', subscription}));
    });
});
