import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';
import {computed} from '@ember/object';

export default Controller.extend({
    integration: alias('model.integration'),
    hostLimitError: alias('model.hostLimitError'),

    showUpgradeModal: computed('hostLimitError', function () {
        if (this.hostLimitError) {
            return true;
        }

        return false;
    }),

    actions: {
        save() {
            return this.integration.save();
        },

        cancel() {
            // 'new' route's dectivate hook takes care of rollback
            this.transitionToRoute('integrations');
        }
    }
});
