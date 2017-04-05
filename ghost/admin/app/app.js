import Ember from 'ember';
import Application from 'ember-application';
import Resolver from './resolver';
import loadInitializers from 'ember-load-initializers';
import 'ghost-admin/utils/route';
import 'ghost-admin/utils/link-component';
import 'ghost-admin/utils/text-field';
import config from './config/environment';

Ember.MODEL_FACTORY_INJECTIONS = true;

let App = Application.extend({
    Resolver,
    modulePrefix: config.modulePrefix,
    podModulePrefix: config.podModulePrefix,

    customEvents: {
        touchstart: null,
        touchmove: null,
        touchend: null,
        touchcancel: null
    }
});

// TODO: remove once the validations refactor is complete
// eslint-disable-next-line
Ember.Debug.registerWarnHandler((message, options, next) => {
    let skip = [
        'ds.errors.add',
        'ds.errors.remove',
        'ds.errors.clear'
    ];

    if (skip.includes(options.id)) {
        return;
    }

    next(message, options);
});

loadInitializers(App, config.modulePrefix);

export default App;
