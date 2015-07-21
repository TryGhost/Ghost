import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    newPassword: '',
    ne2Password: '',
    token: '',
    submitting: false,

    validationType: 'reset',

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    email: Ember.computed('token', function () {
        // The token base64 encodes the email (and some other stuff),
        // each section is divided by a '|'. Email comes second.
        return atob(this.get('token')).split('|')[1];
    }),

    // Used to clear sensitive information
    clearData: function () {
        this.setProperties({
            newPassword: '',
            ne2Password: '',
            token: ''
        });
    },

    actions: {
        submit: function () {
            var credentials = this.getProperties('newPassword', 'ne2Password', 'token'),
                self = this;

            this.validate().then(function () {
                self.toggleProperty('submitting');
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                    type: 'PUT',
                    data: {
                        passwordreset: [credentials]
                    }
                }).then(function (resp) {
                    self.toggleProperty('submitting');
                    self.get('notifications').showAlert(resp.passwordreset[0].message, {type: 'warn', delayed: true});
                    self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                        identification: self.get('email'),
                        password: credentials.newPassword
                    });
                }).catch(function (response) {
                    self.get('notifications').showAPIError(response);
                    self.toggleProperty('submitting');
                });
            });
        }
    }
});
