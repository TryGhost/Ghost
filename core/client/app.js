import Resolver from 'ember/resolver';
import initFixtures from 'ghost/fixtures/init';
import injectCurrentUser from 'ghost/initializers/current-user';
import injectCsrf from 'ghost/initializers/csrf';
import {registerNotifications, injectNotifications} from 'ghost/initializers/notifications';
import registerTrailingLocationHistory from 'ghost/initializers/trailing-history';
import 'ghost/utils/link-view';
import 'ghost/utils/text-field';

var App = Ember.Application.extend({
    /**
     * These are debugging flags, they are useful during development
     */
    LOG_ACTIVE_GENERATION: true,
    LOG_MODULE_RESOLVER: true,
    LOG_TRANSITIONS: true,
    LOG_TRANSITIONS_INTERNAL: true,
    LOG_VIEW_LOOKUPS: true,
    modulePrefix: 'ghost',
    Resolver: Resolver['default']
});

initFixtures();

App.initializer(injectCurrentUser);
App.initializer(injectCsrf);
App.initializer(registerNotifications);
App.initializer(injectNotifications);
App.initializer(registerTrailingLocationHistory);

export default App;
