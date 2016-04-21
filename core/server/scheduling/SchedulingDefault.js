var util = require('util'),
    moment = require('moment'),
    request = require('superagent'),
    SchedulingBase = require(__dirname + '/SchedulingBase'),
    errors = require(__dirname + '/../errors');

/**
 * allJobs is a sorted list by time attribute
 */
function SchedulingDefault(options) {
    SchedulingBase.call(this, options);

    this.intervalInMs = 1000 * 60 * 5;
    this.offsetInMinutes = 10;

    this.allJobs = {};
    this.deletedJobs = {};
}

util.inherits(SchedulingDefault, SchedulingBase);

/**
 * add to list
 */
SchedulingDefault.prototype.schedule = function (object) {
    this._addJob(object);
};

/**
 * remove from list
 * add to list
 */
SchedulingDefault.prototype.reschedule = function (object) {
    this._deleteJob({time: object.extra.oldTime, url: object.url});
    this._addJob(object);
};

/**
 * remove from list
 */
SchedulingDefault.prototype.unschedule = function (object) {
    this._deleteJob(object);
};

/**
 * check if there are new jobs which needs to be published in the next x minutes
 */
SchedulingDefault.prototype.run = function () {
    var self = this,
        timeout = null;

    timeout = setTimeout(function () {
        var keys = Object.keys(self.allJobs),
            nextJobs = {};

        keys.every(function (key) {
            if (moment(Number(key)).diff(moment(), 'minutes') <= self.offsetInMinutes) {
                nextJobs[key] = self.allJobs[key];
                delete self.allJobs[key];
                return true;
            }

            // break!
            return false;
        });

        clearTimeout(timeout);
        self._execute(nextJobs);
        self.run();
    }, self.intervalInMs);
};

/**
 * each timestamp key entry can have multiple jobs
 */
SchedulingDefault.prototype._addJob = function (object) {
    var timestamp = moment(object.time).valueOf(),
        keys = [],
        sortedJobs = {},
        instantJob = {},
        i = 0;

    // CASE: should have been already pinged or should be pinged soon
    if (moment(timestamp).diff(moment(), 'minutes') < this.offsetInMinutes) {
        instantJob[timestamp] = [object];
        this._execute(instantJob);
        return;
    }

    if (!this.allJobs[timestamp]) {
        this.allJobs[timestamp] = [];
    }

    this.allJobs[timestamp].push(object);

    keys = Object.keys(this.allJobs);
    keys.sort();

    for (i = 0; i < keys.length; i = i + 1) {
        sortedJobs[keys[i]] = this.allJobs[keys[i]];
    }

    this.allJobs = sortedJobs;
};

SchedulingDefault.prototype._deleteJob = function (object) {
    this.deletedJobs[object.url + moment(object.time).valueOf()] = true;
};

/**
 * ping jobs
 * setTimeout is not accurate, but we can live with that fact and use immediate feature to qualify
 */
SchedulingDefault.prototype._execute = function (jobs) {
    var keys = Object.keys(jobs),
        self = this;

    keys.forEach(function (timestamp) {
        var timeout = null,
            diff = moment(Number(timestamp)).diff(moment());

        // awake a little before
        timeout = setTimeout(function () {
            clearTimeout(timeout);

            (function retry() {
                var immediate = setImmediate(function () {
                    clearImmediate(immediate);

                    if (moment().diff(moment(Number(timestamp))) <= -50) {
                        return retry();
                    }

                    var toExecute = jobs[timestamp];
                    delete jobs[timestamp];

                    toExecute.forEach(function (job) {
                        var deleteKey = job.url + moment(job.time).valueOf();

                        if (self.deletedJobs[deleteKey]) {
                            delete self.deletedJobs[deleteKey];
                            return;
                        }

                        self._pingUrl(job);
                    });
                });
            })();
        }, diff - 200);
    });
};

SchedulingDefault.prototype._pingUrl = function (object) {
    var url = object.url,
        httpMethod = object.extra.httpMethod;

    request[httpMethod.toLowerCase()](url)
        .end(function (err, response) {
            if (err) {
                // CASE: post/page was deleted already
                if (response && response.status === 404) {
                    return;
                }

                errors.logError(err);
            }
        });
};

module.exports = SchedulingDefault;
