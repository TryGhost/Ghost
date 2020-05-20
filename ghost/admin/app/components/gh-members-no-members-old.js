import Component from '@ember/component';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency';

export default Component.extend({
    session: service(),
    store: service(),
    notifications: service(),

    actions: {
        addYourself() {
            return this.add.perform();
        }
    },

    add: task(function* () {
        const member = this.store.createRecord('member', {
            email: this.get('session.user.email'),
            name: this.get('session.user.name')
        });

        try {
            // NOTE: has to be before member.save() is performed otherwise component is
            //       destroyed before notification is shown
            this.notifications.showNotification('Member added'.htmlSafe(),
                {
                    description: 'You\'ve successfully added yourself as a member.'
                }
            );

            return yield member.save();
        } catch (error) {
            if (error) {
                this.notifications.showAPIError(error, {key: 'member.save'});
            }
        }
    }).drop()
});
