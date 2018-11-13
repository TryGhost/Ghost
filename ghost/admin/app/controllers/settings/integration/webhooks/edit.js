import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';

export default Controller.extend({
    webhook: alias('model'),

    actions: {
        save() {
            return this.webhook.save();
        },

        cancel() {
            // 'new' route's dectivate hook takes care of rollback
            return this.webhook.get('integration').then((integration) => {
                this.transitionToRoute('settings.integration', integration);
            });
        }
    },

    reset() {
        this.webhook.rollbackAttributes();
        this.webhook.errors.clear();
    }
});
