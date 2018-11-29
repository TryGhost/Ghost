const crypto = require('crypto');
const jose = require('node-jose');
const {Router, static} = require('express');
const cookie = require('cookie');
const body = require('body-parser');
const jwt = require('jsonwebtoken');

module.exports = function MembersApi({
    config: {
        privateKey
    },
    createMember,
    validateMember,
    updateMember,
    sendEmail
}) {
    const keyStore = jose.JWK.createKeyStore();
    const keyStoreReady = keyStore.add(privateKey, 'pem');

    function encodeCookie(data) {
        return encodeURIComponent(data);
    }

    function decodeCookie(cookie) {
        return decodeURIComponent(cookie);
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

    const router = Router();

    const apiRouter = Router();

    apiRouter.use(function waitForKeyStore(req, res, next) {
        keyStoreReady.then(() => next());
    });

    apiRouter.post('/token', (req, res) => {
        const {signedin} = cookie.parse(req.headers.cookie, {
            decode: decodeCookie
        });
        if (!signedin) {
            res.writeHead(401);
            return res.end();
        }
        const token = jwt.sign({}, null, {algorithm: 'none'});
        return res.end(token);
    });

    apiRouter.post('/reset-password', body.json(), (req, res) => {
        const {email} = getData(req, res, 'email');
        if (res.ended) {
            return;
        }

        const token = crypto.randomBytes(16).toString('hex');

        updateMember({email}, {token}).then((member) => {
            return sendEmail(member, {token});
        }).then(() => {
            res.writeHead(200);
            res.end();
        }).catch(handleError(400, res));
    });

    apiRouter.post('/verify', body.json(), (req, res) => {
        const {
            token,
            password
        } = getData(req, res, 'token', 'password');
        if (res.ended) {
            return;
        }

        validateMember({token}).then((member) => {
            return updateMember(member, {password});
        }).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(401, res));
    });

    apiRouter.post('/signup', body.json(), (req, res) => {
        const {
            name,
            email,
            password
        } = getData(req, res, 'name', 'email', 'password');
        if (res.ended) {
            return;
        }

        createMember({name, email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(400, res));
    });

    apiRouter.post('/signin', body.json(), (req, res) => {
        const {
            email,
            password
        } = getData(req, res, 'email', 'password');
        if (res.ended) {
            return;
        }

        validateMember({email, password}).then((member) => {
            res.writeHead(200, {
                'Set-Cookie': setCookie(member)
            });
            res.end();
        }).catch(handleError(401, res));
    });

    apiRouter.post('/signout', (req, res) => {
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

    staticRouter.use(static(require('path').join(__dirname, './static')));

    router.use('/api', apiRouter);
    router.use('/static', staticRouter);

    function httpHandler(req, res, next) {
        return router.handle(req, res, next);
    }

    httpHandler.staticRouter = staticRouter;
    httpHandler.apiRouter = apiRouter;
    httpHandler.keyStore = keyStore;

    return httpHandler;
};

function getData(req, res, ...props) {
    if (!req.body) {
        res.writeHead(400);
        return res.end();
    }

    const data = props.reduce((data, prop) => {
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
        return {};
    }
    return data;
}

function handleError(status, res) {
    return function (err) {
        res.writeHead(status);
        res.end(err.message);
    };
}
