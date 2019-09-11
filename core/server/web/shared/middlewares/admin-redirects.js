const express = require('express');
const urlUtils = require('../../../lib/url-utils');

const adminRedirect = (path) => {
    return function doRedirect(req, res) {
        return urlUtils.redirectToAdmin(301, res, path);
    };
};

// redirect to /ghost to the admin
module.exports = function adminRedirects() {
    const router = express.Router();
    router.get(/^\/ghost\/?$/, adminRedirect('/'));
    return router;
};
