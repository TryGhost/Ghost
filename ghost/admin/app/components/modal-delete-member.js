import ModalComponent from 'ghost-admin/components/modal-base';
import {alias, reads} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default ModalComponent.extend({
    membersStats: service(),

    shouldCancelSubscriptions: false,

    // Allowed actions
    confirm: () => {},

    member: alias('model'),

    cancelSubscriptions: reads('shouldCancelSubscriptions'),

    hasActiveStripeSubscriptions: computed('member', function () {
        let subscriptions = this.member.get('subscriptions');

        if (!subscriptions || subscriptions.length === 0) {
            return false;
        }

        let firstActiveStripeSubscription = subscriptions.find((subscription) => {
            return ['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.status);
        });

        return firstActiveStripeSubscription !== undefined;
    }),

    actions: {
        confirm() {
            this.deleteMember.perform();
        },

        toggleShouldCancelSubscriptions() {
            this.set('shouldCancelSubscriptions', !this.shouldCancelSubscriptions);
        }
    },

    deleteMember: task(function* () {
        try {
            yield this.confirm(this.shouldCancelSubscriptions);
            this.membersStats.invalidate();
        } finally {
            this.send('closeModal');
        }
    }).drop()
});
