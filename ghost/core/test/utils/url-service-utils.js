const urlService = require('../../core/server/services/url');

module.exports.isFinished = async () => {
    let timeout;

    return new Promise(function (resolve) {
        (function retry() {
            clearTimeout(timeout);

            if (urlService.hasFinished()) {
                return resolve();
            }

            timeout = setTimeout(retry, 50);
        })();
    });
};

module.exports.urlFor = (model, type, options) => {
    return urlService.getUrlForResource({...model.toJSON(), type}, options);
};

// Drop the router configs the previous boot registered. Ghost registers them
// again on the next one, so this must only run BETWEEN boots — calling it
// mid-boot (e.g. from a DB truncate) would leave the service routerless, and
// answering /404/, for the rest of that boot. There is no data-only reset to
// pair with it: the service caches nothing from the database, only the router
// configs read from routes.yaml.
module.exports.resetRouters = () => {
    urlService.reset();
};
