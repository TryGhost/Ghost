import Configuration from 'ember-simple-auth/configuration';
import ENV from '../config/environment';
import ghostPaths from '../utils/ghost-paths';
import setupSession from 'ember-simple-auth/initializers/setup-session';

export default {
    name: 'ember-simple-auth',
    initialize(registry) {
        let config = ENV['ember-simple-auth'] || {};
        config.rootURL = ghostPaths().adminRoot;
        Configuration.load(config);

        setupSession(registry);
    }
};
