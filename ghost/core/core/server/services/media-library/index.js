/* eslint-disable max-lines */
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
const ObjectId = require('bson-objectid').default;
const mime = require('mime-types');
const sizeOf = require('image-size');
const errors = require('@tryghost/errors');

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
const CONTENT_URL_MATCHER = /(?:(?:https?:\/\/|__GHOST_URL__\/)[^\s"'<>\\)]*|\/)content\/(?:images|files|media)\/[^\s"'<>\\)]+/g;
const REMOTE_URL_MATCHER = /https?:\/\/[^\s"'<>\\)]+/g;
const POST_CONTENT_FIELDS = ['mobiledoc', 'lexical', 'html'];
const POST_META_IMAGE_FIELDS = ['og_image', 'twitter_image'];
const SYSTEM_MEDIA_SETTING_KEYS = ['pintura_js_url', 'pintura_css_url'];
const REMOTE_MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS, ...AUDIO_EXTENSIONS, 'pdf']);

let backfillPromise = null;

function isGeneratedImageSizePath(storagePath) {
    return /^sizes?\/[^/]+\//i.test(storagePath || '');
}

function originalImageStoragePath(storagePath) {
    if (!isGeneratedImageSizePath(storagePath)) {
        return storagePath;
    }

    return storagePath.split('/').slice(2).join('/');
}

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

function getExtension(value) {
    if (!value) {
        return null;
    }

    try {
        const parsedUrl = /^https?:\/\//i.test(value) ? new URL(value) : null;
        const pathnameExtension = path.extname(parsedUrl?.pathname || value).replace('.', '').toLowerCase();

        if (pathnameExtension) {
            return pathnameExtension;
        }

        const format = parsedUrl?.searchParams.get('fm') || parsedUrl?.searchParams.get('format');
        return format ? format.toLowerCase().replace(/^image\//, '') : null;
    } catch (err) {
        return path.extname(value).replace('.', '').toLowerCase() || null;
    }
}

function getBasename(value) {
    if (!value) {
        return null;
    }

    try {
        const parsedUrl = /^https?:\/\//i.test(value) ? new URL(value) : null;
        return path.basename(parsedUrl?.pathname || value).slice(0, 191);
    } catch (err) {
        return path.basename(value.split('?')[0]).slice(0, 191);
    }
}

function getDisplayName(value) {
    const basename = getBasename(value);
    if (!basename) {
        return null;
    }

    const extension = path.extname(basename);
    return (extension ? basename.slice(0, -extension.length) : basename).slice(0, 191);
}

function isUnsplashUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        return hostname === 'unsplash.com' || hostname.endsWith('.unsplash.com');
    } catch (err) {
        return false;
    }
}

function isTenorUrl(url) {
    try {
        const hostname = new URL(url).hostname;
        return hostname === 'tenor.com' || hostname.endsWith('.tenor.com') || hostname === 'tenor.googleapis.com';
    } catch (err) {
        return false;
    }
}

function getIndexedSource(source, url) {
    if (isUnsplashUrl(url)) {
        return 'unsplash';
    }

    if (isTenorUrl(url)) {
        return 'tenor';
    }

    if (source === 'reference') {
        return getStorageType(url) ? 'upload' : 'external';
    }

    return source === 'backfill' ? 'upload' : source;
}

function getStorageTypeHintForExtension(extension) {
    if (IMAGE_EXTENSIONS.has(extension)) {
        return 'images';
    }

    if (VIDEO_EXTENSIONS.has(extension) || AUDIO_EXTENSIONS.has(extension)) {
        return 'media';
    }

    return 'files';
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
    const visibility = data.visibility || existing?.visibility || 'library';

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
            visibility,
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
        visibility,
        created_by: data.created_by,
        created_at: data.created_at || now,
        updated_at: now
    });

    return id;
}

