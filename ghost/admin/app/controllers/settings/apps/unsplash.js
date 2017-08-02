import Controller from 'ember-controller';
import injectService from 'ember-service/inject';
import {alias, empty} from 'ember-computed';
import {task} from 'ember-concurrency';

export default Controller.extend({
    notifications: injectService(),
    settings: injectService(),
    config: injectService(),
    unsplash: injectService(),

    model: alias('settings.unsplash'),
    testRequestDisabled: empty('model.applicationId'),

    _triggerValidations() {
        let isActive = this.get('model.isActive');
        let applicationId = this.get('model.applicationId');

        this.get('model.hasValidated').clear();

        // api key field is hidden if set via config so don't validate in that case
        if (!this.get('config.unsplashAPI.applicationId')) {
            // CASE: application id is empty but unsplash is enabled
            if (isActive && !applicationId) {
                this.get('model.errors').add(
                    'isActive',
                    'You need to enter an Application ID before enabling it'
                );

                this.get('model.hasValidated').pushObject('isActive');
            } else {
                // run the validation for application id
                this.get('model').validate();
            }
        }

        this.get('model.hasValidated').pushObject('isActive');
    },

    save: task(function* () {
        let unsplash = this.get('model');
        let settings = this.get('settings');

        // Don't save when we have errors and properties are not validated
        if ((this.get('model.errors.isActive') || this.get('model.errors.applicationId'))) {
            return;
        }

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

    sendTestRequest: task(function* () {
        let notifications = this.get('notifications');
        let applicationId = this.get('model.applicationId');

        try {
            yield this.get('unsplash').sendTestRequest(applicationId);
        } catch (error) {
            notifications.showAPIError(error, {key: 'unsplash-test:send'});
            return false;
        }

        // save the application id when it's valid
        yield this.get('save').perform();
        return true;
    }).drop(),

    actions: {
        save() {
            this.get('save').perform();
        },

        update(value) {
            if (this.get('model.errors.isActive')) {
                this.get('model.errors.isActive').clear();
            }

            this.set('model.isActive', value);
            this._triggerValidations();
        },

        updateId(value) {
            value = value ? value.toString().trim() : '';

            if (this.get('model.errors.applicationId')) {
                this.get('model.errors.applicationId').clear();
            }

            this.set('model.applicationId', value);
            this._triggerValidations();
        }
    }
});
