import Ember from 'ember';

const {Controller, inject} = Ember;

export default Controller.extend({
    notifications: inject.service(),

    acceptEncoding: 'image/*',

    actions: {
        confirmAccept() {
            let notifications = this.get('notifications');

            this.get('model').save().then((model) => {
                return model;
            }).catch((err) => {
                notifications.showAPIError(err, {key: 'image.upload'});
            });
        },

        confirmReject() {
            return false;
        }
    }
});
