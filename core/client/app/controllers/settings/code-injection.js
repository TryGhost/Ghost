import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';

export default Ember.Controller.extend(SettingsSaveMixin, {
    notifications: Ember.inject.service(),

    save: function () {
        var notifications = this.get('notifications');

        return this.get('model').save().catch(function (error) {
            notifications.showAPIError(error);
        });
    }
});
