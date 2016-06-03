/* jshint node: true */
/* jscs:disable */

module.exports = function (environment) {
    var ENV = {
        modulePrefix: 'ghost-admin',
        environment: environment,
        baseURL: '/',
        locationType: 'trailing-history',
        EmberENV: {
            FEATURES: {
                // Here you can enable experimental features on an ember canary build
                // e.g. 'with-controller': true
            }
        },

        APP: {
            // Here you can pass flags/options to your application instance
            // when it is created

            // override the default version string which contains git info from
            // https://github.com/cibernox/git-repo-version. Only include the
            // `major.minor` version numbers
            version: require('../package.json').version.match(/^(\d+\.)?(\d+)/)[0]
        },

        'ember-simple-auth': {
            authenticationRoute: 'signin',
            routeAfterAuthentication: 'posts',
            routeIfAlreadyAuthenticated: 'posts'
        }
    };

    if (environment === 'development') {
        // ENV.APP.LOG_RESOLVER = true;
        ENV.APP.LOG_ACTIVE_GENERATION = true;
        ENV.APP.LOG_TRANSITIONS = true;
        ENV.APP.LOG_TRANSITIONS_INTERNAL = true;
        ENV.APP.LOG_VIEW_LOOKUPS = true;
        // Enable mirage here in order to mock API endpoints during development
        ENV['ember-cli-mirage'] = {
            enabled: false
        };
    }

    if (environment === 'test') {
        // Testem prefers this...
        ENV.baseURL = '/';
        ENV.locationType = 'none';

        // keep test console output quieter
        ENV.APP.LOG_ACTIVE_GENERATION = false;
        ENV.APP.LOG_VIEW_LOOKUPS = false;

        ENV.APP.rootElement = '#ember-testing';
    }

    return ENV;
};
