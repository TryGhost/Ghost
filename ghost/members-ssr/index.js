const concat = require('concat-stream');
const Cookies = require('cookies');
const jwt = require('jsonwebtoken');
const ignition = require('ghost-ignition');

const {
    UnauthorizedError,
    BadRequestError
} = ignition.errors;

const EMPTY = {};
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 184;

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

module.exports = function create(options = EMPTY) {
    if (options === EMPTY) {
        throw new Error('Must pass options');
    }

    const {
        cookieMaxAge = SIX_MONTHS_MS,
        cookieSecure = true,
        cookieName = 'members-ssr',
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

    const verifyJwt = token => membersApi.getPublicConfig().then(({publicKey, issuer}) => {
        return new Promise((resolve, reject) => {
            jwt.verify(token, publicKey, {
                algorithms: ['RS512'],
                issuer,
                audience: issuer
            }, (err, claims) => {
                if (err) {
                    reject(new UnauthorizedError({err}));
                }
                resolve(claims);
            });
        });
    });

    const exchangeTokenForSession = withBodyAndCookies((req, res, {body, cookies}) => {
        const token = body;
        if (!body || typeof body !== 'string') {
            return Promise.reject(new BadRequestError({
                message: 'Expected body containing JWT'
            }));
        }

        return verifyJwt(token).then(() => {
            cookies.set(cookieName, token, {
                signed: true,
                httpOnly: true,
                sameSite: 'lax',
                maxAge: cookieMaxAge,
                path: cookiePath
            });
        });
    }, cookieConfig);

    const deleteSession = withCookies((req, res, {cookies}) => {
        cookies.set(cookieName, {
            signed: true,
            httpOnly: true,
            sameSite: 'lax',
            maxAge: cookieMaxAge,
            path: cookiePath
        });
    }, cookieConfig);

    const getMemberDataFromSession = withCookies((req, res, {cookies}) => {
        try {
            const token = cookies.get(cookieName, {
                signed: true
            });
            return verifyJwt(token).then((claims) => {
                return membersApi.getMember(claims.sub, token);
            });
        } catch (e) {
            return Promise.reject(new BadRequestError({
                message: `Cookie ${cookieName} not found`
            }));
        }
    }, cookieConfig);

    return {
        exchangeTokenForSession,
        deleteSession,
        getMemberDataFromSession
    };
};
