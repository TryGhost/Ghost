import ValidationEngine from 'ghost/mixins/validation-engine';

var SigninController = Ember.Controller.extend(SimpleAuth.AuthenticationControllerMixin, ValidationEngine, {
    authenticator: 'simple-auth-authenticator:oauth2-password-grant',

    validationType: 'signin',
    submitting: false,

    actions: {
        authenticate: function () {
            var data = this.getProperties('identification', 'password');

            return this._super(data);
        },

        validateAndAuthenticate: function () {
            var self = this;

            this.toggleProperty('submitting');
            this.validate({ format: false }).then(function () {
                self.notifications.closePassive();
                self.send('authenticate');
            }).catch(function (errors) {
                self.notifications.showErrors(errors);
                self.toggleProperty('submitting');
            });
        }
    }
});

export default SigninController;
