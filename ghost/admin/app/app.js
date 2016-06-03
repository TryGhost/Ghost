import Ember from 'ember';
import Resolver from './resolver';
import loadInitializers from 'ember-load-initializers';
import 'ghost-admin/utils/link-component';
import 'ghost-admin/utils/text-field';
import config from './config/environment';

const {Application} = Ember;

Ember.MODEL_FACTORY_INJECTIONS = true;

let App = Application.extend({
    Resolver,
    modulePrefix: config.modulePrefix,
    podModulePrefix: config.podModulePrefix
});

loadInitializers(App, config.modulePrefix);

export default App;
