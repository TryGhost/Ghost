import injectService from 'ember-service/inject';
import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import styleBody from 'ghost-admin/mixins/style-body';

export default AuthenticatedRoute.extend(styleBody, {
    titleToken: 'About',

    classNames: ['view-about'],

    ghostPaths: injectService(),
    ajax: injectService(),

    cachedConfig: false,

    model() {
        let cachedConfig = this.get('cachedConfig');
        let configUrl = this.get('ghostPaths.url').api('configuration', 'about');

        if (cachedConfig) {
            return cachedConfig;
        }

        return this.get('ajax').request(configUrl)
            .then((configurationResponse) => {
                let [cachedConfig] = configurationResponse.configuration;

                this.set('cachedConfig', cachedConfig);

                return cachedConfig;
            });
    }
});
