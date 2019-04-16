import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    members: controller(),
    store: service(),

    router: service(),

    member: alias('model'),

    subscription: computed('member.subscriptions', function () {
        let subscriptions = this.member.get('subscriptions');
        if (!subscriptions) {
            return {
                amount: '...',
                status: '...',
                plan: '...'
            };
        }
        let subscription = subscriptions[0] || {};
        return {
            amount: subscription.amount ? (subscription.amount / 100) : 0,
            status: subscription.status || '-',
            plan: subscription.plan || 'Free'
        };
    }),

    actions: {
        finaliseDeletion() {
            // decrememnt the total member count manually so there's no flash
            // when transitioning back to the members list
            if (this.members.meta) {
                this.members.decrementProperty('meta.pagination.total');
            }
            this.router.transitionTo('members');
        }
    },

    fetchMember: task(function* (memberId) {
        yield this.store.findRecord('member', memberId, {
            reload: true
        }).then((data) => {
            this.set('member', data);
        });
    })

});
