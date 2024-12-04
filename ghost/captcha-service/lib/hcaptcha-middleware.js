const hcaptcha = require('hcaptcha');
const {InternalServerError, BadRequestError, utils: errorUtils} = require('@tryghost/errors');

module.exports = function hcaptchaMiddleware(secretKey) {
    return async function (req, res, next) {
        try {
            if (!req.body || !req.body.token) {
                throw new BadRequestError({
                    message: 'hCaptcha token missing'
                });
            }
            req.hcaptcha = await hcaptcha.verify(secretKey, req.body.token, req.ip);
            next();
        } catch (err) {
            if (errorUtils.isGhostError(err)) {
                return next(err);
            } else {
                return next(new InternalServerError({
                    message: 'Failed to verify hCaptcha token'
                }));
            }
        }
    };
};
