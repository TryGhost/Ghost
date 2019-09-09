const concat = require('concat-stream');
const Cookies = require('cookies');
const ignition = require('ghost-ignition');

const {
    BadRequestError
} = ignition.errors;

const EMPTY = {};
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 184;
const ONE_DAY_MS = 1000 * 60 * 60 * 24;

const withCookies = (fn, cookieConfig) => (req, res) => {
    return new Promise((resolve) => {
        const cookies = new Cookies(req, res, cookieConfig);
        resolve(fn(req, res, {cookies}));
    });
};

const withBodyAndCookies = (fn, cookieConfig) => (req, res) => {
    return new Promise((resolve, reject) => {
        const cookies = new Cookies(req, res, cookieConfig);
        req.on('error', reject);
        req.pipe(concat(function (buff) {
            const body = buff.toString();
            resolve(fn(req, res, {body, cookies}));
        }));
    });
};

const get = (value) => {
    return typeof value === 'function' ? value() : value;
};

module.exports = function create(options = EMPTY) {
    if (options === EMPTY) {
        throw new Error('Must pass options');
    }

    const {
        cookieMaxAge = SIX_MONTHS_MS,
        cookieSecure = true,
        cookieName = 'members-ssr',
        cookieCacheName = 'members-ssr-cache',
        cookieCacheMaxAge = ONE_DAY_MS,
        cookiePath = '/',
        cookieKeys,
        membersApi
    } = options;

    if (!membersApi) {
        throw new Error('Missing option membersApi');
    }

    if (!cookieKeys) {
        throw new Error('Missing option cookieKeys');
    }

    const cookieConfig = {
        keys: [].concat(cookieKeys),
        secure: cookieSecure
    };

    const getMemberDataFromToken = token => get(membersApi).getMemberDataFromMagicLinkToken(token);

    const exchangeTokenForSession = withBodyAndCookies(async (_req, _res, {body, cookies}) => {
        const token = body;
        if (!body || typeof body !== 'string') {
            return Promise.reject(new BadRequestError({
                message: 'Expected body containing JWT'
            }));
        }

        const member = await getMemberDataFromToken(token);
        cookies.set(cookieName, member.email, {
            signed: true,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: cookieMaxAge,
            path: cookiePath
        });
        cookies.set(cookieCacheName, JSON.stringify(member), {
            signed: true,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: cookieCacheMaxAge,
            path: cookiePath
        });
    }, cookieConfig);

    const deleteSession = withCookies((_req, _res, {cookies}) => {
        cookies.set(cookieName, {
            signed: true,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: cookieMaxAge,
            path: cookiePath
        });
        cookies.set(cookieCacheName, {
            signed: true,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: cookieCacheMaxAge,
            path: cookiePath
        });
    }, cookieConfig);

    const getMemberDataFromSession = withCookies(async (_req, _res, {cookies}) => {
        const email = cookies.get(cookieName, {
            signed: true
        });

        if (!email) {
            throw new BadRequestError({
                message: `Cookie ${cookieName} not found`
            });
        }

        const cachedMember = cookies.get(cookieCacheName, {
            signed: true
        });

        if (cachedMember) {
            try {
                return JSON.parse(cachedMember);
            } catch (e) {
                cookies.set(cookieCacheName, {
                    signed: true,
                    httpOnly: true,
                    sameSite: 'lax',
                    maxAge: cookieCacheMaxAge,
                    path: cookiePath
                });
                throw new BadRequestError({
                    message: `Invalid JSON found in cookie ${cookieCacheName}`
                });
            }
        }
        const member = await get(membersApi).getMemberIdentityData(email);
        cookies.set(cookieCacheName, JSON.stringify(member), {
            signed: true,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: cookieCacheMaxAge,
            path: cookiePath
        });

        return member;
    }, cookieConfig);

    const getIdentityTokenForMemberFromSession = withCookies(async (_req, _res, {cookies}) => {
        try {
            const email = cookies.get(cookieName, {
                signed: true
            });
            return get(membersApi).getMemberIdentityToken(email);
        } catch (e) {
            throw new BadRequestError({
                message: `Cookie ${cookieName} not found`
            });
        }
    }, cookieConfig);

    return {
        exchangeTokenForSession,
        deleteSession,
        getMemberDataFromSession,
        getIdentityTokenForMemberFromSession
    };
};
