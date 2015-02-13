import AuthenticatedRoute from 'ghost/routes/authenticated';
import loadingIndicator from 'ghost/mixins/loading-indicator';
import styleBody from 'ghost/mixins/style-body';

var SettingsAboutRoute = AuthenticatedRoute.extend(styleBody, loadingIndicator, {
    titleToken: 'About',

    classNames: ['settings-view-about'],

    cachedConfig: false,
    model: function () {
        var cachedConfig = this.get('cachedConfig'),
            self = this;
        if (cachedConfig) {
            return cachedConfig;
        }

        return ic.ajax.request(this.get('ghostPaths.url').api('configuration'))
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

export default SettingsAboutRoute;
