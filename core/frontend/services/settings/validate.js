const _ = require('lodash');
const debug = require('ghost-ignition').debug('frontend:services:settings:validate');
const {i18n} = require('../../../server/lib/common');
const errors = require('@tryghost/errors');
const themeService = require('../themes');
const _private = {};
let RESOURCE_CONFIG;

_private.validateTemplate = function validateTemplate(object) {
    // CASE: /about/: about
    if (typeof object === 'string') {
        return {
            templates: [object]
        };
    }

    if (!Object.prototype.hasOwnProperty.call(object, 'template')) {
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
    if (!Object.prototype.hasOwnProperty.call(object, 'data')) {
        return object;
    }

    const shortToLongForm = (shortForm, options = {}) => {
        let longForm = {
            query: {},
            router: {}
        };

        if (!shortForm.match(/.*\..*/)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: shortForm,
                    reason: 'Incorrect Format. Please use e.g. tag.recipes'
                })
            });
        }

        let [resourceKey, slug] = shortForm.split('.');

        if (!RESOURCE_CONFIG.QUERY[resourceKey] ||
            (Object.prototype.hasOwnProperty.call(RESOURCE_CONFIG.QUERY[resourceKey], 'internal') && RESOURCE_CONFIG.QUERY[resourceKey].internal === true)) {
            throw new errors.ValidationError({
                message: `Resource key not supported. ${resourceKey}`,
                help: 'Please use: tag, user, post or page.'
            });
        }

        longForm.query[options.resourceKey || resourceKey] = {};
        longForm.query[options.resourceKey || resourceKey] = _.cloneDeep(_.omit(RESOURCE_CONFIG.QUERY[resourceKey], 'resourceAlias'));

        // redirect is enabled by default when using the short form
        longForm.router = {
            [RESOURCE_CONFIG.QUERY[resourceKey].resourceAlias || RESOURCE_CONFIG.QUERY[resourceKey].resource]: [{
                slug: slug,
                redirect: true
            }]
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
        const allowedQueryOptions = ['limit', 'order', 'filter', 'include', 'slug', 'visibility', 'status', 'page'];
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
                throw new errors.ValidationError({
                    message: 'Please wrap the data definition into a custom name.',
                    help: 'Example:\n data:\n  my-tag:\n    resource: tags\n    ...\n'
                });
            }

            // @NOTE: We disallow author, because {{author}} is deprecated.
            if (key === 'author') {
                throw new errors.ValidationError({
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
                if (!Object.prototype.hasOwnProperty.call(object.data[key], option)) {
                    throw new errors.ValidationError({
                        message: i18n.t('errors.services.settings.yaml.validate', {
                            at: JSON.stringify(object.data[key]),
                            reason: `${option} is required.`
                        })
                    });
                }

                if (allowedQueryValues[option] && allowedQueryValues[option].indexOf(object.data[key][option]) === -1) {
                    throw new errors.ValidationError({
                        message: i18n.t('errors.services.settings.yaml.validate', {
                            at: JSON.stringify(object.data[key]),
                            reason: `${object.data[key][option]} not supported. Please use ${_.uniq(allowedQueryValues[option])}.`
                        })
                    });
                }

                data.query[key][option] = object.data[key][option];
            });

            const DEFAULT_RESOURCE = _.find(RESOURCE_CONFIG.QUERY, {resource: data.query[key].resource});

            data.query[key].resource = DEFAULT_RESOURCE.resource;

            data.query[key] = _.defaults(data.query[key], _.omit(DEFAULT_RESOURCE, ['options', 'resourceAlias']));

            data.query[key].options = _.pick(object.data[key], allowedQueryOptions);
            if (data.query[key].type === 'read') {
                data.query[key].options = _.defaults(data.query[key].options, DEFAULT_RESOURCE.options);
            }

            if (!Object.prototype.hasOwnProperty.call(data.router, DEFAULT_RESOURCE.resourceAlias || DEFAULT_RESOURCE.resource)) {
                data.router[DEFAULT_RESOURCE.resourceAlias || DEFAULT_RESOURCE.resource] = [];
            }

            // CASE: we do not allowed redirects for type browse
            if (data.query[key].type === 'read') {
                let entry = _.pick(object.data[key], allowedRouterOptions);
                entry = _.defaults(entry, defaultRouterOptions);
                data.router[DEFAULT_RESOURCE.resourceAlias || DEFAULT_RESOURCE.resource].push(entry);
            } else {
                data.router[DEFAULT_RESOURCE.resourceAlias || DEFAULT_RESOURCE.resource].push(defaultRouterOptions);
            }
        });

        object.data = data;
    }

    return object;
};

