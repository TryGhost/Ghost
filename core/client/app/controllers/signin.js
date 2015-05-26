import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';
import {request as ajax} from 'ic-ajax';

export default Ember.Controller.extend(ValidationEngine, {
    validationType: 'signin',

    submitting: false,

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),

    actions: {
        authenticate: function () {
            var model = this.get('model'),
                authStrategy = 'simple-auth-authenticator:oauth2-password-grant',
                data = model.getProperties('identification', 'password');

            this.get('session').authenticate(authStrategy, data).catch(function () {
                // if authentication fails a rejected promise will be returned.
                // it needs to be caught so it doesn't generate an exception in the console,
                // but it's actually "handled" by the sessionAuthenticationFailed action handler.
            });
        },

        validateAndAuthenticate: function () {
            var self = this;

            // Manually trigger events for input fields, ensuring legacy compatibility with
            // browsers and password managers that don't send proper events on autofill
            $('#login').find('input').trigger('change');

            this.validate({format: false}).then(function () {
                self.get('notifications').closePassive();
                self.send('authenticate');
            }).catch(function (errors) {
                self.get('notifications').showErrors(errors);
            });
        },

        forgotten: function () {
            var email = this.get('model.identification'),
                self = this;

            if (!email) {
                return this.notifications.showError('Enter email address to reset password.');
            }

            self.set('submitting', true);

            ajax({
                url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                type: 'POST',
                data: {
                    passwordreset: [{
                        email: email
                    }]
                }
            }).then(function () {
                self.set('submitting', false);
                self.get('notifications').showSuccess('Please check your email for instructions.');
            }).catch(function (resp) {
                self.set('submitting', false);
                self.get('notifications').showAPIError(resp, {defaultErrorText: 'There was a problem with the reset, please try again.'});
            });
        }
    }
});
