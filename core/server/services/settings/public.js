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
    // TODO: substitute ghost_head and ghost_foot with codeinjection_* when we drop v2 (Ghost 4.0)
    ghost_head: 'ghost_head',
    ghost_foot: 'ghost_foot',
    navigation: 'navigation',
    meta_title: 'meta_title',
    meta_description: 'meta_description',
    og_image: 'og_image',
    og_title: 'og_title',
    og_description: 'og_description',
    twitter_image: 'twitter_image',
    twitter_title: 'twitter_title',
    twitter_description: 'twitter_description'
};
