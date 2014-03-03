import Resolver from 'ember/resolver';
import initFixtures from 'ghost/fixtures/init';

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

export default App;
