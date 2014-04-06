/*global alert, console */
var ResetController = Ember.Controller.extend({
    passwords: {
        newPassword: '',
        ne2Password: ''
    },
    token: '',
    submitButtonDisabled: false,
    actions: {
        submit: function () {
            var self = this;
            this.set('submitButtonDisabled', true);
            
            this.user.resetPassword(this.passwords, this.token)
                .then(function () {
                    alert('@TODO Notification : Success');
                    self.transitionToRoute('signin');
                })
                .catch(function (response) {
                    alert('@TODO Notification : Failure');
                    console.log(response);
                })
                .finally(function () {
                    self.set('submitButtonDisabled', false);
                });
        }
    }
});

export default ResetController;
