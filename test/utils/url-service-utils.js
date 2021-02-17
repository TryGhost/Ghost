const urlService = require('../../core/frontend/services/url');
const events = require('../../core/server/lib/common/events');

module.exports.isFinished = async (options = {disableDbReadyEvent: false}) => {
    let timeout;

    if (options.disableDbReadyEvent === false) {
        events.emit('db.ready');
    }

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

module.exports.reset = () => {
    urlService.softReset();
},

module.exports.resetGenerators = () => {
    urlService.resetGenerators();
    urlService.resources.reset({ignoreDBReady: true});
};
