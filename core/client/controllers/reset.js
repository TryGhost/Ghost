/*global console*/
/* jshint unused: false */
import ajax from 'ghost/utils/ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

var ResetController = Ember.Controller.extend(ValidationEngine, {
    passwords: {
        newPassword: '',
        ne2Password: ''
    },
    token: '',
    submitButtonDisabled: false,

    validationType: 'reset',

    actions: {
        submit: function () {
            var self = this,
                data = self.getProperties('passwords', 'token');

            this.toggleProperty('submitting');
            this.validate({format: false}).then(function () {
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                    type: 'PUT',
                    data: {
                        passwordreset: [{
                            newPassword: data.passwords.newPassword,
                            ne2Password: data.passwords.ne2Password,
                            token: data.token
                        }]
                    }
                }).then(function (resp) {
                    self.toggleProperty('submitting');
                    self.notifications.showSuccess(resp.passwordreset[0].message, true);
                    self.transitionToRoute('signin');
                }).catch(function (response) {
                    self.notifications.showAPIError(response);
                    self.toggleProperty('submitting');
                });
            }).catch(function (error) {
                self.toggleProperty('submitting');
                self.notifications.showErrors(error);
            });
        }
    }
});

export default ResetController;
