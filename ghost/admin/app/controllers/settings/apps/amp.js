import Controller from 'ember-controller';
import injectService from 'ember-service/inject';
import {task} from 'ember-concurrency';

export default Controller.extend({
    notifications: injectService(),

    // will be set by route
    settings: null,

    save: task(function* () {
        let amp = this.get('model');
        let settings = this.get('settings');

        settings.set('amp', amp);

        try {
            return yield settings.save();

        } catch (error) {
            this.get('notifications').showAPIError(error);
            throw error;
        }
    }).drop(),

    actions: {
        update(value) {
            this.set('model', value);
        }
    }
});
