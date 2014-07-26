import ValidationEngine from 'ghost/mixins/validation-engine';

var SigninController = Ember.Controller.extend(SimpleAuth.LoginControllerMixin, ValidationEngine, {
    authenticator: 'simple-auth-authenticator:oauth2-password-grant',

    validationType: 'signin',

    actions: {
        validateAndAuthenticate: function () {
            var self = this;

            this.validate({ format: false }).then(function () {
                self.send('authenticate');
            }).catch(function (errors) {
                self.notifications.closePassive();
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default SigninController;
