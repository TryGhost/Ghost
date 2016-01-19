import Ember from 'ember';
import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

const {inject} = Ember;

export default AuthenticatedRoute.extend(styleBody, {
    titleToken: 'About',

    classNames: ['view-about'],

    ghostPaths: inject.service('ghost-paths'),
    ajax: inject.service(),

    cachedConfig: false,

    model() {
        let cachedConfig = this.get('cachedConfig');
        let configUrl = this.get('ghostPaths.url').api('configuration');

        if (cachedConfig) {
            return cachedConfig;
        }

        return this.get('ajax').request(configUrl)
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
