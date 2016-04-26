import Ember from 'ember';
import SettingsSaveMixin from 'ghost/mixins/settings-save';

const {
    computed,
    Controller,
    get,
    inject: {controller, service},
    set
} = Ember;

const {alias} = computed;
const emberA = Ember.A;

export default Controller.extend(SettingsSaveMixin, {
    appsController: controller('settings.apps'),
    slack: alias('appsController.slack'),
    ghostPaths: service(),
    ajax: service(),
    notifications: service(),

    _scratchValues: null,

    init() {
        this._super(...arguments);
        this._scratchValues = emberA();
    },

    save() {
        return this.get('appsController').save();
    },

    actions: {
        updateProperty(propKey, newValue) {
            this._scratchValues[propKey] = newValue;
        },

        saveProperty(propKey) {
            let slack = this.get('slack');
            let slackValue = get(slack, propKey);
            let scratchValue = this._scratchValues[propKey];

            if (!scratchValue || scratchValue === slackValue) {
                return;
            }

            // we're dealing with a POJO here so there's no "set", instead
            // we want to replace the whole object then save
            // TODO: it may be possible to use a custom transform that puts a
            // full ember "Slack/App" object on the settings model to remove
            // the reliance on reaching up into the parent controller
            set(slack, propKey, scratchValue);
            this.set('slack', [slack]);
            this.send('save');
        },

        toggleActiveProperty() {
            this.toggleProperty('slack.isActive');
            this.send('save');
        },

        sendTestNotification() {
            let notifications = this.get('notifications');
            let slackApi = this.get('ghostPaths.url').api('slack', 'test');

            this.toggleProperty('submitting');

            this.get('ajax').post(slackApi).then(() => {
                notifications.showAlert('Check your slack channel test message.', {type: 'info', key: 'slack-test.send.success'});
                this.toggleProperty('submitting');
            }).catch((error) => {
                notifications.showAPIError(error, {key: 'slack-test:send'});
                this.toggleProperty('submitting');
            });
        }
    }
});
