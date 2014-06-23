var ConfigInitializer = {
    name: 'config',

    initialize: function (container, application) {
        application.register('ghost:config', application.get('config'), {instantiate: false});

        application.inject('route', 'config', 'ghost:config');
        application.inject('controller', 'config', 'ghost:config');
        application.inject('component', 'config', 'ghost:config');
    }
};

export default ConfigInitializer;
