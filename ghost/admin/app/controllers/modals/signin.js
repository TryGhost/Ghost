import Ember from 'ember';
import ValidationEngine from 'ghost/mixins/validation-engine';

export default Ember.Controller.extend(ValidationEngine, {
    validationType: 'signin',
    submitting: false,

    application: Ember.inject.controller(),
    notifications: Ember.inject.service(),

    identification: Ember.computed('session.user.email', function () {
        return this.get('session.user.email');
    }),

    actions: {
        authenticate: function () {
            var appController = this.get('application'),
                authStrategy = 'simple-auth-authenticator:oauth2-password-grant',
                data = this.getProperties('identification', 'password'),
                self = this;

            appController.set('skipAuthSuccessHandler', true);

            this.get('session').authenticate(authStrategy, data).then(function () {
                self.send('closeModal');
                self.set('password', '');
            }).catch(function () {
                // if authentication fails a rejected promise will be returned.
                // it needs to be caught so it doesn't generate an exception in the console,
                // but it's actually "handled" by the sessionAuthenticationFailed action handler.
            }).finally(function () {
                self.toggleProperty('submitting');
                appController.set('skipAuthSuccessHandler', undefined);
            });
        },

        validateAndAuthenticate: function () {
            var self = this;

            this.toggleProperty('submitting');

            // Manually trigger events for input fields, ensuring legacy compatibility with
            // browsers and password managers that don't send proper events on autofill
            $('#login').find('input').trigger('change');

            this.validate({format: false}).then(function () {
                self.get('notifications').closeNotifications();
                self.send('authenticate');
            }).catch(function (errors) {
                self.get('notifications').showErrors(errors);
            });
        },

        confirmAccept: function () {
            this.send('validateAndAuthenticate');
        }
    }
});
