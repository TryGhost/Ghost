const util = require('util');
const moment = require('moment');
const debug = require('@tryghost/debug')('scheduling-default');
const SchedulingBase = require('./scheduling-base');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const request = require('@tryghost/request');

/**
 * @description Default post scheduling implementation.
 *
 * The default scheduler is used for all self-hosted blogs.
 * It is implemented with pure javascript (timers).
 *
 * "node-cron" did not perform well enough and we really just needed a simple time management.

 * @param {Object} options
 * @constructor
 */
function SchedulingDefault(options) {
    SchedulingBase.call(this, options);

    // NOTE: How often should the scheduler wake up?
    this.runTimeoutInMs = 1000 * 60 * 5;

    // NOTE: An offset between now and past, which helps us choosing jobs which need to be executed soon.
    this.offsetInMinutes = 10;
    this.beforePingInMs = -50;
    this.retryTimeoutInMs = 1000 * 5;

    // NOTE: Each scheduler implementation can decide whether to load scheduled posts on bootstrap or not.
    this.rescheduleOnBoot = true;

    // NOTE: A sorted list of all scheduled jobs.
    this.allJobs = {};

    this.deletedJobs = {};
    this.isRunning = false;
}

util.inherits(SchedulingDefault, SchedulingBase);

/**
 * @description Add a new job to the scheduler.
 *
 * A new job get's added when the post scheduler module receives a new model event e.g. "post.scheduled".
 *
 * @param {Object} object
 * @param {Number} object.time - unix timestamp
 * @param {String} object.url - full post/page API url to publish the resource.
 * @param {Object} object.extra
 * @param {String} object.extra.httpMethod - the method of the target API endpoint.
 * @param {Number} object.extra.oldTime - the previous published time.
 */
SchedulingDefault.prototype.schedule = function (object) {
    this._addJob(object);
};

/**
 * @description Unschedule a job.
 *
 * Unscheduling means: scheduled -> draft.
 *
 * @param {Object} object
 * @param {Number} object.time - unix timestamp
 * @param {String} object.url - full post/page API url to publish the resource.
 * @param {Object} object.extra
 * @param {String} object.extra.httpMethod - the method of the target API endpoint.
 * @param {Number} object.extra.oldTime - the previous published time.
 * @param {Object} options
 * @param {Boolean} [options.bootstrap]
 */
SchedulingDefault.prototype.unschedule = function (object, options = {bootstrap: false}) {
    /**
     * CASE:
     * The post scheduling unit triggers "reschedule" on bootstrap, because other custom scheduling implementations
     * could use a database and we need to give the chance to update the job (delete + re-add).
     *
     * We receive a "bootstrap" variable to ensure that jobs are scheduled correctly for this scheduler implementation,
     * because "object.extra.oldTime" === "object.time". If we mark the job as deleted, it won't get scheduled.
     */
    if (!options.bootstrap) {
        this._deleteJob(object);
    }
};

/**
 * @description "run" is executed from outside (see post-scheduling module)
 *
 * This function will ensure that the scheduler will be kept alive while the blog is running.
 * It will run recursively and checks if there are new jobs which need to be executed in the next X minutes.
 */
SchedulingDefault.prototype.run = function () {
    const self = this;
    let timeout = null;

    // NOTE: Ensure the scheduler never runs twice.
    if (this.isRunning) {
        return;
    }

    this.isRunning = true;

    let recursiveRun = function recursiveRun() {
        timeout = setTimeout(function () {
            const times = Object.keys(self.allJobs);
            const nextJobs = {};

            // CASE: We stop till the offset is too big. We are only interested in jobs which need get executed soon.
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
 * @description Add the actual job to "allJobs".
 * @param {Object} object
 * @private
 */
SchedulingDefault.prototype._addJob = function (object) {
    let timestamp = moment(object.time).valueOf();
    let keys = [];
    let sortedJobs = {};
    let instantJob = {};
    let i = 0;

    // CASE: should have been already pinged or should be pinged soon
    if (moment(timestamp).diff(moment(), 'minutes') < this.offsetInMinutes) {
        debug('Emergency job', object.url, moment(object.time).format('YYYY-MM-DD HH:mm:ss'));

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

/**
 * @description Delete the job.
 *
 * Keep a list of deleted jobs because it can happen that a job is already part of the next execution list,
 * but it got deleted meanwhile.
 *
 * @param {Object} object
 * @private
 */
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
 * @description The "execute" function will receive the next jobs which need execution.
 *
 * Based on "offsetInMinutes" we figure out which jobs need execution and the "execute" function will
 * ensure that
 *
 * The advantage of having a two step system (a general runner and an executor) is:
 *    - accuracy
 *    - setTimeout is limited to 24,3 days
 *
 * The execution of "setTimeout" is never guaranteed, therefore we've optimized the execution by using "setImmediate".
 * The executor will put each job to sleep using `setTimeout` with a threshold of 70ms. And "setImmediate" is then
 * used to detect the correct moment to trigger the URL.

 * We can't use "process.nextTick" otherwise we will block I/O operations.
 */
SchedulingDefault.prototype._execute = function (jobs) {
    const keys = Object.keys(jobs);
    const self = this;

    keys.forEach(function (timestamp) {
        let timeout = null;
        let diff = moment(Number(timestamp)).diff(moment());

        // NOTE: awake a little before...
        timeout = setTimeout(function () {
            clearTimeout(timeout);

            (function retry() {
                let immediate = setImmediate(function () {
                    clearImmediate(immediate);

                    // CASE: It's not the time yet...
                    if (moment().diff(moment(Number(timestamp))) <= self.beforePingInMs) {
                        return retry();
                    }

                    const toExecute = jobs[timestamp];
                    delete jobs[timestamp];

                    // CASE: each timestamp can have multiple jobs
                    toExecute.forEach(function (job) {
                        const {url, time} = job;
                        const deleteKey = `${url}_${moment(time).valueOf()}`;

                        // CASE: Was the job already deleted in the meanwhile...?
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
 * @description Ping the job URL.
 * @param {Object} object
 * @return {Promise}
 * @private
 */
SchedulingDefault.prototype._pingUrl = function (object) {
    const {url, time} = object;

    debug('Ping url', url, moment().format('YYYY-MM-DD HH:mm:ss'), moment(time).format('YYYY-MM-DD HH:mm:ss'));

    const httpMethod = object.extra ? object.extra.httpMethod : 'PUT';
    const tries = object.tries || 0;
    const requestTimeout = (object.extra && object.extra.timeoutInMS) ? object.extra.timeoutInMS : 1000 * 5;
    const maxTries = 30;

    const options = {
        timeout: requestTimeout,
        method: httpMethod.toLowerCase(),
        retry: 0,
        headers: {
            'Content-Type': 'application/json'
        }
    };

    // CASE: If we detect to publish a post in the past (case blog is down), we add a force flag
    if (moment(time).isBefore(moment())) {
        if (httpMethod === 'GET') {
            // @TODO: rename to searchParams when updating to Got v10
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

            logging.error(new errors.InternalServerError({
                err,
                context: 'Retrying...',
                level: 'normal'
            }));

            return;
        }

        logging.error(new errors.InternalServerError({
            err,
            level: 'critical'
        }));
    });
};

module.exports = SchedulingDefault;
