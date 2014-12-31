import Resolver from 'ember/resolver';
import loadInitializers from 'ember/load-initializers';
import 'ghost/utils/link-view';
import 'ghost/utils/text-field';
import configureApp from 'ghost/config';

Ember.MODEL_FACTORY_INJECTIONS = true;

var App = Ember.Application.extend({
    modulePrefix: 'ghost',
    Resolver: Resolver['default']
});

// Runtime configuration of Ember.Application
configureApp(App);

loadInitializers(App, 'ghost');

export default App;
