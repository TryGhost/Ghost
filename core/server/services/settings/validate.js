const _ = require('lodash');
const common = require('../../lib/common');
const _private = {};

_private.validateTemplate = function validateTemplate(object) {
    // CASE: /about/: about
    if (typeof object === 'string') {
        return {
            templates: [object]
        };
    }

    if (!object.hasOwnProperty('template')) {
        object.templates = [];
        return object;
    }

    if (_.isArray(object.template)) {
        object.templates = object.template;
    } else {
        object.templates = [object.template];
    }

    delete object.template;
    return object;
};

_private.validateRoutes = function validateRoutes(routes) {
    _.each(routes, (routingTypeObject, routingTypeObjectKey) => {
        // CASE: we hard-require trailing slashes for the index route
        if (!routingTypeObjectKey.match(/\/$/)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'A trailing slash is required.'
                })
            });
        }

        // CASE: we hard-require leading slashes for the index route
        if (!routingTypeObjectKey.match(/^\//)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'A leading slash is required.'
                })
            });
        }

        // CASE: you define /about/:
        if (!routingTypeObject) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'Please define a permalink route.'
                }),
                help: 'e.g. permalink: /{slug}/'
            });
        }

        routes[routingTypeObjectKey] = _private.validateTemplate(routingTypeObject);
    });

    return routes;
};

_private.validateCollections = function validateCollections(collections) {
    _.each(collections, (routingTypeObject, routingTypeObjectKey) => {
        // CASE: we hard-require trailing slashes for the collection index route
        if (!routingTypeObjectKey.match(/\/$/)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'A trailing slash is required.'
                })
            });
        }

        // CASE: we hard-require leading slashes for the collection index route
        if (!routingTypeObjectKey.match(/^\//)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'A leading slash is required.'
                })
            });
        }

        if (!routingTypeObject.hasOwnProperty('permalink')) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'Please define a permalink route.'
                }),
                help: 'e.g. permalink: /{slug}/'
            });
        }

        // CASE: validate permalink key

        if (!routingTypeObject.permalink) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'Please define a permalink route.'
                }),
                help: 'e.g. permalink: /{slug}/'
            });
        }

        // CASE: we hard-require trailing slashes for the value/permalink route
        if (!routingTypeObject.permalink.match(/\/$/) && !routingTypeObject.permalink.match(/globals\.permalinks/)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject.permalink,
                    reason: 'A trailing slash is required.'
                })
            });
        }

        // CASE: we hard-require leading slashes for the value/permalink route
        if (!routingTypeObject.permalink.match(/^\//) && !routingTypeObject.permalink.match(/globals\.permalinks/)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject.permalink,
                    reason: 'A leading slash is required.'
                })
            });
        }

        // CASE: notation /:slug/ or /:primary_author/ is not allowed. We only accept /{{...}}/.
        if (routingTypeObject.permalink && routingTypeObject.permalink.match(/\/\:\w+/)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject.permalink,
                    reason: 'Please use the following notation e.g. /{slug}/.'
                })
            });
        }

        // CASE: transform {.*} into :\w+ notation. This notation is our internal notation e.g. see permalink
        //       replacement in our UrlService utility.
        if (routingTypeObject.permalink.match(/{.*}/)) {
            routingTypeObject.permalink = routingTypeObject.permalink.replace(/{(\w+)}/g, ':$1');
        }

        collections[routingTypeObjectKey] = _private.validateTemplate(routingTypeObject);
    });

    return collections;
};

_private.validateTaxonomies = function validateTaxonomies(taxonomies) {
    _.each(taxonomies, (routingTypeObject, routingTypeObjectKey) => {
        if (!routingTypeObject) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'Please define a taxonomy permalink route.'
                }),
                help: 'e.g. tag: /tag/{slug}/'
            });
        }

        // CASE: we hard-require trailing slashes for the taxonomie permalink route
        if (!routingTypeObject.match(/\/$/)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject,
                    reason: 'A trailing slash is required.'
                })
            });
        }

        // CASE: we hard-require leading slashes for the value/permalink route
        if (!routingTypeObject.match(/^\//)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject,
                    reason: 'A leading slash is required.'
                })
            });
        }

        // CASE: notation /:slug/ or /:primary_author/ is not allowed. We only accept /{{...}}/.
        if (routingTypeObject && routingTypeObject.match(/\/\:\w+/)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject,
                    reason: 'Please use the following notation e.g. /{slug}/.'
                })
            });
        }

        // CASE: transform {.*} into :\w+ notation. This notation is our internal notation e.g. see permalink
        //       replacement in our UrlService utility.
        if (routingTypeObject && routingTypeObject.match(/{.*}/)) {
            routingTypeObject = routingTypeObject.replace(/{(\w+)}/g, ':$1');
            taxonomies[routingTypeObjectKey] = routingTypeObject;
        }
    });

    return taxonomies;
};

/**
 * Validate and sanitize the routing object.
 */
module.exports = function validate(object) {
    if (!object) {
        object = {};
    }

    if (!object.routes) {
        object.routes = {};
    }

    if (!object.collections) {
        object.collections = {};
    }

    if (!object.taxonomies) {
        object.taxonomies = {};
    }

    object.routes = _private.validateRoutes(object.routes);
    object.collections = _private.validateCollections(object.collections);
    object.taxonomies = _private.validateTaxonomies(object.taxonomies);

    return object;
};
