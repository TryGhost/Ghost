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
        if (this.get('testing')) {
            return RSVP.resolve();
        }

        if (!$(`#${key}-styles`).length) {
            let $style = $(`<link rel="stylesheet" id="${key}-styles" />`);
            $style.attr('href', `${this.get('ghostPaths.adminRoot')}${url}`);
            $('head').append($style);
        }
    }
});
