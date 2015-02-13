import ajax from 'ghost/utils/ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

var ResetController = Ember.Controller.extend(ValidationEngine, {
    newPassword: '',
    ne2Password: '',
    token: '',
    submitting: false,

    validationType: 'reset',

    email: Ember.computed('token', function () {
        // The token base64 encodes the email (and some other stuff),
        // each section is divided by a '|'. Email comes second.
        return atob(this.get('token')).split('|')[1];
    }),

    // Used to clear sensitive information
    clearData: function () {
        this.setProperties({
            newPassword: '',
            ne2Password: '',
            token: ''
        });
    },

    actions: {
        submit: function () {
            var credentials = this.getProperties('newPassword', 'ne2Password', 'token'),
                self = this;

            this.toggleProperty('submitting');
            this.validate({format: false}).then(function () {
                ajax({
                    url: self.get('ghostPaths.url').api('authentication', 'passwordreset'),
                    type: 'PUT',
                    data: {
                        passwordreset: [credentials]
                    }
                }).then(function (resp) {
                    self.toggleProperty('submitting');
                    self.notifications.showSuccess(resp.passwordreset[0].message, true);
                    self.get('session').authenticate('simple-auth-authenticator:oauth2-password-grant', {
                        identification: self.get('email'),
                        password: credentials.newPassword
                    });
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
