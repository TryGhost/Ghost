/**
 * This is a loose concept of a frontend handlebars toolkit
 * Note: everything here gets deep-required from the theme-engine
 * This indicates that the theme engine is a set of services, rather than a single service
 * and could do with a further refactor.
 *
 * This at least keeps the deep requires in a single place.
 */

const hbs = require('./theme-engine/engine');

module.exports = {
    hbs: hbs,
    SafeString: hbs.SafeString,
    escapeExpression: hbs.escapeExpression,
    // The local template thing, should this be merged with the channels one?
    templates: require('./theme-engine/handlebars/template'),

    // Theme i18n
    // @TODO: this should live somewhere else...
    themeI18n: require('./theme-engine/i18n'),
    themeI18next: require('./theme-engine/i18next'),
    // TODO: these need a more sensible home
    localUtils: require('./theme-engine/handlebars/utils')
};
