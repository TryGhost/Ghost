import ajax from 'ghost/utils/ajax';
import styleBody from 'ghost/mixins/style-body';

var isEmpty = Ember.isEmpty;

var LoginRoute = Ember.Route.extend(styleBody, {
    classNames: ['ghost-login'],

    actions: {
        login: function () {
            var self = this,
                controller = this.get('controller'),
                data = controller.getProperties('email', 'password');

            if (!isEmpty(data.email) && !isEmpty(data.password)) {

                ajax('/ghost/api/v0.1/signin', data).then(
                    function (response) {
                        self.set('user', response);
                        self.transitionTo('posts');
                    }, function () {
                        window.alert('Error'); // Todo Show notification
                    }
                );
            } else {
                window.alert('Must enter email + passwort. Todo: Must show as notification'); // Todo Show notification
            }
        }
    }
});

export default LoginRoute;