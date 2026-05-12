const path = require('path');
const storage = require('../../adapters/storage');
const db = require('../../data/db');
const models = require('../../models');
const mediaLibrary = require('../../services/media-library');

const getUploadFolderId = frame => frame.data.folder_id || frame.original?.body?.folder_id || null;
const editableMediaFields = ['name', 'folder_id', 'alt_text', 'caption'];
const libraryVisibility = 'library';
const libraryVisibilityFilter = `visibility:${libraryVisibility}`;

function withLibraryVisibilityFilter(options = {}) {
    return {
        ...options,
        filter: options.filter ? `(${options.filter})+${libraryVisibilityFilter}` : libraryVisibilityFilter
    };
}

function displayNameWithoutExtension(name, extension) {
    const trimmedName = (name || '').trim();
    const extensionSuffix = extension ? `.${extension.toLowerCase()}` : '';

    if (extensionSuffix && trimmedName.toLowerCase().endsWith(extensionSuffix)) {
        return trimmedName.slice(0, -extensionSuffix.length);
    }

    return trimmedName;
}

function getEditableMediaData(data) {
    return editableMediaFields.reduce((attrs, field) => {
        if (Object.prototype.hasOwnProperty.call(data, field)) {
            attrs[field] = typeof data[field] === 'string' ? data[field].trim() : data[field];
        }

        return attrs;
    }, {});
}

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
            return models.MediaFile.findPage(withLibraryVisibilityFilter(frame.options));
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
            const mediaFile = await models.MediaFile.findOne({
                ...frame.data,
                visibility: libraryVisibility
            }, {
                ...frame.options,
                withRelated: ['usages'],
                require: true
            });

            return await mediaLibrary.enrichUsageDetails(mediaFile);
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
            const editableData = getEditableMediaData(frame.data.media[0]);
            const mediaFile = await models.MediaFile.findOne({
                id: frame.options.id,
                visibility: libraryVisibility
            }, {require: true});

            if (Object.prototype.hasOwnProperty.call(editableData, 'name')) {
                editableData.name = displayNameWithoutExtension(editableData.name, mediaFile.get('extension'));
            }

            return await models.MediaFile.edit(editableData, {
                ...frame.options,
                require: true
            });
        }
    },

    replaceFile: {
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
            const mediaFile = await models.MediaFile.findOne({
                id: frame.options.id,
                visibility: libraryVisibility
            }, {
                require: true
            });

            await mediaLibrary.replaceFile(mediaFile, frame.file);

            const replacedMediaFile = await models.MediaFile.findOne({id: frame.options.id}, {
                withRelated: ['usages'],
                require: true
            });

            return await mediaLibrary.enrichUsageDetails(replacedMediaFile);
        }
    },

    destroy: {
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
            const mediaFile = await models.MediaFile.findOne({
                id: frame.options.id,
                visibility: libraryVisibility
            }, {
                require: true
            });

            await mediaLibrary.destroyFile(mediaFile);
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
                folderId: getUploadFolderId(frame)
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
