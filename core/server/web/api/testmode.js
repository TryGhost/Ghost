const logging = require('../../../shared/logging');
const express = require('../../../shared/express');

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

    return router;
};
