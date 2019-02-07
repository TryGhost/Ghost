const express = require('express');
const urlService = require('../../../services/url');

const adminRedirect = (path) => {
    return function doRedirect(req, res) {
        return urlService.utils.redirectToAdmin(301, res, path);
    };
};

module.exports = function adminRedirects() {
    const router = express.Router();
    // Admin redirects - register redirect as route
    // TODO: this should be middleware!
    router.get(/^\/(logout|signout)\/$/, adminRedirect('#/signout/'));
    router.get(/^\/signup\/$/, adminRedirect('#/signup/'));
    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    router.get(/^\/((ghost-admin|admin|dashboard|signin|login)\/?)$/, adminRedirect('/'));

    return router;
};
