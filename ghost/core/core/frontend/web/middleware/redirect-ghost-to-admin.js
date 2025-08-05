const express = require('../../../shared/express');
const config = require('../../../shared/config');
const urlUtils = require('../../../shared/url-utils');

// redirect all /ghost/* paths to the admin domain, preserving the path
module.exports = function redirectGhostToAdmin() {
    const router = express.Router('redirect-ghost-to-admin');

    if (config.get('admin:redirects')) {
        // Match /ghost, /ghost/, and all paths under /ghost/* - redirect to admin domain preserving the path
        router.get(/^\/ghost(\/.*)?$/, function (req, res) {
            const pathAfterGhost = req.params[0];
            // If no path after /ghost, redirect to admin root, otherwise preserve the path (remove leading slash since we add it back)
            const preservedPath = pathAfterGhost || '/';
            return urlUtils.redirectToAdmin(301, res, preservedPath);
        });
    }

    return router;
};
