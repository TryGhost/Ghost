const express = require('express');
const config = require('../../../config');
const urlUtils = require('../../../lib/url-utils');

const adminRedirect = (path) => {
    return function doRedirect(req, res) {
        return urlUtils.redirectToAdmin(301, res, path);
    };
};

// redirect to /ghost to the admin
module.exports = function adminRedirects() {
    const router = express.Router();

    if (config.get('admin:redirects')) {
        router.get(/^\/ghost\/?$/, adminRedirect('/'));
    }

    return router;
};
