var _               = require('lodash'),
    url             = require('url'),
    moment          = require('moment'),
    config          = require('../../server/config'),
    schema          = require('../../server/data/schema').tables,
    ApiRouteBase    = '/ghost/api/v0.1/',
    host            = config.get('server').host,
    port            = config.get('server').port,
    protocol        = 'http://',
    expectedProperties = {
        // API top level
        posts:         ['posts', 'meta'],
        tags:          ['tags', 'meta'],
        users:         ['users', 'meta'],
        settings:      ['settings', 'meta'],
        subscribers:   ['subscribers', 'meta'],
        roles:         ['roles'],
        pagination:    ['page', 'limit', 'pages', 'total', 'next', 'prev'],
        slugs:         ['slugs'],
        slug:          ['slug'],
        // object / model level
        // Post API
        post:        _(schema.posts).keys()
            // does not return all formats by default
            .without('mobiledoc', 'amp', 'plaintext')
            // swaps author_id to author, and always returns computed properties: url, comment_id, primary_tag
            .without('author_id').concat('author', 'url', 'comment_id', 'primary_tag')
            .value(),
        // User API always removes the password field
        user:        _(schema.users).keys().without('password').without('ghost_auth_access_token').value(),
        // Tag API swaps parent_id to parent
        tag:         _(schema.tags).keys().without('parent_id').concat('parent').value(),
        setting:     _.keys(schema.settings),
        subscriber: _.keys(schema.subscribers),
        accesstoken: _.keys(schema.accesstokens),
        role:        _.keys(schema.roles),
        permission:  _.keys(schema.permissions),
        notification: ['type', 'message', 'status', 'id', 'dismissible', 'location'],
        theme:        ['name', 'package', 'active'],
        themes:       ['themes'],
        invites:      _(schema.invites).keys().without('token').value()
    };

function getApiQuery(route) {
    return url.resolve(ApiRouteBase, route);
}

function getApiURL(route) {
    var baseURL = url.resolve(protocol + host + ':' + port, ApiRouteBase);
    return url.resolve(baseURL, route);
}

function getURL() {
    return protocol + host;
}

function getSigninURL() {
    return url.resolve(protocol + host + ':' + port, 'ghost/signin/');
}

function getAdminURL() {
    return url.resolve(protocol + host + ':' + port, 'ghost/');
}

function isISO8601(date) {
    return moment(date).parsingFlags().iso;
}

// make sure the API only returns expected properties only
function checkResponseValue(jsonResponse, expectedProperties) {
    var providedProperties = _.keys(jsonResponse),
        missing = _.difference(expectedProperties, providedProperties),
        unexpected = _.difference(providedProperties, expectedProperties);

    _.each(missing, function (prop) {
        jsonResponse.should.have.property(prop);
    });

    _.each(unexpected, function (prop) {
        jsonResponse.should.not.have.property(prop);
    });

    providedProperties.length.should.eql(expectedProperties.length);
}

function checkResponse(jsonResponse, objectType, additionalProperties, missingProperties, onlyProperties) {
    var checkProperties = expectedProperties[objectType];

    checkProperties = onlyProperties ? onlyProperties : checkProperties;
    checkProperties = additionalProperties ? checkProperties.concat(additionalProperties) : checkProperties;
    checkProperties = missingProperties ? _.xor(checkProperties, missingProperties) : checkProperties;

    checkResponseValue(jsonResponse, checkProperties);
}

module.exports = {
    getApiURL: getApiURL,
    getApiQuery: getApiQuery,
    getSigninURL: getSigninURL,
    getAdminURL: getAdminURL,
    getURL: getURL,
    checkResponse: checkResponse,
    checkResponseValue: checkResponseValue,
    isISO8601: isISO8601
};
