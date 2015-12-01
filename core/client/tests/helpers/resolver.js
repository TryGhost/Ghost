import Resolver from 'ember-resolver';
import config from '../../config/environment';

let resolver = Resolver.create();

resolver.namespace = {
    modulePrefix: config.modulePrefix,
    podModulePrefix: config.podModulePrefix
};

export default resolver;
