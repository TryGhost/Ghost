import Ember from 'ember';
import {request as ajax} from 'ic-ajax';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

const {inject} = Ember;

export default AuthenticatedRoute.extend(styleBody, {
    titleToken: 'About',

    classNames: ['view-about'],

    ghostPaths: inject.service('ghost-paths'),

    cachedConfig: false,

    model() {
        let cachedConfig = this.get('cachedConfig');

        if (cachedConfig) {
            return cachedConfig;
        }

        return ajax(this.get('ghostPaths.url').api('configuration'))
            .then((configurationResponse) => {
                let configKeyValues = configurationResponse.configuration;

                cachedConfig = {};
                configKeyValues.forEach((configKeyValue) => {
                    cachedConfig[configKeyValue.key] = configKeyValue.value;
                });
                this.set('cachedConfig', cachedConfig);

                return cachedConfig;
            });
    }
});
