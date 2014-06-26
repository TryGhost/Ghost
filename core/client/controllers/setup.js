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

            // @TODO This should call closePassive() to only close passive notifications
            self.notifications.closeAll();

            this.toggleProperty('submitting');
            this.validate({ format: false }).then(function () {
                ajax({
                    url: self.get('ghostPaths').adminUrl('setup'),
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': self.get('csrf')
                    },
                    data: self.getProperties('blogTitle', 'name', 'email', 'password')
                }).then(function (resp) {
                    self.toggleProperty('submitting');
                    if (resp && resp.userData) {
                        self.store.pushPayload({ users: [resp.userData]});
                        self.store.find('user', resp.userData.id).then(function (user) {
                            self.send('signedIn', user);
                            self.notifications.clear();
                            self.transitionToRoute('posts');
                        });
                    } else {
                        self.transitionToRoute('setup');
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

export default SetupController;
