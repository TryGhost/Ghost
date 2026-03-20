const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const models = require('../../models');
const atprotoOAuth = require('./index');
const urlUtils = require('../../../shared/url-utils');

/**
 * Serve client-metadata.json for AT Proto PDSes
 * This is the public endpoint that Bluesky's PDS fetches to learn about our OAuth client
 */
async function serveClientMetadata(req, res) {
    const config = atprotoOAuth.getConfig();
    const metadata = atprotoOAuth.getClientMetadata(config);

    res.set('Content-Type', 'application/json');
    res.set('Cache-Control', 'public, max-age=3600');
    return res.json(metadata);
}

/**
 * POST /members/api/atproto/authorize
 * Body: { handle: "alice.bsky.social" }
 * Returns: { url: "https://bsky.social/oauth/authorize?..." }
 */
async function authorize(req, res, next) {
    try {
        if (!atprotoOAuth.isEnabled()) {
            throw new errors.NotFoundError({message: 'AT Proto OAuth is not enabled'});
        }

        const {handle} = req.body;
        if (!handle || typeof handle !== 'string') {
            throw new errors.ValidationError({message: 'A valid Bluesky handle is required'});
        }

        // Initialize client on-demand if not yet initialized
        if (!atprotoOAuth.initialized) {
            await atprotoOAuth.init();
        }

        const scope = req.body.scope || 'atproto';

        // Scope upgrade requires revoke+re-auth — PDS won't upgrade existing grants
        if (scope.includes('transition:generic')) {
            const member = await models.Member.findOne({bluesky_handle: handle.trim()});
            if (member && member.get('atproto_did')) {
                await atprotoOAuth.revokeSession(member.get('atproto_did'));
            }
        }

        const url = await atprotoOAuth.authorize(handle.trim(), {scope});

        // Stash return_url in a short-lived cookie so callback can redirect back
        if (req.body.return_url) {
            res.cookie('atproto_return_url', req.body.return_url, {
                maxAge: 10 * 60 * 1000, // 10 minutes
                httpOnly: true,
                sameSite: 'lax',
                path: '/'
            });
        }

        return res.json({url});
    } catch (err) {
        logging.error({message: 'AT Proto authorize error', err});
        return next(new errors.InternalServerError({
            message: err.message || 'Failed to initiate Bluesky login'
        }));
    }
}

/**
 * GET /members/api/atproto/callback
 * PDS redirects here with code + state params
 * Creates or finds member, sets session cookie, redirects to site
 */
async function callback(req, res, next) {
    try {
        if (!atprotoOAuth.isEnabled()) {
            throw new errors.NotFoundError({message: 'AT Proto OAuth is not enabled'});
        }

        const params = new URLSearchParams(req.query);

        // Handle the OAuth callback to get user identity
        const {did, handle, displayName, avatarUrl, scope} = await atprotoOAuth.handleCallback(params);

        // Find existing member by DID
        let member = await models.Member.findOne({atproto_did: did});

        if (member) {
            // Update mutable fields — only upgrade scope, never downgrade
            const updateData = {
                bluesky_handle: handle,
                bluesky_avatar_url: avatarUrl,
                name: member.get('name') || displayName
            };
            const currentScope = member.get('atproto_scope');
            if (scope && (!currentScope || !currentScope.includes('transition:generic'))) {
                updateData.atproto_scope = scope;
            }
            logging.info(`AT Proto OAuth: updating member ${member.id}, scope: ${scope}, currentScope: ${currentScope}, updateData keys: ${Object.keys(updateData)}`);
            try {
                await models.Member.edit(updateData, {id: member.id});
            } catch (editErr) {
                logging.error({message: 'AT Proto OAuth: failed to edit member', err: editErr});
            }

            // Reload to get updated data
            member = await models.Member.findOne({id: member.id});
        } else {
            // New member — create with synthetic email
            // Real email can be added later via member settings
            const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');
            const domain = new URL(siteUrl).hostname;
            const syntheticEmail = `bsky-${handle.replace(/\./g, '-')}@${domain}`;

            member = await models.Member.add({
                email: syntheticEmail,
                name: displayName,
                status: 'free',
                email_disabled: false,
                atproto_did: did,
                atproto_scope: scope || 'atproto',
                bluesky_handle: handle,
                bluesky_avatar_url: avatarUrl
            });
        }

        // Set session cookie — reuse the same mechanism as magic link
        const membersService = require('../members');
        const ssr = membersService.ssr;
        ssr._setSessionCookie(req, res, member.get('transient_id'));

        logging.info(`AT Proto OAuth: member session created for ${handle} (${did})`);

        // Redirect back to where the user was, or site root
        const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');
        let redirectTo = `${siteUrl}/?success=true&action=signin`;

        // Parse return_url from cookie (no cookie-parser middleware)
        const cookieHeader = req.headers.cookie || '';
        const returnMatch = cookieHeader.match(/atproto_return_url=([^;]+)/);
        if (returnMatch) {
            const returnUrl = decodeURIComponent(returnMatch[1]);
            // Only allow same-origin redirects
            if (returnUrl.startsWith(siteUrl)) {
                redirectTo = returnUrl;
            }
            res.clearCookie('atproto_return_url', {path: '/'});
        }

        return res.redirect(redirectTo);
    } catch (err) {
        logging.error({message: 'AT Proto callback error', err});
        // Redirect to site with error instead of showing JSON error
        const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');
        return res.redirect(`${siteUrl}/#/portal/signin?error=bluesky-auth-failed`);
    }
}

module.exports = {
    serveClientMetadata,
    authorize,
    callback
};
