import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';

const {
    Controller,
    computed
} = Ember;
const {alias} = computed;

export default Controller.extend(SettingsSaveMixin, {

    settings: alias('model'),

    slack: computed('settings.slack', function () {
        return this.get('settings.slack.firstObject');
    }),

    save() {
        let notifications = this.get('notifications');

        return this.get('settings').save().catch((err) => {
            notifications.showErrors(err);
        });
    }

});
