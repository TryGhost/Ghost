const express = require('../../../shared/express');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');

// Extract the core redirect logic for easier testing
const handleAdminRedirect = function (req, res) {
    const adminPath = req.path.replace(/^\/ghost/, '') || '/';
    return urlUtils.redirectToAdmin(301, res, adminPath);
};

// redirect to /ghost to the admin
module.exports = function redirectGhostToAdmin() {
    const router = express.Router('redirect-ghost-to-admin');

    if (config.get('admin:redirects')) {
        router.get(/^\/ghost(\/.*)?\/?$/, handleAdminRedirect);
    }

    return router;
};

// Export the core logic for testing
module.exports.handleAdminRedirect = handleAdminRedirect;
