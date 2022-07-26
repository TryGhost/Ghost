export = SessionFromToken;
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
declare function SessionFromToken<Token, Lookup>({ getTokenFromRequest, getLookupFromToken, findUserByLookup, createSession, callNextWithError }: {
    getTokenFromRequest: (req: Req) => Promise<Token>;
    getLookupFromToken: (token: Token) => Promise<Lookup>;
    findUserByLookup: (lookup: Lookup) => Promise<User>;
    createSession: (req: Req, res: Res, user: User) => Promise<void>;
    callNextWithError: boolean;
}): RequestHandler;
declare namespace SessionFromToken {
    export { User, Req, Res, Next, RequestHandler };
}
type Req = import('express').Request;
type User = {
    id: string;
};
type Res = import('express').Response;
type RequestHandler = import('express').RequestHandler;
type Next = import('express').NextFunction;
