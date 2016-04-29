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
            this.get('model.errors').remove('url');
            this._scratchValues[propKey] = newValue;
        },

        saveProperty(propKey) {
            let slack = this.get('slack');
            let slackValue = get(slack, propKey);
            let scratchValue = this._scratchValues[propKey];
            let errMessage;

            if (!scratchValue || scratchValue === slackValue) {
                return;
            }
            if (propKey === 'url' && !scratchValue.match(/(^https:\/\/hooks\.slack\.com\/)(\S+)/g)) {
                errMessage = 'The URL must be in a format like ' +
                 'https://hooks.slack.com/services/<your personal key>';
                this.get('model.errors').add('url', errMessage);
                return;
            }
            console.log('property');
            console.log(propKey);
            console.log('scratchValue');
            console.log(scratchValue);
            console.log('slack before');
            console.log(slack);
            set(slack, propKey, scratchValue);
            console.log('slack after first set');
            console.log(slack);
            this.set('slack', slack);
            console.log('slack after "set"');
            console.log(slack);
            this.send('save');
        },

        toggleActiveProperty() {
            let notifications = this.get('notifications');
            let slack = this.get('slack');
            let isActive = this.get('slack.isActive');
            let url = this.get('slack.url');

            if (!isActive && (url === '' || url === '/')) {
                notifications.showAlert('Please submit a valid webhook url in "Authentification" to activate your Slack integration.', {type: 'error', key: 'slack-test.invalidUrl'});
                return;
            } else {
                this.toggleProperty('slack.isActive');
                console.log('slack');
                console.log(slack);
                // this.set('slack', slack);
                this.send('save');
            }
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
