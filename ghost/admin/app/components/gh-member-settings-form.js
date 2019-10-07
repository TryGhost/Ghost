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
    scratchDescription: '',

    // Allowed actions
    setProperty: () => {},
    showDeleteTagModal: () => {},

    scratchName: boundOneWay('member.name'),
    scratchEmail: boundOneWay('member.email'),
    subscriptions: computed('member.stripe', function () {
        let subscriptions = this.member.get('stripe');
        if (subscriptions && subscriptions.length > 0) {
            return subscriptions.map((subscription) => {
                return {
                    customer: subscription.customer,
                    name: '',
                    email: subscription.email || '',
                    status: subscription.status,
                    startDate: '',
                    planName: subscription.name,
                    validUntil: moment(subscription.validUntil * 1000).format('MMM DD YYYY')
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
