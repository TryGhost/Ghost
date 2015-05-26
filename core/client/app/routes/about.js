import AuthenticatedRoute from 'ghost/routes/authenticated';
import styleBody from 'ghost/mixins/style-body';

var AboutRoute = AuthenticatedRoute.extend(styleBody, {
    titleToken: 'About',

    classNames: ['view-about'],

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
    },

    renderTemplate: function () {
        this.render('about', {into: 'application'});
    }
});

export default AboutRoute;
