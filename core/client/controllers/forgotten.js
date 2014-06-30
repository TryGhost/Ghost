/* jshint unused: false */
import ajax from 'ghost/utils/ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

var ForgottenController = Ember.Controller.extend(ValidationEngine, {
    email: '',
    submitting: false,

    // ValidationEngine settings
    validationType: 'forgotten',

    actions: {
        submit: function () {
            var self = this,
                data = self.getProperties('email');

            this.toggleProperty('submitting');
            this.validate({ format: false }).then(function () {
                ajax({
                    url: self.get('ghostPaths').apiUrl('authentication', 'passwordreset'),
                    type: 'POST',
                    data: {
                        passwordreset: [{
                            email: data.email
                        }]
                    }
                }).then(function (resp) {
                    self.toggleProperty('submitting');
                    self.notifications.showSuccess('Please check your email for instructions.');
                    self.transitionToRoute('signin');
                }).catch(function (resp) {
                    self.toggleProperty('submitting');
                    self.notifications.showAPIError(resp, 'There was a problem logging in, please try again.');
                });
            }).catch(function (errors) {
                self.toggleProperty('submitting');
                self.notifications.showErrors(errors);
            });
        }
    }
});

export default ForgottenController;
