const _ = require('lodash');
const url = require('url');
const path = require('path');
const debug = require('@tryghost/debug')('importer:image-scraper');
const request = require('@tryghost/request');
const imageTransform = require('@tryghost/image-transform');
const storage = require('../../../../adapters/storage');
const ImageHandler = require('../../handlers/image');
const models = require('../../../../models');

const setExtension = (string, ext) => {
    return path.join(path.dirname(string), path.basename(string, path.extname(string)) + '.' + ext);
};

const getRemoteImage = async (src) => {
    try {
        const response = await request(src, {
            followRedirect: true,
            encoding: null
        });

        return response;
    } catch (error) {
        // TODO: Log this properly
        console.log({error});
    }
};

const getAndSaveImage = async (src) => {
    // Only allow scraping from specific sources
    let allowedDomains = [
        'https://s3.amazonaws.com/revue'
    ];

    // If not on the list of allowed domains, return the given src
    if (!allowedDomains.some(el => src.includes(el))) {
        return src;
    }

    let firstImageBasename = path.basename(url.parse(src).pathname);

    // Download the image
    let response = await getRemoteImage(src);

    const headers = response.headers;
    const contentType = headers['content-type'];
    const extension = contentType.split('/')[1];
    const imageBuffer = response.body;

    // Case: Some services trim extensions from image URLs, but we need one
    // Imply the extension from `content-type` and use that
    // TODO: Use a library to get more definitive extensions form the mime type
    firstImageBasename = setExtension(firstImageBasename, extension);

    // Unsure how to make images go into dated folders (/content/images/2022/11/image.jpg)
    // It appears we need to send this with the destination path?
    let now = new Date();
    let year = now.getFullYear();
    let month = `${now.getMonth() + 1}`; // We need this as a string, and `getMonth` is zero-index, so adding one makes it human
    if (month.length === 1) {
        month = `0${month}`;
    }
    let checkFileName = `${year}/${month}/${firstImageBasename}`;

    // Get what the new filename will be (it may add `-1` if the same filename exists)
    let newImagePath = await ImageHandler.loadFile([{
        name: checkFileName
    }]);

    // This works, but we need to get the unique path/name before writing it, which is the 2nd param
    // Unsure what needs to change here to that replacing the image dir isn't needed
    let imagePath = newImagePath[0].newPath.replace('/content/images/', '');

    if (imageTransform.canTransformToFormat(extension)) {
        try {
            const originalStoragePath = imageTransform.generateOriginalImageName(imagePath);
            await storage.getStorage('images').saveRaw(imageBuffer, originalStoragePath);
            const optimizedStoragePath = imagePath;
            const optimizedData = await imageTransform.resizeFromBuffer(imageBuffer, {width: 2000});
            src = await storage.getStorage('images').saveRaw(optimizedData, optimizedStoragePath);
        } catch (error) {
            // Silently fail and only save the original image without manipulation
            // TODO: How should we log this error?
            src = await storage.getStorage('images').saveRaw(imageBuffer, imagePath);
        }
    } else {
        // await fs.outputFile(options.storagePath, data);
        src = await storage.getStorage('images').saveRaw(imageBuffer, imagePath);
    }

    return src;
};

const imageScraper = async (modelData, type = '') => {
    debug(`start scraping images for ${type} id ${modelData.id}`);

    const attributes = modelData?.attributes ?? [];
    const metaAttributes = modelData?.relations?.posts_meta?.attributes ?? [];

    // This is what wll be written to the model
    let newData = {};

    let fields = [];
    let metaFields = [];

    if (type === 'post') {
        fields = ['feature_image'];
        metaFields = ['og_image', 'twitter_image'];

        newData = {
            posts_meta: {}
        };
    } else if (type === 'user') {
        fields = ['profile_image', 'cover_image'];
    }

    for (const field of fields) {
        if (attributes[field]) {
            newData[field] = await getAndSaveImage(attributes[field]);
        }
    }

    for (const field of metaFields) {
        if (metaAttributes[field]) {
            newData.posts_meta[field] = await getAndSaveImage(metaAttributes[field]);
        }
    }

    // TODO: Add support for:
    // - Images in mobiledoc
    // - Images in HTML (as cards in mobiledoc)
    // - Images in Markdown (as cards in mobiledoc)

    return newData;
};

const tempMethodForModelTesting = (importers) => {
    const ops = [];

    _.forEach(importers.posts.importedData, async (importedPost) => {
        ops.push(async () => {
            let thePost = await models.Post.findOne({id: importedPost.id}, {withRelated: ['posts_meta']});

            let newData = await imageScraper(thePost, 'post');

            const resp = await models.Post.edit(newData, {id: importedPost.id});
            return resp;
        });
    });

    return ops;

    // let theUser = await models.User.findOne({id: importedUser.id});

    // let newData = await imageScraper(theUser, type);

    // const resp = await models.User.edit(newData, {id: importedUser.id});
    // return resp;
};

module.exports = imageScraper;
module.exports.tempMethodForModelTesting = tempMethodForModelTesting;
