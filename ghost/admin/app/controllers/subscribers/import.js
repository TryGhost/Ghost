import Controller from '@ember/controller';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    subscribers: controller(),
    router: service(),

    actions: {
        fetchNewSubscribers() {
            this.subscribers.fetchSubscribers.perform();
        },

        close() {
            this.router.transitionTo('subscribers');
        }
    }
});
