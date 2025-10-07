import Service from '@ember/service';
import {inject as service} from '@ember/service';

export default class ActivitypubService extends Service {
    @service ajax;

    async fetchFollowerCount() {
        try {
            const auth = await this._getAuth();

            if (!auth) {
                return 0;
            }

            const {token, siteUrl} = auth;

            let accountUrl;

            if (siteUrl && siteUrl !== window.location.origin) {
                accountUrl = new URL('/.ghost/activitypub/v1/account/me', siteUrl).toString();
            } else {
                accountUrl = '/.ghost/activitypub/v1/account/me';
            }

            const response = await this.ajax.request(accountUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/activity+json'
                }
            });

            return response.followerCount || 0;
        } catch (error) {
            return 0;
        }
    }

    async _getAuth() {
        try {
            const identityResponse = await this.ajax.request('/ghost/api/admin/identities/');
            const token = identityResponse?.identities?.[0]?.token;

            if (!token) {
                return null;
            }

            const siteInfoResponse = await this.ajax.request('/ghost/api/admin/site');
            const siteUrl = siteInfoResponse?.site?.url;

            if (!siteUrl) {
                return null;
            }

            return {token, siteUrl};
        } catch (error) {
            return null;
        }
    }
}
