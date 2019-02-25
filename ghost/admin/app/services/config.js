import Ember from 'ember';
import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
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
        let siteUrl = this.ghostPaths.url.api('site');
        let configUrl = this.ghostPaths.url.api('config');

        return RSVP.all([
            this.ajax.request(siteUrl).then(({site}) => {
                // normalize url to non-trailing-slash
                site.blogUrl = site.url.replace(/\/$/, '');
                site.blogTitle = site.title;
                delete site.url;
                delete site.title;

                Object.assign(this.content, site);
            }),
            this.ajax.request(configUrl).then(({config}) => {
                Object.assign(this.content, config);
            })
        ]).then(() => {
            this.notifyPropertyChange('content');
        });
    },

    availableTimezones: computed(function () {
        let timezonesUrl = this.ghostPaths.url.api('configuration', 'timezones');

        return this.ajax.request(timezonesUrl).then((configTimezones) => {
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
