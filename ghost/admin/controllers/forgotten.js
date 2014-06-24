import ValidationEngine from 'ghost/mixins/validation-engine';

var ForgottenController = Ember.Controller.extend(ValidationEngine, {
    email: '',
    submitting: false,

    // ValidationEngine settings
    validationType: 'forgotten',

    actions: {
        submit: function () {
            var self = this;

            this.toggleProperty('submitting');
            this.validate({ format: false }).then(function () {
                self.user.fetchForgottenPasswordFor(this.email)
                    .then(function () {
                        self.toggleProperty('submitting');
                        self.notifications.showSuccess('Please check your email for instructions.');
                        self.transitionToRoute('signin');
                    })
                    .catch(function (resp) {
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
