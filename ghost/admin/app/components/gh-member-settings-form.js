import Component from '@ember/component';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import moment from 'moment';
import {computed} from '@ember/object';
import {gt, reads} from '@ember/object/computed';
import {inject as service} from '@ember/service';

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),

    // Allowed actions
    setProperty: () => {},
    showDeleteTagModal: () => {},

    canEditEmail: reads('member.isNew'),

    scratchName: boundOneWay('member.name'),
    scratchEmail: boundOneWay('member.email'),
    scratchNote: boundOneWay('member.note'),

    hasMultipleSubscriptions: gt('member.stripe', 1),

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
                    startDate: subscription.start_date ? moment(subscription.start_date).format('MMM DD YYYY') : '-',
                    plan: subscription.plan,
                    dollarAmount: parseInt(subscription.plan.amount) ? (subscription.plan.amount / 100) : 0,
                    cancelAtPeriodEnd: subscription.cancel_at_period_end,
                    validUntil: subscription.current_period_end ? moment(subscription.current_period_end).format('MMM DD YYYY') : '-'
                };
            }).reverse();
        }
        return null;
    }),

    actions: {
        setProperty(property, value) {
            this.setProperty(property, value);
        },

        deleteTag() {
            this.showDeleteTagModal();
        }
    }

});
