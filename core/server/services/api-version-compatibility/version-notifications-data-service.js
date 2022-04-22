const settingsService = require('../../services/settings');
const models = require('../../models');
const settingsBREADServiceInstance = settingsService.getSettingsBREADServiceInstance();

const internalContext = {
    internal: true
};

const fetchNotification = async (acceptVersion) => {
    const setting = await settingsBREADServiceInstance.read('version_notifications', internalContext);
    const versionNotifications = JSON.parse(setting.version_notifications.value);

    return versionNotifications.find(version => version === acceptVersion);
};

const saveNotification = async (acceptVersion) => {
    const setting = await settingsBREADServiceInstance.read('version_notifications', internalContext);
    const versionNotifications = JSON.parse(setting.version_notifications.value);

    if (!versionNotifications.find(version => version === acceptVersion)) {
        versionNotifications.push(acceptVersion);

        return settingsBREADServiceInstance.edit([{
            key: 'version_notifications',
            value: JSON.stringify(versionNotifications)
        }], {
            context: internalContext
        });
    }
};

const getNotificationEmails = async () => {
    const data = await models.User.findAll(Object.assign({
        withRelated: ['roles'],
        filter: 'status:active'
    }, internalContext));

    const adminEmails = data
        .toJSON()
        .filter(user => ['Owner', 'Administrator'].includes(user.roles[0].name))
        .map(user => user.email);

    return adminEmails;
};

module.exports = {
    fetchNotification,
    saveNotification,
    getNotificationEmails
};
