const _ = require('lodash'),
    Promise = require('bluebird'),
    debug = require('ghost-ignition').debug('services:routing:controllers:static'),
    helpers = require('../helpers'),
    config = require('../../../config');

function processQuery(query, locals) {
    const api = require('../../../api')[locals.apiVersion];
    query = _.cloneDeep(query);

    // CASE: If you define a single data key for a static route (e.g. data: page.team), this static route will represent
    //       the target resource. That means this static route has to behave the same way than the original resource url.
    //       e.g. the meta data package needs access to the full resource including relations.
    //       We override the `include` property for now, because the full data set is required anyway.
    if (_.get(query, 'resource') === 'posts') {
        _.extend(query.options, {
            include: 'author,authors,tags'
        });
    }

    if (config.get('enableDeveloperExperiments')) {
        Object.assign(query.options, {
            context: {
                members: locals.member
            }
        });
    }

    // Return a promise for the api query
    return api[query.controller][query.type](query.options);
}

module.exports = function staticController(req, res, next) {
    debug('staticController', res.routerOptions);

    let props = {};

    _.each(res.routerOptions.data, function (query, name) {
        props[name] = processQuery(query, res.locals);
    });

    return Promise.props(props)
        .then(function handleResult(result) {
            let response = {};

            if (res.routerOptions.data) {
                response.data = {};

                _.each(res.routerOptions.data, function (config, name) {
                    response.data[name] = result[name][config.resource];

                    if (config.type === 'browse') {
                        response.data[name].meta = result[name].meta;
                        // @TODO: remove in v3
                        response.data[name][config.resource] = result[name][config.resource];
                    }
                });
            }

            // @TODO: get rid of this O_O
            _.each(response.data, function (data) {
                helpers.secure(req, data);
            });

            helpers.renderer(req, res, helpers.formatResponse.entries(response));
        })
        .catch(helpers.handleError(next));
};
