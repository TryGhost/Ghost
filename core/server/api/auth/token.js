const fs = require('fs'),
    Promise = require('bluebird'),
    jwt = require('jsonwebtoken'),
    {BadRequestError} = require('../../lib/common/errors'),
    config = require('../../config'),
    {hash} = require('./utils'),
    User = require('../../models/user').User,
    privateKey = fs.readFileSync(config.get('auth:keys:private')),
    publicKey = fs.readFileSync(config.get('auth:keys:public')),
    keyId = hash(publicKey),
    internalJwtIssuer = config.get('auth:issuer'),
    jwtAudience = config.get('auth:audience');

console.log({internalJwtIssuer, jwtAudience});

function generateToken(user) {
    return new Promise(function (resolve, reject) {
        // empty payload for now - we set the subject via the options param
        return jwt.sign({}, privateKey, {
            algorithm: 'RS256',
            expiresIn: '7d',
            audience: jwtAudience,
            issuer: internalJwtIssuer,
            jwtid: hash(user.id, Date.now(), internalJwtIssuer),
            subject: user.id,
            keyid: keyId
        }, function (err, token) {
            if (err) {
                return reject(err);
            }
            resolve(token);
        });
    });
}

function generateRefreshToken(token) {
    const payload = jwt.decode(token);
    return new Promise(function (resolve, reject) {
        // empty payload for now - we set the subject via the options param
        return jwt.sign({}, privateKey, {
            algorithm: 'RS256',
            expiresIn: '184d',
            audience: jwtAudience,
            issuer: internalJwtIssuer,
            jwtid: hash(payload.jti, Date.now(), internalJwtIssuer),
            subject: payload.jti,
            keyid: keyId
        }, function (err, token) {
            if (err) {
                return reject(err);
            }
            resolve(token);
        });
    });
}

function loginUser(options) {
    return User.check(options)
        .then(generateToken)
        .then((accessToken) => {
            return Promise.all([
                Promise.resolve(accessToken),
                generateRefreshToken(accessToken)
            ]);
        })
        .then(([accessToken, refreshToken]) => {
            return {
                accessToken, refreshToken
            };
        });
}

function token(options) {
    if (options.email && options.password) {
        return loginUser(options);
    }
    return Promise.reject(new BadRequestError());
}

module.exports = token;
