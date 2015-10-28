import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';

const {Controller, inject} = Ember;

export default Controller.extend(SettingsSaveMixin, {
    notifications: inject.service(),

    save() {
        let notifications = this.get('notifications');

        return this.get('model').save().catch((error) => {
            notifications.showAPIError(error, {key: 'code-injection.save'});
        });
    }
});