async function indexUrl(url, {source = 'reference', visibility = 'library', createdBy = null, thumbnailUrl = null, filePath = null, folderId = null, storageTypeHint = null, mediaTypeHint = null} = {}) {
    let absoluteUrl = toAbsoluteUrl(trimUrl(url));
    const storageType = getStorageType(absoluteUrl) || storageTypeHint;
    const indexedSource = getIndexedSource(source, absoluteUrl);

    if (!storageType) {
        return null;
    }

    let storagePath = getStoragePath(absoluteUrl, storageType);
    if (storageType === 'images' && isGeneratedImageSizePath(storagePath)) {
        storagePath = originalImageStoragePath(storagePath);
        absoluteUrl = toAbsoluteUrl(urlUtils.urlJoin('/', STORAGE_PREFIXES.images, storagePath));
    }
    const extension = getExtension(storagePath || absoluteUrl);
    const mimeType = mime.lookup(storagePath || absoluteUrl) || mime.lookup(extension || '') || (mediaTypeHint === 'image' ? 'image/jpeg' : null);
    const mediaType = mediaTypeHint || getMediaType({storageType, extension, mimeType});
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
        name: getDisplayName(storagePath || absoluteUrl),
        size_bytes: stats.size_bytes,
        width: dimensions.width,
        height: dimensions.height,
        thumbnail_url: thumbnailUrl ? toAbsoluteUrl(thumbnailUrl) : null,
        source: indexedSource,
        visibility,
        created_by: createdBy,
        created_at: stats.created_at
    });
}

async function indexUpload({url, storageType, file, thumbnailUrl = null, visibility = 'library', createdBy = null, folderId = null}) {
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
        name: getDisplayName(storagePath || file?.name || absoluteUrl),
        size_bytes: stats.size_bytes,
        width: dimensions.width,
        height: dimensions.height,
        thumbnail_url: thumbnailUrl ? toAbsoluteUrl(thumbnailUrl) : null,
        source: 'upload',
        visibility,
        created_by: createdBy
    });
}

async function setVisibilityForUrl(url, visibility) {
    if (!url || !visibility) {
        return;
    }

    const absoluteUrl = toAbsoluteUrl(trimUrl(url));
    const storageType = getStorageType(absoluteUrl);
    const storagePath = getStoragePath(absoluteUrl, storageType);

    await db.knex('media_files')
        .where((builder) => {
            builder.where({url: absoluteUrl});

            if (storageType && storagePath) {
                builder.orWhere({
                    storage_type: storageType,
                    storage_path: storagePath
                });
            }
        })
        .whereNot({visibility})
        .update({
            visibility,
            updated_at: new Date()
        });
}

async function markSystemSettingMediaFiles() {
    const settings = await db.knex('settings')
        .select('value')
        .whereIn('key', SYSTEM_MEDIA_SETTING_KEYS);

    for (const setting of settings) {
        await setVisibilityForUrl(setting.value, 'system');
    }
}

async function updateThumbnail(mediaUrl, thumbnailUrl) {
    const absoluteMediaUrl = toAbsoluteUrl(mediaUrl);
    const absoluteThumbnailUrl = toAbsoluteUrl(thumbnailUrl);

    await db.knex('media_files').where({url: absoluteMediaUrl}).update({
        thumbnail_url: absoluteThumbnailUrl,
        updated_at: new Date()
    });
}

async function removeMatchingGeneratedImageSizeFiles(baseRoot, dir, storagePath) {
    const entries = await fs.readdir(dir, {withFileTypes: true});

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            await removeMatchingGeneratedImageSizeFiles(baseRoot, fullPath, storagePath);
            continue;
        }

        if (!entry.isFile()) {
            continue;
        }

        const relative = path.relative(baseRoot, fullPath).split(path.sep).join('/');
        if (relative === storagePath || relative.endsWith(`/${storagePath}`)) {
            await fs.remove(fullPath);
        }
    }
}

