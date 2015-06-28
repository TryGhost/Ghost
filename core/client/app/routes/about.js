import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, {
    titleToken: 'About',

    classNames: ['view-about'],

    ghostPaths: Ember.inject.service('ghost-paths'),

    cachedConfig: false,

    model: function () {
        var cachedConfig = this.get('cachedConfig'),
            self = this;

        if (cachedConfig) {
            return cachedConfig;
        }

        return ajax(this.get('ghostPaths.url').api('configuration'))
            .then(function (configurationResponse) {
                var configKeyValues = configurationResponse.configuration;

                cachedConfig = {};
                configKeyValues.forEach(function (configKeyValue) {
                    cachedConfig[configKeyValue.key] = configKeyValue.value;
                });
                self.set('cachedConfig', cachedConfig);

                return cachedConfig;
            });
    }
});
