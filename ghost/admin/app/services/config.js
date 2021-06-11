import Ember from 'ember';
import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import timezoneData from '@tryghost/timezone-data';
import {computed} from '@ember/object';

// ember-cli-shims doesn't export _ProxyMixin
const {_ProxyMixin} = Ember;

export default Service.extend(_ProxyMixin, {
    ajax: service(),
    ghostPaths: service(),
    session: service(),

    content: null,

    init() {
        this._super(...arguments);
        this.content = {};
    },

    fetch() {
        let promises = [];

        promises.push(this.fetchUnauthenticated());

        if (this.session.isAuthenticated) {
            promises.push(this.fetchAuthenticated());
        }

        return RSVP.all(promises);
    },

    fetchUnauthenticated() {
        let siteUrl = this.ghostPaths.url.api('site');
        return this.ajax.request(siteUrl).then(({site}) => {
            // normalize url to non-trailing-slash
            site.blogUrl = site.url.replace(/\/$/, '');
            site.blogTitle = site.title;
            delete site.url;
            delete site.title;

            Object.assign(this.content, site);
        }).then(() => {
            this.notifyPropertyChange('content');
        });
    },

    fetchAuthenticated() {
        let configUrl = this.ghostPaths.url.api('config');
        return this.ajax.request(configUrl).then(({config}) => {
            Object.assign(this.content, config);
        }).then(() => {
            this.notifyPropertyChange('content');
        });
    },

    availableTimezones: computed(function () {
        return RSVP.resolve(timezoneData);
    }),

    blogDomain: computed('blogUrl', function () {
        let blogUrl = this.get('blogUrl');
        let blogDomain = blogUrl
            .replace(/^https?:\/\//, '')
            .replace(/\/?$/, '');

        return blogDomain;
    }),

    emailDomain: computed('blogDomain', function () {
        let blogDomain = this.blogDomain || '';
        const domainExp = blogDomain.match(new RegExp('^([^/:?#]+)(?:[/:?#]|$)', 'i'));
        const domain = (domainExp && domainExp[1]) || '';
        if (domain.startsWith('www.')) {
            return domain.replace(/^(www)\.(?=[^/]*\..{2,5})/, '');
        }
        return domain;
    })
});