async function removeGeneratedImageSizeFiles(storagePath) {
    if (!storagePath) {
        return;
    }

    for (const prefix of ['size', 'sizes']) {
        const root = path.join(STORAGE_PATHS.images(), prefix);

        if (!await fs.pathExists(root)) {
            continue;
        }

        await removeMatchingGeneratedImageSizeFiles(root, root, storagePath);
    }
}

async function deleteStoredFile(storageType, storagePath) {
    if (!storageType || !storagePath) {
        return;
    }

    const store = storage.getStorage(storageType);
    if (typeof store.delete !== 'function') {
        return;
    }

    const fileName = path.posix.basename(storagePath);
    const targetDir = path.posix.dirname(storagePath);
    await store.delete(fileName, targetDir === '.' ? undefined : targetDir);
}

async function destroyFile(mediaFile) {
    const id = getModelValue(mediaFile, 'id');
    const storageType = getModelValue(mediaFile, 'storage_type');
    const storagePath = getModelValue(mediaFile, 'storage_path');
    const thumbnailUrl = getModelValue(mediaFile, 'thumbnail_url');
    const usageCount = await db.knex('media_file_usages').where({media_file_id: id}).count({count: '*'}).first();

    if (Number(usageCount?.count || 0) > 0) {
        throw new errors.BadRequestError({
            message: 'This media file cannot be deleted while it is in use.'
        });
    }

    if (storageType === 'images') {
        await removeGeneratedImageSizeFiles(storagePath);
    }

    await deleteStoredFile(storageType, storagePath);

    if (thumbnailUrl) {
        const thumbnailStorageType = getStorageType(thumbnailUrl);
        const thumbnailStoragePath = getStoragePath(thumbnailUrl, thumbnailStorageType);
        await deleteStoredFile(thumbnailStorageType, thumbnailStoragePath);
    }

    await db.knex('media_files').where({id}).del();
}

async function replaceFile(mediaFile, file) {
    const id = getModelValue(mediaFile, 'id');
    const storageType = getModelValue(mediaFile, 'storage_type');
    const storagePath = getModelValue(mediaFile, 'storage_path');
    const mediaType = getModelValue(mediaFile, 'media_type');
    const extension = (path.extname(storagePath || file?.name || '').replace('.', '') || '').toLowerCase() || null;
    const mimeType = file?.type || mime.lookup(file?.name || storagePath || '') || null;
    const replacementMediaType = getMediaType({storageType, extension, mimeType});

    if (!id || !storagePath) {
        throw new errors.BadRequestError({
            message: 'This media file cannot be replaced.'
        });
    }

    if (storageType !== 'images' || mediaType !== 'image' || replacementMediaType !== 'image') {
        throw new errors.BadRequestError({
            message: 'Only image files can be replaced.'
        });
    }

    if (isGeneratedImageSizePath(storagePath)) {
        throw new errors.BadRequestError({
            message: 'Generated image sizes cannot be replaced.'
        });
    }

    const store = storage.getStorage(storageType);
    if (typeof store.saveRaw !== 'function') {
        throw new errors.BadRequestError({
            message: 'This storage adapter does not support replacing media files.'
        });
    }

    await store.saveRaw(await fs.readFile(file.path), storagePath);
    await removeGeneratedImageSizeFiles(storagePath);

    const stats = await getFileStats(file.path);
    const dimensions = getImageDimensions(file.path, 'image');
    await db.knex('media_files').where({id}).update({
        mime_type: mimeType,
        extension,
        media_type: 'image',
        size_bytes: stats.size_bytes,
        width: dimensions.width,
        height: dimensions.height,
        updated_at: new Date()
    });

    return await db.knex('media_files').where({id}).first();
}

