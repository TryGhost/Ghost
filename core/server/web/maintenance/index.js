const hbs = require('express-hbs');
const MaintenanceApp = require('@tryghost/maintenance');
const {i18n} = require('../../lib/common');
const logging = require('../../../shared/logging');
const express = require('../../../shared/express');
const config = require('../../../shared/config');
const {servePublicFile, serveFavicon} = require('../site/middleware');

const createHbsEngine = () => {
    const engine = hbs.create();
    engine.registerHelper('asset', require('../../../frontend/helpers/asset'));

    return engine.express4();
};

module.exports = new MaintenanceApp({
    logging,
    i18n,
    express,
    viewEngine: createHbsEngine(),
    compress: config.get('compress'),
    views: config.get('paths').defaultViews,
    servePublicFile,
    serveFavicon
}).app;
