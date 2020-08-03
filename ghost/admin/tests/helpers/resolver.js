import Resolver from '../../resolver';
import config from 'ghost-admin/config/environment';

const resolver = Resolver.create();

resolver.namespace = {
    modulePrefix: config.modulePrefix,
    podModulePrefix: config.podModulePrefix
};

export default resolver;
