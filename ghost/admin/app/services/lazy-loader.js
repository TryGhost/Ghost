import $ from 'jquery';
import Ember from 'ember';
import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';

export default Service.extend({
    ajax: service(),
    ghostPaths: service(),

    // This is needed so we can disable it in unit tests
    testing: undefined,

    scriptPromises: null,

    init() {
        this._super(...arguments);
        this.scriptPromises = {};

        if (this.testing === undefined) {
            this.testing = Ember.testing; // eslint-disable-line
        }
    },

    loadScript(key, url) {
        if (this.get('testing')) {
            return RSVP.resolve();
        }

        if (this.get(`scriptPromises.${key}`)) {
            // Script is already loaded/in the process of being loaded,
            // so return that promise
            return this.get(`scriptPromises.${key}`);
        }

        let ajax = this.get('ajax');
        let adminRoot = this.get('ghostPaths.adminRoot');

        let scriptPromise = ajax.request(`${adminRoot}${url}`, {
            dataType: 'script',
            cache: true
        });

        this.set(`scriptPromises.${key}`, scriptPromise);

        return scriptPromise;
    },

    loadStyle(key, url, alternate = false) {
        if (this.get('testing') || $(`#${key}-styles`).length) {
            return RSVP.resolve();
        }

        return new RSVP.Promise((resolve, reject) => {
            let link = document.createElement('link');
            link.id = `${key}-styles`;
            link.rel = alternate ? 'alternate stylesheet' : 'stylesheet';
            link.href = `${this.get('ghostPaths.adminRoot')}${url}`;
            link.onload = () => {
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

            $('head').append($(link));
        });
    }
});
