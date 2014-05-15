import User from 'ghost/models/user';

export default {
    name: 'currentUser',

    initialize: function (container, application) {
        var user = User.create(application.get('user') || {});

        container.register('user:current', user, { instantiate: false });

        container.injection('route', 'user', 'user:current');
        container.injection('controller', 'user', 'user:current');
    }
};