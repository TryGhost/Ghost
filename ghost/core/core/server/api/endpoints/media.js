const path = require('path');
const storage = require('../../adapters/storage');
const models = require('../../models');
const mediaLibrary = require('../../services/media-library');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'media',
    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'page',
            'limit',
            'order',
            'filter',
            'search'
        ],
        permissions: true,
        async query(frame) {
            await mediaLibrary.ensureBackfilled();
            return models.MediaFile.findPage(frame.options);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        permissions: true,
        async query(frame) {
            await mediaLibrary.ensureBackfilled();
            return models.MediaFile.findOne(frame.data, {
                ...frame.options,
                withRelated: ['usages'],
                require: true
            });
        }
    },

    upload: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        async query(frame) {
            let thumbnailPath = null;
            if (frame.files.thumbnail && frame.files.thumbnail[0]) {
                thumbnailPath = await storage.getStorage('media').save(frame.files.thumbnail[0]);
            }

            const filePath = await storage.getStorage('media').save(frame.files.file[0]);
            await mediaLibrary.indexUpload({
                url: filePath,
                storageType: 'media',
                file: frame.files.file[0],
                thumbnailUrl: thumbnailPath,
                createdBy: frame.options.context?.user
            });

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
            const mediaStorage = storage.getStorage('media');
            const targetDir = path.dirname(mediaStorage.urlToPath(frame.data.url));

            // NOTE: need to cleanup otherwise the parent media name won't match thumb name
            //       due to "unique name" generation during save
            if (await mediaStorage.exists(frame.file.name, targetDir)) {
                await mediaStorage.delete(frame.file.name, targetDir);
            }

            const thumbnailPath = await mediaStorage.save(frame.file, targetDir);
            await mediaLibrary.updateThumbnail(frame.data.url, thumbnailPath);

            return thumbnailPath;
        }
    }
};

module.exports = controller;
