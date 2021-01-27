const hbs = require('express-hbs');
const compress = require('compression');
const debug = require('ghost-ignition').debug('web:maintenance');
const constants = require('@tryghost/constants');
const express = require('../../../shared/express');
const config = require('../../../shared/config');
const {servePublicFile} = require('../site/middleware');

const createHbsEngine = () => {
    const engine = hbs.create();
    engine.registerHelper('asset', require('../../../frontend/helpers/asset'));

    return engine.express4();
};

module.exports = function setupMaintenanceApp() {
    debug('MaintenanceApp setup start');
    const app = express('maintenance');

    // enabled gzip compression by defaulti
    if (config.get('compress') !== false) {
        app.use(compress());
    }

    app.engine('hbs', createHbsEngine());
    app.set('view engine', 'hbs');
    app.set('views', config.get('paths').defaultViews);

    // Serve stylesheets for default templates
    app.use(servePublicFile('public/ghost.css', 'text/css', constants.ONE_HOUR_S));
    app.use(servePublicFile('public/ghost.min.css', 'text/css', constants.ONE_YEAR_S));

    // Serve images for default templates
    app.use(servePublicFile('public/404-ghost@2x.png', 'image/png', constants.ONE_HOUR_S));
    app.use(servePublicFile('public/404-ghost.png', 'image/png', constants.ONE_HOUR_S));

    app.use('/', (req, res) => {
        const data = {
            message: 'Maintenance',
            statusCode: 503
        };

        res.render('error', data, (err, html) => {
            return res.send(html);
        });
    });

    debug('MaintenanceApp setup end');

    return app;
};
