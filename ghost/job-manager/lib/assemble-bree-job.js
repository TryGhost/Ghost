const isCronExpression = require('./is-cron-expression');

const assemble = (when, job, data, name) => {
    const breeJob = {
        name: name,
        // NOTE: both function and path syntaxes work with 'path' parameter
        path: job,
        // NOTE: avoids executing job immidiately after initialization
        // can remove it when https://github.com/breejs/bree/issues/50 is fixed
        timeout: false
    };

    if (data) {
        Object.assign(breeJob, {
            worker: {
                workerData: data
            }
        });
    }

    if (isCronExpression(when)) {
        Object.assign(breeJob, {
            cron: when
        });
    } else {
        Object.assign(breeJob, {
            interval: when
        });
    }

    return breeJob;
};

module.exports = assemble;
