import ajax from 'ghost/utils/ajax';
import styleBody from 'ghost/mixins/style-body';

var SignupRoute = Ember.Route.extend(styleBody, {
    classNames: ['ghost-signup'],

    name: null,
    email: null,
    password: null,

    actions: {
        signup: function () {
            var self = this,
                controller = this.get('controller'),
                data = controller.getProperties('name', 'email', 'password');

            // TODO: Validate data

            if (data.name && data.email && data.password) {
                ajax({
                    url: '/ghost/signup/',
                    type: 'POST',
                    headers: {
                        'X-CSRF-Token': this.get('csrf')
                    },
                    data: data
                }).then(function (resp) {
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
                    self.notifications.showAPIError(resp);
                });
            } else {
                this.notifications.showError('Must provide name, email and password');
            }
        }
    }
});

export default SignupRoute;
