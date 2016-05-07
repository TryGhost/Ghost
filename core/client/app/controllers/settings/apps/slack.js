import Ember from 'ember';

const {
    Controller,
    RSVP,
    computed: {empty},
    inject: {service}
} = Ember;

export default Controller.extend({
    ghostPaths: service(),
    ajax: service(),
    notifications: service(),

    // will be set by route
    settings: null,

    isSaving: false,
    savePromise: null,
    isSendingTest: false,

    testNotificationDisabled: empty('model.url'),

    save() {
        let slack = this.get('model');
        let settings = this.get('settings');
        let promise;

        if (this.get('savePromise')) {
            return;
        }

        settings.get('slack').clear().pushObject(slack);

        this.set('isSaving', true);

        promise = settings.save().catch((err) => {
            this.get('notifications').showErrors(err);
        }).then(() => {
            this.set('savePromise', null);
        }).finally(() => {
            this.set('isSaving', false);
        });

        this.set('savePromise', promise);

        return promise;
    },

    actions: {
        sendTestNotification() {
            let notifications = this.get('notifications');
            let slackApi = this.get('ghostPaths.url').api('slack', 'test');
            let savePromise = this.get('savePromise') || RSVP.resolve(true);

            if (this.get('isSendingTest')) {
                return;
            }

            this.set('isSendingTest', true);

            savePromise.then(() => {
                this.get('ajax').post(slackApi).then(() => {
                    notifications.showAlert('Check your slack channel test message.', {type: 'info', key: 'slack-test.send.success'});
                }).catch((error) => {
                    notifications.showAPIError(error, {key: 'slack-test:send'});
                }).finally(() => {
                    this.set('isSendingTest', false);
                });
            });
        },

        updateURL(value) {
            this.set('model.url', value);
            this.get('model.errors').clear();
        },

        save() {
            let model = this.get('model');

            model.validate().then(() => {
                this.save();
            });
        }
    }
});
