const internalContext = {
    internal: true
};

class VersionNotificationsDataService {
    /**
     * @param {Object} options
     * @param {Object} options.UserModel - ghost user model
     * @param {Object} options.settingsService - ghost settings service
    */
    constructor({UserModel, settingsService}) {
        this.UserModel = UserModel;
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
}

module.exports = VersionNotificationsDataService;
