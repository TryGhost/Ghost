const util = require('util');
const moment = require('moment');
const debug = require('ghost-ignition').debug('scheduling-default');
const SchedulingBase = require('./SchedulingBase');
const common = require('../../lib/common');
const request = require('../../lib/request');

/**
 * allJobs is a sorted list by time attribute
 */
function SchedulingDefault(options) {
    SchedulingBase.call(this, options);

    this.runTimeoutInMs = 1000 * 60 * 5;
    this.offsetInMinutes = 10;
    this.beforePingInMs = -50;
    this.retryTimeoutInMs = 1000 * 5;

    this.rescheduleOnBoot = true;
    this.allJobs = {};
    this.deletedJobs = {};
    this.isRunning = false;
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
 * deletion happens right before execution
 */
SchedulingDefault.prototype.unschedule = function (object) {
    this._deleteJob(object);
};

/**
 * check if there are new jobs which needs to be published in the next x minutes
 * because allJobs is a sorted list, we don't have to iterate over all jobs, just until the offset is too big
 */
SchedulingDefault.prototype.run = function () {
    const self = this;
    let timeout = null,
        recursiveRun;

    if (this.isRunning) {
        return;
    }

    this.isRunning = true;

    recursiveRun = function recursiveRun() {
        timeout = setTimeout(function () {
            const times = Object.keys(self.allJobs),
                nextJobs = {};

            times.every(function (time) {
                if (moment(Number(time)).diff(moment(), 'minutes') <= self.offsetInMinutes) {
                    nextJobs[time] = self.allJobs[time];
                    delete self.allJobs[time];
                    return true;
                }

                // break!
                return false;
            });

            clearTimeout(timeout);
            self._execute(nextJobs);

            recursiveRun();
        }, self.runTimeoutInMs);
    };

    recursiveRun();
};

/**
 * each timestamp key entry can have multiple jobs
 */
SchedulingDefault.prototype._addJob = function (object) {
    let timestamp = moment(object.time).valueOf(),
        keys = [],
        sortedJobs = {},
        instantJob = {},
        i = 0;

    // CASE: should have been already pinged or should be pinged soon
    if (moment(timestamp).diff(moment(), 'minutes') < this.offsetInMinutes) {
        debug('Imergency job', object.url, moment(object.time).format('YYYY-MM-DD HH:mm:ss'));

        instantJob[timestamp] = [object];
        this._execute(instantJob);
        return;
    }

    // CASE: are there jobs already scheduled for the same time?
    if (!this.allJobs[timestamp]) {
        this.allJobs[timestamp] = [];
    }

    debug('Added job', object.url, moment(object.time).format('YYYY-MM-DD HH:mm:ss'));
    this.allJobs[timestamp].push(object);

    keys = Object.keys(this.allJobs);
    keys.sort();

    for (i = 0; i < keys.length; i = i + 1) {
        sortedJobs[keys[i]] = this.allJobs[keys[i]];
    }

    this.allJobs = sortedJobs;
};

SchedulingDefault.prototype._deleteJob = function (object) {
    const {url, time} = object;

    if (!time) {
        return;
    }

    const deleteKey = `${url}_${moment(time).valueOf()}`;

    if (!this.deletedJobs[deleteKey]) {
        this.deletedJobs[deleteKey] = [];
    }

    debug('Deleted job', url, moment(time).format('YYYY-MM-DD HH:mm:ss'));
    this.deletedJobs[deleteKey].push(object);
};

/**
 * ping jobs
 * setTimeout is not accurate, but we can live with that fact and use setImmediate feature to qualify
 * we don't want to use process.nextTick, this would block any I/O operation
 */
SchedulingDefault.prototype._execute = function (jobs) {
    const keys = Object.keys(jobs),
        self = this;

    keys.forEach(function (timestamp) {
        let timeout = null,
            diff = moment(Number(timestamp)).diff(moment());

        // awake a little before
        timeout = setTimeout(function () {
            clearTimeout(timeout);

            (function retry() {
                let immediate = setImmediate(function () {
                    clearImmediate(immediate);

                    if (moment().diff(moment(Number(timestamp))) <= self.beforePingInMs) {
                        return retry();
                    }

                    const toExecute = jobs[timestamp];
                    delete jobs[timestamp];

                    toExecute.forEach(function (job) {
                        const {url, time} = job;
                        const deleteKey = `${url}_${moment(time).valueOf()}`;

                        if (self.deletedJobs[deleteKey]) {
                            if (self.deletedJobs[deleteKey].length === 1) {
                                delete self.deletedJobs[deleteKey];
                            } else {
                                self.deletedJobs[deleteKey].pop();
                            }

                            return;
                        }

                        self._pingUrl(job);
                    });
                });
            })();
        }, diff - 70);
    });
};

/**
 * - if we detect to publish a post in the past (case blog is down), we add a force flag
 */
SchedulingDefault.prototype._pingUrl = function (object) {
    const {url, time} = object;

    debug('Ping url', url, moment().format('YYYY-MM-DD HH:mm:ss'), moment(time).format('YYYY-MM-DD HH:mm:ss'));

    const httpMethod = object.extra ? object.extra.httpMethod : 'PUT';
    const tries = object.tries || 0;
    const requestTimeout = object.extra ? object.extra.timeoutInMS : 1000 * 5;
    const maxTries = 30;

    const options = {
        timeout: requestTimeout,
        method: httpMethod.toLowerCase(),
        headers: {
            'Content-Type': 'application/json'
        }
    };

    if (moment(time).isBefore(moment())) {
        if (httpMethod === 'GET') {
            // @todo: rename to searchParams when updating to Got v10
            options.query = 'force=true';
        } else {
            options.body = JSON.stringify({force: true});
        }
    }

    return request(url, options).catch((err) => {
        const {statusCode} = err;

        // CASE: post/page was deleted already
        if (statusCode === 404) {
            return;
        }

        // CASE: blog is in maintenance mode, retry
        if (statusCode === 503 && tries < maxTries) {
            setTimeout(() => {
                object.tries = tries + 1;
                this._pingUrl(object);
            }, this.retryTimeoutInMs);

            common.logging.error(new common.errors.GhostError({
                err,
                context: 'Retrying...',
                level: 'normal'
            }));

            return;
        }

        common.logging.error(new common.errors.GhostError({
            err,
            level: 'critical'
        }));
    });
};

module.exports = SchedulingDefault;
