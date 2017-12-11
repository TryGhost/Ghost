'use strict';

const config = require('../../config'),
    UrlService = require('./UrlService'),
    urlService = new UrlService({
        disableUrlPreload: config.get('disableUrlPreload')
    });

// Singleton
module.exports = urlService;
