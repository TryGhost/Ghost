const _ = require('lodash'),
    Promise = require('bluebird'),
    debug = require('ghost-ignition').debug('services:routing:controllers:static'),
    api = require('../../../api'),
    helpers = require('../helpers');

function processQuery(query) {
    query = _.cloneDeep(query);

    // Return a promise for the api query
    return api[query.resource][query.type](query.options);
}

module.exports = function staticController(req, res, next) {
    debug('staticController', res.routerOptions);

    let props = {};

    _.each(res.routerOptions.data, function (query, name) {
        props[name] = processQuery(query);
    });

    return Promise.props(props)
        .then(function handleResult(result) {
            let response = {};

            if (res.routerOptions.data) {
                response.data = {};

                _.each(res.routerOptions.data, function (config, name) {
                    if (config.type === 'browse') {
                        response.data[name] = result[name];
                    } else {
                        response.data[name] = result[name][config.resource];
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
