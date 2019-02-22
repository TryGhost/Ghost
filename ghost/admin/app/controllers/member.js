import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';
import {inject as controller} from '@ember/controller';
import {inject as service} from '@ember/service';

export default Controller.extend({
    members: controller(),
    router: service(),

    member: alias('model'),

    actions: {
        finaliseDeletion() {
            // decrememnt the total member count manually so there's no flash
            // when transitioning back to the members list
            if (this.members.meta) {
                this.members.decrementProperty('meta.pagination.total');
            }
            this.router.transitionTo('members');
        }
    }
});
