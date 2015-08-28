import Ember from 'ember';

var AuthenticationInitializer = {
    name: 'authentication',

    initialize: function (instance) {
        var store = instance.container.lookup('store:main'),
            Session = instance.container.lookup('simple-auth-session:main');

        Session.reopen({
            user: Ember.computed(function () {
                return store.find('user', 'me');
            })
        });
    }
};

export default AuthenticationInitializer;
