import ajax from 'ghost/utils/ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

var SetupController = Ember.Controller.extend(ValidationEngine, {
    blogTitle: null,
    name: null,
    email: null,
    password: null,
    submitting: false,

    // ValidationEngine settings
    validationType: 'setup',

    actions: {
        setup: function () {
            var self = this,
                data = self.getProperties('blogTitle', 'name', 'email', 'password');

            self.notifications.closePassive();

            this.toggleProperty('submitting');
            this.validate({format: false}).then(function () {
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'setup'),
                    type: 'POST',
                    data: {
                        setup: [{
                            name: data.name,
                            email: data.email,
                            password: data.password,
                            blogTitle: data.blogTitle
                        }]
                    }
                }).then(function () {
                    self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                        identification: self.get('email'),
                        password: self.get('password')
                    });
                }).catch(function (resp) {
                    self.toggleProperty('submitting');
                    self.notifications.showAPIError(resp);
                });
            }).catch(function (errors) {
                self.toggleProperty('submitting');
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default SetupController;
