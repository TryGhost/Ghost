import getConfig from 'ghost/utils/config-parser';

var ConfigInitializer = {
    name: 'config',

    initialize: function (container, application) {
        var config = getConfig();
        application.register('ghost:config', config, {instantiate: false});

        application.inject('route', 'config', 'ghost:config');
        application.inject('controller', 'config', 'ghost:config');
        application.inject('component', 'config', 'ghost:config');
    }
};

export default ConfigInitializer;
