import ajax from 'ghost/utils/ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

var SignupController = Ember.ObjectController.extend(ValidationEngine, {
    name: null,
    email: null,
    password: null,
    submitting: false,

    // ValidationEngine settings
    validationType: 'signup',

    actions: {
        signup: function () {
            var self = this;

            this.toggleProperty('submitting');
            this.validate({ format: false }).then(function () {
                ajax({
                    url: self.get('ghostPaths').adminUrl('signup'),
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': self.get('csrf')
                    },
                    data: self.getProperties('name', 'email', 'password')
                }).then(function (resp) {
                    self.toggleProperty('submitting');
                    if (resp && resp.userData) {
                        self.store.pushPayload({ users: [resp.userData]});
                        self.store.find('user', resp.userData.id).then(function (user) {
                            self.send('signedIn', user);
                            self.notifications.clear();
                            self.transitionTo('posts');
                        });
                    } else {
                        self.transitionTo('signin');
                    }
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
