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

            // @TODO This should call closePassive() to only close passive notifications
            self.notifications.closeAll();

            this.toggleProperty('submitting');
            this.validate({ format: false }).then(function () {
                ajax({
                    url: self.get('ghostPaths').adminUrl('signup'),
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': self.get('csrf')
                    },
                    data: self.getProperties('name', 'email', 'password')
                }).then(function () {
                    self.get('session').authenticate('ember-simple-auth-authenticator:oauth2-password-grant', {
                        identification: self.get('email'),
                        password: self.get('password')
                    }).then(function () {
                        self.store.find('user', 'me').then(function (user) {
                            self.send('signedIn', user);
                            self.notifications.clear();
                            self.transitionToRoute(Ember.SimpleAuth.routeAfterAuthentication);
                        });
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
