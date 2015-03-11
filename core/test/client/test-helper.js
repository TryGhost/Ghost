import TestLoader from 'ember-cli/test-loader';
import Resolver from 'ember/resolver';
import { setResolver } from 'ember-mocha';

var resolver = Resolver.create();
resolver.namespace = {
  modulePrefix: 'ghost'
};

setResolver(resolver);

TestLoader.load();

window.expect = chai.expect;

mocha.checkLeaks();
mocha.globals(['jQuery', 'EmberInspector']);
mocha.run();
