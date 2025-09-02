import Service from '@ember/service';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

export default class NotificationsCountService extends Service {
    @service ajax;
    @service session;
    @tracked count = 0;
    @tracked isLoading = false;

    async fetchCount() {
        try {
            this.count = 0;
            this.isLoading = true;
            
            const identityResponse = await this.ajax.request('/ghost/api/admin/identities/');
            const token = identityResponse?.identities?.[0]?.token;

            if (!token) {
                this.count = 0;
                return 0;
            }

            const siteInfoResponse = await this.ajax.request('/ghost/api/admin/site');
            const siteUrl = siteInfoResponse?.site?.url;

            if (!siteUrl) {
                this.count = 0;
                return 0;
            }
            const notificationCountUrl = new URL('/.ghost/activitypub/stable/notifications/unread/count', siteUrl).toString();
            const response = await this.ajax.request(notificationCountUrl, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/activity+json'
                }
            });
            this.count = response.count || 0;
            return this.count;
        } catch (error) {
            this.count = 0;
            return 0;
        } finally {
            this.isLoading = false;
        }
    }

    updateCount(newCount) {
        this.count = newCount;
    }
} 
