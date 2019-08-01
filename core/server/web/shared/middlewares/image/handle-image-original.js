const storage = require('../../../../adapters/storage');

const ORIGINAL_URL = '/original/';

module.exports = function (req, res, next) {
    if (!req.url.startsWith(ORIGINAL_URL)) {
        return next();
    }

    const redirectToOriginal = () => {
        const url = req.originalUrl.replace('/original/', '/');
        return res.redirect(url);
    };

    const storageInstance = storage.getStorage();
    // CASE: unsupported storage adapter but theme is using original images
    // Storage without saveRaw() use different naming conventions
    if (typeof storageInstance.saveRaw !== 'function') {
        return redirectToOriginal();
    }

    storageInstance.exists(req.url).then((exists) => {
        return exists ? next() : redirectToOriginal();
    }).catch(function (err) {
        next(err);
    });
};