async function pruneGeneratedImageSizes() {
    const generatedImageSizes = await db.knex('media_files')
        .select('id')
        .where({storage_type: 'images'})
        .where(function () {
            this.where('storage_path', 'like', 'size/%')
                .orWhere('storage_path', 'like', 'sizes/%');
        });
    const generatedImageSizeIds = generatedImageSizes.map(row => row.id);

    if (!generatedImageSizeIds.length) {
        return;
    }

    await db.knex('media_file_usages').whereIn('media_file_id', generatedImageSizeIds).del();
    await db.knex('media_files').whereIn('id', generatedImageSizeIds).del();
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
            if (storageType === 'images' && (/_o\.[a-z0-9]+$/i.test(relative) || isGeneratedImageSizePath(relative))) {
                continue;
            }

            const url = toAbsoluteUrl(urlUtils.urlJoin('/', STORAGE_PREFIXES[storageType], relative));
            await indexUrl(url, {source: 'upload', filePath: fullPath});
        }
    }

    await walk(root, entries);
}

function extractUrls(value) {
    if (!value || typeof value !== 'string') {
        return [];
    }

    return [...value.matchAll(CONTENT_URL_MATCHER)].map(match => trimUrl(match[0]));
}

function extractRemoteMediaUrls(value) {
    if (!value || typeof value !== 'string') {
        return [];
    }

    return [...value.matchAll(REMOTE_URL_MATCHER)]
        .map((match) => {
            const url = trimUrl(match[0]);
            if (getStorageType(url)) {
                return null;
            }

            const extension = getExtension(url);
            if (!extension && (isUnsplashUrl(url) || isTenorUrl(url))) {
                return {
                    url,
                    storageTypeHint: 'images',
                    mediaTypeHint: 'image'
                };
            }

            if (!extension || !REMOTE_MEDIA_EXTENSIONS.has(extension)) {
                return null;
            }

            return {
                url,
                storageTypeHint: getStorageTypeHintForExtension(extension),
                mediaTypeHint: getMediaType({
                    storageType: getStorageTypeHintForExtension(extension),
                    extension,
                    mimeType: mime.lookup(extension) || null
                })
            };
        })
        .filter(Boolean);
}

function extractImageFieldUrls(value) {
    if (!value || typeof value !== 'string') {
        return [];
    }

    return Array.from(new Set([value, ...extractUrls(value)]));
}

function extractContentFieldUsages(field, value) {
    const usages = [];
    const seenUrls = new Set();

    const addUrl = (url, hints = {}) => {
        if (!url || seenUrls.has(url)) {
            return;
        }

        seenUrls.add(url);
        usages.push({
            field,
            url,
            storageTypeHint: hints.storageTypeHint || null,
            mediaTypeHint: hints.mediaTypeHint || null
        });
    };

    extractUrls(value).forEach(url => addUrl(url));
    extractRemoteMediaUrls(value).forEach(item => addUrl(item.url, {
        storageTypeHint: item.storageTypeHint,
        mediaTypeHint: item.mediaTypeHint
    }));

    return usages;
}

function getModelValue(modelOrAttrs, field) {
    if (!modelOrAttrs) {
        return null;
    }

    if (typeof modelOrAttrs.get === 'function') {
        return modelOrAttrs.get(field);
    }

    return modelOrAttrs[field];
}

function getPostMeta(modelOrAttrs) {
    if (!modelOrAttrs) {
        return {};
    }

    if (typeof modelOrAttrs.related === 'function') {
        const postsMeta = modelOrAttrs.related('posts_meta');

        if (postsMeta && typeof postsMeta.toJSON === 'function') {
            return postsMeta.toJSON();
        }
    }

    return modelOrAttrs.posts_meta || {};
}

