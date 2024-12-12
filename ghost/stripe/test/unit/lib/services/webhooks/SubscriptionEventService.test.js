const sinon = require('sinon');
const assert = require('assert/strict');

const SubscriptionEventService = require('../../../../../lib/services/webhook/SubscriptionEventService');

describe('SubscriptionEventService', function () {
    let service;
    let memberRepository;
    let member;
    let subscription;

    beforeEach(function () {
        member = {
            id: 'member_123',
            related: sinon.stub().returns({
                query: sinon.stub().returns({
                    fetchOne: sinon.stub().resolves({subscription_id: 'sub_123'})
                })
            })
        };

        memberRepository = {
            get: sinon.stub().resolves(member),
            linkSubscription: sinon.stub()
        };

        subscription = {
            id: 'sub_123',
            items: {
                data: [{price: {id: 'price_123'}}]
            },
            customer: 'cust_123'
        };

        service = new SubscriptionEventService({memberRepository});
    });

    it('should not call linkSubscription if member does not exist', async function () {
        memberRepository.get.resolves(null);

        await service.handleSubscriptionEvent(subscription);
        assert(memberRepository.linkSubscription.notCalled);
    });

    it('should not call linkSubscription if member subscription does not exist', async function () {
        member.related.returns({
            query: sinon.stub().returns({
                fetchOne: sinon.stub().resolves(null)
            })
        });

        await service.handleSubscriptionEvent(subscription);
        assert(memberRepository.linkSubscription.notCalled);
    });

    it('should throw BadRequestError if subscription has no price item', async function () {
        subscription = {
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
        memberRepository.linkSubscription.rejects({code: 'ER_DUP_ENTRY'});

        try {
            await service.handleSubscriptionEvent(subscription);
            assert.fail('Expected ConflictError');
        } catch (err) {
            assert(err.name, 'ConflictError');
        }
    });

    it('should throw ConflictError if linkSubscription fails with SQLITE_CONSTRAINT', async function () {
        memberRepository.linkSubscription.rejects({code: 'SQLITE_CONSTRAINT'});

        try {
            await service.handleSubscriptionEvent(subscription);
            assert.fail('Expected ConflictError');
        } catch (err) {
            assert(err.name, 'ConflictError');
        }
    });

    it('should throw if linkSubscription fails with unexpected error', async function () {
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
        await service.handleSubscriptionEvent(subscription);

        assert(memberRepository.linkSubscription.calledWith({id: 'member_123', subscription}));
    });
});
