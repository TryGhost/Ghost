import timezoneData from '@tryghost/timezone-data';
import {TrackedObject} from 'tracked-built-ins';

export function initialize(applicationInstance) {
    const config = new TrackedObject({});

    Object.defineProperty(config, 'availableTimezones', {
        get() {
            return timezoneData;
        },
        enumerable: true
    });

    Object.defineProperty(config, 'blogDomain', {
        get() {
            const blogDomain = this.blogUrl
                .replace(/^https?:\/\//, '')
                .replace(/\/?$/, '');

            return blogDomain;
        },
        enumerable: true

    });

    Object.defineProperty(config, 'emailDomain', {
        get() {
            const blogDomain = this.blogDomain || '';
            const domainExp = blogDomain.match(new RegExp('^([^/:?#]+)(?:[/:?#]|$)', 'i'));
            const domain = (domainExp && domainExp[1]) || '';
            if (domain.startsWith('www.')) {
                return domain.replace(/^(www)\.(?=[^/]*\..{2,5})/, '');
            }
            return domain;
        },
        enumerable: true
    });

    Object.defineProperty(config, 'getSiteUrl', {
        value: function (path) {
            const siteUrl = new URL(this.blogUrl);
            const subdir = siteUrl.pathname.endsWith('/') ? siteUrl.pathname : `${siteUrl.pathname}/`;
            const fullPath = `${subdir}${path.replace(/^\//, '')}`;

            return `${siteUrl.origin}${fullPath}`;
        }
    });

    applicationInstance.register('config:main', config, {instantiate: false});
}

export default {
    name: 'config',
    initialize
};
