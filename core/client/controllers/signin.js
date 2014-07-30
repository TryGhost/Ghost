import ValidationEngine from 'ghost/mixins/validation-engine';

var SigninController = Ember.Controller.extend(SimpleAuth.AuthenticationControllerMixin, ValidationEngine, {
    authenticator: 'simple-auth-authenticator:oauth2-password-grant',

    validationType: 'signin',

    actions: {
        authenticate: function () {
            var data = this.getProperties('identification', 'password');

            return this._super(data);
        },

        validateAndAuthenticate: function () {
            var self = this;

            this.validate({ format: false }).then(function () {
                self.notifications.closePassive();
                self.send('authenticate');
            }).catch(function (errors) {
                self.notifications.closePassive();
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default SigninController;
