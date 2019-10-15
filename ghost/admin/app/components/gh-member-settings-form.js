import Component from '@ember/component';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import moment from 'moment';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    feature: service(),
    config: service(),
    mediaQueries: service(),

    isViewingSubview: false,

    // Allowed actions
    setProperty: () => {},
    showDeleteTagModal: () => {},

    scratchName: boundOneWay('member.name'),
    scratchEmail: boundOneWay('member.email'),
    scratchNote: boundOneWay('member.note'),
    subscriptions: computed('member.stripe', function () {
        let subscriptions = this.member.get('stripe');
        if (subscriptions && subscriptions.length > 0) {
            return subscriptions.map((subscription) => {
                return {
                    customer: subscription.customer,
                    name: subscription.name || '',
                    email: subscription.email || '',
                    status: subscription.status,
                    startDate: subscription.start_date ? moment(subscription.start_date).format('MMM DD YYYY') : '-',
                    plan: subscription.plan,
                    dollarAmount: parseInt(subscription.plan.amount) ? (subscription.plan.amount / 100) : 0,
                    validUntil: subscription.current_period_end ? moment(subscription.current_period_end).format('MMM DD YYYY') : '-'
                };
            }).reverse();
        }
        return null;
    }),
    hasMultipleSubscriptions: computed('member.stripe', function () {
        let subscriptions = this.member.get('stripe');
        if (subscriptions && subscriptions.length > 1) {
            return true;
        }
        return false;
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
