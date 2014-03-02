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
    modulePrefix: 'ghost', // TODO: loaded via config
    Resolver: Resolver['default']
});

initFixtures();

// TODO move into ext/route.js
// needed to add body class depending on current route
Ember.Route.reopen({
    activate: function () {
        var cssClasses = this.get('classNames'),
            rootElement = this.router.namespace.get('rootElement');

        if (cssClasses) {
            Ember.run.schedule('afterRender', null, function () {
                Ember.$(rootElement).addClass(cssClasses);
            });
        }
    },
    deactivate: function () {
        var cssClasses = this.get('classNames'),
            rootElement = this.router.namespace.get('rootElement');

        Ember.run.schedule('afterRender', null, function () {
            Ember.$(rootElement).removeClass(cssClasses);
        });
    }
});

export default App;
