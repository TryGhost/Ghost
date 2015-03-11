import ValidationEngine from 'ghost/mixins/validation-engine';

var SigninController = Ember.Controller.extend(SimpleAuth.AuthenticationControllerMixin, ValidationEngine, {
    authenticator: 'simple-auth-authenticator:oauth2-password-grant',

    validationType: 'signin',

    actions: {
        authenticate: function () {
            var model = this.get('model'),
                data = model.getProperties('identification', 'password');

            this._super(data).catch(function () {
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
                self.notifications.closePassive();
                self.send('authenticate');
            }).catch(function (errors) {
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default SigninController;
