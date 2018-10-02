const Promise = require('bluebird');

/**
 * expects an array of functions returning a promise
 */
function sequence(tasks /* Any Arguments */) {
    const args = Array.prototype.slice.call(arguments, 1);

    return Promise.reduce(tasks, function (results, task) {
        const response = task.apply(this, args);

        if (response && response.then) {
            return response.then(function (result) {
                results.push(result);
                return results;
            });
        } else {
            return Promise.resolve().then(() => {
                results.push(response);
                return results;
            });
        }
    }, []);
}

module.exports = sequence;
