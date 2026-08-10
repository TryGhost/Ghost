import Component from '@glimmer/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class DeleteMemberModal extends Component {
    @service notifications;

    @tracked shouldCancelSubscriptions = false;

    get member() {
        return this.args.data.member;
    }

    get hasActiveStripeSubscriptions() {
        const subscriptions = this.member.get('subscriptions');

        if (!subscriptions || subscriptions.length === 0) {
            return false;
        }

        const firstActiveStripeSubscription = subscriptions.find((subscription) => {
            return ['active', 'trialing', 'unpaid', 'past_due'].includes(subscription.status);
        });

        return firstActiveStripeSubscription !== undefined;
    }

    @task({drop: true})
    *deleteMemberTask() {
        const options = {
            adapterOptions: {
                cancel: this.shouldCancelSubscriptions
            }
        };

        try {
            yield this.member.destroyRecord(options);
            this.args.data.afterDelete?.();
            this.args.close(true);
        } catch (e) {
            this.notifications.showAPIError(e, {key: 'member.delete'});
            this.args.close(false);
            throw e;
        }
    }
}
