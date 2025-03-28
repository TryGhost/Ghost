const debug = require('@tryghost/debug')('api:endpoints:utils:serializers:output:notifications');

module.exports = {
    all(response, apiConfig, frame) {
        debug('all');
        if (!response) {
            return;
        }

        if (!response || !response.length) {
            frame.response = {
                notifications: []
            };

            return;
        }

        response.forEach((notification) => {
            delete notification.seen;
            delete notification.seenBy;
            delete notification.addedAt;
            delete notification.createdAtVersion;
        });

        frame.response = {
            notifications: response
        };
    }
};
