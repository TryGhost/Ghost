const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const {generateGiftPreviewImage} = require('./image');
const {t} = require('../../services/i18n');

function getCadenceLabel(cadence, duration) {
    if (cadence === 'year') {
        return t('{count} year', {count: duration});
    }

    return t('{count} month', {count: duration});
}

function getOgTitle({cadence, duration, tierName, siteTitle}) {
    if (cadence === 'year') {
        return t(`You've been gifted a {duration}-year {tierName} membership to {siteTitle}`, {
            duration,
            tierName,
            siteTitle,
            interpolation: {escapeValue: false}
        });
    }

    return t(`You've been gifted a {duration}-month {tierName} membership to {siteTitle}`, {
        duration,
        tierName,
        siteTitle,
        interpolation: {escapeValue: false}
    });
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

        if (!gift) {
            throw new errors.NotFoundError({message: `Gift not found for token`});
        }

        tier = await tiersService.api.read(gift.tierId);

        if (!tier) {
            throw new errors.NotFoundError({message: `Tier not found for gift: ${gift.id}`});
        }
    } catch (err) {
        logging.warn(`Gift preview: failed to load required gift data, redirecting to homepage`, err);

        return res.redirect(302, siteUrl + '/');
    }

    const ogTitle = getOgTitle({
        cadence: gift.cadence,
        duration: gift.duration,
        tierName: tier.name,
        siteTitle
    });
    const ogDescription = t('Open this link to redeem your gift.');
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
    <noscript><a href="${escapeHtml(redirectUrl)}">${escapeHtml(t('Redeem your gift subscription'))}</a></noscript>
</body>
</html>`;

    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
}

async function giftPreviewImage(req, res) {
    const labs = require('../../../shared/labs');
    const giftService = require('../../services/gifts').service;
    const settingsCache = require('../../../shared/settings-cache');
    const tiersService = require('../../services/tiers');

    if (!labs.isSet('giftSubscriptions')) {
        return res.sendStatus(404);
    }

    const accentColor = settingsCache.get('accent_color') || '#15171A';
    const siteTitle = settingsCache.get('title') || 'Ghost';
    const {token} = req.params;

    try {
        const gift = await giftService.getByToken(token);

        if (!gift) {
            throw new errors.NotFoundError({message: `Gift not found for token`});
        }

        const tier = await tiersService.api.read(gift.tierId);

        if (!tier) {
            throw new errors.NotFoundError({message: `Tier not found for gift: ${gift.id}`});
        }

        const png = await generateGiftPreviewImage({
            accentColor,
            siteTitle,
            tierLabel: t('{tierName} membership', {
                tierName: tier.name,
                interpolation: {escapeValue: false}
            }),
            cadenceLabel: getCadenceLabel(gift.cadence, gift.duration)
        });

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
