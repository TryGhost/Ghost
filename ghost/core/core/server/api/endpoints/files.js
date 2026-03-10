const storage = require('../../adapters/storage');
const mime = require('mime-types');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'files',
    upload: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        async query(frame) {
            const filePath = await storage.getStorage('files').save({
                name: frame.file.originalname,
                path: frame.file.path,
                type: mime.lookup(frame.file.originalname) || 'application/octet-stream'
            });

            return {
                filePath
            };
        }
    }
};

module.exports = controller;
