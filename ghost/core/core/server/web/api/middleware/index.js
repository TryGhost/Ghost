const {corsCaching, corsMiddleware} = require('./cors');

module.exports = {
    cors: [
        corsCaching,
        corsMiddleware
    ],
    updateUserLastSeen: require('./update-user-last-seen'),
    upload: require('./upload')
};
