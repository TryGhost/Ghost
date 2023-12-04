const {notifications} = require('../../services/notifications');
const settingsService = require('../../services/settings/settings-service');
const settingsBREADService = settingsService.getSettingsBREADServiceInstance();
const internalContext = {context: {internal: true}};

module.exports = {
    docName: 'notifications',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query(frame) {
            return notifications.browse({
                user: {
                    id: frame.user && frame.user.id
                }
            });
        }
    },

    add: {
        statusCode(result) {
            if (result.notifications.length) {
                return 201;
            } else {
                return 200;
            }
        },
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        async query(frame) {
            const {allNotifications, notificationsToAdd} = notifications.add({
                notifications: frame.data.notifications
            });

            if (notificationsToAdd.length){
                return await settingsBREADService.edit([{
                    key: 'notifications',
                    // @NOTE: We always need to store all notifications!
                    value: allNotifications.concat(notificationsToAdd)
                }], internalContext).then(() => {
                    return notificationsToAdd;
                });
            }
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: ['notification_id'],
        validation: {
            options: {
                notification_id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            const allNotifications = await notifications.destroy({
                notificationId: frame.options.notification_id,
                user: {
                    id: frame.user && frame.user.id
                }
            });

            await settingsBREADService.edit([{
                key: 'notifications',
                value: allNotifications
            }], internalContext);
        }
    },

    /**
     * Clears all notifications. Method used in tests only
     *
     * @private Not exposed over HTTP
     */
    destroyAll: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            method: 'destroy'
        },
        async query() {
            const allNotifications = notifications.destroyAll();

            await settingsBREADService.edit([{
                key: 'notifications',
                value: allNotifications
            }], internalContext);
        }
    }
};
