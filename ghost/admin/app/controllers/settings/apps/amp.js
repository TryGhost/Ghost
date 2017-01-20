import Controller from 'ember-controller';
import injectService from 'ember-service/inject';

export default Controller.extend({
    notifications: injectService(),

    // will be set by route
    settings: null,

    isSaving: false,

    actions: {
        update(value) {
            this.set('model', value);
        },

        save() {
            let amp = this.get('model');
            let settings = this.get('settings');

            if (this.get('isSaving')) {
                return;
            }

            settings.set('amp', amp);

            this.set('isSaving', true);

            return settings.save().catch((err) => {
                this.get('notifications').showAPIError(err);
                throw err;
            }).finally(() => {
                this.set('isSaving', false);
            });
        }
    }
});
