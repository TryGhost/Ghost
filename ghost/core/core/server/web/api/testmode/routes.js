const path = require('path');
const logging = require('@tryghost/logging');
const express = require('../../../../shared/express');
const jobsService = require('../../../services/jobs');

/** A bunch of helper routes for testing purposes */
module.exports = function testRoutes() {
    const router = express.Router('testmode');

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
        jobsService.addJob({
            job: () => {
                return new Promise((resolve) => {
                    logging.info('Start Slow Job');
                    setTimeout(() => {
                        logging.info('End Slow Job', timeout);
                        resolve();
                    }, timeout);
                });
            },
            offloaded: false
        });

        res.sendStatus(202);
    });

    router.get('/oneoff/:name', (req, res) => {
        logging.info('Create Slow Job with timeout of', req.params.name);

        const options = {};

        options.solo = true;
        options.name = req.params.name;
        options.job = path.resolve(__dirname, 'jobs', `${options.name}.js`);

        jobsService.addOneOffJob(options);

        res.sendStatus(202);
    });

    router.get('/schedule/:schedule/:name*?', (req, res) => {
        if (!req.params.schedule) {
            return res.sendStatus(400, 'schedule parameter cannot be mepty');
        }

        const schedule = req.params.schedule;
        const jobName = req.params.name || `generic-${new Date().getTime()}`;
        logging.info('Achedule a Job with schedule of:', schedule, req.params.name);

        if (req.params.name) {
            const jobPath = path.resolve(__dirname, 'jobs', `${req.params.name}.js`);
            jobsService.addJob({
                at: schedule,
                job: jobPath,
                name: jobName
            });
        } else {
            jobsService.addJob({
                at: schedule,
                job: () => {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, 20 * 1000);
                    });
                },
                name: jobName
            });
        }

        res.sendStatus(202);
    });

    function blockForSeconds(seconds) {
        const end = Date.now() + seconds * 1000;
        while (Date.now() < end) {
            // Busy-wait loop to block the event loop
        }
    }

    router.get('/block/:seconds', (req, res) => {
        const seconds = parseInt(req.params.seconds, 10);
        if (isNaN(seconds) || seconds <= 0) {
            return res.status(400).send('Invalid number of seconds');
        }

        // eslint-disable-next-line no-console
        console.log(`Blocking for ${seconds} seconds`);
        blockForSeconds(seconds);
        res.send(`Blocked for ${seconds} seconds`);
    });

    router.get('/drop', () => { // do nothing and wait for request to drop
        // eslint-disable-next-line no-console
        console.log('Request received but not responding');
    });

    return router;
};
