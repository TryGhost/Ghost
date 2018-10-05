var _ = require('lodash'),
    url = require('url'),
    moment = require('moment'),
    DataGenerator = require('./fixtures/data-generator'),
    config = require('../../server/config'),
    common = require('../../server/lib/common'),
    sequence = require('../../server/lib/promise/sequence'),
    schema = require('../../server/data/schema').tables,
    host = config.get('server').host,
    port = config.get('server').port,
    protocol = 'http://',
    expectedProperties = {
        // API top level
        posts: ['posts', 'meta'],
        tags: ['tags', 'meta'],
        users: ['users', 'meta'],
        settings: ['settings', 'meta'],
        subscribers: ['subscribers', 'meta'],
        roles: ['roles'],
        pagination: ['page', 'limit', 'pages', 'total', 'next', 'prev'],
        slugs: ['slugs'],
        slug: ['slug'],
        post: _(schema.posts)
            .keys()
            // by default we only return html
            .without('mobiledoc', 'plaintext')
            // swaps author_id to author, and always returns computed properties: url, comment_id, primary_tag, primary_author
            .without('author_id').concat('author', 'url', 'primary_tag', 'primary_author')
            .value(),
        user: {
            default: _(schema.users).keys().without('password').without('ghost_auth_access_token').value(),
            public: _(schema.users)
                .keys()
                .without(
                    'password',
                    'email',
                    'ghost_auth_access_token',
                    'ghost_auth_id',
                    'created_at',
                    'created_by',
                    'updated_at',
                    'updated_by',
                    'last_seen',
                    'status'
                )
                .value()
        },
        // Tag API swaps parent_id to parent
        tag: _(schema.tags).keys().without('parent_id').concat('parent').value(),
        setting: _.keys(schema.settings),
        subscriber: _.keys(schema.subscribers),
        accesstoken: _.keys(schema.accesstokens),
        role: _.keys(schema.roles),
        permission: _.keys(schema.permissions),
        notification: ['type', 'message', 'status', 'id', 'dismissible', 'location', 'custom'],
        theme: ['name', 'package', 'active'],
        themes: ['themes'],
        invites: _(schema.invites).keys().without('token').value(),
        webhook: _.keys(schema.webhooks)
    };

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

// @TODO: support options pattern only, it's annoying to call checkResponse(null, null, null, something)
function checkResponse(jsonResponse, objectType, additionalProperties, missingProperties, onlyProperties, options) {
    options = options || {};

    var checkProperties = options.public ? (expectedProperties[objectType].public || expectedProperties[objectType]) : (expectedProperties[objectType].default || expectedProperties[objectType]);

    checkProperties = onlyProperties ? onlyProperties : checkProperties;
    checkProperties = additionalProperties ? checkProperties.concat(additionalProperties) : checkProperties;
    checkProperties = missingProperties ? _.xor(checkProperties, missingProperties) : checkProperties;

    checkResponseValue(jsonResponse, checkProperties);
}

/**
 * This function manages the work of ensuring we have an overridden owner user, and grabbing an access token
 *
 * @TODO make this do the DB init as well
 */
const doAuth = (apiOptions) => {
    return function doAuthInner() {
        let API_URL = arguments[0];
        let request = arguments[1];

        // Remove API_URL & request from this list
        let options = Array.prototype.slice.call(arguments, 2);

        // No DB setup, but override the owner
        options = _.merge({'owner:post': true}, _.transform(options, function (result, val) {
            if (val) {
                result[val] = true;
            }
        }));

        const fixtureOps = apiOptions.getFixtureOps(options);

        return sequence(fixtureOps).then(function () {
            return login(request, API_URL);
        });
    };
};

const login = (request, API_URL) => {
    // CASE: by default we use the owner to login
    if (!request.user) {
        request.user = DataGenerator.Content.users[0];
    }

    return new Promise(function (resolve, reject) {
        request.post(API_URL)
            .set('Origin', config.get('url'))
            .send({
                grant_type: 'password',
                username: request.user.email,
                password: 'Sl1m3rson99',
                client_id: 'ghost-admin',
                client_secret: 'not_available'
            }).then(function then(res) {
            if (res.statusCode !== 200) {
                return reject(new common.errors.GhostError({
                    message: res.body.errors[0].message
                }));
            }

            resolve(res.body.access_token);
        }, reject);
    });
};

module.exports = (options = {}) => {
    return {
        getSigninURL: getSigninURL,
        getAdminURL: getAdminURL,
        doAuth: doAuth(options),
        login: login,
        getURL: getURL,
        checkResponse: checkResponse,
        checkResponseValue: checkResponseValue,
        isISO8601: isISO8601
    };
};
