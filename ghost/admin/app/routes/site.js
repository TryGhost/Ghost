import AuthenticatedRoute from 'ghost-admin/routes/authenticated';
import fetch from 'fetch';
import {inject as service} from '@ember/service';

export default AuthenticatedRoute.extend({
    config: service(),
    settings: service(),
    ui: service(),

    _hasLoggedIn: false,

    model() {
        return (new Date()).valueOf();
    },

    afterModel() {
        if (this.settings.get('isPrivate') && !this._hasLoggedIn) {
            let privateLoginUrl = `${this.config.get('blogUrl')}/private/?r=%2F`;

            return fetch(privateLoginUrl, {
                method: 'POST',
                mode: 'cors',
                redirect: 'manual',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: `password=${this.settings.get('password')}`
            }).then(() => {
                this._hasLoggedIn = true;
            });
        }
    },

    buildRouteInfoMetadata() {
        return {
            titleToken: 'Site'
        };
    }
});
