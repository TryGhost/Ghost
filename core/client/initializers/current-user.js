import User from 'ghost/models/user';
import userFixtures from 'ghost/fixtures/users';

var currentUser = {
    name: 'currentUser',

    initialize: function (container) {
        container.register('user:current', User);
    }
};

var injectCurrentUser = {
    name: 'injectCurrentUser',

    initialize: function (container) {
        if (container.lookup('user:current')) {
            // @TODO: remove userFixture
            container.lookup('user:current').setProperties(userFixtures.findBy('id', 1));

            container.injection('route', 'user', 'user:current');
            container.injection('controller', 'user', 'user:current');
        }
    }
};

export {currentUser, injectCurrentUser};