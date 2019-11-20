const common = require('../../lib/common');
const constants = require('../../lib/constants');
const shared = require('../../web/shared');
const labsService = require('../labs');
const membersService = require('./index');

module.exports.public = (siteApp) => {
    siteApp.get('/public/members-theme-bindings.js',
        shared.middlewares.labs.members,
        shared.middlewares.servePublicFile.createPublicFileMiddleware(
            'public/members-theme-bindings.js',
            'application/javascript',
            constants.ONE_HOUR_S
        )
    );

    siteApp.get('/public/members.js',
        shared.middlewares.labs.members,
        shared.middlewares.servePublicFile.createPublicFileMiddleware(
            'public/members.js',
            'application/javascript',
            constants.ONE_HOUR_S
        )
    );
};

module.exports.use = (siteApp) => {
    // @TODO only loads this stuff if members is enabled
    // Set req.member & res.locals.member if a cookie is set
    siteApp.get('/members/ssr', shared.middlewares.labs.members, async function (req, res) {
        try {
            const token = await membersService.ssr.getIdentityTokenForMemberFromSession(req, res);
            res.writeHead(200);
            res.end(token);
        } catch (err) {
            common.logging.warn(err.message);
            res.writeHead(err.statusCode);
            res.end(err.message);
        }
    });

    siteApp.delete('/members/ssr', shared.middlewares.labs.members, async function (req, res) {
        try {
            await membersService.ssr.deleteSession(req, res);
            res.writeHead(204);
            res.end();
        } catch (err) {
            common.logging.warn(err.message);
            res.writeHead(err.statusCode);
            res.end(err.message);
        }
    });

    // NOTE: this route needs a clear note why (if intentional) is it skipping shared.middlewares.labs.members middleware
    siteApp.post('/members/webhooks/stripe', (req, res, next) => membersService.api.middleware.handleStripeWebhook(req, res, next));

    siteApp.use(async function (req, res, next) {
        if (!labsService.isSet('members')) {
            req.member = null;
            return next();
        }
        try {
            const member = await membersService.ssr.getMemberDataFromSession(req, res);
            Object.assign(req, {member});
            next();
        } catch (err) {
            common.logging.warn(err.message);
            Object.assign(req, {member: null});
            next();
        }
    });

    siteApp.use(async function (req, res, next) {
        if (!labsService.isSet('members')) {
            return next();
        }
        if (!req.url.includes('token=')) {
            return next();
        }
        try {
            const member = await membersService.ssr.exchangeTokenForSession(req, res);
            Object.assign(req, {member});
            next();
        } catch (err) {
            common.logging.warn(err.message);
            return next();
        }
    });

    siteApp.use(function (req, res, next) {
        res.locals.member = req.member;
        next();
    });
};
