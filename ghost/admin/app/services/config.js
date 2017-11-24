import Ember from 'ember';
import Service, {inject as service} from '@ember/service';
import {assign} from '@ember/polyfills';
import {computed} from '@ember/object';

// ember-cli-shims doesn't export _ProxyMixin
const {_ProxyMixin} = Ember;

export default Service.extend(_ProxyMixin, {
    ajax: service(),
    ghostPaths: service(),

    content: null,

    init() {
        this._super(...arguments);
        this.content = {};
    },

    fetch() {
        let configUrl = this.get('ghostPaths.url').api('configuration');

        return this.get('ajax').request(configUrl).then((publicConfig) => {
            // normalize blogUrl to non-trailing-slash
            let [{blogUrl}] = publicConfig.configuration;
            publicConfig.configuration[0].blogUrl = blogUrl.replace(/\/$/, '');

            this.set('content', publicConfig.configuration[0]);
        });
    },

    fetchPrivate() {
        let privateConfigUrl = this.get('ghostPaths.url').api('configuration', 'private');

        return this.get('ajax').request(privateConfigUrl).then((privateConfig) => {
            assign(this.get('content'), privateConfig.configuration[0]);
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

    blogDomain: computed('blogUrl', function () {
        let blogUrl = this.get('blogUrl');
        let blogDomain = blogUrl
            .replace(/^https?:\/\//, '')
            .replace(/\/?$/, '');

        return blogDomain;
    })
});
