import ajax from 'ghost/utils/ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

var SignupController = Ember.Controller.extend(ValidationEngine, {
    submitting: false,

    // ValidationEngine settings
    validationType: 'signup',

    actions: {
        signup: function () {
            var self = this,
                model = this.get('model'),
                data = model.getProperties('name', 'email', 'password', 'token');

            self.notifications.closePassive();

            this.toggleProperty('submitting');
            this.validate({format: false}).then(function () {
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'invitation'),
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        invitation: [{
                            name: data.name,
                            email: data.email,
                            password: data.password,
                            token: data.token
                        }]
                    }
                }).then(function () {
                    self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                        identification: self.get('model.email'),
                        password: self.get('model.password')
                    });
                }, function (resp) {
                    self.toggleProperty('submitting');
                    self.notifications.showAPIError(resp);
                });
            }, function (errors) {
                self.toggleProperty('submitting');
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default SignupController;
