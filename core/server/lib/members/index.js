const crypto = require('crypto');
const jose = require('node-jose');
const {Router, static} = require('express');
const cookie = require('cookie');
const body = require('body-parser');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const urlService = require('../../services/url');

module.exports = function MembersApi({
    config: {
        issuer,
        privateKey,
        sessionSecret,
        ssoOrigin
    },
    createMember,
    validateMember,
    updateMember,
    sendEmail
}) {
    const keyStore = jose.JWK.createKeyStore();
    const keyStoreReady = keyStore.add(privateKey, 'pem');

    function encodeCookie(data) {
        const encodedData = encodeURIComponent(data);
        const hmac = crypto.createHmac('sha256', sessionSecret);
        hmac.update(encodedData);
        return `${hmac.digest('hex')}~${encodedData}`;
    }

    function decodeCookie(data) {
        const hmac = crypto.createHmac('sha256', sessionSecret);
        const [sentHmac, sentData] = data.split('~');
        if (hmac.update(sentData).digest('hex') !== sentHmac) {
            return null;
        }
        return decodeURIComponent(sentData);
    }

    function setCookie(member) {
        return cookie.serialize('signedin', member.id, {
            maxAge: 180,
            path: '/ghost/api/v2/members/token',
            sameSite: 'strict',
            httpOnly: true,
            encode: encodeCookie
        });
    }

    function getCookie(req) {
        return cookie.parse(req.headers.cookie || '', {
            decode: decodeCookie
        });
    }

    const router = Router();

    const apiRouter = Router();

    apiRouter.use(function waitForKeyStore(req, res, next) {
        keyStoreReady.then((jwk) => {
            req.jwk = jwk;
            next();
        });
    });

    apiRouter.post('/token', body.json(), getData('audience'), (req, res) => {
        const {audience, origin} = req.data;
        if (audience !== origin) {
            res.writeHead(403);
            return res.end();
        }

        const {signedin} = getCookie(req);
        if (!signedin) {
            res.writeHead(401);
            return res.end();
        }
        const token = jwt.sign({
            sub: signedin,
            kid: req.jwk.kid
        }, privateKey, {
            algorithm: 'RS512',
            audience,
            issuer
        });
        return res.end(token);
    });

    function ssoOriginCheck(req, res, next) {
        if (!req.data.origin || req.data.origin !== ssoOrigin) {
            res.writeHead(403);
            return res.end();
        }
        next();
    }

    apiRouter.post('/reset-password', body.json(), getData('email'), (req, res) => {
        const {email} = req.data;

        const token = crypto.randomBytes(16).toString('hex');

        updateMember({email}, {token}).then((member) => {
            return sendEmail(member, {token});
        }).then(() => {
            res.writeHead(200);
            res.end();
        }).catch(handleError(400, res));
    });

    apiRouter.post('/verify', body.json(), getData('token', 'password'), ssoOriginCheck, (req, res) => {
        const {token, password} = req.data;

        validateMember({token}).then((member) => {
            return updateMember(member, {password});
        }).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(401, res));
    });

    apiRouter.post('/signup', body.json(), getData('name', 'email', 'password'), ssoOriginCheck, (req, res) => {
        const {name, email, password} = req.data;

        createMember({name, email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(400, res));
    });

    apiRouter.post('/signin', body.json(), getData('email', 'password'), ssoOriginCheck, (req, res) => {
        const {email, password} = req.data;

        validateMember({email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(401, res));
    });

    apiRouter.post('/signout', body.json(), getData(), ssoOriginCheck, (req, res) => {
        res.writeHead(200, {
            'Set-Cookie': cookie.serialize('signedin', false, {
                maxAge: 0,
                path: '/ghost/api/v2/members/token',
                sameSite: 'strict',
                httpOnly: true
            })
        });
        res.end();
    });

    const staticRouter = Router();
    staticRouter.use('/static', static(require('path').join(__dirname, './static/preact/dist')));
    staticRouter.use('/gateway', static(require('path').join(__dirname, './static/gateway')));
    staticRouter.get('/*', (req, res) => {
        res.sendFile(require('path').join(__dirname, './static/preact/dist/index.html'));
    });

    router.use('/api', apiRouter);
    router.use('/static', staticRouter);
    router.get('/.well-known/jwks.json', (req, res) => {
        keyStoreReady.then(() => {
            res.json(keyStore.toJSON());
        });
    });

    function httpHandler(req, res, next) {
        return router.handle(req, res, next);
    }

    httpHandler.staticRouter = staticRouter;
    httpHandler.apiRouter = apiRouter;
    httpHandler.keyStore = keyStore;

    return httpHandler;
};

function getData(...props) {
    return function (req, res, next) {
        if (!req.body) {
            res.writeHead(400);
            return res.end();
        }

        const data = props.concat('origin').reduce((data, prop) => {
            if (!data || !req.body[prop]) {
                return null;
            }
            return Object.assign(data, {
                [prop]: req.body[prop]
            });
        }, {});

        if (!data) {
            res.writeHead(400);
            res.end(`Expected {${props.join(', ')}}`);
        }
        req.data = data;
        next();
    };
}

function handleError(status, res) {
    return function (err) {
        res.writeHead(status);
        res.end(err.message);
    };
}
