import ghostPaths from 'ghost/utils/ghost-paths';

var ghostPathsInitializer = {
    name: 'ghost-paths',
    after: 'store',

    initialize: function (container, application) {
        application.register('ghost:paths', ghostPaths(), {instantiate: false});

        application.inject('route', 'ghostPaths', 'ghost:paths');
        application.inject('model', 'ghostPaths', 'ghost:paths');
        application.inject('controller', 'ghostPaths', 'ghost:paths');
    }
};

export default ghostPathsInitializer;
