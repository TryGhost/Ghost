import ajax from 'ghost/utils/ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

var SetupController = Ember.ObjectController.extend(ValidationEngine, {
    blogTitle: null,
    name: null,
    email: null,
    password: null,
    submitting: false,

    // ValidationEngine settings
    validationType: 'setup',

    actions: {
        setup: function () {
            var self = this;

            self.notifications.closePassive();

            this.toggleProperty('submitting');
            this.validate({ format: false }).then(function () {
                ajax({
                    url: self.get('ghostPaths').adminUrl('setup'),
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': self.get('csrf')
                    },
                    data: self.getProperties('blogTitle', 'name', 'email', 'password')
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

export default SetupController;
