const path = require('path');
const storage = require('../../adapters/storage');
const db = require('../../data/db');
const models = require('../../models');
const mediaLibrary = require('../../services/media-library');

async function saveThumbnail(files) {
    if (!files.thumbnail || !files.thumbnail[0]) {
        return null;
    }

    return await storage.getStorage('media').save(files.thumbnail[0]);
}

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

    edit: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        permissions: true,
        async query(frame) {
            return await models.MediaFile.edit(frame.data.media[0], {
                ...frame.options,
                require: true
            });
        }
    },

    browseFolders: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'page',
            'limit',
            'order'
        ],
        permissions: {
            docName: 'media',
            method: 'browse'
        },
        query(frame) {
            return models.MediaFolder.findPage(frame.options);
        }
    },

    addFolder: {
        statusCode: 201,
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'media',
            method: 'edit'
        },
        query(frame) {
            return models.MediaFolder.add({
                ...frame.data.media_folders[0],
                created_by: frame.options.context?.user
            }, frame.options);
        }
    },

    editFolder: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        permissions: {
            docName: 'media',
            method: 'edit'
        },
        query(frame) {
            return models.MediaFolder.edit(frame.data.media_folders[0], {
                ...frame.options,
                require: true
            });
        }
    },

    destroyFolder: {
        statusCode: 204,
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        permissions: {
            docName: 'media',
            method: 'edit'
        },
        async query(frame) {
            await db.knex('media_files').where({folder_id: frame.options.id}).update({
                folder_id: null,
                updated_at: new Date()
            });
            await models.MediaFolder.destroy({
                ...frame.options,
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
        data: [
            'folder_id'
        ],
        async query(frame) {
            const thumbnailPath = await saveThumbnail(frame.files);
            const filePath = await storage.getStorage('media').save(frame.files.file[0]);
            await mediaLibrary.indexUpload({
                url: filePath,
                storageType: 'media',
                file: frame.files.file[0],
                thumbnailUrl: thumbnailPath,
                createdBy: frame.options.context?.user,
                folderId: frame.data.folder_id || null
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
