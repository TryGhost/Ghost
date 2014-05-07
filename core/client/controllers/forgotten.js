/*global console, alert */

var ForgottenController = Ember.Controller.extend({
    email: '',
    actions: {
        submit: function () {
            var self = this;
            self.user.fetchForgottenPasswordFor(this.email)
                .then(function () {
                    alert('@TODO Notification: Success');
                    self.transitionToRoute('signin');
                })
                .catch(function (response) {
                    alert('@TODO');
                    console.log(response);
                });
        }
    }
});

export default ForgottenController;
