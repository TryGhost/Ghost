import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';
import config from 'ghost-admin/config/environment';
import {prefixAssetUrl} from 'ghost-admin/utils/asset-base';

@classic
export default class LazyLoaderService extends Service {
    @service ajax;

    // This is needed so we can disable it in unit tests
    testing = undefined;

    scriptPromises = null;

    init() {
        super.init(...arguments);
        this.scriptPromises = {};

        if (this.testing === undefined) {
            this.testing = config.environment === 'test';
        }
    }

    loadScript(key, url) {
        if (this.testing) {
            return RSVP.resolve();
        }

        if (this.scriptPromises[key]) {
            return this.scriptPromises[key];
        }

        const scriptPromise = new RSVP.Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.src = prefixAssetUrl(url);

            const el = document.getElementsByTagName('script')[0];
            el.parentNode.insertBefore(script, el);

            script.addEventListener('load', () => {
                resolve();
            });

            script.addEventListener('error', () => {
                reject(new Error(`${url} failed to load`));
            });
        });

        this.scriptPromises[key] = scriptPromise;

        return scriptPromise;
    }
}
