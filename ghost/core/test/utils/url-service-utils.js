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

// @TODO: unify all the reset/softTeset helpers so they either work how the main code works or the reasons why they are different are clear
module.exports.init = () => {
    urlService.init();
};

module.exports.reset = () => {
    urlService.softReset();
},

module.exports.resetGenerators = () => {
    urlService.resetGenerators();
    urlService.resources.reset();
};
