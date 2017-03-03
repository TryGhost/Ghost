import $ from 'jquery';
import Ember from 'ember';
import RSVP from 'rsvp';
import Service from 'ember-service';
import injectService from 'ember-service/inject';

const {testing} = Ember;

export default Service.extend({
    ajax: injectService(),
    ghostPaths: injectService(),

    // This is needed so we can disable it in unit tests
    testing,

    scriptPromises: {},

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

    loadStyle(key, url) {
        if (this.get('testing') || $(`#${key}-styles`).length) {
            return RSVP.resolve();
        }

        return new RSVP.Promise((resolve, reject) => {
            let link = document.createElement('link');
            link.id = `${key}-styles`;
            link.rel = 'stylesheet';
            link.href = `${this.get('ghostPaths.adminRoot')}${url}`;
            link.onload = resolve;
            link.onerror = reject;
            $('head').append($(link));
        });
    }
});
