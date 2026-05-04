/* eslint-disable max-lines */
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const ObjectId = require('bson-objectid').default;
const mime = require('mime-types');
const sizeOf = require('image-size');

const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');
const db = require('../../data/db');
const storage = require('../../adapters/storage');

const STORAGE_PREFIXES = {
    images: urlUtils.STATIC_IMAGE_URL_PREFIX,
    files: urlUtils.STATIC_FILES_URL_PREFIX,
    media: urlUtils.STATIC_MEDIA_URL_PREFIX
};

const STORAGE_PATHS = {
    images: () => config.getContentPath('images'),
    files: () => config.getContentPath('files'),
    media: () => config.getContentPath('media')
};

const IMAGE_EXTENSIONS = new Set(['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'ogv', 'ogg']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a']);
const URL_MATCHER = /(?:(?:https?:\/\/|__GHOST_URL__\/)[^\s"'<>\\)]*|\/)content\/(?:images|files|media)\/[^\s"'<>\\)]+/g;

let backfillPromise = null;

function trimUrl(value) {
    return value
        .replace(/\\u002F/g, '/')
        .replace(/\\\//g, '/')
        .replace(/[.,;:!?]+$/, '');
}

function toAbsoluteUrl(url) {
    if (!url) {
        return url;
    }

    if (url.startsWith('__GHOST_URL__/')) {
        return config.getSiteUrl().replace(/\/$/, '') + url.replace('__GHOST_URL__', '');
    }

    if (/^https?:\/\//i.test(url)) {
        return url;
    }

    const siteUrl = config.getSiteUrl().replace(/\/$/, '');
    const subdir = config.getSubdir();
    const cleanUrl = url.startsWith(subdir) ? url.slice(subdir.length) : url;
    return siteUrl + cleanUrl;
}

function getRelativeContentUrl(url) {
    const absoluteUrl = toAbsoluteUrl(url);
    const siteUrl = config.getSiteUrl().replace(/\/$/, '');

    if (absoluteUrl.startsWith(siteUrl)) {
        return absoluteUrl.slice(siteUrl.length).replace(/^\/+/, '');
    }

    const match = absoluteUrl.match(/content\/(?:images|files|media)\/.+$/);
    return match ? match[0] : null;
}

function getStorageType(url) {
    const relative = getRelativeContentUrl(url);

    if (!relative) {
        return null;
    }

    if (relative.startsWith(STORAGE_PREFIXES.images + '/')) {
        return 'images';
    }

    if (relative.startsWith(STORAGE_PREFIXES.files + '/')) {
        return 'files';
    }

    if (relative.startsWith(STORAGE_PREFIXES.media + '/')) {
        return 'media';
    }

    return null;
}

function getStoragePath(url, storageType) {
    const relative = getRelativeContentUrl(url);
    if (!relative || !storageType) {
        return null;
    }

    const prefix = STORAGE_PREFIXES[storageType] + '/';
    return relative.startsWith(prefix) ? relative.slice(prefix.length) : null;
}

function getMediaType({storageType, extension, mimeType}) {
    if (storageType === 'images' || (mimeType && mimeType.startsWith('image/')) || IMAGE_EXTENSIONS.has(extension)) {
        return 'image';
    }

    if (storageType === 'media' && ((mimeType && mimeType.startsWith('video/')) || VIDEO_EXTENSIONS.has(extension))) {
        return 'video';
    }

    if (storageType === 'media' && ((mimeType && mimeType.startsWith('audio/')) || AUDIO_EXTENSIONS.has(extension))) {
        return 'audio';
    }

    return 'file';
}

function getImageDimensions(filePath, mediaType) {
    if (mediaType !== 'image' || !filePath) {
        return {};
    }

    try {
        const dimensions = sizeOf(filePath);
        return {
            width: dimensions.width || null,
            height: dimensions.height || null
        };
    } catch (err) {
        return {};
    }
}

async function getFileStats(filePath) {
    if (!filePath) {
        return {};
    }

    try {
        const stat = await fs.stat(filePath);
        return {
            size_bytes: stat.size,
            created_at: stat.birthtime || stat.ctime
        };
    } catch (err) {
        return {};
    }
}

function localFilePath(storageType, storagePath) {
    if (!storageType || !storagePath || !STORAGE_PATHS[storageType]) {
        return null;
    }

    return path.join(STORAGE_PATHS[storageType](), storagePath);
}

async function upsertMediaFile(data) {
    const knex = db.knex;
    const now = new Date();
    const urlHash = crypto.createHash('sha256').update(data.url).digest('hex');
    const existing = await knex('media_files').where({url_hash: urlHash}).first();
    const source = existing?.source === 'upload' && data.source !== 'upload' ? 'upload' : data.source;

    if (existing) {
        await knex('media_files').where({id: existing.id}).update({
            folder_id: data.folder_id ?? existing.folder_id,
            storage_path: data.storage_path ?? existing.storage_path,
            storage_type: data.storage_type ?? existing.storage_type,
            media_type: data.media_type ?? existing.media_type,
            mime_type: data.mime_type ?? existing.mime_type,
            extension: data.extension ?? existing.extension,
            name: data.name ?? existing.name,
            size_bytes: data.size_bytes ?? existing.size_bytes,
            width: data.width ?? existing.width,
            height: data.height ?? existing.height,
            thumbnail_url: data.thumbnail_url ?? existing.thumbnail_url,
            source,
            created_by: data.created_by ?? existing.created_by,
            updated_at: now
        });

        return existing.id;
    }

    const id = ObjectId().toHexString();
    await knex('media_files').insert({
        id,
        url: data.url,
        url_hash: urlHash,
        folder_id: data.folder_id || null,
        storage_path: data.storage_path,
        storage_type: data.storage_type,
        media_type: data.media_type,
        mime_type: data.mime_type,
        extension: data.extension,
        name: data.name,
        size_bytes: data.size_bytes,
        width: data.width,
        height: data.height,
        thumbnail_url: data.thumbnail_url,
        source,
        created_by: data.created_by,
        created_at: data.created_at || now,
        updated_at: now
    });

    return id;
}

async function indexUrl(url, {source = 'reference', createdBy = null, thumbnailUrl = null, filePath = null, folderId = null} = {}) {
    const absoluteUrl = toAbsoluteUrl(trimUrl(url));
    const storageType = getStorageType(absoluteUrl);

    if (!storageType) {
        return null;
    }

    const storagePath = getStoragePath(absoluteUrl, storageType);
    const extension = (path.extname(storagePath || absoluteUrl).replace('.', '') || '').toLowerCase() || null;
    const mimeType = mime.lookup(storagePath || absoluteUrl) || null;
    const mediaType = getMediaType({storageType, extension, mimeType});
    const resolvedFilePath = filePath || localFilePath(storageType, storagePath);
    const stats = await getFileStats(resolvedFilePath);
    const dimensions = getImageDimensions(resolvedFilePath, mediaType);

    return await upsertMediaFile({
        url: absoluteUrl,
        storage_path: storagePath,
        storage_type: storageType,
        media_type: mediaType,
        folder_id: folderId,
        mime_type: mimeType,
        extension,
        name: path.basename(storagePath || absoluteUrl).slice(0, 191),
        size_bytes: stats.size_bytes,
        width: dimensions.width,
        height: dimensions.height,
        thumbnail_url: thumbnailUrl ? toAbsoluteUrl(thumbnailUrl) : null,
        source,
        created_by: createdBy,
        created_at: stats.created_at
    });
}

async function indexUpload({url, storageType, file, thumbnailUrl = null, createdBy = null, folderId = null}) {
    let absoluteUrl = url;

    if (storageType === 'images') {
        absoluteUrl = urlUtils.urlFor('image', {image: url}, true);
    } else {
        absoluteUrl = toAbsoluteUrl(url);
    }

    let storagePath = null;
    try {
        const store = storage.getStorage(storageType);
        if (store.urlToPath) {
            storagePath = store.urlToPath(absoluteUrl);
        }
    } catch (err) {
        storagePath = getStoragePath(absoluteUrl, storageType);
    }

    const extension = (path.extname(storagePath || file?.name || absoluteUrl).replace('.', '') || '').toLowerCase() || null;
    const mimeType = file?.type || mime.lookup(file?.name || storagePath || absoluteUrl) || null;
    const mediaType = getMediaType({storageType, extension, mimeType});
    const stats = await getFileStats(file?.path);
    const dimensions = getImageDimensions(file?.path, mediaType);

    return await upsertMediaFile({
        url: absoluteUrl,
        storage_path: storagePath,
        storage_type: storageType,
        media_type: mediaType,
        folder_id: folderId,
        mime_type: mimeType,
        extension,
        name: path.basename(storagePath || file?.name || absoluteUrl).slice(0, 191),
        size_bytes: stats.size_bytes,
        width: dimensions.width,
        height: dimensions.height,
        thumbnail_url: thumbnailUrl ? toAbsoluteUrl(thumbnailUrl) : null,
        source: 'upload',
        created_by: createdBy
    });
}

async function updateThumbnail(mediaUrl, thumbnailUrl) {
    const absoluteMediaUrl = toAbsoluteUrl(mediaUrl);
    const absoluteThumbnailUrl = toAbsoluteUrl(thumbnailUrl);

    await db.knex('media_files').where({url: absoluteMediaUrl}).update({
        thumbnail_url: absoluteThumbnailUrl,
        updated_at: new Date()
    });
}

async function scanStorage(storageType) {
    const root = STORAGE_PATHS[storageType]();
    const exists = await fs.pathExists(root);
    if (!exists) {
        return;
    }

    const entries = await fs.readdir(root, {withFileTypes: true});
    async function walk(dir, dirEntries) {
        for (const entry of dirEntries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                await walk(fullPath, await fs.readdir(fullPath, {withFileTypes: true}));
                continue;
            }

            if (!entry.isFile()) {
                continue;
            }

            const relative = path.relative(root, fullPath).split(path.sep).join('/');
            if (storageType === 'images' && /_o\.[a-z0-9]+$/i.test(relative)) {
                continue;
            }

            const url = toAbsoluteUrl(urlUtils.urlJoin('/', STORAGE_PREFIXES[storageType], relative));
            await indexUrl(url, {source: 'backfill', filePath: fullPath});
        }
    }

    await walk(root, entries);
}

function extractUrls(value) {
    if (!value || typeof value !== 'string') {
        return [];
    }

    return [...value.matchAll(URL_MATCHER)].map(match => trimUrl(match[0]));
}

async function addUsage(mediaFileId, usage) {
    const existing = await db.knex('media_file_usages').where({
        media_file_id: mediaFileId,
        resource_type: usage.resource_type,
        resource_id: usage.resource_id,
        field: usage.field
    }).first();

    if (existing) {
        return;
    }

    await db.knex('media_file_usages').insert({
        id: ObjectId().toHexString(),
        media_file_id: mediaFileId,
        resource_type: usage.resource_type,
        resource_id: usage.resource_id,
        field: usage.field,
        created_at: new Date()
    });
}

async function scanTableForReferences(tableName, resourceType, fields) {
    const exists = await db.knex.schema.hasTable(tableName);
    if (!exists) {
        return;
    }

    const rows = await db.knex(tableName).select(['id', ...fields]);
    for (const row of rows) {
        for (const field of fields) {
            for (const url of extractUrls(row[field])) {
                const mediaFileId = await indexUrl(url, {source: 'reference'});
                if (mediaFileId) {
                    await addUsage(mediaFileId, {
                        resource_type: resourceType,
                        resource_id: row.id,
                        field
                    });
                }
            }
        }
    }
}

async function backfill() {
    await scanStorage('images');
    await scanStorage('files');
    await scanStorage('media');

    await scanTableForReferences('posts', 'post', ['feature_image', 'mobiledoc', 'lexical', 'html']);
    await scanTableForReferences('posts_meta', 'post', ['og_image', 'twitter_image']);
    await scanTableForReferences('snippets', 'snippet', ['mobiledoc', 'lexical']);
    await scanTableForReferences('settings', 'setting', ['value']);
    await scanTableForReferences('users', 'user', ['profile_image', 'cover_image']);
    await scanTableForReferences('tags', 'tag', ['feature_image', 'og_image', 'twitter_image']);
    await scanTableForReferences('newsletters', 'newsletter', ['header_image']);
}

async function ensureBackfilled() {
    if (!backfillPromise) {
        backfillPromise = backfill().catch((err) => {
            backfillPromise = null;
            throw err;
        });
    }

    return backfillPromise;
}

module.exports = {
    ensureBackfilled,
    indexUpload,
    updateThumbnail,
    indexUrl
};
