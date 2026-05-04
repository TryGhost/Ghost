const storage = require('../../adapters/storage');
const {getStorageContentType} = require('../../services/files/file-type-utils');
const mediaLibrary = require('../../services/media-library');

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
            const file = {
                name: frame.file.originalname,
                path: frame.file.path,
                type: getStorageContentType(frame.file.originalname)
            };
            const filePath = await storage.getStorage('files').save(file);
            await mediaLibrary.indexUpload({
                url: filePath,
                storageType: 'files',
                file,
                createdBy: frame.options.context?.user
            });

            return {
                filePath
            };
        }
    }
};

module.exports = controller;
