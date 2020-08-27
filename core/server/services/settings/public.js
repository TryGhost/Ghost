/**
 * The settings with type "site" were originally meant to be public
 * This has been misused - unsplash and slack are incorrectly stored there
 * https://github.com/TryGhost/Ghost/issues/10318
 *
 * This file acts as a new whitelist for "public" settings
 */

module.exports = {
    title: 'title',
    description: 'description',
    logo: 'logo',
    icon: 'icon',
    accent_color: 'accent_color',
    cover_image: 'cover_image',
    facebook: 'facebook',
    twitter: 'twitter',
    lang: 'lang',
    timezone: 'timezone',
    codeinjection_head: 'codeinjection_head',
    codeinjection_foot: 'codeinjection_foot',
    navigation: 'navigation',
    secondary_navigation: 'secondary_navigation',
    meta_title: 'meta_title',
    meta_description: 'meta_description',
    og_image: 'og_image',
    og_title: 'og_title',
    og_description: 'og_description',
    twitter_image: 'twitter_image',
    twitter_title: 'twitter_title',
    twitter_description: 'twitter_description',
    members_support_address: 'members_support_address'
};
