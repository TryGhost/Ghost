import Service, {inject as service} from '@ember/service';
import fetch from 'fetch';
import validator from 'validator';
import {inject} from 'ghost-admin/decorators/inject';

export default class FrontendService extends Service {
    @service settings;
    @service ajax;

    @inject config;

    _hasLoggedIn = false;
    _lastPassword = null;

    get hasPasswordChanged() {
        return this._lastPassword !== this.settings.password;
    }

    getUrl(path) {
        const siteUrl = new URL(this.config.blogUrl);
        const subdir = siteUrl.pathname.endsWith('/') ? siteUrl.pathname : `${siteUrl.pathname}/`;
        const fullPath = `${subdir}${path.replace(/^\//, '')}`;

        return `${siteUrl.origin}${fullPath}`;
    }

    async loginIfNeeded() {
        if (this.settings.isPrivate && (this.hasPasswordChanged || !this._hasLoggedIn)) {
            const privateLoginUrl = this.getUrl('/private/?r=%2F');
            this._lastPassword = this.settings.password;

            return fetch(privateLoginUrl, {
                method: 'POST',
                mode: 'cors',
                redirect: 'manual',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `password=${this._lastPassword}`
            }).then(() => {
                this._hasLoggedIn = true;
            }).catch((e) => {
                // Safari will error when x-site tracking is prevented and frontend/admin are separate
                // we don't want to break anything else in that case so make it look like it succeeded
                console.error(e); // eslint-disable-line
                return true;
            });
        }
    }

    async fetch(urlOrPath, options) {
        await this.loginIfNeeded();
        let frontendUrl = urlOrPath;
        if (!validator.isURL(urlOrPath)) {
            frontendUrl = this.getUrl(urlOrPath);
        }
        return fetch(frontendUrl, {
            mode: 'cors',
            credentials: 'include',
            ...options
        });
    }
}
