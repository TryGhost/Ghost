const {notifications} = require('../../services/notifications');
const api = require('./index');
const internalContext = {context: {internal: true}};

module.exports = {
    docName: 'notifications',

    browse: {
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
        permissions: true,
        query(frame) {
            const {allNotifications, notificationsToAdd} = notifications.add({
                notifications: frame.data.notifications
            });

            if (notificationsToAdd.length){
                return api.settings.edit({
                    settings: [{
                        key: 'notifications',
                        // @NOTE: We always need to store all notifications!
                        value: allNotifications.concat(notificationsToAdd)
                    }]
                }, internalContext).then(() => {
                    return notificationsToAdd;
                });
            }
        }
    },

    destroy: {
        statusCode: 204,
        options: ['notification_id'],
        validation: {
            options: {
                notification_id: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            const allNotifications = notifications.destroy({
                notificationId: frame.options.notification_id,
                user: {
                    id: frame.user && frame.user.id
                }
            });

            return api.settings.edit({
                settings: [{
                    key: 'notifications',
                    value: allNotifications
                }]
            }, internalContext).return();
        }
    },

    /**
     * Clears all notifications. Method used in tests only
     *
     * @private Not exposed over HTTP
     */
    destroyAll: {
        statusCode: 204,
        permissions: {
            method: 'destroy'
        },
        query() {
            const allNotifications = notifications.destroyAll();

            return api.settings.edit({
                settings: [{
                    key: 'notifications',
                    value: allNotifications
                }]
            }, internalContext).return();
        }
    }
};
