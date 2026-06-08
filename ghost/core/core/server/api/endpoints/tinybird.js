const TinybirdServiceWrapper = require('../../services/tinybird');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'tinybird',

    token: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            TinybirdServiceWrapper.init();
            const tokenData = TinybirdServiceWrapper.instance?.getToken() ?? null;
            
            if (tokenData?.exp) {
                return {
                    token: tokenData.token,
                    exp: new Date(tokenData.exp * 1000).toISOString()
                };
            }
            
            return tokenData;
        }
    }
};

module.exports = controller;
