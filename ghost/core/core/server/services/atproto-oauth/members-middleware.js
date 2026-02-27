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

        const url = await atprotoOAuth.authorize(handle.trim());
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
        const {did, handle, displayName, avatarUrl} = await atprotoOAuth.handleCallback(params);

        // Find existing member by DID
        let member = await models.Member.findOne({atproto_did: did});

        if (member) {
            // Update mutable fields
            await models.Member.edit({
                bluesky_handle: handle,
                bluesky_avatar_url: avatarUrl,
                name: member.get('name') || displayName
            }, {id: member.id});

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
                atproto_did: did,
                bluesky_handle: handle,
                bluesky_avatar_url: avatarUrl
            });
        }

        // Set session cookie — reuse the same mechanism as magic link
        const membersService = require('../members');
        const ssr = membersService.ssr;
        ssr._setSessionCookie(req, res, member.get('transient_id'));

        logging.info(`AT Proto OAuth: member session created for ${handle} (${did})`);

        // Redirect to site root with success indicator
        const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');
        return res.redirect(`${siteUrl}/?success=true&action=signin`);
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
