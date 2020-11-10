const path = require('path');
const logging = require('../../../../shared/logging');
const express = require('../../../../shared/express');
const jobService = require('../../../services/jobs');

/** A bunch of helper routes for testing purposes */
module.exports = function testRoutes() {
    const router = express.Router('canary admin');

    router.get('/500', (req, res) => res.sendStatus(500));
    router.get('/400', (req, res) => res.sendStatus(400));
    router.get('/404', (req, res) => res.sendStatus(404));
    router.get('/slow/:timeout', (req, res) => {
        if (!req.params || !req.params.timeout) {
            return res.sendStatus(200);
        }
        const timeout = req.params.timeout * 1000;
        logging.info('Begin Slow Request with timeout of', timeout);
        setTimeout(() => {
            logging.info('End Slow Request', timeout);
            res.sendStatus(200);
        }, timeout);
    });
    router.get('/job/:timeout', (req, res) => {
        if (!req.params || !req.params.timeout) {
            return res.sendStatus(200);
        }

        const timeout = req.params.timeout * 1000;
        logging.info('Create Slow Job with timeout of', timeout);
        jobService.addJob(() => {
            return new Promise((resolve) => {
                logging.info('Start Slow Job');
                setTimeout(() => {
                    logging.info('End Slow Job', timeout);
                    resolve();
                }, timeout);
            });
        });

        res.sendStatus(202);
    });

    router.get('/schedule/:schedule/:name*?', (req, res) => {
        if (!req.params.schedule) {
            return res.sendStatus(400, 'schedule parameter cannot be mepty');
        }

        const schedule = req.params.schedule;
        logging.info('Achedule a Job with schedule of:', schedule, req.params.name);

        if (req.params.name) {
            const jobPath = path.resolve(__dirname, 'jobs', req.params.name);
            jobService.scheduleJob(schedule, jobPath);
        } else {
            jobService.scheduleJob(schedule, () => {
                return new Promise((resolve) => {
                    logging.info('Start scheduled Job');

                    setTimeout(() => {
                        logging.info('End scheduled Job run', schedule);
                        resolve();
                    }, 20 * 1000);
                });
            }, {});
        }

        res.sendStatus(202);
    });

    return router;
};
