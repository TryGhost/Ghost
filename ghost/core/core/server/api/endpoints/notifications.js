const {notifications} = require('../../services/notifications');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
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
            return await notifications.add({
                notifications: frame.data.notifications
            });
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
            await notifications.destroy({
                notificationId: frame.options.notification_id,
                user: {
                    id: frame.user && frame.user.id
                }
            });
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
            await notifications.destroyAll();
        }
    }
};

module.exports = controller;
