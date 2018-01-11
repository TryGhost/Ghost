import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import styleBody from 'ghost-admin/mixins/style-body';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend(styleBody, {
    ghostPaths: service(),
    ajax: service(),

    titleToken: 'About',

    classNames: ['view-about'],

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
