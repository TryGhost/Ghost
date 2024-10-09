const {
    BadRequestError
} = require('@tryghost/errors');
const emailTemplate = require('../lib/emails/signin');

const {totp} = require('otplib');
totp.options = {
    digits: 6,
    step: 60,
    window: [10, 10]
};

/**
 * @typedef {object} User
 * @prop {string} id
 * @prop {(attr: string) => string} get
 */

/**
 * @typedef {object} Session
 * @prop {(cb: (err: Error | null) => any) => void} destroy
 * @prop {string} user_id
 * @prop {string} origin
 * @prop {string} user_agent
 * @prop {string} ip
 * @prop {boolean} verified
 */

/**
 * @typedef {import('express').Request} Req
 * @typedef {import('express').Response} Res
 */

/**
 * @typedef {object} SessionService
 * @prop {(req: Req, res: Res) => Promise<User | null>} getUserForSession
 * @prop {(req: Req, res: Res) => Promise<void>} removeUserForSession
 * @prop {(req: Req, res: Res, user: User) => Promise<void>} createSessionForUser
 * @prop {(req: Req, res: Res) => Promise<void>} verifySession
 * @prop {(req: Req, res: Res) => Promise<void>} sendAuthCodeToUser
 * @prop {(req: Req, res: Res) => Promise<boolean>} verifyAuthCodeForUser
 * @prop {(req: Req, res: Res) => Promise<boolean>} isVerifiedSession
 */

/**
 * @param {object} deps
 * @param {(req: Req, res: Res) => Promise<Session>} deps.getSession
 * @param {(data: {id: string}) => Promise<User>} deps.findUserById
 * @param {(req: Req) => string} deps.getOriginOfRequest
 * @param {(key: string) => string} deps.getSettingsCache
 * @param {import('../../core/core/server/services/mail').GhostMailer} deps.mailer
 * @param {import('../../core/core/server/services/i18n').t} deps.t
 * @param {import('../../core/core/shared/url-utils')} deps.urlUtils
 * @returns {SessionService}
 */

module.exports = function createSessionService({
    getSession,
    findUserById,
    getOriginOfRequest,
    getSettingsCache,
    mailer,
    urlUtils,
    t
}) {
    /**
     * cookieCsrfProtection
     *
     * @param {Req} req
     * @param {Session} session
     * @returns {Promise<void>}
     */
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

    /**
     * createSessionForUser
     *
     * @param {Req} req
     * @param {Res} res
     * @param {User} user
     * @returns {Promise<void>}
     */
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

    /**
     * generateAuthCodeForUser
     *
     * @param {Req} req
     * @param {Res} res
     * @returns {Promise<string>}
     */
    async function generateAuthCodeForUser(req, res) {
        const session = await getSession(req, res);
        const secret = getSettingsCache('admin_session_secret') + session.user_id;
        const token = totp.generate(secret);
        return token;
    }

    /**
     * verifyAuthCodeForUser
     *
     * @param {Req} req
     * @param {Res} res
     * @returns {Promise<boolean>}
     */
    async function verifyAuthCodeForUser(req, res) {
        const session = await getSession(req, res);
        const secret = getSettingsCache('admin_session_secret') + session.user_id;
        const isValid = totp.check(req.body.token, secret);
        return isValid;
    }

    /**
     * sendAuthCodeToUser
     *
     * @param {Req} req
     * @param {Res} res
     * @returns {Promise<void>}
     */
    async function sendAuthCodeToUser(req, res) {
        const token = await generateAuthCodeForUser(req, res);
        const user = await getUserForSession(req, res);
        if (!user) {
            throw new BadRequestError({
                message: 'Could not fetch user from the session.'
            });
        }
        const recipient = user.get('email');
        const siteTitle = getSettingsCache('title');
        const siteUrl = urlUtils.urlFor('home', true);
        const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
        const siteDomain = (domain && domain[1]);
        const email = emailTemplate({
            t,
            siteTitle: siteTitle,
            email: recipient,
            siteDomain: siteDomain,
            siteUrl: siteUrl,
            token
        });

        await mailer.send({
            to: recipient,
            subject: `Verification code: ${token}`,
            html: email
        });

        return Promise.resolve();
    }

    /**
     * verifySession
     *
     * @param {Req} req
     * @param {Res} res
     */
    async function verifySession(req, res) {
        const session = await getSession(req, res);
        session.verified = true;
    }

    /**
     * isVerifiedSession
     *
     * @param {Req} req
     * @param {Res} res
     */
    async function isVerifiedSession(req, res) {
        const session = await getSession(req, res);
        return session.verified;
    }

    /**
     * removeUserForSession
     *
     * @param {Req} req
     * @param {Res} res
     * @returns {Promise<void>}
     */
    async function removeUserForSession(req, res) {
        const session = await getSession(req, res);
        session.user_id = undefined;
    }

    /**
     * getUserForSession
     *
     * @param {Req} req
     * @param {Res} res
     * @returns {Promise<User | null>}
     */
    async function getUserForSession(req, res) {
        // CASE: we don't have a cookie header so allow fallthrough to other
        // auth middleware or final "ensure authenticated" check
        if (!req.headers || !req.headers.cookie) {
            return null;
        }

        const session = await getSession(req, res);
        // Enable CSRF bypass (useful for OAuth for example)
        if (!res || !res.locals || !res.locals.bypassCsrfProtection) {
            cookieCsrfProtection(req, session);
        }

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
        removeUserForSession,
        verifySession,
        isVerifiedSession,
        sendAuthCodeToUser,
        verifyAuthCodeForUser,
        generateAuthCodeForUser
    };
};
