const chai = require('chai');
const sinon = require('sinon');
const {expect} = chai;

const SubscriptionEventService = require('../../../../lib/services/SubscriptionEventService');

describe('SubscriptionEventService', function () {
    let service;
    let deps;

    beforeEach(function () {
        deps = {
            memberRepository: {get: sinon.stub(), linkSubscription: sinon.stub()}
        };

        service = new SubscriptionEventService(deps);
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

        deps.memberRepository.get.resolves({id: 'member_123'});
        deps.memberRepository.linkSubscription.rejects({code: 'ER_DUP_ENTRY'});

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

        deps.memberRepository.get.resolves({id: 'member_123'});
        deps.memberRepository.linkSubscription.rejects({code: 'SQLITE_CONSTRAINT'});

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

        deps.memberRepository.get.resolves({id: 'member_123'});
        deps.memberRepository.linkSubscription.rejects(new Error('Unexpected error'));

        try {
            await service.handleSubscriptionEvent(subscription);
            expect.fail('Expected error');
        } catch (err) {
            expect(err.message).to.equal('Unexpected error');
        }
    });

    it('should catch and rethrow unexpected errors from member repository', async function () {
        deps.memberRepository.get.rejects(new Error('Unexpected error'));

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

        deps.memberRepository.get.resolves({id: 'member_123'});

        await service.handleSubscriptionEvent(subscription);

        expect(deps.memberRepository.linkSubscription.calledWith({id: 'member_123', subscription})).to.be.true;
    });
});