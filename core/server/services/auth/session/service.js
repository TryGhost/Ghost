const {
    BadRequestError,
    InternalServerError
} = require('@tryghost/errors');

module.exports = function SessionService({
    getSession,
    findUserById,
    getOriginOfRequest
}) {
    if (this instanceof SessionService) {
        return SessionService({getSession, findUserById, getOriginOfRequest});
    }

    function cookieCsrfProtection(req, session) {
        // If there is no origin on the session object it means this is a *new*
        // session, that hasn't been initialised yet. So we don't need CSRF protection
        if (!session.origin) {
            return;
        }

        const origin = getOriginOfRequest(req);

        if (session.origin !== origin) {
            throw new BadRequestError({
                message: `Request made from incorrect origin. Expected '${session.origin}' received '${origin}'.`
            });
        }
    }

    async function createSessionForUser(req, res, user) {
        const session = await getSession(req, res);
        const origin = getOriginOfRequest(req);
        if (!origin) {
            throw new BadRequestError({
                message: 'Could not determine origin of request. Please ensure an Origin or Referrer header is present.'
            });
        }

        session.user_id = user.id;
        session.origin = origin;
        session.user_agent = req.get('user-agent');
        session.ip = req.ip;
    }

    async function destroyCurrentSession(req, res) {
        const session = await getSession(req, res);
        return new Promise((resolve, reject) => {
            session.destroy((err) => {
                if (err) {
                    return reject(new InternalServerError({err}));
                }
                resolve();
            });
        });
    }

    async function getUserForSession(req, res) {
        // CASE: we don't have a cookie header so allow fallthrough to other
        // auth middleware or final "ensure authenticated" check
        if (!req.headers || !req.headers.cookie) {
            return null;
        }

        const session = await getSession(req, res);
        cookieCsrfProtection(req, session);

        if (!session || !session.user_id) {
            return null;
        }

        try {
            const user = await findUserById({id: session.user_id});
            return user;
        } catch (err) {
            return null;
        }
    }

    return {
        getUserForSession,
        createSessionForUser,
        destroyCurrentSession
    };
};
