const tinybirdService = require('../../services/tinybird');

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
            const instance = tinybirdService.getInstance();
            const tokenData = instance.getToken();
            
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
