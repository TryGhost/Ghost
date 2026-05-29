const _ = require('lodash');
const hbs = require('../engine');
const urlUtils = require('../../../../shared/url-utils');
const customThemeSettingsCache = require('../../../../shared/custom-theme-settings-cache');
const preview = require('../preview');
const config = require('../../../../shared/config');

function updateLocalTemplateOptions(req, res, next) {
    const localTemplateOptions = hbs.getLocalTemplateOptions(res.locals);

    // adjust @site.url for http/https based on the incoming request
    const siteData = {
        url: urlUtils.urlFor('home', {trailingSlash: false}, true),
        admin_url: urlUtils.urlFor('admin', true)
    };

    // @TODO: it would be nicer if this was proper middleware somehow...
    const previewData = preview.handle(req, Object.keys(customThemeSettingsCache.getAll()));

    // strip custom off of preview data so it doesn't get merged into @site
    const customData = previewData.custom;
    delete previewData.custom;

    // update site data with any preview values from the request
    Object.assign(siteData, previewData);

    const member = req.member ? {
        uuid: req.member.uuid,
        email: req.member.email,
        name: req.member.name,
        firstname: req.member.name && req.member.name.split(' ')[0],
        avatar_image: req.member.avatar_image,
        subscriptions: req.member.subscriptions && req.member.subscriptions.map((sub) => {
            return Object.assign({}, sub, {
                default_payment_card_last4: sub.default_payment_card_last4 || '****'
            });
        }),
        paid: req.member.status !== 'free',
        status: req.member.status
    } : null;

    const enableDeduplication = config.get('optimization:getHelper:deduplication');

    // Expose the resolved gift link (if the request carried a valid `?gift=` token)
    // so the {{content}} helper can render the reader-facing gift callout.
    const gift = res.locals.giftLink ? {post_id: res.locals.giftLink.post_id} : null;

    hbs.updateLocalTemplateOptions(res.locals, _.merge({}, localTemplateOptions, {
        data: {
            member: member,
            site: siteData,
            custom: customData,
            gift: gift,
            ...(enableDeduplication && {_queryCache: new Map()})
        }
    }));

    next();
}

module.exports = updateLocalTemplateOptions;
