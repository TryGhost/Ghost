import Resolver from 'ember/resolver';
import loadInitializers from 'ember/load-initializers';
import 'ghost/utils/link-view';
import 'ghost/utils/text-field';
import configureApp from 'ghost/config';
import ghostPathsHelper from 'ghost/helpers/ghost-paths';

Ember.MODEL_FACTORY_INJECTIONS = true;

var App = Ember.Application.extend({
    modulePrefix: 'ghost',
    Resolver: Resolver['default']
});

// Runtime configuration of Ember.Application
configureApp(App);

loadInitializers(App, 'ghost');

Ember.Handlebars.registerHelper('gh-path', ghostPathsHelper);

export default App;
