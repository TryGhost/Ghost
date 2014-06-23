var currentUserInitializer = {
    name: 'currentUser',
    after: 'store',

    initialize: function (container, application) {
        var store = container.lookup('store:main'),
            preloadedUser = application.get('user');

        // If we don't have a user, don't do the injection
        if (!preloadedUser) {
            return;
        }

        // Push the preloaded user into the data store
        store.pushPayload({
            users: [preloadedUser]
        });

        // Signal to wait until the user is loaded before continuing.
        application.deferReadiness();

        // Find the user (which should be fast since we just preloaded it in the store)
        store.find('user', preloadedUser.id).then(function (user) {
            // Register the value for injection
            application.register('user:current', user, { instantiate: false });

            // Inject into the routes and controllers as the user property.
            application.inject('route', 'user', 'user:current');
            application.inject('controller', 'user', 'user:current');

            application.advanceReadiness();
        });
    }
};

export default currentUserInitializer;
