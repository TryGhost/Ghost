const logging = require('@tryghost/logging');

function bestEffort(method, args) {
    try {
        logging[method](...args);
    } catch {
        // Observability must not control background-job execution.
    }
}

module.exports = {
    info(...args) {
        bestEffort('info', args);
    },

    error(...args) {
        bestEffort('error', args);
    }
};
