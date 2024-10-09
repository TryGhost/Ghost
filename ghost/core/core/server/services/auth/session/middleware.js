function SessionMiddleware({sessionService}) {
    async function createSession(req, res, next) {
        try {
            await sessionService.createSessionForUser(req, res, req.user);
            res.sendStatus(201);
        } catch (err) {
            next(err);
        }
    }

    async function logout(req, res, next) {
        try {
            await sessionService.removeUserForSession(req, res);
            res.sendStatus(204);
        } catch (err) {
            next(err);
        }
    }

    async function authenticate(req, res, next) {
        try {
            const user = await sessionService.getUserForSession(req, res);
            if (user) {
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

            res.sendStatus(201);
        } catch (err) {
            next(err);
        }
    }

    async function verifyAuthCode(req, res, next) {
        try {
            const verified = await sessionService.verifyAuthCodeForUser(req, res);

            if (verified) {
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
