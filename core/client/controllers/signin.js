import ValidationEngine from 'ghost/mixins/validation-engine';

var SigninController = Ember.Controller.extend(SimpleAuth.AuthenticationControllerMixin, ValidationEngine, {
    authenticator: 'simple-auth-authenticator:oauth2-password-grant',

    validationType: 'signin',

    actions: {
        authenticate: function () {
            var model = this.get('model'),
                data = model.getProperties('identification', 'password');

            this._super(data).catch(function () {
                // If simple-auth's authenticate rejects we need to catch it
                // to avoid an unhandled rejection exception.
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
