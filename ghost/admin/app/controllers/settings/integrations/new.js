import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';

export default Controller.extend({
    integration: alias('model'),

    actions: {
        save() {
            return this.integration.save();
        },

        cancel() {
            // 'new' route's dectivate hook takes care of rollback
            this.transitionToRoute('settings.integrations');
        }
    }
});
