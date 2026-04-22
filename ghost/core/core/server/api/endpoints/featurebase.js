const jwt = require('jsonwebtoken');
const errors = require('@tryghost/errors');
const config = require('../../../shared/config');
const settingsCache = require('../../../shared/settings-cache');
const urlUtils = require('../../../shared/url-utils');

function generateJWTToken(frame) {
    const userData = {
        name: frame.user.get('name'),
        email: frame.user.get('email'),
        profilePicture: frame.user.get('profile_image'),

        companies: [{
            id: settingsCache.get('site_uuid'),
            name: settingsCache.get('title'),
            website: urlUtils.urlFor('home', true)
        }]
    };

    return jwt.sign(userData, config.get('featurebase:jwtSecret'), {
        algorithm: 'HS256',
        expiresIn: '7d'
    });
}

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'featurebase',

    token: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        async query(frame) {
            const enabled = config.get('featurebase:enabled');
            const jwtSecret = config.get('featurebase:jwtSecret');

            if (!enabled || !jwtSecret) {
                throw new errors.ValidationError({
                    message: 'Featurebase is not configured'
                });
            }

            const token = generateJWTToken(frame);

            return {
                token
            };
        }
    }
};

module.exports = controller;
