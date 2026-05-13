const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:notifications');

module.exports = {
    all(response, apiConfig, frame) {
        debug('all');
        if (!response) {
            return;
        }

        if (!response.length) {
            frame.response = {
                notifications: []
            };
            return;
        }

        const serialized = response.map(notification => ({
            id: notification.id,
            custom: notification.custom,
            type: notification.type,
            message: notification.message,
            dismissible: notification.dismissible,
            top: notification.top ?? false,
            location: 'bottom',
            status: 'alert'
        }));

        frame.response = {
            notifications: serialized
        };
    }
};
