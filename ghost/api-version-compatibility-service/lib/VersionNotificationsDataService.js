const internalContext = {
    internal: true
};

class VersionNotificationsDataService {
    /**
     * @param {Object} options
     * @param {Object} options.UserModel - ghost user model
     * @param {Object} options.ApiKeyModel -  ghost api key model
     * @param {Object} options.settingsService - ghost settings service
    */
    constructor({UserModel, ApiKeyModel, settingsService}) {
        this.UserModel = UserModel;
        this.ApiKeyModel = ApiKeyModel;
        this.settingsService = settingsService;
    }

    async fetchNotification(acceptVersion) {
        const setting = await this.settingsService.read('version_notifications', internalContext);
        const versionNotifications = JSON.parse(setting.version_notifications.value);

        return versionNotifications.find(version => version === acceptVersion);
    }

    async saveNotification(acceptVersion) {
        const setting = await this.settingsService.read('version_notifications', internalContext);
        const versionNotifications = JSON.parse(setting.version_notifications.value);

        if (!versionNotifications.find(version => version === acceptVersion)) {
            versionNotifications.push(acceptVersion);

            return this.settingsService.edit([{
                key: 'version_notifications',
                value: JSON.stringify(versionNotifications)
            }], {
                context: internalContext
            });
        }
    }

    async getNotificationEmails() {
        const data = await this.UserModel.findAll(Object.assign({
            withRelated: ['roles'],
            filter: 'status:active'
        }, internalContext));

        const adminEmails = data
            .toJSON()
            .filter(user => ['Owner', 'Administrator'].includes(user.roles[0].name))
            .map(user => user.email);

        return adminEmails;
    }

    /**
     * This method is for internal use only.
     *
     * @param {String} key - api key identification value, it's "secret" in case of Content API key and "id" for Admin API
     * @param {String} type - one of "content" or "admin" values
     * @returns {Promise<Object | null>} Integration JSON object
     */
    async getIntegration(key, type) {
        let queryOptions = null;

        if (type === 'content') {
            queryOptions = {secret: key};
        } else if (type === 'admin') {
            queryOptions = {id: key};
        }

        const apiKey = await this.ApiKeyModel.findOne(queryOptions, {withRelated: ['integration']});
        if (!apiKey) {
            return null;
        }

        return apiKey.relations.integration.toJSON();
    }
}

module.exports = VersionNotificationsDataService;
