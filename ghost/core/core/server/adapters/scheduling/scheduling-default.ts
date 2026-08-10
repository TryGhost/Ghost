import moment from 'moment'
import createDebug from '@tryghost/debug'
import logging from '@tryghost/logging';
import errors, {type GhostError} from '@tryghost/errors';
import request from '@tryghost/request';
import {SchedulingBase, type SchedulerJob as BaseSchedulerJob} from "@tryghost/adapter-base-scheduling"

type SchedulerJob = BaseSchedulerJob & {
    tries?: number;
    extra?: BaseSchedulerJob['extra'] & {
        timeoutInMS?: number;
    }
}

const debug = createDebug("scheduling-default")

export default class SchedulingDefault extends SchedulingBase {
    // NOTE: How often should the scheduler wake up?
    runTimeoutInMs = 1000 * 60 * 5 // 5 minutes

    // NOTE: An offset between now and past, which helps us choosing jobs which need to be executed soon.
    offsetInMinutes = 10;
    beforePingInMs = -50;
    retryTimeoutInMs = 1000 * 5;

    // NOTE: Each scheduler implementation can decide whether to load scheduled posts on bootstrap or not.
    rescheduleOnBoot = true;

    // NOTE: A sorted list of all scheduled jobs.
    allJobs: Record<string, SchedulerJob[]> = {};

    deletedJobs: Record<string, SchedulerJob[]> = {};
    isRunning = false;

    // The HTTP client is held as an instance property so unit tests can
    // swap it for a deterministic stub. Doing the dependency injection in
    // the constructor (rather than `require`ing inside _pingUrl) avoids
    // pulling `@tryghost/request`'s cacheable-lookup singleton — racy
    // under nock + shared workers — into the unit-test path.
    request = request;

    _addJob(job: SchedulerJob) {
        let timestamp = moment(job.time).valueOf();
        let keys: string[] = [];
        let sortedJobs: Record<string, SchedulerJob[]> = {};
        let instantJob: Record<string, SchedulerJob[]> = {};
        let i = 0;

        // CASE: should have been already pinged or should be pinged soon
        if (moment(timestamp).diff(moment(), 'minutes') < this.offsetInMinutes) {
            debug('Emergency job', job.url, moment(job.time).format('YYYY-MM-DD HH:mm:ss'));

            instantJob[timestamp] = [job];
            this._execute(instantJob);
            return;
        }

        // CASE: are there jobs already scheduled for the same time?
        if (!this.allJobs[timestamp]) {
            this.allJobs[timestamp] = [];
        }

        debug('Added job', job.url, moment(job.time).format('YYYY-MM-DD HH:mm:ss'));
        this.allJobs[timestamp].push(job);

        keys = Object.keys(this.allJobs);
        keys.sort();

        for (i = 0; i < keys.length; i = i + 1) {
            sortedJobs[keys[i]] = this.allJobs[keys[i]];
        }

        this.allJobs = sortedJobs;
    }

    _deleteJob(job: SchedulerJob) {
        const {url, time} = job;

        if (!time) {
            return;
        }

        const deleteKey = `${url}_${moment(time).valueOf()}`;

        if (!this.deletedJobs[deleteKey]) {
            this.deletedJobs[deleteKey] = [];
        }

        debug('Deleted job', url, moment(time).format('YYYY-MM-DD HH:mm:ss'));
        this.deletedJobs[deleteKey].push(job);
    }

    _execute(jobs: Record<string, SchedulerJob[]>) {
        const keys = Object.keys(jobs);
        const self = this; // eslint-disable-line @typescript-eslint/no-this-alias

        keys.forEach(function (timestamp) {
            let timeout: NodeJS.Timeout | undefined;
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
    }

    _pingUrl(job: SchedulerJob) {
        const {url, time} = job;

        debug('Ping url', url, moment().format('YYYY-MM-DD HH:mm:ss'), moment(time).format('YYYY-MM-DD HH:mm:ss'));

        const httpMethod = job.extra ? job.extra.httpMethod : 'PUT';
        const tries = job.tries || 0;
        const requestTimeout = (job.extra && job.extra.timeoutInMS) ? job.extra.timeoutInMS : 1000 * 5;
        const maxTries = 30;

        // TODO: fix this typing once @tryghost/request has types
        const options: any = {
            timeout: {
                request: requestTimeout
            },
            method: httpMethod,
            retry: {
                limit: 0
            }
        };

        // CASE: If we detect to publish a post in the past (case blog is down), we add a force flag
        if (moment(time).isBefore(moment())) {
            if (httpMethod === 'GET') {
                options.searchParams = {force: true};
            } else {
                options.json = {force: true};
            }
        }

        return this.request(url, options).catch((err: GhostError) => {
            const {statusCode} = err;

            // CASE: post/page was deleted already
            if (statusCode === 404) {
                return;
            }

            // CASE: blog is in maintenance mode, retry
            if (statusCode === 503 && tries < maxTries) {
                setTimeout(() => {
                    job.tries = tries + 1;
                    this._pingUrl(job);
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
    }

    run() {
        let timeout: NodeJS.Timeout | undefined;

        // NOTE: Ensure the scheduler never runs twice.
        if (this.isRunning) {
            return;
        }

        this.isRunning = true;

        const recursiveRun = () => {
            timeout = setTimeout(() => {
                const times = Object.keys(this.allJobs);
                const nextJobs: Record<string, SchedulerJob[]> = {};

                // CASE: We stop till the offset is too big. We are only interested in jobs which need get executed soon.
                times.every((time) => {
                    if (moment(Number(time)).diff(moment(), 'minutes') <= this.offsetInMinutes) {
                        nextJobs[time] = this.allJobs[time];
                        delete this.allJobs[time];
                        return true;
                    }

                    // break!
                    return false;
                });

                clearTimeout(timeout);
                this._execute(nextJobs);

                recursiveRun();
            }, this.runTimeoutInMs);
        };

        recursiveRun();
    }

    schedule(job: SchedulerJob) {
        this._addJob(job);
    }

    unschedule(job: SchedulerJob, opts?: {bootstrap?: boolean}) {
        if (!opts?.bootstrap) {
            this._deleteJob(job);
        }
    }
}
