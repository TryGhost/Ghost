const publicConfig = require('../../services/public-config');

module.exports = {
    docName: 'config',

    read: {
        permissions: false,
        query() {
            return publicConfig.config;
        }
    }
};
