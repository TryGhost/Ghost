const errors = require('@tryghost/errors');
const labs = require('../../../../shared/labs');

function SessionMiddleware({sessionService}) {
    async function createSession(req, res, next) {
        try {
            await sessionService.createSessionForUser(req, res, req.user);

            if (labs.isSet('staff2fa')) {
                const isVerified = await sessionService.isVerifiedSession(req, res);
                if (isVerified) {
                    res.sendStatus(201);
                } else {
                    await sessionService.sendAuthCodeToUser(req, res);
                    throw new errors.NoPermissionError({
                        code: '2FA_TOKEN_REQUIRED',
                        errorType: 'Needs2FAError',
                        message: 'User must verify session to login.'
                    });
                }
            } else {
                res.sendStatus(201);
            }
        } catch (err) {
            next(err);
        }
    }

    async function logout(req, res, next) {
        try {
            await sessionService.removeUserForSession(req, res);
            res.sendStatus(204);
        } catch (err) {
            if (errors.utils.isGhostError(err)) {
                next(err);
            } else {
                next(new errors.InternalServerError({err}));
            }
        }
    }

    async function authenticate(req, res, next) {
        try {
            const user = await sessionService.getUserForSession(req, res);
            const isVerified = await sessionService.isVerifiedSession(req, res);
            if (user && isVerified) {
                // Do not nullify `req.user` as it might have been already set
                // in a previous middleware (authorize middleware).
                req.user = user;
            }
            next();
        } catch (err) {
            next(err);
        }
    }

    async function sendAuthCode(req, res, next) {
        try {
            await sessionService.sendAuthCodeToUser(req, res);

            res.sendStatus(200);
        } catch (err) {
            next(err);
        }
    }

    async function verifyAuthCode(req, res, next) {
        try {
            const verified = await sessionService.verifyAuthCodeForUser(req, res);

            if (verified) {
                await sessionService.verifySession(req, res);
                res.sendStatus(200);
            } else {
                res.sendStatus(401);
            }
        } catch (err) {
            next(err);
        }
    }

    return {
        createSession: createSession,
        logout: logout,
        authenticate: authenticate,
        sendAuthCode: sendAuthCode,
        verifyAuthCode: verifyAuthCode
    };
}

module.exports = SessionMiddleware;
