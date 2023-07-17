import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';
import config from 'ghost-admin/config/environment';

@classic
export default class LazyLoaderService extends Service {
    @service ajax;
    @service ghostPaths;

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

        let scriptPromise = new RSVP.Promise((resolve, reject) => {
            let script = document.createElement('script');
            script.type = 'text/javascript';
            script.async = true;
            script.src = `${config.cdnUrl ? '' : this.ghostPaths.adminRoot}${url}`;

            let el = document.getElementsByTagName('script')[0];
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

    loadStyle(key, url, alternate = false) {
        if (this.testing || document.querySelector(`#${key}-styles`)) {
            return RSVP.resolve();
        }

        return new RSVP.Promise((resolve, reject) => {
            let link = document.createElement('link');
            link.id = `${key}-styles`;
            link.rel = alternate ? 'alternate stylesheet' : 'stylesheet';
            link.href = `${config.cdnUrl ? '' : this.ghostPaths.adminRoot}${url}`;
            link.onload = () => {
                link.onload = null;
                if (alternate) {
                    // If stylesheet is alternate and we disable the stylesheet before injecting into the DOM,
                    // the onload handler never gets called. Thus, we should disable the link after it has finished loading
                    link.disabled = true;
                }
                resolve();
            };
            link.onerror = reject;

            if (alternate) {
                link.title = key;
            }

            document.querySelector('head').appendChild(link);
        });
    }
}
