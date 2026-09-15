/**
 * Express app for ATProto auth routes.
 *
 * Mounted at '/' on the frontend app so that both:
 *   /.well-known/oauth-client-metadata  (spec-required public client metadata)
 *   /members/atproto/*                  (OAuth flow endpoints)
 * are served at the site root.
 *
 * When atproto.enabled is false the exported factory returns a no-op router so
 * the rest of the app is unaffected.
 */
const express = require('../../../shared/express');
const bodyParser = require('body-parser');
const config = require('../../../shared/config');
const errorHandler = require('@tryghost/mw-error-handler');
const sentry = require('../../../shared/sentry');
const {BadRequestError, DisabledFeatureError} = require('@tryghost/errors');
const logging = require('@tryghost/logging');

const atprotoAuth = require('../../services/atproto-auth');

/**
 * Middleware that immediately returns 404/405 when ATProto is disabled.
 */
function requireAtproto(req, res, next) {
    if (!config.get('atproto:enabled')) {
        return next(new DisabledFeatureError({message: 'ATProto login is not enabled on this site.'}));
    }
    next();
}

/**
 * Exclusive-mode guard.  Blocks magic-link and OTC endpoints when
 * atproto.exclusive is true.  Exported so members/app.js can import it.
 */
function exclusiveModeGuard(req, res, next) {
    if (config.get('atproto:exclusive')) {
        res.writeHead(405, {'Content-Type': 'application/json'});
        return res.end(JSON.stringify({
            errors: [{message: 'This site requires sign-in via ATProto/Bluesky.', type: 'MethodNotAllowedError'}]
        }));
    }
    next();
}

module.exports = function setupAtprotoApp() {
    const app = express('atproto');

    // /.well-known/oauth-client-metadata — required by ATProto OAuth spec
    app.get('/.well-known/oauth-client-metadata', requireAtproto, (req, res) => {
        const service = atprotoAuth.getService();
        if (!service) {
            return res.status(503).json({errors: [{message: 'Service not initialised'}]});
        }
        const cache = config.get('caching:wellKnown:maxAge') || 3600;
        res.set('Cache-Control', `public, max-age=${cache}`);
        res.json(service.getClientMetadata());
    });

    // Authorize – initiate the OAuth flow
    app.get('/members/atproto/authorize', requireAtproto, async (req, res, next) => {
        try {
            const service = atprotoAuth.getService();
            const handle = req.query.handle;
            const redirect = req.query.redirect;

            if (!handle) {
                return next(new BadRequestError({message: 'handle parameter is required'}));
            }

            const authUrl = await service.authorize(handle, redirect || null);
            res.redirect(authUrl);
        } catch (err) {
            next(err);
        }
    });

    // Callback – handle the authorization server redirect
    app.get('/members/atproto/callback', requireAtproto, async (req, res, next) => {
        try {
            const service = atprotoAuth.getService();
            const {code, state, iss, error, error_description: errorDesc} = req.query;

            if (error) {
                logging.warn(`[atproto-auth] Authorization server error: ${error} – ${errorDesc}`);
                const siteUrl = service ? service.getSiteUrl() : '/';
                return res.redirect(`${siteUrl}?atproto_error=${encodeURIComponent(error)}`);
            }

            if (!code || !state) {
                return next(new BadRequestError({message: 'Missing code or state parameter'}));
            }

            const result = await service.callback(code, state, iss || null);

            if (result.needsEmail) {
                const siteUrl = service.getSiteUrl().replace(/\/$/, '');
                const redirectUrl = `${siteUrl}/#/portal/atprotoNeedsEmail?pending=${encodeURIComponent(result.pendingId)}`;
                return res.redirect(redirectUrl);
            }

            // Establish Ghost member session via the existing SSR machinery
            const membersService = require('../../services/members');
            membersService.ssr.setSessionFromTransientId(req, res, result.member.get('transient_id'));

            const destination = result.redirectUrl || `${service.getSiteUrl()}?atproto_success=true`;
            res.redirect(destination);
        } catch (err) {
            logging.error(err);
            next(err);
        }
    });

    // Needs-email – display the "enter your email" screen (Portal renders this)
    app.get('/members/atproto/needs-email', requireAtproto, (req, res, next) => {
        if (!req.query.pending) {
            return next(new BadRequestError({message: 'Missing pending parameter'}));
        }
        // The page is served by the Ghost frontend (theme); Portal reads the URL params.
        next();
    });

    // Submit-email – accept email for pending DID, send magic link
    app.post('/members/atproto/needs-email', requireAtproto, bodyParser.json(), async (req, res, next) => {
        try {
            const service = atprotoAuth.getService();
            const {pending, email} = req.body;

            const siteUrl = service.getSiteUrl();
            await service.submitEmailForPending(pending, email, siteUrl);

            res.status(201).json({});
        } catch (err) {
            logging.error(err);
            next(err);
        }
    });

    // Complete-signup – runs after magic-link click for the email-required flow
    app.get('/members/atproto/complete-signup', requireAtproto, async (req, res, next) => {
        try {
            const service = atprotoAuth.getService();
            const {pending} = req.query;

            if (!pending) {
                return next(new BadRequestError({message: 'Missing pending parameter'}));
            }

            // Member must be authenticated (session cookie set by magic link)
            const membersService = require('../../services/members');
            const member = await membersService.ssr.getMemberDataFromSession(req, res);
            if (!member) {
                return res.redirect(`/members/atproto/needs-email?error=session_required`);
            }

            await service.completePendingSignup(pending, member.email);
            res.redirect(`${service.getSiteUrl()}?atproto_success=true`);
        } catch (err) {
            logging.error(err);
            next(err);
        }
    });

    app.use(errorHandler.handleJSONResponse(sentry));

    return app;
};

module.exports.exclusiveModeGuard = exclusiveModeGuard;
