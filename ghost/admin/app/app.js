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
    podModulePrefix: config.podModulePrefix
});

loadInitializers(App, config.modulePrefix);

export default App;