_private.validateRoutes = function validateRoutes(routes) {
    if (routes.constructor !== Object) {
        throw new errors.ValidationError({
            message: i18n.t('errors.services.settings.yaml.validate', {
                at: routes,
                reason: '`routes` must be a YAML map.'
            })
        });
    }

    _.each(routes, (routingTypeObject, routingTypeObjectKey) => {
        // CASE: we hard-require trailing slashes for the index route
        if (!routingTypeObjectKey.match(/\/$/)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'A trailing slash is required.'
                })
            });
        }

        // CASE: we hard-require leading slashes for the index route
        if (!routingTypeObjectKey.match(/^\//)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'A leading slash is required.'
                })
            });
        }

        // CASE: you define /about/:
        if (!routingTypeObject) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
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
    if (collections.constructor !== Object) {
        throw new errors.ValidationError({
            message: i18n.t('errors.services.settings.yaml.validate', {
                at: collections,
                reason: '`collections` must be a YAML map.'
            })
        });
    }

    _.each(collections, (routingTypeObject, routingTypeObjectKey) => {
        // CASE: we hard-require trailing slashes for the collection index route
        if (!routingTypeObjectKey.match(/\/$/)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'A trailing slash is required.'
                })
            });
        }

        // CASE: we hard-require leading slashes for the collection index route
        if (!routingTypeObjectKey.match(/^\//)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'A leading slash is required.'
                })
            });
        }

        if (!Object.prototype.hasOwnProperty.call(routingTypeObject, 'permalink')) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'Please define a permalink route.'
                }),
                help: 'e.g. permalink: /{slug}/'
            });
        }

        // CASE: validate permalink key

        if (!routingTypeObject.permalink) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'Please define a permalink route.'
                }),
                help: 'e.g. permalink: /{slug}/'
            });
        }

        // CASE: we hard-require trailing slashes for the value/permalink route
        if (!routingTypeObject.permalink.match(/\/$/)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject.permalink,
                    reason: 'A trailing slash is required.'
                })
            });
        }

        // CASE: we hard-require leading slashes for the value/permalink route
        if (!routingTypeObject.permalink.match(/^\//)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject.permalink,
                    reason: 'A leading slash is required.'
                })
            });
        }

        // CASE: notation /:slug/ or /:primary_author/ is not allowed. We only accept /{{...}}/.
        if (routingTypeObject.permalink && routingTypeObject.permalink.match(/\/:\w+/)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
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
    if (taxonomies.constructor !== Object) {
        throw new errors.ValidationError({
            message: i18n.t('errors.services.settings.yaml.validate', {
                at: taxonomies,
                reason: '`taxonomies` must be a YAML map.'
            })
        });
    }

    const validRoutingTypeObjectKeys = Object.keys(RESOURCE_CONFIG.TAXONOMIES);
    _.each(taxonomies, (routingTypeObject, routingTypeObjectKey) => {
        if (!routingTypeObject) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'Please define a taxonomy permalink route.'
                }),
                help: 'e.g. tag: /tag/{slug}/'
            });
        }

        if (!validRoutingTypeObjectKeys.includes(routingTypeObjectKey)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObjectKey,
                    reason: 'Unknown taxonomy.'
                })
            });
        }

        // CASE: we hard-require trailing slashes for the taxonomie permalink route
        if (!routingTypeObject.match(/\/$/)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject,
                    reason: 'A trailing slash is required.'
                })
            });
        }

        // CASE: we hard-require leading slashes for the value/permalink route
        if (!routingTypeObject.match(/^\//)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
                    at: routingTypeObject,
                    reason: 'A leading slash is required.'
                })
            });
        }

        // CASE: notation /:slug/ or /:primary_author/ is not allowed. We only accept /{{...}}/.
        if (routingTypeObject && routingTypeObject.match(/\/:\w+/)) {
            throw new errors.ValidationError({
                message: i18n.t('errors.services.settings.yaml.validate', {
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

    const apiVersion = themeService.getApiVersion();

    debug('api version', apiVersion);

    RESOURCE_CONFIG = require(`../routing/config/${apiVersion}`);

    object.routes = _private.validateRoutes(object.routes);
    object.collections = _private.validateCollections(object.collections);
    object.taxonomies = _private.validateTaxonomies(object.taxonomies);

    return object;
};
