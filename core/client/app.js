/*global Ember */

var App = Ember.Application.create({
    /**
     * These are debugging flags, they are useful during development
     */
    LOG_ACTIVE_GENERATION: true,
    LOG_MODULE_RESOLVER: true,
    LOG_TRANSITIONS: true,
    LOG_TRANSITIONS_INTERNAL: true,
    LOG_VIEW_LOOKUPS: true,
    rootElement: '#ember-app' // tells ember to inject this app into element with selector #ember-app
});

