const path = require('path');

const adapterManager = require('../../services/adapter-manager').default;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'media',
    upload: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        async query(frame) {
            const storage = adapterManager.getAdapter('storage:media');

            let thumbnailPath = null;
            if (frame.files.thumbnail && frame.files.thumbnail[0]) {
                thumbnailPath = await storage.save(frame.files.thumbnail[0]);
            }

            const filePath = await storage.save(frame.files.file[0]);

            return {
                filePath,
                thumbnailPath
            };
        }
    },

    uploadThumbnail: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        data: [
            'url',
            'ref'
        ],
        async query(frame) {
            const mediaStorage = adapterManager.getAdapter('storage:media');
            const targetDir = path.dirname(mediaStorage.urlToPath(frame.data.url));

            // NOTE: need to cleanup otherwise the parent media name won't match thumb name
            //       due to "unique name" generation during save
            if (await mediaStorage.exists(frame.file.name, targetDir)) {
                await mediaStorage.delete(frame.file.name, targetDir);
            }

            return await mediaStorage.save(frame.file, targetDir);
        }
    }
};

module.exports = controller;
