import Controller from '@ember/controller';
import {alias} from '@ember/object/computed';
import {inject as injectService} from '@ember/service';
import {task} from 'ember-concurrency';

export default Controller.extend({
    notifications: injectService(),
    settings: injectService(),

    model: alias('settings.unsplash'),

    save: task(function* () {
        let unsplash = this.get('model');
        let settings = this.get('settings');

        try {
            settings.set('unsplash', unsplash);
            return yield settings.save();
        } catch (error) {
            if (error) {
                this.get('notifications').showAPIError(error);
                throw error;
            }
        }
    }).drop(),

    actions: {
        save() {
            this.get('save').perform();
        },

        update(value) {
            this.set('model.isActive', value);
        }
    }
});
