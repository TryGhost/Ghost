import Controller from '@ember/controller';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';

/* eslint-disable ghost/ember/alias-model-in-controller */
export default Controller.extend({
    members: controller(),
    router: service(),

    actions: {
        fetchNewMembers() {
            this.members.fetchMembers.perform();
        },

        close() {
            this.router.transitionTo('members');
        }
    }
});
