const jose = require('node-jose');
const {Router, static} = require('express');
const body = require('body-parser');
const jwt = require('jsonwebtoken');

const cookies = require('./cookies');

module.exports = function MembersApi({
    config: {
        issuer,
        privateKey,
        publicKey,
        sessionSecret,
        ssoOrigin
    },
    validateAudience,
    createMember,
    validateMember,
    updateMember,
    getMember,
    sendEmail
}) {
    const keyStore = jose.JWK.createKeyStore();
    const keyStoreReady = keyStore.add(privateKey, 'pem');

    const router = Router();

    const apiRouter = Router();

    apiRouter.use(body.json());
    apiRouter.use(function waitForKeyStore(req, res, next) {
        keyStoreReady.then((jwk) => {
            req.jwk = jwk;
            next();
        });
    });

    const {getCookie, setCookie, removeCookie} = cookies(sessionSecret);

    apiRouter.post('/token', getData('audience'), (req, res) => {
        const {signedin} = getCookie(req);
        if (!signedin) {
            res.writeHead(401);
            return res.end();
        }

        const {audience, origin} = req.data;

        validateAudience({audience, origin, id: signedin}).then(() => {
            const token = jwt.sign({
                sub: signedin,
                kid: req.jwk.kid
            }, privateKey, {
                algorithm: 'RS512',
                audience,
                issuer
            });
            return res.end(token);
        }).catch(handleError(403, res));
    });

    function ssoOriginCheck(req, res, next) {
        if (!req.data.origin || req.data.origin !== ssoOrigin) {
            res.writeHead(403);
            return res.end();
        }
        next();
    }

    apiRouter.post('/request-password-reset', getData('email'), ssoOriginCheck, (req, res) => {
        const {email} = req.data;

        getMember({email}).then((member) => {
            const token = jwt.sign({
                sub: member.id,
                kid: req.jwk.kid
            }, privateKey, {
                algorithm: 'RS512',
                issuer
            });
            return sendEmail(member, {token})
                .catch(handleError(500, res));
        }).catch(() => {
            return;
        }).then(() => {
            res.writeHead(200);
            res.end();
        });
    });

    apiRouter.post('/reset-password', getData('token', 'password'), ssoOriginCheck, (req, res) => {
        const {token, password} = req.data;

        try {
            jwt.verify(token, publicKey, {
                algorithm: 'RS515',
                issuer
            });
        } catch (err) {
            res.writeHead(401);
            return res.end();
        }

        const id = jwt.decode(token).sub;

        updateMember({id}, {password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(401, res));
    });

    apiRouter.post('/signup', getData('name', 'email', 'password'), ssoOriginCheck, (req, res) => {
        const {name, email, password} = req.data;

        // @TODO this should attempt to reset password before creating member
        createMember({name, email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(400, res));
    });

    apiRouter.post('/signin', getData('email', 'password'), ssoOriginCheck, (req, res) => {
        const {email, password} = req.data;

        validateMember({email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(401, res));
    });

    apiRouter.post('/signout', getData(), ssoOriginCheck, (req, res) => {
        res.writeHead(200, {
            'Set-Cookie': removeCookie()
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
            return res.end(`Expected {${props.join(', ')}}`);
        }
        req.data = data || {};
        next();
    };
}

function handleError(status, res) {
    return function () {
        res.writeHead(status);
        res.end();
    };
}
