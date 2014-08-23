var Promise = require('bluebird');

function pipeline(tasks /* initial arguments */) {
    var args = Array.prototype.slice.call(arguments, 1),

        runTask = function (task, args) {
            runTask = function (task, arg) {
                return task(arg);
            };

            return task.apply(null, args);
        };

    return Promise.all(tasks).reduce(function (arg, task) {
        return Promise.resolve(runTask(task, arg)).then(function (result) {
            return result;
        });
    }, args);
}

module.exports = pipeline;
