import userFixtures from 'ghost/fixtures/users';

var currentUser = {
    name: 'currentUser',

    initialize: function (container) {
        var userFixture = userFixtures.findBy("id", 1);

        container.register('user:current', Ember.Object.extend(userFixture));
        // Todo: remove userFixture
        // Todo: use model User instead of Ember.Object once model layer exists
    }
};

var injectCurrentUser = {
    name: 'injectCurrentUser',

    initialize: function (container) {
        if (container.lookup('user:current')) {
            container.injection('route', 'user', 'user:current');
            container.injection('controller', 'user', 'user:current');
        }
    }
};

export {currentUser, injectCurrentUser};