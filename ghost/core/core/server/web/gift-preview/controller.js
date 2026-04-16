const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const {generateGiftPreviewImage} = require('./image');

function getCadenceLabel(cadence, duration) {
    return duration === 1 ? `1 ${cadence}` : `${duration} ${cadence}s`;
}

function escapeHtml(str) {
    return str
        .replaceAll('&', '&amp;')
        .replaceAll('"', '&quot;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;');
}

async function giftPreview(req, res) {
    const labs = require('../../../shared/labs');
    const giftService = require('../../services/gifts').service;
    const tiersService = require('../../services/tiers');
    const urlUtils = require('../../../shared/url-utils');
    const settingsCache = require('../../../shared/settings-cache');

    const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');

    if (!labs.isSet('giftSubscriptions')) {
        return res.redirect(302, siteUrl + '/');
    }

    const {token} = req.params;
    const siteTitle = settingsCache.get('title') || 'Ghost';

    let gift;
    let tier;

    try {
        gift = await giftService.getByToken(token);
        tier = await tiersService.api.read(gift.tierId);

        if (!tier) {
            throw new errors.NotFoundError({message: `Tier not found: ${gift.tierId}`});
        }
    } catch (err) {
        logging.warn(`Gift preview: failed to load required gift data, redirecting to homepage`, err);

        return res.redirect(302, siteUrl + '/');
    }

    const cadenceLabel = getCadenceLabel(gift.cadence, gift.duration);
    const ogTitle = `A gift membership to ${siteTitle}`;
    const ogDescription = `${tier.name} \u00B7 ${cadenceLabel}`;
    const ogImage = `${siteUrl}/gift/${encodeURIComponent(token)}/image`;
    const ogUrl = `${siteUrl}/gift/${encodeURIComponent(token)}`;
    const redirectUrl = `${siteUrl}/#/portal/gift/redeem/${encodeURIComponent(token)}`;

    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(ogTitle)}</title>

    <!-- Open Graph -->
    <meta property="og:site_name" content="${escapeHtml(siteTitle)}">
    <meta property="og:type" content="website">
    <meta property="og:title" content="${escapeHtml(ogTitle)}">
    <meta property="og:description" content="${escapeHtml(ogDescription)}">
    <meta property="og:url" content="${escapeHtml(ogUrl)}">
    <meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">

    <!-- Twitter -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}">
    <meta name="twitter:image" content="${escapeHtml(ogImage)}">

    <!-- Redirect -->
    <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
</head>
<body>
    <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
    <noscript><a href="${escapeHtml(redirectUrl)}">Redeem your gift membership</a></noscript>
</body>
</html>`;

    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
}

async function giftPreviewImage(req, res) {
    const labs = require('../../../shared/labs');
    const giftService = require('../../services/gifts').service;
    const tiersService = require('../../services/tiers');
    const settingsCache = require('../../../shared/settings-cache');

    if (!labs.isSet('giftSubscriptions')) {
        return res.sendStatus(404);
    }

    const token = req.params.token;

    let gift;
    let tier;

    try {
        gift = await giftService.getByToken(token);
        tier = await tiersService.api.read(gift.tierId);

        if (!tier) {
            throw new errors.NotFoundError({message: `Tier not found: ${gift.tierId}`});
        }
    } catch (err) {
        logging.warn('Gift preview image: failed to load required gift data', err);

        return res.sendStatus(404);
    }

    const tierName = tier.name;
    const cadenceLabel = getCadenceLabel(gift.cadence, gift.duration);
    const accentColor = settingsCache.get('accent_color') || '#15171A';

    try {
        const png = await generateGiftPreviewImage({tierName, cadenceLabel, accentColor});

        res.set('Content-Type', 'image/png');
        res.set('Cache-Control', 'public, max-age=86400');
        res.send(png);
    } catch (err) {
        logging.error('Gift OG image generation failed', err);

        res.sendStatus(404);
    }
}

module.exports = {
    giftPreview,
    giftPreviewImage
};
