import Ember from 'ember';

const {
    Controller,
    inject: {service}
} = Ember;

export default Controller.extend({
    ghostPaths: service(),
    ajax: service(),
    notifications: service(),

    // will be set by route
    settings: null,

    save() {
        let slack = this.get('model');
        let settings = this.get('settings');

        settings.get('slack').clear().pushObject(slack);
        return settings.save().catch((err) => {
            this.get('notifications').showErrors(err);
        });
    },

    actions: {
        toggleActiveProperty() {
            let notifications = this.get('notifications');
            let isActive = this.get('model.isActive');
            let url = this.get('model.url');

            if (!isActive && (url === '' || url === '/')) {
                notifications.showAlert('Please submit a valid webhook url in "Authentification" to activate your Slack integration.', {type: 'error', key: 'slack-test.invalidUrl'});
                return;
            } else {
                this.toggleProperty('model.isActive');
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
        },

        save(validate = false) {
            let model = this.get('model');

            if (validate || model.get('isActive')) {
                model.validate({model}).then(() => {
                    this.save();
                });
            }
        }
    }
});
