module.exports = SessionFromToken;

/**
 * @typedef {object} User
 * @prop {string} id
 */

/**
 * @typedef {import('express').Request} Req
 * @typedef {import('express').Response} Res
 * @typedef {import('express').NextFunction} Next
 * @typedef {import('express').RequestHandler} RequestHandler
 */

/**
 * Returns a connect middleware function which exchanges a token for a session
 *
 * @template Token
 * @template Lookup
 *
 * @param { object } deps
 * @param { (req: Req) => Promise<Token> } deps.getTokenFromRequest
 * @param { (token: Token) => Promise<Lookup> } deps.getLookupFromToken
 * @param { (lookup: Lookup) => Promise<User> } deps.findUserByLookup
 * @param { (req: Req, res: Res, user: User) => Promise<void> } deps.createSession
 * @param { boolean } deps.callNextWithError - Whether next should be call with an error or just pass through
 *
 * @returns {RequestHandler}
 */
function SessionFromToken({
    getTokenFromRequest,
    getLookupFromToken,
    findUserByLookup,
    createSession,
    callNextWithError
}) {
    /**
     * @param {Req} req
     * @param {Res} res
     * @param {Next} next
     * @returns {Promise<void>}
     */
    async function handler(req, res, next) {
        try {
            const token = await getTokenFromRequest(req);
            if (!token) {
                return next();
            }
            const email = await getLookupFromToken(token);
            if (!email) {
                return next();
            }
            const user = await findUserByLookup(email);
            if (!user) {
                return next();
            }
            await createSession(req, res, user);
            next();
        } catch (err) {
            if (callNextWithError) {
                next(err);
            } else {
                next();
            }
        }
    }

    return handler;
}
