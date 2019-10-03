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
    subscription: computed('member.stripe', function () {
        let subscriptions = this.member.get('stripe');
        if (subscriptions && subscriptions.length > 0) {
            let latestSubscription = subscriptions[0];
            return {
                customer: latestSubscription.customer,
                name: latestSubscription.name,
                status: latestSubscription.status,
                validUntil: moment(latestSubscription.validUntil * 1000).format('MMM DD YYYY')
            };
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
