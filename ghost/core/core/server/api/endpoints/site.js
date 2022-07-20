const publicConfig = require('../../services/public-config');

const site = {
    docName: 'site',

    read: {
        permissions: false,
        query() {
            return publicConfig.site;
        }
    }
};

module.exports = site;
