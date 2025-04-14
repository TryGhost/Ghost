const {
    BadRequestError
} = require('@tryghost/errors');
const errors = require('@tryghost/errors');
const emailTemplate = require('./emails/signin');
const UAParser = require('ua-parser-js');
const got = require('got');
const IPV4_REGEX = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
const IPV6_REGEX = /^(?:[A-F0-9]{1,4}:){7}[A-F0-9]{1,4}$/i;

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
 * @prop {(req: Req, res: Res) => Promise<void>} createVerifiedSessionForUser
 * @prop {(req: Req, res: Res) => Promise<void>} verifySession
 * @prop {(req: Req, res: Res) => Promise<void>} sendAuthCodeToUser
 * @prop {(req: Req, res: Res) => Promise<boolean>} verifyAuthCodeForUser
 * @prop {(req: Req, res: Res) => Promise<boolean>} isVerifiedSession
 * @prop {() => boolean} isVerificationRequired
 */

/**
 * @param {object} deps
 * @param {(req: Req, res: Res) => Promise<Session>} deps.getSession
 * @param {(data: {id: string}) => Promise<User>} deps.findUserById
 * @param {(req: Req) => string} deps.getOriginOfRequest
 * @param {(key: 'require_email_mfa' | 'admin_session_secret' | 'title') => boolean | string} deps.getSettingsCache
 * @param {() => string} deps.getBlogLogo
 * @param {import('../../core/core/server/services/mail').GhostMailer} deps.mailer
 * @param {import('../../core/core/shared/labs')} deps.labs
 * @param {import('../../core/core/server/services/i18n').t} deps.t
 * @param {import('../../core/core/shared/url-utils')} deps.urlUtils
 * @returns {SessionService}
 */

module.exports = function createSessionService({
    getSession,
    findUserById,
    getOriginOfRequest,
    getSettingsCache,
    getBlogLogo,
    mailer,
    urlUtils,
    labs,
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
     * isVerificationRequired
     * Determines if 2FA verification is required based on site settings
     * @returns {boolean}
     */
    function isVerificationRequired() {
        return getSettingsCache('require_email_mfa') === true;
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

        if (!labs.isSet('staff2fa')) {
            session.verified = true;
        }
    }

    /**
     * createVerifiedSessionForUser
     *
     * @param {Req} req
     * @param {Res} res
     * @param {User} user
     * @returns {Promise<void>}
     */
    async function createVerifiedSessionForUser(req, res, user) {
        await createSessionForUser(req, res, user);
        await verifySession(req, res);
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

    const formatTime = new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short'
    }).format;

    /**
     * Get a readable location string from an IP address.
     * @param {string} ip - The IP address to look up.
     * @returns {Promise<string>} - A readable location string or 'Unknown'.
     */
    async function getGeolocationFromIP(ip) {
        if (!ip || (!IPV4_REGEX.test(ip) && !IPV6_REGEX.test(ip))) {
            return 'Unknown';
        }

        const gotOpts = {
            timeout: 500
        };

        if (process.env.NODE_ENV?.startsWith('test')) {
            gotOpts.retry = 0;
        }

        const geojsUrl = `https://get.geojs.io/v1/ip/geo/${encodeURIComponent(ip)}.json`;

        try {
            const response = await got(geojsUrl, gotOpts).json();

            const {city, region, country} = response || {};

            // Only include non-empty parts in the result
            const locationParts = [city, region, country].filter(Boolean);

            // If no valid parts, return 'Unknown'
            return locationParts.length > 0 ? locationParts.join(', ').trim() : 'Unknown';
        } catch (error) {
            return 'Unknown';
        }
    }

    async function getDeviceDetails(userAgent, ip) {
        const parser = new UAParser();
        parser.setUA(userAgent);
        const result = parser.getResult();
        const deviceParts = [
            result.browser?.name || '',
            result.os?.name || ''
        ].filter(Boolean);

        return {
            device: deviceParts.join(', '),
            location: await getGeolocationFromIP(ip),
            time: formatTime(new Date())
        };
    }

    /**
     * sendAuthCodeToUser
     *
     * @param {Req} req
     * @param {Res} res
     * @returns {Promise<void>}
     */
    async function sendAuthCodeToUser(req, res) {
        const session = await getSession(req, res);
        const token = await generateAuthCodeForUser(req, res);

        let user;
        try {
            user = await findUserById({id: session.user_id});
        } catch (error) {
            // User session likely doesn't contain a valid user ID
            throw new BadRequestError({
                message: 'Could not fetch user from the session.'
            });
        }

        const recipient = user.get('email');
        const siteTitle = getSettingsCache('title');
        const siteLogo = getBlogLogo();
        const siteUrl = urlUtils.urlFor('home', true);
        const domain = urlUtils.urlFor('home', true).match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
        const siteDomain = (domain && domain[1]);
        const email = emailTemplate({
            t,
            siteTitle: siteTitle,
            email: recipient,
            siteDomain: siteDomain,
            siteUrl: siteUrl,
            siteLogo: siteLogo,
            token: token,
            deviceDetails: await getDeviceDetails(session.user_agent, session.ip),
            is2FARequired: isVerificationRequired()
        });

        try {
            await mailer.send({
                to: recipient,
                subject: `${token} is your Ghost sign in verification code`,
                html: email
            });
        } catch (error) {
            throw new errors.EmailError({
                ...error,
                message: 'Failed to send email. Please check your site configuration and try again.'
            });
        }
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

        if (isVerificationRequired()) {
            session.verified = undefined;
        }

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
        createVerifiedSessionForUser,
        removeUserForSession,
        verifySession,
        isVerifiedSession,
        sendAuthCodeToUser,
        verifyAuthCodeForUser,
        generateAuthCodeForUser,
        isVerificationRequired
    };
};
