import Ember from 'ember';
import Service from 'ember-service';
import computed from 'ember-computed';
import injectService from 'ember-service/inject';
import {isBlank} from 'ember-utils';

// ember-cli-shims doesn't export _ProxyMixin
const {_ProxyMixin} = Ember;

export default Service.extend(_ProxyMixin, {
    ajax: injectService(),
    ghostPaths: injectService(),

    content: {},

    fetch() {
        let configUrl = this.get('ghostPaths.url').api('configuration');

        return this.get('ajax').request(configUrl).then((config) => {
            // normalize blogUrl to non-trailing-slash
            let [{blogUrl}] = config.configuration;
            config.configuration[0].blogUrl = blogUrl.replace(/\/$/, '');

            this.set('content', config.configuration[0]);
        });
    },

    availableTimezones: computed(function () {
        let timezonesUrl = this.get('ghostPaths.url').api('configuration', 'timezones');

        return this.get('ajax').request(timezonesUrl).then((configTimezones) => {
            let [timezonesObj] = configTimezones.configuration;

            timezonesObj = timezonesObj.timezones;

            return timezonesObj;
        });
    }),

    ghostOAuth: computed('ghostAuthId', function () {
        return !isBlank(this.get('ghostAuthId'));
    })
});
