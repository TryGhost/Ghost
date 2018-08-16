const _ = require('lodash');
const common = require('../../lib/common');
const RESOURCE_CONFIG = require('../../services/routing/assets/resource-config');
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

_private.validateData = function validateData(object) {
    if (!object.hasOwnProperty('data')) {
        return object;
    }

    const shortToLongForm = (shortForm, options = {}) => {
        let longForm = {
            query: {},
            router: {}
        };

        if (!shortForm.match(/.*\..*/)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: shortForm,
                    reason: 'Incorrect Format. Please use e.g. tag.recipes'
                })
            });
        }

        let [resourceKey, slug] = shortForm.split('.');

        // @NOTE: `data: author.foo` is not allowed currently, because this will make {{author}} available in the theme, which is deprecated (single author usage)
        if (!RESOURCE_CONFIG.QUERY[resourceKey] ||
            (RESOURCE_CONFIG.QUERY[resourceKey].hasOwnProperty('internal') && RESOURCE_CONFIG.QUERY[resourceKey].internal === true)) {
            throw new common.errors.ValidationError({
                message: `Resource key not supported. ${resourceKey}`,
                help: 'Please use: tag, user, post or page.'
            });
        }

        longForm.query[options.resourceKey || resourceKey] = {};
        longForm.query[options.resourceKey || resourceKey] = _.omit(_.cloneDeep(RESOURCE_CONFIG.QUERY[resourceKey]), 'alias');

        // redirect is enabled by default when using the short form
        longForm.router = {
            [RESOURCE_CONFIG.QUERY[resourceKey].alias]: [{slug: slug, redirect: true}]
        };

        longForm.query[options.resourceKey || resourceKey].options.slug = slug;
        return longForm;
    };

    // CASE: short form e.g. data: tag.recipes (expand to long form)
    if (typeof object.data === 'string') {
        object.data = shortToLongForm(object.data);
    } else {
        const requiredQueryFields = ['type', 'resource'];
        const allowedQueryValues = {
            type: ['read', 'browse'],
            resource: _.map(RESOURCE_CONFIG.QUERY, 'resource')
        };
        const allowedQueryOptions = ['limit', 'filter', 'include', 'slug', 'visibility', 'status'];
        const allowedRouterOptions = ['redirect', 'slug'];
        const defaultRouterOptions = {
            redirect: true
        };

        let data = {
            query: {},
            router: {}
        };

        _.each(object.data, (value, key) => {
            // CASE: a name is required to define the data longform
            if (['resource', 'type', 'limit', 'order', 'include', 'filter', 'status', 'visibility', 'slug', 'redirect'].indexOf(key) !== -1) {
                throw new common.errors.ValidationError({
                    message: 'Please wrap the data definition into a custom name.',
                    help: 'Example:\n data:\n  my-tag:\n    resource: tags\n    ...\n'
                });
            }

            // @NOTE: We disallow author, because {{author}} is deprecated.
            if (key === 'author') {
                throw new common.errors.ValidationError({
                    message: 'Please choose a different name. We recommend not using author.'
                });
            }

            // CASE: short form used with custom names, resolve to longform and return
            if (typeof object.data[key] === 'string') {
                const longForm = shortToLongForm(object.data[key], {resourceKey: key});
                data.query = _.merge(data.query, longForm.query);

                _.each(Object.keys(longForm.router), (key) => {
                    if (data.router[key]) {
                        data.router[key] = data.router[key].concat(longForm.router[key]);
                    } else {
                        data.router[key] = longForm.router[key];
                    }
                });

                return;
            }

            data.query[key] = {
                options: {}
            };

            _.each(requiredQueryFields, (option) => {
                if (!object.data[key].hasOwnProperty(option)) {
                    throw new common.errors.ValidationError({
                        message: common.i18n.t('errors.services.settings.yaml.validate', {
                            at: JSON.stringify(object.data[key]),
                            reason: `${option} is required.`
                        })
                    });
                }

                if (allowedQueryValues[option] && allowedQueryValues[option].indexOf(object.data[key][option]) === -1) {
                    throw new common.errors.ValidationError({
                        message: common.i18n.t('errors.services.settings.yaml.validate', {
                            at: JSON.stringify(object.data[key]),
                            reason: `${object.data[key][option]} not supported. Please use ${_.uniq(allowedQueryValues[option])}.`
                        })
                    });
                }

                data.query[key][option] = object.data[key][option];
            });

            const DEFAULT_RESOURCE =  _.find(RESOURCE_CONFIG.QUERY, {resource: data.query[key].resource});

            data.query[key].options = _.pick(object.data[key], allowedQueryOptions);
            if (data.query[key].type === 'read') {
                data.query[key].options = _.defaults(data.query[key].options, DEFAULT_RESOURCE.options);
            }

            if (!data.router.hasOwnProperty(DEFAULT_RESOURCE.alias)) {
                data.router[DEFAULT_RESOURCE.alias] = [];
            }

            // CASE: we do not allowed redirects for type browse
            if (data.query[key].type === 'read') {
                let entry = _.pick(object.data[key], allowedRouterOptions);
                entry = _.defaults(entry, defaultRouterOptions);
                data.router[DEFAULT_RESOURCE.alias].push(entry);
            } else {
                data.router[DEFAULT_RESOURCE.alias].push(defaultRouterOptions);
            }
        });

        object.data = data;
    }

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
                    reason: 'Please define a template.'
                }),
                help: 'e.g. /about/: about'
            });
        }

        routes[routingTypeObjectKey] = _private.validateTemplate(routingTypeObject);
        routes[routingTypeObjectKey] = _private.validateData(routes[routingTypeObjectKey]);
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
        if (!routingTypeObject.permalink.match(/\/$/)) {
            throw new common.errors.ValidationError({
                message: common.i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject.permalink,
                    reason: 'A trailing slash is required.'
                })
            });
        }

        // CASE: we hard-require leading slashes for the value/permalink route
        if (!routingTypeObject.permalink.match(/^\//)) {
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
        collections[routingTypeObjectKey] = _private.validateData(collections[routingTypeObjectKey]);
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
