import Controller from 'ember-controller';
import injectService from 'ember-service/inject';
import SettingsSaveMixin from 'ghost-admin/mixins/settings-save';

export default Controller.extend(SettingsSaveMixin, {
    notifications: injectService(),

    save() {
        let notifications = this.get('notifications');

        return this.get('model').save().catch((error) => {
            notifications.showAPIError(error, {key: 'code-injection.save'});
        });
    }
});
