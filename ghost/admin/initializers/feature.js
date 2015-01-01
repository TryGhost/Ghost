import Feature from 'ghost/utils/feature';

var injectFeatureInitializer = {
    name: 'injectFeature',
    after: ['config', 'store'],

    initialize: function (container, application) {
        application.register('feature:main', Feature);
        application.inject('feature:main', 'store', 'store:main');
        application.inject('feature:main', 'config', 'ghost:config');

        application.inject('controller', 'feature', 'feature:main');
        application.inject('route', 'feature', 'feature:main');
    }
};

export default injectFeatureInitializer;
