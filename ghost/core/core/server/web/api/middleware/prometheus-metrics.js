const {collectDefaultMetrics, register} = require('prom-client');

const prefix = 'ghost_';
collectDefaultMetrics({prefix});

/**
     * @param {import('express').Request} req
     * @param {import('express').Response} res
     */
async function promClientMw(req, res) {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).send(err.message);
    }
}

module.exports = promClientMw;