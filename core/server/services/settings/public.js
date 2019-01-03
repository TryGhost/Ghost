/**
 * The settings with type "blog" were originally meant to be public
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
    cover_image: 'cover_image',
    facebook: 'facebook',
    twitter: 'twitter',
    default_locale: 'lang',
    active_timezone: 'timezone',
    ghost_head: 'ghost_head',
    ghost_foot: 'ghost_foot',
    navigation: 'navigation'
};
