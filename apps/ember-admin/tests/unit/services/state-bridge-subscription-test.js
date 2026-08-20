import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupTest} from 'ember-mocha';

describe('Unit: Service: state-bridge subscription snapshot', function () {
    setupTest();

    it('stores only normalized dunning state before notifying React', function () {
        const stateBridge = this.owner.lookup('service:state-bridge');
        let stateObservedByListener;
        stateBridge.on('subscriptionChange', () => {
            stateObservedByListener = stateBridge.subscriptionState;
        });

        stateBridge.triggerSubscriptionChange({
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
            subscription: {
                status: 'past_due',
                isActiveTrial: false,
                trial_end: null
            },
            paymentAttempts: 3,
            forceUpgrade: false
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
            subscription: null,
            paymentAttempts: null,
            forceUpgrade: false
        });
    });
});
