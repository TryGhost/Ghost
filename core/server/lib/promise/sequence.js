var Promise = require('bluebird');

/**
 * expects an array of functions returning a promise
 */
function sequence(tasks /* Any Arguments */) {
    var args = Array.prototype.slice.call(arguments, 1);

    return Promise.reduce(tasks, function (results, task) {
        return task.apply(this, args).then(function (result) {
            results.push(result);
            return results;
        });
    }, []);
}

module.exports = sequence;
