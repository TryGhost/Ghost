const express = require('../../../shared/express');
const metricsController = require('../../controllers/metrics');

/**
 * @returns {import('express').Router}
 */
module.exports = function apiRoutes() {
    const router = express.Router('metrics');

    router.use(express._express.json({limit: '10kb'}));

    router.post('/', metricsController.proxy);

    return router;
}; 