function extractPostResourceUsages(post) {
    const usages = [];
    const addUrls = (field, value, isImageField = false) => {
        if (!isImageField) {
            usages.push(...extractContentFieldUsages(field, value));
            return;
        }

        const urls = extractImageFieldUrls(value);

        urls.forEach((url) => {
            usages.push({
                field,
                url,
                storageTypeHint: isImageField ? 'images' : null,
                mediaTypeHint: isImageField ? 'image' : null
            });
        });
    };

    addUrls('feature_image', getModelValue(post, 'feature_image'), true);

    POST_CONTENT_FIELDS.forEach((field) => {
        addUrls(field, getModelValue(post, field));
    });

    const postsMeta = getPostMeta(post);
    POST_META_IMAGE_FIELDS.forEach((field) => {
        addUrls(field, postsMeta[field], true);
    });

    return usages;
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

async function syncResourceUsages({resourceType, resourceId, usages}) {
    if (!resourceType || !resourceId) {
        return;
    }

    const rows = [];
    const seenRows = new Set();

    for (const usage of usages) {
        const mediaFileId = await indexUrl(usage.url, {
            source: 'reference',
            storageTypeHint: usage.storageTypeHint,
            mediaTypeHint: usage.mediaTypeHint
        });

        if (!mediaFileId) {
            continue;
        }

        const rowKey = [mediaFileId, resourceType, resourceId, usage.field].join(':');
        if (seenRows.has(rowKey)) {
            continue;
        }
        seenRows.add(rowKey);

        rows.push({
            id: ObjectId().toHexString(),
            media_file_id: mediaFileId,
            resource_type: resourceType,
            resource_id: resourceId,
            field: usage.field,
            created_at: new Date()
        });
    }

    await db.knex.transaction(async (transacting) => {
        await transacting('media_file_usages').where({
            resource_type: resourceType,
            resource_id: resourceId
        }).del();

        if (rows.length) {
            await transacting.batchInsert('media_file_usages', rows, 100);
        }
    });
}

async function syncPostResourceUsage(post) {
    const postId = getModelValue(post, 'id');
    if (!postId) {
        return;
    }

    const postRow = await db.knex('posts').where({id: postId}).first();
    if (!postRow) {
        return;
    }

    const postsMeta = await db.knex('posts_meta').where({post_id: postId}).first();

    await syncResourceUsages({
        resourceType: 'post',
        resourceId: postId,
        usages: extractPostResourceUsages({
            ...postRow,
            posts_meta: postsMeta || {}
        })
    });
}

async function clearResourceUsages(resourceType, resourceIds) {
    const ids = Array.isArray(resourceIds) ? resourceIds.filter(Boolean) : [resourceIds].filter(Boolean);

    if (!resourceType || !ids.length) {
        return;
    }

    await db.knex('media_file_usages')
        .where({resource_type: resourceType})
        .whereIn('resource_id', ids)
        .del();
}

async function enrichUsageDetails(mediaFile) {
    const usages = mediaFile.related('usages');

    if (!usages?.models?.length) {
        return mediaFile;
    }

    const postIds = usages.models
        .filter(usage => usage.get('resource_type') === 'post' && usage.get('resource_id'))
        .map(usage => usage.get('resource_id'));

    if (!postIds.length) {
        return mediaFile;
    }

    const posts = await db.knex('posts')
        .select('id', 'title', 'slug', 'type', 'status')
        .whereIn('id', postIds);
    const postsById = new Map(posts.map(post => [post.id, post]));

    usages.models.forEach((usage) => {
        const post = postsById.get(usage.get('resource_id'));

        if (!post) {
            return;
        }

        const type = post.type === 'page' ? 'page' : 'post';
        usage.set('resource', {
            id: post.id,
            type,
            title: post.title || '(Untitled)',
            slug: post.slug,
            status: post.status,
            editor_url: `/editor/${type}/${post.id}`
        });
    });

    return mediaFile;
}

async function scanTableForReferences(tableName, resourceType, fields, imageUrlFields = [], resourceIdField = 'id') {
    const exists = await db.knex.schema.hasTable(tableName);
    if (!exists) {
        return;
    }

    const imageUrlFieldSet = new Set(imageUrlFields);
    const selectFields = Array.from(new Set(['id', resourceIdField, ...fields]));
    const batchSize = 100;
    let lastId = null;

    // Keep backfill memory bounded on sites with large post/member/tag tables.
    // The first library request still waits for the scan so existing media appears immediately.
    // Moving this to a background job is a larger follow-up.
    for (;;) {
        const rows = await db.knex(tableName)
            .select(selectFields)
            .modify((query) => {
                if (lastId) {
                    query.where('id', '>', lastId);
                }
            })
            .orderBy('id', 'asc')
            .limit(batchSize);

        if (!rows.length) {
            break;
        }

        for (const field of fields) {
            for (const row of rows) {
                const fieldUsages = imageUrlFieldSet.has(field)
                    ? extractImageFieldUrls(row[field]).map(url => ({
                        url,
                        storageTypeHint: 'images',
                        mediaTypeHint: 'image'
                    }))
                    : extractContentFieldUsages(field, row[field]);

                for (const usage of fieldUsages) {
                    const mediaFileId = await indexUrl(usage.url, {
                        source: 'reference',
                        storageTypeHint: usage.storageTypeHint,
                        mediaTypeHint: usage.mediaTypeHint
                    });
                    if (mediaFileId) {
                        await addUsage(mediaFileId, {
                            resource_type: resourceType,
                            resource_id: row[resourceIdField],
                            field
                        });
                    }
                }
            }
        }

        lastId = rows[rows.length - 1].id;
    }
}

async function backfill() {
    await scanStorage('images');
    await scanStorage('files');
    await scanStorage('media');

    await scanTableForReferences('posts', 'post', ['feature_image', 'mobiledoc', 'lexical', 'html'], ['feature_image']);
    await scanTableForReferences('posts_meta', 'post', ['og_image', 'twitter_image'], ['og_image', 'twitter_image'], 'post_id');
    await scanTableForReferences('snippets', 'snippet', ['mobiledoc', 'lexical']);
    await scanTableForReferences('settings', 'setting', ['value']);
    await scanTableForReferences('users', 'user', ['profile_image', 'cover_image'], ['profile_image', 'cover_image']);
    await scanTableForReferences('tags', 'tag', ['feature_image', 'og_image', 'twitter_image'], ['feature_image', 'og_image', 'twitter_image']);
    await scanTableForReferences('newsletters', 'newsletter', ['header_image'], ['header_image']);
}

async function normalizeIndexedSources() {
    await db.knex('media_files')
        .where({source: 'backfill'})
        .update({
            source: 'upload',
            updated_at: new Date()
        });

    await db.knex('media_files')
        .where('url', 'like', '%unsplash.com%')
        .whereNot({source: 'unsplash'})
        .update({
            source: 'unsplash',
            updated_at: new Date()
        });

    await db.knex('media_files')
        .where(function () {
            this.where('url', 'like', '%tenor.com%')
                .orWhere('url', 'like', '%tenor.googleapis.com%');
        })
        .whereNot({source: 'tenor'})
        .update({
            source: 'tenor',
            updated_at: new Date()
        });

    await db.knex('media_files')
        .where({source: 'reference'})
        .whereNull('storage_path')
        .update({
            source: 'external',
            updated_at: new Date()
        });

    await db.knex('media_files')
        .where({source: 'reference'})
        .whereNotNull('storage_path')
        .update({
            source: 'upload',
            updated_at: new Date()
        });
}

async function ensureBackfilled() {
    await pruneGeneratedImageSizes();
    await normalizeIndexedSources();
    await markSystemSettingMediaFiles();

    if (!backfillPromise) {
        backfillPromise = backfill().catch((err) => {
            backfillPromise = null;
            throw err;
        });
    }

    await backfillPromise;
    await normalizeIndexedSources();
    await markSystemSettingMediaFiles();
}

module.exports = {
    enrichUsageDetails,
    ensureBackfilled,
    clearResourceUsages,
    syncPostResourceUsage,
    syncResourceUsages,
    indexUpload,
    destroyFile,
    replaceFile,
    setVisibilityForUrl,
    updateThumbnail,
    indexUrl
};
