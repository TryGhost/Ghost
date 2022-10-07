import Ember from 'ember';
import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import classic from 'ember-classic-decorator';
import timezoneData from '@tryghost/timezone-data';
import {computed} from '@ember/object';

// ember-cli-shims doesn't export _ProxyMixin
const {_ProxyMixin} = Ember;

@classic
export default class ConfigService extends Service.extend(_ProxyMixin) {
    @service ajax;
    @service ghostPaths;

    @service session;

    content = null;

    init() {
        super.init(...arguments);
        this.content = {};
    }

    fetch() {
        let promises = [];

        promises.push(this.fetchUnauthenticated());

        if (this.session.isAuthenticated) {
            promises.push(this.fetchAuthenticated());
        }

        return RSVP.all(promises);
    }

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
    }

    fetchAuthenticated() {
        let configUrl = this.ghostPaths.url.api('config');
        return this.ajax.request(configUrl).then(({config}) => {
            Object.assign(this.content, config);
        }).then(() => {
            this.notifyPropertyChange('content');
        });
    }

    @computed
    get availableTimezones() {
        return RSVP.resolve(timezoneData);
    }

    @computed('blogUrl')
    get blogDomain() {
        let blogUrl = this.get('blogUrl');
        let blogDomain = blogUrl
            .replace(/^https?:\/\//, '')
            .replace(/\/?$/, '');

        return blogDomain;
    }

    @computed('blogDomain')
    get emailDomain() {
        let blogDomain = this.blogDomain || '';
        const domainExp = blogDomain.match(new RegExp('^([^/:?#]+)(?:[/:?#]|$)', 'i'));
        const domain = (domainExp && domainExp[1]) || '';
        if (domain.startsWith('www.')) {
            return domain.replace(/^(www)\.(?=[^/]*\..{2,5})/, '');
        }
        return domain;
    }

    getSiteUrl(path) {
        const siteUrl = new URL(this.get('blogUrl'));
        const subdir = siteUrl.pathname.endsWith('/') ? siteUrl.pathname : `${siteUrl.pathname}/`;
        const fullPath = `${subdir}${path.replace(/^\//, '')}`;

        return `${siteUrl.origin}${fullPath}`;
    }
}
