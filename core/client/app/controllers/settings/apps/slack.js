import Ember from 'ember';

const {
    Controller,
    RSVP,
    isBlank,
    inject: {service}
} = Ember;

export default Controller.extend({
    ghostPaths: service(),
    ajax: service(),
    notifications: service(),

    // will be set by route
    settings: null,

    submitting: false,
    savePromise: null,

    save() {
        let slack = this.get('model');
        let settings = this.get('settings');
        let promise;

        if (this.get('savePromise')) {
            return;
        }

        settings.get('slack').clear().pushObject(slack);

        promise = settings.save().catch((err) => {
            this.get('notifications').showErrors(err);
        }).then(() => {
            this.set('savePromise', null);
        });

        this.set('savePromise', promise);

        return promise;
    },

    actions: {
        sendTestNotification() {
            let notifications = this.get('notifications');
            let slackApi = this.get('ghostPaths.url').api('slack', 'test');
            let savePromise = this.get('savePromise') || RSVP.resolve(true);

            if (this.get('submitting')) {
                return;
            }

            this.set('submitting', true);

            savePromise.then(() => {
                this.get('ajax').post(slackApi).then(() => {
                    notifications.showAlert('Check your slack channel test message.', {type: 'info', key: 'slack-test.send.success'});
                }).catch((error) => {
                    notifications.showAPIError(error, {key: 'slack-test:send'});
                }).finally(() => {
                    this.set('submitting', false);
                });
            });
        },

        save(validate = false) {
            let model = this.get('model');

            if (validate && !isBlank(model.get('url'))) {
                model.validate({model}).then(() => {
                    this.save();
                });
            } else {
                this.save();
            }
        }
    }
});
