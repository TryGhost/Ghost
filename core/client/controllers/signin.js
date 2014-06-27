import ajax from 'ghost/utils/ajax';
import ValidationEngine from 'ghost/mixins/validation-engine';

var SigninController = Ember.ObjectController.extend(ValidationEngine, {
    needs: 'application',
    email: null,
    password: null,
    submitting: false,

    // ValidationEngine settings
    validationType: 'signin',

    actions: {
        login: function () {
            var self = this,
                data = this.getProperties('email', 'password'),
                //Data to check if user came in somewhere besides index
                appController = this.get('controllers.application'),
                loginTransition = appController.get('loginTransition');

            this.toggleProperty('submitting');
            
            // @TODO This should call closePassive() to only close passive notifications
            self.notifications.closeAll();

            this.validate({ format: false }).then(function () {
                ajax({
                    url: self.get('ghostPaths').adminUrl('signin'),
                    type: 'POST',
                    headers: {'X-CSRF-Token': self.get('csrf')},
                    data: data
                }).then(function (response) {
                    // once the email and password are pulled from the controller
                    // they need to be cleared, or they will reappear next time the signin
                    // page is visited
                    self.setProperties({
                        email: '',
                        password: ''
                    });

                    self.store.pushPayload({users: [response.userData]});
                    return self.store.find('user', response.userData.id);
                }).then(function (user) {
                    self.send('signedIn', user);
                    if (loginTransition) {
                        appController.set('loginTransition', null);
                        loginTransition.retry();
                    } else {
                        self.transitionToRoute('posts');
                    }
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

export default SigninController;
