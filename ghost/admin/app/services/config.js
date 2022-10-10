import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import timezoneData from '@tryghost/timezone-data';
import {TrackedObject} from 'tracked-built-ins';
import {tracked} from '@glimmer/tracking';

export default class ConfigService extends Service {
    @service ajax;
    @service ghostPaths;
    @service session;

    @tracked content = new TrackedObject();

    availableTimezones = timezoneData;

    fetch() {
        let promises = [];

        promises.push(this.fetchUnauthenticated());

        if (this.session.isAuthenticated) {
            promises.push(this.fetchAuthenticated());
        }

        return RSVP.all(promises);
    }

    async fetchUnauthenticated() {
        const siteUrl = this.ghostPaths.url.api('site');
        const {site} = await this.ajax.request(siteUrl);

        // normalize url to non-trailing-slash
        site.blogUrl = site.url.replace(/\/$/, '');
        site.blogTitle = site.title;
        delete site.url;
        delete site.title;

        Object.assign(this.content, site);
        this._defineProperties(site);
    }

    async fetchAuthenticated() {
        const configUrl = this.ghostPaths.url.api('config');
        const {config} = await this.ajax.request(configUrl);

        Object.assign(this.content, config);
        this._defineProperties(config);
    }

    get blogDomain() {
        const blogDomain = this.blogUrl
            .replace(/^https?:\/\//, '')
            .replace(/\/?$/, '');

        return blogDomain;
    }

    get emailDomain() {
        const blogDomain = this.blogDomain || '';
        const domainExp = blogDomain.match(new RegExp('^([^/:?#]+)(?:[/:?#]|$)', 'i'));
        const domain = (domainExp && domainExp[1]) || '';
        if (domain.startsWith('www.')) {
            return domain.replace(/^(www)\.(?=[^/]*\..{2,5})/, '');
        }
        return domain;
    }

    getSiteUrl(path) {
        const siteUrl = new URL(this.blogUrl);
        const subdir = siteUrl.pathname.endsWith('/') ? siteUrl.pathname : `${siteUrl.pathname}/`;
        const fullPath = `${subdir}${path.replace(/^\//, '')}`;

        return `${siteUrl.origin}${fullPath}`;
    }

    _defineProperties(obj) {
        for (const name of Object.keys(obj)) {
            if (!Object.prototype.hasOwnProperty.call(this, name)) {
                Object.defineProperty(this, name, {
                    get() {
                        return this.content[name];
                    },
                    set(newValue) {
                        this.content[name] = newValue;
                    }
                });
            }
        }
    }
}
