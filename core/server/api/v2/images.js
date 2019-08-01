const storage = require('../../adapters/storage'),
    urlUtils = require('../../lib/url-utils'),
    path = require('path'),
    fs = require('fs-extra');

module.exports = {
    docName: 'images',
    upload: {
        statusCode: 201,
        permissions: false,
        query(frame) {
            const store = storage.getStorage();
            if (frame.files) {
                // CASE: saving optimized and original image

                if (typeof store.saveRaw === 'function') {
                    // CASE: storage supports saveRaw
                    return store.save(frame.files[0]).then((url) => {
                        const imagesUrl = urlUtils.urlJoin('/', urlUtils.getSubdir(),
                            urlUtils.STATIC_IMAGE_URL_PREFIX);
                        const imagePath = url.startsWith(imagesUrl) ? url.substr(imagesUrl.length) : url;

                        console.log('***imagePath:', imagePath);

                        return fs.readFile(frame.files[1].path).then((buffer) => {
                            return store.saveRaw(buffer, path.join('original', imagePath));
                        }).then(() => url);
                    });
                } else {
                    return Promise
                        .map(frame.files, file => store.save(file))
                        .then(paths => paths[0]);
                }
            }
            return store.save(frame.file);
        }
    }
};
