import RSVP from 'rsvp';
import Service, {inject as service} from '@ember/service';
import {inject} from 'ghost-admin/decorators/inject';
import {setProperties} from '@ember/object';

export default class ConfigManagerService extends Service {
    @service ajax;
    @service ghostPaths;
    @service session;

    @inject config;

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

        setProperties(this.config, site);
    }

    async fetchAuthenticated() {
        const configUrl = this.ghostPaths.url.api('config');
        const {config} = await this.ajax.request(configUrl);

        setProperties(this.config, config);
    }
}
