const logging = require('@tryghost/logging');
const {generateGiftOgImage} = require('./og-image-generator');

function getCadenceLabel(cadence, duration) {
    const unit = cadence === 'month' ? 'month' : 'year';
    return duration === 1 ? `1 ${unit}` : `${duration} ${unit}s`;
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

async function giftPreview(req, res) {
    const labs = require('../../../shared/labs');
    const giftService = require('../../services/gifts').service;
    const urlUtils = require('../../../shared/url-utils');

    const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');

    if (!labs.isSet('giftSubscriptions')) {
        return res.redirect(302, siteUrl + '/');
    }

    const settingsCache = require('../../../shared/settings-cache');

    const {token} = req.params;
    const siteTitle = settingsCache.get('title') || 'Ghost';

    let gift;

    try {
        gift = await giftService.getByToken(token);
    } catch (err) {
        logging.warn(`Gift preview: gift not found, redirecting to homepage`);

        return res.redirect(302, siteUrl + '/');
    }

    const tierName = gift.tier.name;
    const cadenceLabel = getCadenceLabel(gift.cadence, gift.duration);
    const ogTitle = `A gift membership to ${siteTitle}`;
    const ogDescription = `${tierName} \u00B7 ${cadenceLabel}`;
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

async function giftImage(req, res) {
    const labs = require('../../../shared/labs');
    const giftService = require('../../services/gifts').service;

    if (!labs.isSet('giftSubscriptions')) {
        return res.sendStatus(404);
    }

    const settingsCache = require('../../../shared/settings-cache');

    const token = req.params.token;

    let gift;

    try {
        gift = await giftService.getByToken(token);
    } catch (err) {
        return res.sendStatus(404);
    }

    const tierName = gift.tier.name;
    const cadenceLabel = getCadenceLabel(gift.cadence, gift.duration);
    const accentColor = settingsCache.get('accent_color') || '#15171A';

    try {
        const png = await generateGiftOgImage({tierName, cadenceLabel, accentColor});
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
    giftImage
};
