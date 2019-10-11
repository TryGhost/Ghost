const {parse: parseUrl} = require('url');
const createCookies = require('cookies');
const ignition = require('ghost-ignition');
const {
    BadRequestError
} = ignition.errors;

/**
 * @typedef {import('http').IncomingMessage} Request
 * @typedef {import('http').ServerResponse} Response
 * @typedef {import('cookies').ICookies} Cookies
 * @typedef {import('cookies').Option} CookiesOptions
 * @typedef {import('cookies').SetOption} SetCookieOptions
 * @typedef {string} JWT
 */

/**
 * @typedef {object} Member
 * @prop {string} email
 */

const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 184;

class MembersSSR {
    /**
     * @typedef {object} MembersSSROptions
     *
     * @prop {string|string[]} cookieKeys - A secret or array of secrets used to sign cookies
     * @prop {() => object} getMembersApi - A function which returns an instance of members-api
     * @prop {boolean} [cookieSecure = true] - Whether the cookie should have Secure flag
     * @prop {string} [cookieName] - The name of the members-ssr cookie
     * @prop {number} [cookieMaxAge] - The max age in ms of the members-ssr cookie
     * @prop {string} [cookiePath] - The Path flag for the cookie
     * @prop {boolean} [dangerousRemovalOfSignedCookie] - Flag for removing signed cookie
     */

    /**
     * Create an instance of MembersSSR
     *
     * @param {MembersSSROptions} options  - The options for the members ssr class
     */
    constructor(options) {
        const {
            cookieSecure = true,
            cookieName = 'members-ssr',
            cookieMaxAge = SIX_MONTHS_MS,
            cookiePath = '/',
            cookieKeys,
            getMembersApi,
            dangerousRemovalOfSignedCookie
        } = options;

        if (!getMembersApi) {
            throw new Error('Missing option getMembersApi');
        }

        this._getMembersApi = getMembersApi;

        if (!cookieKeys) {
            throw new Error('Missing option cookieKeys');
        }

        this.sessionCookieName = cookieName;

        /**
         * @type SetCookieOptions
         */
        this.sessionCookieOptions = {
            signed: true,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: cookieMaxAge,
            path: cookiePath
        };

        if (dangerousRemovalOfSignedCookie === true) {
            this.sessionCookieOptions.signed = false;
        }

        /**
         * @type CookiesOptions
         */
        this.cookiesOptions = {
            keys: Array.isArray(cookieKeys) ? cookieKeys : [cookieKeys],
            secure: cookieSecure
        };
    }

    /**
     * @method _getCookies
     *
     * @param {Request} req
     * @param {Response} res
     *
     * @returns {Cookies} An instance of the cookies object for current request/response
     */
    _getCookies(req, res) {
        return createCookies(req, res, this.cookiesOptions);
    }

    /**
     * @method _removeSessionCookie
     *
     * @param {Request} req
     * @param {Response} res
     */
    _removeSessionCookie(req, res) {
        const cookies = this._getCookies(req, res);
        cookies.set(this.sessionCookieName, this.sessionCookieOptions);
    }

    /**
     * @method _setSessionCookie
     *
     * @param {Request} req
     * @param {Response} res
     * @param {string} value
     */
    _setSessionCookie(req, res, value) {
        if (!value) {
            return this._removeSessionCookie(req, res);
        }
        const cookies = this._getCookies(req, res);
        cookies.set(this.sessionCookieName, value, this.sessionCookieOptions);
    }

    /**
     * @method _getSessionCookies
     *
     * @param {Request} req
     * @param {Response} res
     *
     * @returns {string} The cookie value
     */
    _getSessionCookies(req, res) {
        const cookies = this._getCookies(req, res);
        const value = cookies.get(this.sessionCookieName, {signed: true});
        if (!value) {
            throw new BadRequestError({
                message: `Cookie ${this.sessionCookieName} not found`
            });
        }
        return value;
    }

    /**
     * @method _getMemberDataFromToken
     *
     * @param {JWT} token
     *
     * @returns {Promise<Member>} member
     */
    async _getMemberDataFromToken(token) {
        const api = await this._getMembersApi();
        return api.getMemberDataFromMagicLinkToken(token);
    }

    /**
     * @method _getMemberIdentityData
     *
     * @param {string} email
     *
     * @returns {Promise<Member>} member
     */
    async _getMemberIdentityData(email) {
        const api = await this._getMembersApi();
        return api.getMemberIdentityData(email);
    }

    /**
     * @method _getMemberIdentityToken
     *
     * @param {string} email
     *
     * @returns {Promise<JWT>} member
     */
    async _getMemberIdentityToken(email) {
        const api = await this._getMembersApi();
        return api.getMemberIdentityToken(email);
    }

    /**
     * @method exchangeTokenForSession
     * @param {Request} req
     * @param {Response} res
     *
     * @returns {Promise<Member>} The member the session was created for
     */
    async exchangeTokenForSession(req, res) {
        if (!req.url) {
            return Promise.reject(new BadRequestError({
                message: 'Expected token param containing JWT'
            }));
        }

        const {query} = parseUrl(req.url, true);
        if (!query || !query.token) {
            return Promise.reject(new BadRequestError({
                message: 'Expected token param containing JWT'
            }));
        }

        const token = Array.isArray(query.token) ? query.token[0] : query.token;
        const member = await this._getMemberDataFromToken(token);

        this._setSessionCookie(req, res, member.email);

        return member;
    }

    /**
     * @method deleteSession
     * @param {Request} req
     * @param {Response} res
     *
     * @returns {Promise<void>}
     */
    async deleteSession(req, res) {
        this._removeSessionCookie(req, res);
    }

    /**
     * @method getMemberDataFromSession
     *
     * @param {Request} req
     * @param {Response} res
     *
     * @returns {Promise<Member>}
     */
    async getMemberDataFromSession(req, res) {
        const email = this._getSessionCookies(req, res);

        const member = await this._getMemberIdentityData(email);
        return member;
    }

    /**
     * @method getIdentityTokenForMemberFromSession
     *
     * @param {Request} req
     * @param {Response} res
     *
     * @returns {Promise<JWT>} identity token
     */
    async getIdentityTokenForMemberFromSession(req, res) {
        const email = this._getSessionCookies(req, res);
        const token = await this._getMemberIdentityToken(email);
        if (!token) {
            this.deleteSession(req, res);
            throw new BadRequestError({
                message: 'Invalid session, could not get identity token'
            });
        }
        return token;
    }
}

/**
 * Factory function for creating instance of MembersSSR
 *
 * @param {MembersSSROptions} options
 * @returns {MembersSSR}
 */
module.exports = function create(options) {
    if (!options) {
        throw new Error('Must pass options');
    }
    return new MembersSSR(options);
};
