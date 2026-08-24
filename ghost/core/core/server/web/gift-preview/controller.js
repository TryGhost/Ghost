const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const { generateGiftPreviewImage } = require('./image');
const { t } = require('../../services/i18n');

function getCadenceLabel(cadence, duration) {
  if (cadence === 'year') {
    return t('{count} year', { count: duration });
  }

  return t('{count} month', { count: duration });
}

function getOgTitle({ cadence, duration, tierName, siteTitle }) {
  if (cadence === 'year') {
    return t(`You've been gifted a {duration}-year {tierName} membership to {siteTitle}`, {
      duration,
      tierName,
      siteTitle,
      interpolation: { escapeValue: false },
    });
  }

  return t(`You've been gifted a {duration}-month {tierName} membership to {siteTitle}`, {
    duration,
    tierName,
    siteTitle,
    interpolation: { escapeValue: false },
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
  const { formatGiftDate, service: giftService } = require('../../services/gifts');
  const urlUtils = require('../../../shared/url-utils').default;
  const settingsCache = require('../../../shared/settings-cache');

  const siteUrl = urlUtils.getSiteUrl().replace(/\/$/, '');

  const { token } = req.params;
  const siteTitle = settingsCache.get('title') || 'Ghost';

  let preview;

  try {
    preview = await giftService.getPreview(token);

    if (!preview) {
      throw new errors.NotFoundError({ message: `Gift not found for token` });
    }
  } catch (err) {
    logging.warn(`Gift preview: failed to load required gift data, redirecting to homepage`, err);

    return res.redirect(302, siteUrl + '/');
  }

  // Before redemption availability the bearer may see the availability date
  // but no gift details, so the tier and duration stay out of the page and
  // its unfurl card until the scheduled date arrives.
  const isAvailable = preview.available;
  const ogTitle = isAvailable
    ? getOgTitle({
        cadence: preview.cadence,
        duration: preview.duration,
        tierName: preview.tier.name,
        siteTitle,
      })
    : t(`You've been gifted a membership to {siteTitle}`, {
        siteTitle,
        interpolation: { escapeValue: false },
      });
  const ogDescription = isAvailable
    ? t('Open this link to redeem your gift.')
    : t('Your gift can be opened on {date}.', {
        date: formatGiftDate(preview.redeemableAt, {
          locale: settingsCache.get('locale'),
          timeZone: settingsCache.get('timezone'),
        }),
        interpolation: { escapeValue: false },
      });
  const ogImage = `${siteUrl}/gift/${encodeURIComponent(token)}/image`;
  const ogUrl = `${siteUrl}/gift/${encodeURIComponent(token)}`;
  const redirectUrl = `${siteUrl}/#/portal/gift/redeem/${encodeURIComponent(token)}`;

  // The generated card image names the tier, so it only exists once the
  // gift is available; unfurls fall back to a plain summary until then.
  const imageMeta = isAvailable
    ? `<meta property="og:image" content="${escapeHtml(ogImage)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">`
    : '';
  const twitterImageMeta = isAvailable
    ? `\n    <meta name="twitter:image" content="${escapeHtml(ogImage)}">`
    : '';

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
    ${imageMeta}

    <!-- Twitter -->
    <meta name="twitter:card" content="${isAvailable ? 'summary_large_image' : 'summary'}">
    <meta name="twitter:title" content="${escapeHtml(ogTitle)}">
    <meta name="twitter:description" content="${escapeHtml(ogDescription)}">${twitterImageMeta}

    <!-- Redirect -->
    <meta http-equiv="refresh" content="0;url=${escapeHtml(redirectUrl)}">
</head>
<body>
    <script>window.location.replace(${JSON.stringify(redirectUrl)});</script>
    <noscript><a href="${escapeHtml(redirectUrl)}">${escapeHtml(t('Redeem your gift subscription'))}</a></noscript>
</body>
</html>`;

  // A cached pre-availability page must not outlive the availability time,
  // or the neutral card would linger after the gift becomes redeemable.
  const maxAge = isAvailable
    ? 3600
    : Math.max(1, Math.min(3600, Math.ceil((preview.redeemableAt.getTime() - Date.now()) / 1000)));

  res.set('Cache-Control', `public, max-age=${maxAge}`);
  res.set('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
}

async function giftPreviewImage(req, res) {
  const giftService = require('../../services/gifts').service;
  const settingsCache = require('../../../shared/settings-cache');

  const accentColor = settingsCache.get('accent_color') || '#15171A';
  const siteTitle = settingsCache.get('title') || 'Ghost';
  const { token } = req.params;

  try {
    const preview = await giftService.getPreview(token);

    if (!preview) {
      throw new errors.NotFoundError({ message: `Gift not found for token` });
    }

    if (!preview.available) {
      return res.sendStatus(404);
    }

    const png = await generateGiftPreviewImage({
      accentColor,
      siteTitle,
      tierLabel: t('{tierName} membership', {
        tierName: preview.tier.name,
        interpolation: { escapeValue: false },
      }),
      cadenceLabel: getCadenceLabel(preview.cadence, preview.duration),
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
  giftPreviewImage,
};
