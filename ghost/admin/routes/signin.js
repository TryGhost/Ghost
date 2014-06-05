import ajax from 'ghost/utils/ajax';
import styleBody from 'ghost/mixins/style-body';
import loadingIndicator from 'ghost/mixins/loading-indicator';

var isEmpty = Ember.isEmpty;

var SigninRoute = Ember.Route.extend(styleBody, loadingIndicator, {
    classNames: ['ghost-login'],

    actions: {
        login: function () {
            var self = this,
                controller = this.get('controller'),
                data = controller.getProperties('email', 'password'),
                //Data to check if user came in somewhere besides index
                appController = this.controllerFor('application'),
                loginTransition = appController.get('loginTransition');

            if (!isEmpty(data.email) && !isEmpty(data.password)) {

                ajax({
                    url: this.get('ghostPaths').adminUrl('signin'),
                    type: 'POST',
                    headers: {'X-CSRF-Token': this.get('csrf')},
                    data: data
                }).then(function (response) {
                    // once the email and password are pulled from the controller
                    // they need to be cleared, or they will reappear next time the signin
                    // page is visited
                    controller.setProperties({
                        email: '',
                        password: ''
                    });

                    self.store.pushPayload({users: [response.userData]});
                    return self.store.find('user', response.userData.id);
                }).then(function (user) {
                    self.send('signedIn', user);
                    self.notifications.clear();
                    if (loginTransition) {
                        appController.set('loginTransition', null);
                        loginTransition.retry();
                    } else {
                        self.transitionTo('posts');
                    }
                }).catch(function (resp) {
                    self.notifications.showAPIError(resp, 'There was a problem logging in, please try again.');
                });
            } else {
                this.notifications.clear();

                this.notifications.showError('Must enter email + password');
            }
        }
    }
});

export default SigninRoute;