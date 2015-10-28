import ENV from '../config/environment';
import ghostPaths from '../utils/ghost-paths';
import Configuration from 'ember-simple-auth/configuration';
import setupSession from 'ember-simple-auth/initializers/setup-session';
import setupSessionService from 'ember-simple-auth/initializers/setup-session-service';

export default {
    name: 'ember-simple-auth',
    initialize(registry) {
        let config   = ENV['ember-simple-auth'] || {};
        config.baseURL = ghostPaths().adminRoot;
        Configuration.load(config);

        setupSession(registry);
        setupSessionService(registry);
    }
};
