import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: state-bridge subscription snapshot', function () {
    setupTest();

    beforeEach(function () {
        this.owner.lookup('service:session').user = {isOwnerOnly: true};
    });

    it('stores only normalized dunning state before notifying React', function () {
        const stateBridge = this.owner.lookup('service:state-bridge');
        let stateObservedByListener;
        stateBridge.on('subscriptionChange', () => {
            stateObservedByListener = stateBridge.subscriptionState;
        });

        stateBridge.triggerSubscriptionChange({
            isGrace: true,
            subscription: {
                status: 'past_due',
                id: 'sensitive-subscription-id'
            },
            user: {
                payment_attempts: 3,
                email_address: 'billing@example.com'
            },
            forceUpgrade: false,
            customer: {
                email: 'customer@example.com'
            }
        });

        expect(stateBridge.subscriptionState).to.deep.equal({
            isGrace: true,
            subscription: {
                status: 'past_due',
                isActiveTrial: false,
                trial_end: null,
                paymentAttempts: 3,
                forceUpgrade: false
            }
        });
        expect(stateObservedByListener).to.equal(stateBridge.subscriptionState);
    });

    it('normalizes malformed and missing values without throwing', function () {
        const stateBridge = this.owner.lookup('service:state-bridge');

        stateBridge.triggerSubscriptionChange({
            subscription: null,
            user: {payment_attempts: 'unknown'},
            forceUpgrade: 'true'
        });

        expect(stateBridge.subscriptionState).to.deep.equal({
            isGrace: false,
            subscription: null
        });
    });

    it('preserves a numeric zero payment-attempt count', function () {
        const stateBridge = this.owner.lookup('service:state-bridge');

        stateBridge.triggerSubscriptionChange({
            isGrace: true,
            subscription: {status: 'past_due'},
            user: {payment_attempts: 0},
            forceUpgrade: false
        });

        expect(stateBridge.subscriptionState.subscription.paymentAttempts).to.equal(0);
    });

    it('does not expose payment-attempt counts to staff', function () {
        const stateBridge = this.owner.lookup('service:state-bridge');
        this.owner.lookup('service:session').user = {isOwnerOnly: false};

        stateBridge.triggerSubscriptionChange({
            isGrace: true,
            subscription: {status: 'past_due'},
            user: {payment_attempts: 3},
            forceUpgrade: false
        });

        expect(stateBridge.subscriptionState.subscription.paymentAttempts).to.be.null;
    });

    it('normalizes the Billing grace flag without deriving it from status', function () {
        const stateBridge = this.owner.lookup('service:state-bridge');

        stateBridge.triggerSubscriptionChange({
            subscription: {status: 'unpaid'},
            isGrace: 'true'
        });

        expect(stateBridge.subscriptionState.isGrace).to.be.false;
    });
});
