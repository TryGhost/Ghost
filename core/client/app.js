import Resolver from 'ember/resolver';
import initFixtures from 'ghost/fixtures/init';
import loadInitializers from 'ember/load-initializers';
import 'ghost/utils/link-view';
import 'ghost/utils/text-field';

Ember.MODEL_FACTORY_INJECTIONS = true;

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

loadInitializers(App, 'ghost');

export default App;
