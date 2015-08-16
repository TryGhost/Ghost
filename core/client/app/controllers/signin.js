import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';
import {request as ajax} from 'ic-ajax';

export default Ember.Controller.extend(ValidationEngine, {
    submitting: false,
    loggingIn: false,

    ghostPaths: Ember.inject.service('ghost-paths'),
    notifications: Ember.inject.service(),
    flowErrors: '',

    // ValidationEngine settings
    validationType: 'signin',

    actions: {
        authenticate: function () {
            var self = this,
                model = this.get('model'),
                authStrategy = 'simple-auth-authenticator:oauth2-password-grant',
                data = model.getProperties('identification', 'password');

            this.get('session').authenticate(authStrategy, data).then(function () {
                self.toggleProperty('loggingIn');
            }).catch(function (err) {
                self.toggleProperty('loggingIn');

                if (err.errors) {
                    self.set('flowErrors', err.errors[0].message.string);
                }
                // if authentication fails a rejected promise will be returned.
                // it needs to be caught so it doesn't generate an exception in the console,
                // but it's actually "handled" by the sessionAuthenticationFailed action handler.
            });
        },

        validateAndAuthenticate: function () {
            var self = this;
            this.set('flowErrors', '');
            // Manually trigger events for input fields, ensuring legacy compatibility with
            // browsers and password managers that don't send proper events on autofill
            $('#login').find('input').trigger('change');

            this.validate().then(function () {
                self.get('notifications').closeNotifications();
                self.toggleProperty('loggingIn');
                self.send('authenticate');
            }).catch(function (error) {
                if (error) {
                    self.get('notifications').showAPIError(error);
                } else {
                    self.set('flowErrors', 'Please fill out the form to sign in.');
                }
            });
        },

        forgotten: function () {
            var email = this.get('model.identification'),
                notifications = this.get('notifications'),
                self = this;

            this.set('flowErrors', '');
            this.validate({property: 'identification'}).then(function () {
                self.toggleProperty('submitting');

                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                    type: 'POST',
                    data: {
                        passwordreset: [{
                            email: email
                        }]
                    }
                }).then(function () {
                    self.toggleProperty('submitting');
                    notifications.showAlert('Please check your email for instructions.', {type: 'info'});
                }).catch(function (resp) {
                    self.toggleProperty('submitting');
                    if (resp && resp.jqXHR && resp.jqXHR.responseJSON && resp.jqXHR.responseJSON.errors) {
                        self.set('flowErrors', resp.jqXHR.responseJSON.errors[0].message);
                    } else {
                        notifications.showAPIError(resp, {defaultErrorText: 'There was a problem with the reset, please try again.'});
                    }
                });
            }).catch(function () {
                self.set('flowErrors', 'Please enter an email address then click "Forgot?".');
            });
        }
    }
});
