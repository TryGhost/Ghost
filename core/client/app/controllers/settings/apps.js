import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';

const {
    Controller,
    computed
} = Ember;
const {alias} = computed;

export default Controller.extend(SettingsSaveMixin, {

    settings: alias('model'),

    slack: computed('settings.slack', {
        get() {
            let slackItem;

            try {
                [ slackItem ] = JSON.parse(this.get('settings.slack')) || [{}];
            } catch (e) {
                slackItem = {};
            }

            return slackItem;
        },
        set(key, value) {
            this.set('settings.slack', JSON.stringify(value));
            return value;
        }
    }),

    save() {
        let notifications = this.get('notifications');

        return this.get('settings').save().catch((err) => {
            notifications.showErrors(err);
        });
    }

});
