module.exports = {
    cors: require('./cors'),
    normalizeImage: require('./normalize-image'),
    updateUserLastSeen: require('@tryghost/mw-update-user-last-seen'),
    upload: require('./upload'),
    versionMatch: require('./version-match')
};
