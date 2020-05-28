const express = require('../../../../shared/express');
const config = require('../../../../shared/config');
const urlUtils = require('../../../../shared/url-utils');

const adminRedirect = (path) => {
    return function doRedirect(req, res) {
        return urlUtils.redirectToAdmin(301, res, path);
    };
};

// redirect to /ghost to the admin
module.exports = function redirectGhostToAdmin() {
    const router = express.Router('redirect-ghost-to-admin');

    if (config.get('admin:redirects')) {
        router.get(/^\/ghost\/?$/, adminRedirect('/'));
    }

    return router;
};
