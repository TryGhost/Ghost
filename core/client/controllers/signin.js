import ValidationEngine from 'ghost/mixins/validation-engine';

var SigninController = Ember.Controller.extend(SimpleAuth.AuthenticationControllerMixin, ValidationEngine, {
    authenticator: 'simple-auth-authenticator:oauth2-password-grant',

    validationType: 'signin',

    actions: {
        authenticate: function () {
            var data = this.getProperties('identification', 'password');

            this._super(data).catch(function () {
                // If simple-auth's authenticate rejects we need to catch it
                // to avoid an unhandled rejection exception.
            });
        },

        validateAndAuthenticate: function () {
            var self = this;

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
