import Component from '@ember/component';
import moment from 'moment';
import {computed} from '@ember/object';
import {gt} from '@ember/object/computed';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Component.extend({
    membersUtils: service(),
    feature: service(),
    config: service(),
    mediaQueries: service(),
    ghostPaths: service(),
    ajax: service(),
    store: service(),

    // Allowed actions
    setProperty: () => {},

    hasMultipleSubscriptions: gt('member.stripe', 1),

    canShowStripeInfo: computed('member.isNew', 'membersUtils.isStripeEnabled', function () {
        let stripeEnabled = this.membersUtils.isStripeEnabled;

        if (this.member.get('isNew') || !stripeEnabled) {
            return false;
        } else {
            return true;
        }
    }),

    subscriptions: computed('member.stripe', function () {
        let subscriptions = this.member.get('stripe');
        if (subscriptions && subscriptions.length > 0) {
            return subscriptions.map((subscription) => {
                return {
                    id: subscription.id,
                    customer: subscription.customer,
                    name: subscription.name || '',
                    email: subscription.email || '',
                    status: subscription.status,
                    startDate: subscription.start_date ? moment(subscription.start_date).format('D MMM YYYY') : '-',
                    plan: subscription.plan,
                    amount: parseInt(subscription.plan.amount) ? (subscription.plan.amount / 100) : 0,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    validUntil: subscription.current_period_end ? moment(subscription.current_period_end).format('D MMM YYYY') : '-'
                };
            }).reverse();
        }
        return null;
    }),

    actions: {
        setProperty(property, value) {
            this.setProperty(property, value);
        }
    },

    cancelSubscription: task(function* (subscriptionId) {
        let url = this.get('ghostPaths.url').api('members', this.member.get('id'), 'subscriptions', subscriptionId);

        let response = yield this.ajax.put(url, {
            data: {
                cancel_at_period_end: true
            }
        });

        this.store.pushPayload('member', response);
        return response;
    }).drop(),

    continueSubscription: task(function* (subscriptionId) {
        let url = this.get('ghostPaths.url').api('members', this.member.get('id'), 'subscriptions', subscriptionId);

        let response = yield this.ajax.put(url, {
            data: {
                cancel_at_period_end: false
            }
        });

        this.store.pushPayload('member', response);
        return response;
    }).drop()
});
